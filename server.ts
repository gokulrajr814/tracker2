/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DEFAULT_TASKS_TEMPLATE } from "./src/defaultTasks";
import { DatabaseState, CleaningWeek } from "./src/types";

// DB Path in the current workspace directory
const DB_PATH = path.join(process.cwd(), "db.json");

// Helper to load database state
function loadDatabase(): DatabaseState {
  const defaultRoommates = ["Gokul", "Amal", "Abhiram", "Nithin"];
  if (!fs.existsSync(DB_PATH)) {
    // Return default initial database state
    const defaultState: DatabaseState = {
      settings: {
        roommates: defaultRoommates
      },
      weeks: {}
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultState, null, 2), "utf8");
    return defaultState;
  }
  try {
    const data = fs.readFileSync(DB_PATH, "utf8");
    const json = JSON.parse(data);
    // Auto-migrate or clean old defaults if rooms/roommates are empty or contain Friend 1
    if (json.settings && (!json.settings.roommates || json.settings.roommates.includes("Friend 1"))) {
      json.settings.roommates = defaultRoommates;
      fs.writeFileSync(DB_PATH, JSON.stringify(json, null, 2), "utf8");
    }
    return json;
  } catch (error) {
    console.error("Failed to parse db.json, resetting to default states", error);
    const defaultState: DatabaseState = {
      settings: {
        roommates: defaultRoommates
      },
      weeks: {}
    };
    return defaultState;
  }
}

// Helper to save database state
function saveDatabase(state: DatabaseState) {
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), "utf8");
}

// Utility to get Monday and Sunday dates from YYYY-WW week ID
function getWeekDateRange(weekStr: string): { start: string; end: string } {
  const parts = weekStr.split("-W");
  if (parts.length !== 2) {
    return { start: "Monday", end: "Sunday" };
  }
  const year = parseInt(parts[0], 10);
  const week = parseInt(parts[1], 10);
  
  // Find the approximate starting day based on standard formulas
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  
  const monday = new Date(ISOweekStart);
  const sunday = new Date(ISOweekStart);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  return {
    start: formatDate(monday),
    end: formatDate(sunday)
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());
  
  const PORT = 3000;

  // Initialize and verify database setup at startup
  loadDatabase();

  // API Route: Export database state for backup
  app.get("/api/db/export", (req, res) => {
    const db = loadDatabase();
    res.json(db);
  });

  // API Route: Import backup
  app.post("/api/db/import", (req, res) => {
    const { settings, weeks } = req.body;
    if (!settings || !settings.roommates || !Array.isArray(settings.roommates)) {
      return res.status(400).json({ error: "Invalid backup format: missing settings" });
    }
    const validatedState: DatabaseState = {
      settings: {
        roommates: settings.roommates.map((r: any) => String(r).trim()).filter(Boolean)
      },
      weeks: weeks || {}
    };
    saveDatabase(validatedState);
    res.json({ success: true, settings: validatedState.settings });
  });

  // API Route: Get settings
  app.get("/api/settings", (req, res) => {
    const db = loadDatabase();
    res.json(db.settings);
  });

  // API Route: Update settings
  app.post("/api/settings", (req, res) => {
    const { roommates } = req.body;
    if (!roommates || !Array.isArray(roommates) || roommates.length === 0) {
      return res.status(400).json({ error: "Roommates array is required and cannot be empty" });
    }
    const db = loadDatabase();
    db.settings.roommates = roommates.map(name => String(name).trim()).filter(Boolean);
    saveDatabase(db);
    res.json(db.settings);
  });

  // API Route: Get all weeks index
  app.get("/api/weeks", (req, res) => {
    const db = loadDatabase();
    const list = Object.values(db.weeks).map(w => {
      // Calculate roommate performance map for this week
      const performance: { [name: string]: number } = {};
      const roommatesList = w.roommates || db.settings.roommates || [];
      roommatesList.forEach(name => {
        performance[name] = 0;
      });
      if (w.tasks) {
        w.tasks.forEach(t => {
          if (t.completed && t.cleanedBy) {
            performance[t.cleanedBy] = (performance[t.cleanedBy] || 0) + 1;
          }
        });
      }

      return {
        id: w.id,
        startDate: w.startDate,
        endDate: w.endDate,
        updatedAt: w.updatedAt,
        completedCount: w.tasks.filter(t => t.completed).length,
        totalCount: w.tasks.length,
        performance,
        roommates: roommatesList
      };
    }).sort((a, b) => b.id.localeCompare(a.id));
    res.json(list);
  });

  // API Route: Get or create specific week
  app.get("/api/weeks/:weekId", (req, res) => {
    const { weekId } = req.params;
    if (!/^[0-9]{4}-W[0-9]{2}$/.test(weekId)) {
      return res.status(400).json({ error: "Invalid week ID format. Must be YYYY-WW (e.g., 2026-W24)" });
    }
    const db = loadDatabase();
    
    if (!db.weeks[weekId]) {
      // Lazy initialize the week record if not yet created in db
      const dates = getWeekDateRange(weekId);
      const newWeek: CleaningWeek = {
        id: weekId,
        startDate: dates.start,
        endDate: dates.end,
        roommates: [...db.settings.roommates], // snapshot of current roommate names
        tasks: DEFAULT_TASKS_TEMPLATE.map(t => ({
          ...t,
          completed: false,
          cleanedBy: ""
        })),
        updatedAt: new Date().toISOString()
      };
      db.weeks[weekId] = newWeek;
      saveDatabase(db);
    }
    
    res.json(db.weeks[weekId]);
  });

  // API Route: Update week record
  app.put("/api/weeks/:weekId", (req, res) => {
    const { weekId } = req.params;
    const { tasks, roommates } = req.body;
    
    if (!/^[0-9]{4}-W[0-9]{2}$/.test(weekId)) {
      return res.status(400).json({ error: "Invalid week ID format" });
    }
    
    const db = loadDatabase();
    if (!db.weeks[weekId]) {
      return res.status(404).json({ error: "Week not found. Run GET first to initialize it." });
    }
    
    if (tasks && Array.isArray(tasks)) {
      db.weeks[weekId].tasks = tasks;
    }
    if (roommates && Array.isArray(roommates)) {
      db.weeks[weekId].roommates = roommates;
    }
    
    db.weeks[weekId].updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json(db.weeks[weekId]);
  });

  // Vite Integration for development / static files compilation in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
