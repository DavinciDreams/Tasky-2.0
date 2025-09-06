/**
 * Pomodoro Timer Task Types
 * 
 * Separate task system specifically for Pomodoro Timer workflow
 */

export interface PomodoroTask {
  id: string;
  name: string;
  estimatedPomodoros: number; // How many 25-min sessions estimated
  completedPomodoros: number; // How many sessions actually completed
  workDuration: number; // Work session duration in minutes
  shortBreakDuration: number; // Short break duration in minutes
  longBreakDuration: number; // Long break duration in minutes
  order: number; // Task order/priority (lower numbers = higher priority)
  isActive: boolean; // Currently selected for work
  isCompleted: boolean; // Task finished
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface PomodoroTaskStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalEstimatedPomodoros: number;
  totalCompletedPomodoros: number;
  todayCompletedPomodoros: number;
}

export interface CreatePomodoroTaskData {
  name: string;
  estimatedPomodoros: number;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
}

export interface UpdatePomodoroTaskData {
  name?: string;
  estimatedPomodoros?: number;
  workDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  completedPomodoros?: number;
  isActive?: boolean;
  isCompleted?: boolean;
}
