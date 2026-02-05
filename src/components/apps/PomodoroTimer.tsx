import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, RefreshCw, ListTodo } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Modal } from '../ui/modal';
import { PomodoroTaskList } from './PomodoroTaskList';
import { PomodoroTask } from '../../types/pomodoro';

interface PomodoroTimerProps {
  // Optional props for future extensibility
  onSessionComplete?: (sessionType: 'work' | 'shortBreak' | 'longBreak') => void;
  onTimerStart?: () => void;
  onTimerPause?: () => void;
  onTimerReset?: () => void;
}

type SessionType = 'work' | 'shortBreak' | 'longBreak';

interface TimerState {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  sessionType: SessionType;
  sessionCount: number; // Number of completed work sessions
  cycleCount: number; // Current position in 4-session cycle (0-3)
}



const SESSION_COLORS = {
  work: 'hsl(var(--warning))', // Use warning theme color for work sessions
  shortBreak: 'hsl(var(--accent))', // Use accent theme color  
  longBreak: 'hsl(var(--success))', // Use success theme color
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  onSessionComplete,
  onTimerStart,
  onTimerPause,
  onTimerReset,
}) => {
  const [showTasks, setShowTasks] = useState(false);
  const [activeTask, setActiveTask] = useState<PomodoroTask | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({
    minutes: 25,
    seconds: 0,
    isRunning: false,
    sessionType: 'work',
    sessionCount: 0,
    cycleCount: 0,
  });


  // Load initial state from background service
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const state = await window.electronAPI?.pomodoroGetState();
        if (state) {
          setTimerState({
            minutes: state.minutes,
            seconds: state.seconds,
            isRunning: state.isRunning,
            sessionType: state.sessionType,
            sessionCount: state.sessionCount,
            cycleCount: state.cycleCount,
          });

        }

        // Load active task
        const task = await window.electronAPI?.pomodoroGetActiveTask();
        if (task) {
          setActiveTask(task);
        }
      } catch (error) {
        console.warn('Failed to load pomodoro state:', error);
      }
    };

    loadInitialState();
  }, []);

  // Set up event listeners for background timer updates
  useEffect(() => {
    const handleTick = (event: any, state: any) => {
      setTimerState({
        minutes: state.minutes,
        seconds: state.seconds,
        isRunning: state.isRunning,
        sessionType: state.sessionType,
        sessionCount: state.sessionCount,
        cycleCount: state.cycleCount,
      });
    };

    const handleSessionComplete = (event: any, data: any) => {
      onSessionComplete?.(data.completedType);
      // Update active task if provided
      if (data.activeTask) {
        setActiveTask(data.activeTask);
      }
      // State will be updated via tick event
      
      // Check if we should auto-select next task after work session
      if (data.completedType === 'work') {
        setTimeout(() => checkForNextTask(), 1000); // Small delay to let state update
      }
    };

    const handleStarted = (_event: any, _state: any) => {
      setTimerState(prev => ({ ...prev, isRunning: true }));
      onTimerStart?.();
    };

    const handlePaused = (_event: any, _state: any) => {
      setTimerState(prev => ({ ...prev, isRunning: false }));
      onTimerPause?.();
    };

    const handleReset = (event: any, state: any) => {
      setTimerState({
        minutes: state.minutes,
        seconds: state.seconds,
        isRunning: state.isRunning,
        sessionType: state.sessionType,
        sessionCount: state.sessionCount,
        cycleCount: state.cycleCount,
      });
      onTimerReset?.();
    };

    // Set up event listeners
    if (window.electronAPI) {
      window.electronAPI.onPomodoroTick(handleTick);
      window.electronAPI.onPomodoroSessionComplete(handleSessionComplete);
      window.electronAPI.onPomodoroStarted(handleStarted);
      window.electronAPI.onPomodoroPaused(handlePaused);
      window.electronAPI.onPomodoroReset(handleReset);
      window.electronAPI.onPomodoroResetAll(handleReset);

    }

    // Cleanup function
    return () => {
      // Note: We can't easily remove specific listeners with the current API
      // This is acceptable since the component lifecycle matches the app lifecycle
    };
  }, [onSessionComplete, onTimerStart, onTimerPause, onTimerReset]);

  // Calculate progress percentage
  const getProgress = useCallback(() => {
    const totalSeconds = (() => {
      // Use active task timing if available, otherwise use defaults
      const workDuration = activeTask?.workDuration || 25;
      const shortBreakDuration = activeTask?.shortBreakDuration || 5;
      const longBreakDuration = activeTask?.longBreakDuration || 30;
      
      switch (timerState.sessionType) {
        case 'work':
          return workDuration * 60;
        case 'shortBreak':
          return shortBreakDuration * 60;
        case 'longBreak':
          return longBreakDuration * 60;
        default:
          return workDuration * 60;
      }
    })();
    const currentSeconds = timerState.minutes * 60 + timerState.seconds;
    return ((totalSeconds - currentSeconds) / totalSeconds) * 100;
  }, [timerState.sessionType, timerState.minutes, timerState.seconds, activeTask]);

  // Control functions - now use background service
  const startTimer = useCallback(async () => {
    try {
      await window.electronAPI?.pomodoroStart();
    } catch (error) {
      console.warn('Failed to start timer:', error);
    }
  }, []);

  const pauseTimer = useCallback(async () => {
    try {
      await window.electronAPI?.pomodoroPause();
    } catch (error) {
      console.warn('Failed to pause timer:', error);
    }
  }, []);

  const resetCurrentSession = useCallback(async () => {
    try {
      await window.electronAPI?.pomodoroResetCurrent();
    } catch (error) {
      console.warn('Failed to reset current session:', error);
    }
  }, []);

  const resetAllSessions = useCallback(async () => {
    try {
      await window.electronAPI?.pomodoroResetAll();
    } catch (error) {
      console.warn('Failed to reset all sessions:', error);
    }
  }, []);

  // Handle settings changes


  // Handle task selection
  const handleTaskSelect = useCallback((task: PomodoroTask) => {
    setActiveTask(task);
    setShowTasks(false);
  }, []);

  // Auto-select next task when current task is completed
  const checkForNextTask = useCallback(async () => {
    try {
      const nextTask = await window.electronAPI?.pomodoroGetNextTask();
      if (nextTask && (!activeTask || activeTask.isCompleted)) {
        await window.electronAPI?.pomodoroSetActiveTask(nextTask.id);
        setActiveTask(nextTask);
      }
    } catch (error) {
      console.warn('Failed to get next task:', error);
    }
  }, [activeTask]);

  // Format time display
  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };



  // Check if almost done (final minute)
  const isAlmostDone = (timerState.minutes * 60 + timerState.seconds) <= 60 && (timerState.minutes * 60 + timerState.seconds) > 0;

  // Calculate stroke dasharray for progress ring
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (getProgress() / 100) * circumference;

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 bg-card border-border shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-4 h-full flex flex-col min-h-0">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-card-foreground mb-1">
              Pomodoro Timer
            </h1>
            
            {/* Active Task Display */}
            {activeTask && (
              <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-xs font-medium text-primary">Working on:</div>
                <div className="font-semibold text-sm">{activeTask.name}</div>
                <div className="text-xs text-muted-foreground">
                  {activeTask.completedPomodoros}/{activeTask.estimatedPomodoros} pomodoros
                </div>
              </div>
            )}
          </div>

          {/* Main Timer Display */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative mb-6">
              {/* Progress Ring */}
              <svg
                className="transform -rotate-90 transition-all duration-1000 ease-in-out"
                width="200"
                height="200"
                viewBox="0 0 200 200"
              >
                {/* Background Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted-foreground/20"
                />
                {/* Progress Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke={SESSION_COLORS[timerState.sessionType]}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-in-out"
                  style={{
                    filter: `drop-shadow(0 0 6px ${SESSION_COLORS[timerState.sessionType]}40)`
                  }}
                />
              </svg>

              {/* Timer Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Time Display */}
                <div className="text-4xl font-mono font-bold text-foreground tracking-wider">
                  {formatTime(timerState.minutes, timerState.seconds)}
                </div>

                {/* Almost Done Indicator */}
                {isAlmostDone && (
                  <div className="text-xs font-medium text-amber-500 animate-pulse mt-2">
                    Almost done!
                  </div>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                onClick={resetCurrentSession}
                variant="outline"
                className="w-12 h-12 rounded-full border-2 hover:bg-muted transition-all duration-300 hover:scale-105"
                title="Reset Current Session"
              >
                <RotateCcw size={18} />
              </Button>

              <Button
                onClick={timerState.isRunning ? pauseTimer : startTimer}
                className="w-16 h-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 font-bold"
                style={{
                  backgroundColor: `hsl(var(--button))`,
                  color: `hsl(var(--button-foreground))`,
                  border: `3px solid hsl(var(--button))`,
                }}
              >
                {timerState.isRunning ? (
                  <Pause size={24} />
                ) : (
                  <Play size={24} className="ml-1" />
                )}
              </Button>

              <Button
                onClick={resetAllSessions}
                variant="outline"
                className="w-12 h-12 rounded-full border-2 hover:bg-muted transition-all duration-300 hover:scale-105"
                title="Reset All Progress"
              >
                <RefreshCw size={18} />
              </Button>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="space-y-4 pb-2">
            {/* Progress Tracking */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index <= timerState.cycleCount
                        ? 'bg-primary shadow-lg'
                        : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                Cycle Progress: {timerState.cycleCount + 1}/4
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => setShowTasks(true)}
                variant="outline"
                className="px-4 py-2 text-sm rounded-lg"
              >
                <ListTodo size={14} className="mr-2" />
                Manage Tasks
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Tasks Modal */}
      <Modal open={showTasks} onClose={() => setShowTasks(false)} title="Pomodoro Tasks" maxWidth={600} fullHeight={true}>
        <PomodoroTaskList 
          onTaskSelect={handleTaskSelect}
          activeTask={activeTask}
        />
      </Modal>
    </div>
  );
};

