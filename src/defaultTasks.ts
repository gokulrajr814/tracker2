/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from './types';

export const DEFAULT_TASKS_TEMPLATE: Omit<Task, 'completed' | 'cleanedBy'>[] = [
  // Hall Category
  { id: 'hall_floor_sweep', category: 'Hall', name: 'Floor sweep' },
  { id: 'hall_shoe_rack', category: 'Hall', name: 'Shoe rack' },
  { id: 'hall_sink', category: 'Hall', name: 'Sink' },
  { id: 'hall_table_cleaning', category: 'Hall', name: 'Table cleaning after food' },
  { id: 'hall_ceiling_corners', category: 'Hall', name: 'Ceiling and corners' },

  // Kitchen Category
  { id: 'kitchen_floor_cleaning', category: 'Kitchen', name: 'Floor cleaning' },
  { id: 'kitchen_counter_top', category: 'Kitchen', name: 'Counter top' },
  { id: 'kitchen_fridge', category: 'Kitchen', name: 'Fridge' },
  { id: 'kitchen_trash_outside', category: 'Kitchen', name: 'Trash taking to outside' },

  // Sitout Category
  { id: 'sitout_overall_cleaning', category: 'Sitout', name: 'Overall cleaning/sweeping' },
  { id: 'sitout_arrange_shoes', category: 'Sitout', name: 'Arranging shoes' },
  { id: 'sitout_clean_railing', category: 'Sitout', name: 'Cleaning useless things out of the railing' },

  // Room Specific Room1 Category
  { id: 'room1_floor', category: 'Amal/Gokul', name: 'Floor' },
  { id: 'room1_windows', category: 'Amal/Gokul', name: 'Windows' },

  // Bathroom 1 Category
  { id: 'bathroom1_floor', category: 'Bathroom 1', name: 'Floor' },
  { id: 'bathroom1_closet', category: 'Bathroom 1', name: 'Closet' },
  { id: 'bathroom1_sink', category: 'Bathroom 1', name: 'Sink' },
  { id: 'bathroom1_walls', category: 'Bathroom 1', name: 'Walls', optional: true },

  // Room Specific Room2 Category
  { id: 'room2_floor', category: 'Abhiram/Nithin', name: 'Floor' },
  { id: 'room2_windows', category: 'Abhiram/Nithin', name: 'Windows' },

  // Bathroom 2 Category
  { id: 'bathroom2_floor', category: 'Bathroom 2', name: 'Floor' },
  { id: 'bathroom2_closet', category: 'Bathroom 2', name: 'Closet' },
  { id: 'bathroom2_sink', category: 'Bathroom 2', name: 'Sink' },
  { id: 'bathroom2_walls', category: 'Bathroom 2', name: 'Walls', optional: true }
];
