/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Home, 
  ChefHat, 
  Compass, 
  BedDouble, 
  Bath, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  Plus,
  HelpCircle
} from 'lucide-react';
import { CleaningWeek, Task } from './types';
import RoommatesSettings from './components/RoommatesSettings';
import WhatsAppShare from './components/WhatsAppShare';

// Helper to calculate original ISO WW ID (e.g. 2026-W24)
function getISOWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const pad = weekNo < 10 ? '0' + weekNo : weekNo;
  return `${d.getUTCFullYear()}-W${pad}`;
}

// Convert week ID like "2026-W24" into previous / next week strings
function shiftWeekId(weekId: string, offset: number): string {
  const parts = weekId.split("-W");
  if (parts.length !== 2) return weekId;
  const year = parseInt(parts[0], 10);
  const week = parseInt(parts[1], 10);
  
  // Approximate the week start date
  const baseDate = new Date(year, 0, 1 + (week - 1) * 7);
  baseDate.setDate(baseDate.getDate() + offset * 7);
  return getISOWeekId(baseDate);
}

// Map corresponding icons to categories
function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'hall':
      return <Home className="w-5 h-5 text-indigo-600" />;
    case 'kitchen':
      return <ChefHat className="w-5 h-5 text-amber-600" />;
    case 'sitout':
      return <Compass className="w-5 h-5 text-emerald-600" />;
    case 'room 1':
    case 'room 2':
    case 'amal/gokul':
    case 'abhiram/nithin':
      return <BedDouble className="w-5 h-5 text-sky-600" />;
    case 'bathroom 1':
    case 'bathroom 2':
      return <Bath className="w-5 h-5 text-cyan-600" />;
    default:
      return <Home className="w-5 h-5 text-slate-600" />;
  }
}

// Apply contextual colors to category title cards
function getCategoryColorStyle(category: string): string {
  switch (category.toLowerCase()) {
    case 'hall':
      return 'border-indigo-100 bg-indigo-50/20';
    case 'kitchen':
      return 'border-amber-100 bg-amber-50/20';
    case 'sitout':
      return 'border-emerald-100 bg-emerald-50/20';
    case 'room 1':
    case 'room 2':
    case 'amal/gokul':
    case 'abhiram/nithin':
      return 'border-sky-100 bg-sky-50/20';
    case 'bathroom 1':
    case 'bathroom 2':
      return 'border-cyan-100 bg-cyan-50/20';
    default:
      return 'border-slate-100 bg-slate-50/20';
  }
}

// Helper to filter roommates allowed for specific task categories
function getRoommatesForTask(task: Task, roommates: string[]): string[] {
  const cat = task.category.toLowerCase();
  if (cat === 'bathroom 1' || cat === 'amal/gokul' || cat === 'room 1') {
    return roommates.filter((name) => {
      const n = name.toLowerCase();
      return n === 'gokul' || n === 'amal';
    });
  }
  if (cat === 'bathroom 2' || cat === 'abhiram/nithin' || cat === 'room 2') {
    return roommates.filter((name) => {
      const n = name.toLowerCase();
      return n === 'abhiram' || n === 'nithin' || n === 'nidhin';
    });
  }
  return roommates;
}

// Suffix helper
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

