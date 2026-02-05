/**
 * PomodoroService - Background timer service for Pomodoro Timer
 * 
 * Manages timer state persistence and background execution.
 * Continues running even when the app is closed to tray.
 */

import { Storage, PomodoroState } from './storage';
import { notificationUtility } from './notification-utility';
import logger from '../lib/logger';

type SessionType = 'work' | 'shortBreak' | 'longBreak';

// Simple event emitter implementation for Electron
class SimpleEventEmitter {
  private listeners: { [event: string]: ((...args: unknown[]) => void)[] } = {};

  on(event: string, listener: (...args: unknown[]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          logger.error('Event listener error:', error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

export class PomodoroService extends SimpleEventEmitter {
  private storage: Storage;
  private interval: NodeJS.Timeout | null = null;
  private state: PomodoroState;

  constructor(storage: Storage) {
    super();
    this.storage = storage;
    this.state = this.storage.getPomodoroState();
    
    // Resume timer if it was running when app was closed
    this.resumeTimerIfNeeded();
  }

  private resumeTimerIfNeeded(): void {
    if (this.state.isRunning && this.state.startTime) {
      const now = Date.now();
      const elapsed = Math.floor((now - this.state.startTime) / 1000);
      const totalDuration = this.getTotalSeconds(this.state.sessionType);
      
      if (elapsed >= totalDuration) {
        // Session should have completed while app was closed
        this.completeSession();
      } else {
        // Resume the timer
        this.startInterval();
        logger.info(`Resumed Pomodoro timer: ${this.state.sessionType} session`);
      }
    }
  }

  private getTotalSeconds(sessionType: SessionType): number {
    // Get timing from active task if available, otherwise use defaults
    const activeTask = this.storage.getActivePomodoroTask();
    
    if (activeTask) {
      switch (sessionType) {
        case 'work':
          return activeTask.workDuration * 60;
        case 'shortBreak':
          return activeTask.shortBreakDuration * 60;
        case 'longBreak':
          return activeTask.longBreakDuration * 60;
        default:
          return activeTask.workDuration * 60;
      }
    }
    
    // Fallback to defaults if no active task
    switch (sessionType) {
      case 'work':
        return 25 * 60;
      case 'shortBreak':
        return 5 * 60;
      case 'longBreak':
        return 30 * 60;
      default:
        return 25 * 60;
    }
  }

  private getCurrentSeconds(): number {
    if (!this.state.isRunning) {
      return this.state.pausedTime || this.getTotalSeconds(this.state.sessionType);
    }

    if (!this.state.startTime) {
      return this.getTotalSeconds(this.state.sessionType);
    }

    const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
    const totalDuration = this.getTotalSeconds(this.state.sessionType);
    return Math.max(0, totalDuration - elapsed);
  }

  private startInterval(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      const remainingSeconds = this.getCurrentSeconds();
      
      if (remainingSeconds <= 0) {
        this.completeSession();
      } else {
        // Emit current state for UI updates
        this.emit('tick', this.getTimerDisplay());
      }
    }, 1000);
  }

  private completeSession(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    const completedSessionType = this.state.sessionType;
    
    // If completing a work session, increment active task progress
    if (completedSessionType === 'work') {
      const activeTask = this.storage.getActivePomodoroTask();
      if (activeTask) {
        this.storage.incrementPomodoroTaskProgress(activeTask.id);
        logger.info(`Incremented pomodoro progress for task: ${activeTask.name}`);
      }
    }
    
    // Show notification
    this.showSessionCompleteNotification(completedSessionType);
    
    // Update session counts and determine next session
    const nextSession = this.getNextSession();
    
    // Update state
    this.state = {
      ...this.state,
      isRunning: false,
      sessionType: nextSession.type,
      sessionCount: nextSession.sessionCount,
      cycleCount: nextSession.cycleCount,
      startTime: undefined,
      pausedTime: undefined
    };

    // Persist state
    this.storage.setPomodoroState(this.state);
    
    // Emit completion event
    this.emit('sessionComplete', {
      completedType: completedSessionType,
      nextType: nextSession.type,
      state: this.getTimerDisplay(),
      activeTask: this.storage.getActivePomodoroTask()
    });

    logger.info(`Pomodoro session completed: ${completedSessionType} -> ${nextSession.type} (Session: ${nextSession.sessionCount}, Cycle: ${nextSession.cycleCount}/4)`);
  }

  private getNextSession(): { type: SessionType; sessionCount: number; cycleCount: number } {
    if (this.state.sessionType === 'work') {
      // Completed a work session
      const newSessionCount = this.state.sessionCount + 1;
      const currentCycle = this.state.cycleCount;
      
      // After 4th work session (cycle 3), take long break and reset cycle
      // Otherwise take short break and increment cycle
      if (currentCycle >= 3) {
        return {
          type: 'longBreak',
          sessionCount: newSessionCount,
          cycleCount: 0 // Reset cycle after long break
        };
      } else {
        return {
          type: 'shortBreak',
          sessionCount: newSessionCount,
          cycleCount: currentCycle + 1
        };
      }
    } else {
      // Completed a break, start work session
      // Keep the same cycle count (it was already updated when we entered the break)
      return {
        type: 'work',
        sessionCount: this.state.sessionCount,
        cycleCount: this.state.cycleCount
      };
    }
  }

  private showSessionCompleteNotification(sessionType: SessionType): void {
    const messages = {
      work: 'Work session complete! Time for a break.',
      shortBreak: 'Break time over! Ready for another work session?',
      longBreak: 'Long break complete! Great job on completing 4 pomodoros!'
    };

    try {
      // Use Tasky's notification system
      notificationUtility.showNotification({
        title: 'Pomodoro Timer',
        body: messages[sessionType],
        type: 'info'
      });

      // Also trigger assistant message if available
      this.emit('assistantMessage', messages[sessionType]);
      
      logger.info(`Pomodoro notification sent: ${messages[sessionType]}`);
    } catch (error) {
      logger.warn('Failed to show pomodoro notification:', error);
    }
  }

  // Public API methods
  startTimer(): boolean {
    try {
      if (this.state.isRunning) {
        return false; // Already running
      }

      this.state.isRunning = true;
      this.state.startTime = Date.now();
      
      // If resuming from pause, adjust start time
      if (this.state.pausedTime) {
        const totalDuration = this.getTotalSeconds(this.state.sessionType);
        const elapsedBeforePause = totalDuration - this.state.pausedTime;
        this.state.startTime = Date.now() - (elapsedBeforePause * 1000);
        this.state.pausedTime = undefined;
      }

      this.storage.setPomodoroState(this.state);
      this.startInterval();
      
      this.emit('started', this.getTimerDisplay());
      logger.info(`Pomodoro timer started: ${this.state.sessionType} session`);
      return true;
    } catch (error) {
      logger.error('Failed to start pomodoro timer:', error);
      return false;
    }
  }

  pauseTimer(): boolean {
    try {
      if (!this.state.isRunning) {
        return false; // Not running
      }

      this.state.isRunning = false;
      this.state.pausedTime = this.getCurrentSeconds();
      this.state.startTime = undefined;

      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }

      this.storage.setPomodoroState(this.state);
      
      this.emit('paused', this.getTimerDisplay());
      logger.info(`Pomodoro timer paused: ${this.state.sessionType} session`);
      return true;
    } catch (error) {
      logger.error('Failed to pause pomodoro timer:', error);
      return false;
    }
  }

  resetCurrentSession(): boolean {
    try {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }

      this.state.isRunning = false;
      this.state.startTime = undefined;
      this.state.pausedTime = undefined;

      this.storage.setPomodoroState(this.state);
      
      this.emit('reset', this.getTimerDisplay());
      logger.info(`Pomodoro timer reset: ${this.state.sessionType} session`);
      return true;
    } catch (error) {
      logger.error('Failed to reset pomodoro timer:', error);
      return false;
    }
  }

