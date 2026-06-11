/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  category: string;
  name: string;
  completed: boolean;
  cleanedBy: string; // The roommate name who cleaned it
  optional?: boolean;
}

export interface CleaningWeek {
  id: string; // YYYY-WW, e.g., 2026-W24
  startDate: string; // e.g., '2026-06-08'
  endDate: string; // e.g., '2026-06-14'
  roommates: string[]; // Snapshot of roommate names for this week
  tasks: Task[];
  updatedAt: string; // ISO datetime string
}

export interface AppSettings {
  roommates: string[];
}

export interface DatabaseState {
  settings: AppSettings;
  weeks: { [weekId: string]: CleaningWeek };
}