// Format friendly date range like: 8th june to 14th june
export function formatFriendlyDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return "";
  const parseDate = (str: string) => {
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  if (!start || !end) {
    return `${startDateStr} to ${endDateStr}`;
  }

  const months = [
    "june", "july", "august", "september", "october", "november", "december",
    "january", "february", "march", "april", "may"
  ];
  const realMonths = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  const startDay = start.getDate();
  const startMonth = realMonths[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = realMonths[end.getMonth()];

  const startFormatted = `${startDay}${getOrdinalSuffix(startDay)} ${startMonth}`;
  const endFormatted = `${endDay}${getOrdinalSuffix(endDay)} ${endMonth}`;

  return `${startFormatted} to ${endFormatted}`;
}

export default function App() {
  const [currentWeekId, setCurrentWeekId] = useState<string>(() => getISOWeekId(new Date()));
  const [currentWeek, setCurrentWeek] = useState<CleaningWeek | null>(null);
  const [roommates, setRoommates] = useState<string[]>([]);
  const [weeksHistory, setWeeksHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Load baseline app settings and current week metadata
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        setErrorStatus(null);
        
        // Fetch active configuration
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setRoommates(settings.roommates || []);
        }

        // Fetch index list of recorded weeks
        const weeksRes = await fetch('/api/weeks');
        if (weeksRes.ok) {
          const rawHistory = await weeksRes.json();
          setWeeksHistory(rawHistory);
        }

        // Fetch detailed record for select week
        await fetchWeekDetails(currentWeekId);
      } catch (err) {
        console.error("Initialization failed: ", err);
        setErrorStatus("Could not boot backend connection. Try refreshing.");
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [currentWeekId]);

  // Fetch cleaning checklist data for specific week
  const fetchWeekDetails = async (weekId: string) => {
    try {
      const res = await fetch(`/api/weeks/${weekId}`);
      if (res.ok) {
        const weekDetail = await res.json();
        setCurrentWeek(weekDetail);
      } else {
        setErrorStatus(`Failed to pull records for week ${weekId}`);
      }
    } catch (err) {
      console.error(err);
      setErrorStatus("Failed to contact database");
    }
  };

  // Persist edits to target week's checklists
  const saveWeekChange = async (updatedWeek: CleaningWeek) => {
    try {
      const res = await fetch(`/api/weeks/${updatedWeek.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedWeek)
      });
      if (res.ok) {
        const result = await res.json();
        setCurrentWeek(result);
        
        // Refresh index list quietly in background
        const reloadIndex = await fetch('/api/weeks');
        if (reloadIndex.ok) {
          const indexList = await reloadIndex.json();
          setWeeksHistory(indexList);
        }
      }
    } catch (err) {
      console.error("Save failed:", err);
      setErrorStatus("Failed to sync records cleanly.");
    }
  };

  // Save changes to roommates list configuration
  const handleRoommatesSave = async (updatedNames: string[]) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roommates: updatedNames })
      });
      if (res.ok) {
        const settings = await res.json();
        setRoommates(settings.roommates);
        
        // Also update the active week's roommate listing snapshot if nothing is modified yet
        if (currentWeek) {
          const tasksCleanedByOthers = currentWeek.tasks.some(t => t.completed && t.cleanedBy !== "");
          if (!tasksCleanedByOthers) {
            const freshWeek = { ...currentWeek, roommates: settings.roommates };
            await saveWeekChange(freshWeek);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setErrorStatus("Failed to save updated roommate list");
    }
  };

  // Toggle checklist complete & toggle clean assignee in a single dynamic click
  const handleToggleTask = async (taskId: string, roommateName: string) => {
    if (!currentWeek) return;
    setSavingTask(taskId);
    
    const updatedTasks = currentWeek.tasks.map((task) => {
      if (task.id === taskId) {
        const isCurrentAssignee = task.cleanedBy === roommateName;
        if (isCurrentAssignee && task.completed) {
          // If clicked the active assignee pill again, then reset the task status
          return { ...task, completed: false, cleanedBy: "" };
        } else {
          // Complete the task and assign/switch to the clicked roommate
          return { ...task, completed: true, cleanedBy: roommateName };
        }
      }
      return task;
    });

    const updatedWeek = {
      ...currentWeek,
      tasks: updatedTasks
    };

    setCurrentWeek(updatedWeek); // Optimistic UI update
    await saveWeekChange(updatedWeek);
    setSavingTask(null);
  };

  // Re-sync with server
  const handleForceRefresh = async () => {
    setLoading(true);
    await fetchWeekDetails(currentWeekId);
    setLoading(false);
  };

  // Calculate high-level week metrics
  const totalTasks = currentWeek?.tasks.length || 0;
  const completedTasks = currentWeek?.tasks.filter(t => t.completed).length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Track task counts per active roommate
  const roommatePerformance: { [name: string]: number } = {};
  if (currentWeek) {
    currentWeek.roommates.forEach(name => {
      roommatePerformance[name] = 0;
    });
    currentWeek.tasks.forEach(task => {
      if (task.completed && task.cleanedBy) {
        roommatePerformance[task.cleanedBy] = (roommatePerformance[task.cleanedBy] || 0) + 1;
      }
    });
  }

  // Group tasks by category for neat grid layout
  const categories: string[] = [];
  const categorizedTasks: { [category: string]: Task[] } = {};
  
  if (currentWeek) {
    currentWeek.tasks.forEach((task) => {
      if (!categorizedTasks[task.category]) {
        categorizedTasks[task.category] = [];
        categories.push(task.category);
      }
      categorizedTasks[task.category].push(task);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans antialiased">
      {/* Header Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5 shadow-inner" />
            </div>
            <div>
              <h1 id="app-title" className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                Our Room Cleaning Tracker
              </h1>
              <span className="text-xs text-slate-500 font-medium">
                Keep the shared home shining • 4 Friends Shared Tool
              </span>
            </div>
          </div>

          {/* Settings button trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceRefresh}
              className="p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition-colors"
              title="Refresh lives data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <RoommatesSettings roommates={roommates} onSave={handleRoommatesSave} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        
        {errorStatus && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Synchronization Notice</p>
              <p className="text-xs mt-0.5 opacity-90">{errorStatus}</p>
            </div>
          </div>
        )}

        {/* Dashboard Grid Row */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline & Navigator Tracker */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Tracking Timeline</span>
              </div>
              
              <div className="flex items-center justify-between gap-1 border border-slate-100 p-1.5 rounded-lg bg-slate-50/50">
                <button
                  onClick={() => setCurrentWeekId(shiftWeekId(currentWeekId, -1))}
                  className="p-2 hover:bg-white hover:shadow-xs text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="text-center">
                  <span className="block text-sm font-bold text-slate-800 font-mono">
                    {currentWeekId}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                    {currentWeek ? formatFriendlyDateRange(currentWeek.startDate, currentWeek.endDate) : 'Loading dates...'}
                  </span>
                </div>

                <button
                  onClick={() => setCurrentWeekId(shiftWeekId(currentWeekId, 1))}
                  className="p-2 hover:bg-white hover:shadow-xs text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
                  title="Next Week"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Jump to Tracked Week</label>
              <select
                value={currentWeekId}
                onChange={(e) => setCurrentWeekId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:outline-emerald-500 font-mono"
              >
                <option value={getISOWeekId(new Date())}>Current Week ({formatFriendlyDateRange(getISOWeekId(new Date()), getISOWeekId(new Date())) || getISOWeekId(new Date())})</option>
                {weeksHistory.length > 0 ? (
                  weeksHistory.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.id} ({formatFriendlyDateRange(w.startDate, w.endDate)})
                    </option>
                  ))
                ) : (
                  <option value={currentWeekId}>{currentWeekId}</option>
                )}
              </select>
            </div>
          </div>

          {/* Performance Circle Progress bar Gauge */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-2 text-center sm:text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Weekly Progress</span>
              <h3 className="text-2xl font-black text-slate-900 font-mono">
                {completionPercentage}% Done
              </h3>
              <p className="text-xs text-slate-500 max-w-xs">
                {completedTasks} out of {totalTasks} chores are completed for this schedule. Stay on top of it!
              </p>
            </div>

            {/* Concentric Circle Progress Indicator */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full rotate-270 transform">
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  className="text-slate-100"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  className="text-emerald-500 transition-all duration-500 ease-in-out"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - completionPercentage / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-lg font-black text-slate-800 font-mono leading-none">
                  {completedTasks}
                </span>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider mt-1 uppercase">
                  OF {totalTasks}
                </span>
              </div>
            </div>
          </div>

          {/* Roommates stats Leaderboard */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">Roommate Stats This Week</span>
            
            <div className="space-y-2.5 max-h-36 overflow-y-auto">
              {currentWeek?.roommates.map((name) => {
                const count = roommatePerformance[name] || 0;
                return (
                  <div key={name} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />
                      <span className="text-sm font-semibold text-slate-700">{name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold font-mono px-2 py-0.5 rounded-full">
                        {count} chores done
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Action instruction guide banner */}
        <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-xl p-4 flex gap-3.5 items-start">
          <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed md:max-w-4xl">
            <strong className="text-slate-800 font-semibold block mb-0.5">Quick instruction on updating tasks:</strong>
            To check off any household chore, simply click the pill button corresponding to your name inside that row. 
            This dynamically marks that individual task as <strong className="text-indigo-600">Completed</strong> by you. If you click your name pill again, it resets the chore to pending.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Syncing checklist from database...</p>
          </div>
        ) : (
          <>
            {/* Chores Grid Categorized */}
            <section className="space-y-4">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                🏠 Categorized Cleaning Checklists
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((category) => {
                  const tasksList = categorizedTasks[category];
                  const completedCount = tasksList.filter(t => t.completed).length;
                  const totalCount = tasksList.length;
                  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                  return (
                    <div 
                      key={category} 
                      className={`border rounded-xl shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-sm ${getCategoryColorStyle(category)}`}
                    >
                      {/* Category Header */}
                      <div className="p-4 bg-white border-b border-inherit flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {getCategoryIcon(category)}
                          <h4 className="font-bold text-slate-800 text-sm md:text-base">{category}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            {completedCount}/{totalCount} Done
                          </span>
                        </div>
                      </div>

                      {/* Tasks rows checklist */}
                      <div className="p-4 space-y-3 bg-white/50 backdrop-blur-xs flex-1">
                        {tasksList.map((task) => {
                          const isActiveLoading = savingTask === task.id;

                          return (
                            <div 
                              key={task.id} 
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all ${
                                task.completed 
                                  ? 'bg-emerald-50/30 border-emerald-100/70' 
                                  : 'bg-white border-slate-200/60'
                              }`}
                            >
                              {/* Task Details Info */}
                              <div className="flex items-start gap-2.5">
                                <div className="mt-0.5 shrink-0">
                                  {task.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <p className={`text-sm font-semibold text-slate-800 leading-tight ${task.completed ? 'line-through text-slate-400' : ''}`}>
                                    {task.name}
                                  </p>
                                  {task.optional && (
                                    <span className="inline-block mt-0.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">
                                      Optional
                                    </span>
                                  )}
                                  {task.completed && task.cleanedBy && (
                                    <p className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                                      <span>✓ Cleaned by:</span>
                                      <span className="underline">{task.cleanedBy}</span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Frictionless Roommate Quick Selector array */}
                              <div className="shrink-0 flex items-center flex-wrap gap-1.5 self-end sm:self-center">
                                {getRoommatesForTask(task, currentWeek?.roommates || roommates).map((name) => {
                                  const isAssignee = task.cleanedBy === name;
                                  return (
                                    <button
                                      key={name}
                                      onClick={() => handleToggleTask(task.id, name)}
                                      disabled={isActiveLoading}
                                      className={`px-2 py-1 text-xs rounded-md border font-medium cursor-pointer transition-all ${
                                        isAssignee && task.completed
                                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm font-bold scale-102'
                                          : 'bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200'
                                      }`}
                                      title={isAssignee ? `Click to un-assign ${name}` : `Click to mark done by ${name}`}
                                    >
                                      {name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Dynamic Monthly Accountability Summary card deck */}
            <section className="mt-8 border-t border-slate-200/60 pt-8">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                📊 Monthly Accountability Summaries
              </h3>

              {weeksHistory.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-xs">
                  No monthly summaries recorded yet. Start checking off chores to track monthly records!
                </div>
              ) : (() => {
                const monthNamesLabels = [
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"
                ];

                const monthsData: {
                  [monthKey: string]: {
                    monthName: string;
                    year: string;
                    totalTasks: number;
                    completedTasks: number;
                    perf: { [name: string]: number };
                    weeksCount: number;
                  }
                } = {};

                weeksHistory.forEach((w) => {
                  if (!w.startDate) return;
                  const parts = w.startDate.split('-');
                  if (parts.length < 2) return;
                  const year = parts[0];
                  const monthIdx = parseInt(parts[1], 10) - 1;
                  if (monthIdx < 0 || monthIdx >= 12) return;
                  
                  const monthName = monthNamesLabels[monthIdx];
                  const key = `${monthName} ${year}`;

                  if (!monthsData[key]) {
                    monthsData[key] = {
                      monthName,
                      year,
                      totalTasks: 0,
                      completedTasks: 0,
                      perf: {},
                      weeksCount: 0
                    };
                  }

                  const m = monthsData[key];
                  m.weeksCount += 1;
                  m.totalTasks += w.totalCount || 0;
                  m.completedTasks += w.completedCount || 0;

                  if (w.performance) {
                    Object.keys(w.performance).forEach((name) => {
                      m.perf[name] = (m.perf[name] || 0) + (w.performance[name] || 0);
                    });
                  }
                });

                const sortedKeys = Object.keys(monthsData).sort((a, b) => {
                  const [aMonth, aYear] = a.split(' ');
                  const [bMonth, bYear] = b.split(' ');
                  if (aYear !== bYear) return parseInt(bYear, 10) - parseInt(aYear, 10);
                  return monthNamesLabels.indexOf(bMonth) - monthNamesLabels.indexOf(aMonth);
                });

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sortedKeys.map((key) => {
                      const m = monthsData[key];
                      const percent = m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0;
                      
                      const ranking = Object.entries(m.perf)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count);

                      const maxCleaned = ranking.length > 0 ? ranking[0].count : 0;

                      return (
                        <div key={key} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-black text-slate-900 text-sm md:text-base">{m.monthName} {m.year}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  Aggregated from {m.weeksCount} {m.weeksCount === 1 ? 'recorded week' : 'recorded weeks'}
                                </p>
                              </div>
                              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/70 px-2 py-0.5 rounded-md">
                                {percent}% Done
                              </span>
                            </div>

                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
                              <div 
                                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                Roommate Standings
                              </span>
                              
                              {ranking.length === 0 ? (
                                <p className="text-slate-400 text-xs italic">No activity logged.</p>
                              ) : (
                                ranking.map((r, idx) => {
                                  const isMVP = maxCleaned > 0 && r.count === maxCleaned;
                                  return (
                                    <div 
                                      key={r.name} 
                                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                                        isMVP 
                                          ? 'bg-amber-50/40 border-amber-200/40' 
                                          : 'bg-slate-50 border-slate-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[10px] text-slate-400 font-bold">
                                          #{idx + 1}
                                        </span>
                                        <span className={`text-xs font-semibold ${isMVP ? 'text-amber-900 font-bold' : 'text-slate-700'}`}>
                                          {r.name}
                                        </span>
                                        {isMVP && (
                                          <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200/50 px-1.5 py-0.2 rounded font-black uppercase tracking-wide">
                                            👑 MVP
                                          </span>
                                        )}
                                      </div>
                                      <span className={`text-[11px] font-bold font-mono ${isMVP ? 'text-amber-700' : 'text-slate-600'}`}>
                                        {r.count} tasks
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <span>TOTAL COMMITTED</span>
                            <span className="text-[11px] font-bold text-slate-700 font-mono">
                              {m.completedTasks} / {m.totalTasks} Chores
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>

            {/* Live WhatsApp Status Reporting */}
            {currentWeek && (
              <section className="mt-8">
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                  📲 Roommates WhatsApp Dispatcher
                </h3>
                <WhatsAppShare currentWeek={currentWeek} />
              </section>
            )}
          </>
        )}
      </main>

      {/* Aesthetic Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            🧹 Single Screen House Cleaning Tracker
          </p>
          <p className="text-xs text-slate-400 font-medium">
            Crafted for Gokul & Friends with Node Express persistent cache database.
          </p>
        </div>
      </footer>
    </div>
  );
}