  resetAllSessions(): boolean {
    try {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }

      this.state = {
        ...this.state,
        isRunning: false,
        sessionType: 'work',
        sessionCount: 0,
        cycleCount: 0,
        startTime: undefined,
        pausedTime: undefined
      };

      this.storage.setPomodoroState(this.state);
      
      this.emit('resetAll', this.getTimerDisplay());
      logger.info('Pomodoro timer reset all sessions');
      return true;
    } catch (error) {
      logger.error('Failed to reset all pomodoro sessions:', error);
      return false;
    }
  }

  stopTimerForDeletedTask(taskId: string): boolean {
    try {
      const activeTask = this.storage.getActivePomodoroTask();
      
      // If the deleted task was the active task, stop the timer
      if (activeTask && activeTask.id === taskId) {
        this.pauseTimer();
        this.storage.setActivePomodoroTask(null);
        logger.info(`Stopped timer for deleted task: ${taskId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to stop timer for deleted task:', error);
      return false;
    }
  }



  getTimerDisplay(): {
    minutes: number;
    seconds: number;
    isRunning: boolean;
    sessionType: SessionType;
    sessionCount: number;
    cycleCount: number;
  } {
    const remainingSeconds = this.getCurrentSeconds();
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return {
      minutes,
      seconds,
      isRunning: this.state.isRunning,
      sessionType: this.state.sessionType,
      sessionCount: this.state.sessionCount,
      cycleCount: this.state.cycleCount
    };
  }

  destroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.removeAllListeners();
    logger.info('Pomodoro service destroyed');
  }
}
