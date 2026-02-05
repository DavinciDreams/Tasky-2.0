import { gsap } from 'gsap';
import { TaskyGSAPAvatarRef, AvatarEmotion } from './TaskyGSAPAvatar';
import { avatarPresets } from './avatarPresets';

export class TaskyEventHandler {
  private avatar: TaskyGSAPAvatarRef;
  private currentSequence: gsap.core.Timeline | null = null;
  
  constructor(avatarInstance: TaskyGSAPAvatarRef) {
    this.avatar = avatarInstance;
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // MCP Tool Events
    window.addEventListener('tasky:tool', (event: CustomEvent) => {
      const { phase, name, args, output, error } = event.detail;
      
      switch (phase) {
        case 'start':
          this.handleToolStart(name, args);
          break;
        case 'done':
          this.handleToolSuccess(name, args, output);
          break;
        case 'error':
          this.handleToolError(name, args, error);
          break;
      }
    });
    
    // Task Events
    window.addEventListener('task:created', (event: CustomEvent) => {
      this.playSequence('taskCreated', event.detail);
    });
    
    window.addEventListener('task:completed', (event: CustomEvent) => {
      this.playSequence('taskCompleted', event.detail);
    });
    
    window.addEventListener('task:updated', (event: CustomEvent) => {
      this.playSequence('taskUpdated', event.detail);
    });
    
    window.addEventListener('task:deleted', (event: CustomEvent) => {
      this.playSequence('taskDeleted', event.detail);
    });
    
    window.addEventListener('task:overdue', (event: CustomEvent) => {
      this.playSequence('taskOverdue', event.detail);
    });
    
    // Reminder Events
    window.addEventListener('reminder:triggered', (event: CustomEvent) => {
      this.playSequence('reminderTriggered', event.detail);
    });
    
    window.addEventListener('reminder:created', (event: CustomEvent) => {
      this.playSequence('reminderCreated', event.detail);
    });
    
    window.addEventListener('reminder:snoozed', (_event: CustomEvent) => {
      this.avatar.setEmotion('sleeping');
      setTimeout(() => this.avatar.setEmotion('idle'), 3000);
    });
    
    // Voice Events
    window.addEventListener('voice:listening', () => {
      this.avatar.setEmotion('listening');
    });
    
    window.addEventListener('voice:processing', () => {
      this.avatar.setEmotion('thinking');
    });
    
    window.addEventListener('voice:speaking', (event: CustomEvent) => {
      this.avatar.setEmotion('speaking');
      this.avatar.setAudioLevel(event.detail.audioLevel || 0);
    });
    
    window.addEventListener('voice:idle', () => {
      this.avatar.setEmotion('idle');
    });
    
    // Notification Events
    window.addEventListener('notification:show', (event: CustomEvent) => {
      this.handleNotification(event.detail);
    });

    // App lifecycle events
    window.addEventListener('app:startup', () => {
      this.playSequence('appStartup');
    });
  }
  
  private handleToolStart(toolName: string, _args: any) {
    const toolMappings: Record<string, AvatarEmotion> = {
      'tasky_create_task': 'focused',
      'tasky_update_task': 'focused', 
      'tasky_execute_task': 'thinking',
      'tasky_create_reminder': 'focused',
      'tasky_list_tasks': 'thinking',
      'tasky_list_reminders': 'thinking',
      'tasky_delete_task': 'focused',
      'tasky_delete_reminder': 'focused'
    };
    
    const emotion = toolMappings[toolName] || 'thinking';
    this.avatar.setEmotion(emotion);
  }
  
  private handleToolSuccess(toolName: string, args: any, _output: string) {
    const successMappings: Record<string, () => void> = {
      'tasky_create_task': () => this.playSequence('taskCreated', args),
      'tasky_update_task': () => this.playSequence('taskUpdated', args),
      'tasky_delete_task': () => this.playSequence('taskDeleted', args),
      'tasky_execute_task': () => this.playSequence('taskExecuted', args),
      'tasky_create_reminder': () => this.playSequence('reminderCreated', args),
      'tasky_list_tasks': () => {
        this.avatar.setEmotion('happy');
        setTimeout(() => this.avatar.setEmotion('idle'), 2000);
      },
      'tasky_list_reminders': () => {
        this.avatar.setEmotion('happy');
        setTimeout(() => this.avatar.setEmotion('idle'), 2000);
      }
    };
    
    const handler = successMappings[toolName];
    if (handler) {
      handler();
    } else {
      // Default success animation
      this.avatar.setEmotion('happy');
      setTimeout(() => this.avatar.setEmotion('idle'), 2000);
    }
  }
  
  private handleToolError(toolName: string, args: any, error: string) {
    this.playSequence('toolError', { toolName, error });
  }
  
  private handleNotification(notification: any) {
    const { priority } = notification;
    
    if (priority === 'urgent') {
      this.avatar.setEmotion('excited');
      setTimeout(() => this.avatar.setEmotion('idle'), 3000);
    } else if (priority === 'high') {
      this.avatar.setEmotion('focused');
      if (this.avatar.avatarRef.current) {
        avatarPresets.notify(this.avatar.avatarRef.current);
      }
      setTimeout(() => this.avatar.setEmotion('idle'), 2000);
    } else {
      this.avatar.setEmotion('focused');
      setTimeout(() => this.avatar.setEmotion('idle'), 1500);
    }
  }
  
  private async playSequence(sequenceName: string, data?: any) {
    // Kill any current sequence
    this.currentSequence?.kill();
    
    const sequences: Record<string, () => gsap.core.Timeline> = {
      taskCreated: () => this.taskCreatedSequence(data),
      taskCompleted: () => this.taskCompletedSequence(data),
      taskUpdated: () => this.taskUpdatedSequence(data),
      taskDeleted: () => this.taskDeletedSequence(data),
      taskOverdue: () => this.taskOverdueSequence(data),
      taskExecuted: () => this.taskExecutedSequence(data),
      reminderTriggered: () => this.reminderTriggeredSequence(data),
      reminderCreated: () => this.reminderCreatedSequence(data),
      toolError: () => this.toolErrorSequence(data),
      appStartup: () => this.appStartupSequence()
    };
    
    const sequence = sequences[sequenceName];
    if (sequence) {
      this.currentSequence = sequence();
    }
  }
  
  private taskCreatedSequence(_task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Excited → Happy sequence
    tl.call(() => this.avatar.setEmotion('excited'))
      .to({}, { duration: 1 }) // Wait for excited animation
      .call(() => this.avatar.setEmotion('happy'))
      .to({}, { duration: 2 }) // Wait for happy animation
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private taskCompletedSequence(_task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Celebration with confetti
    tl.call(() => this.avatar.setEmotion('happy'))
      .call(() => {
        if (this.avatar.containerRef.current && this.avatar.avatarRef.current) {
          avatarPresets.celebrate(
            this.avatar.avatarRef.current,
            this.avatar.containerRef.current
          );
        }
      })
      .to({}, { duration: 4 }) // Let celebration play
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private taskUpdatedSequence(_task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    tl.call(() => this.avatar.setEmotion('focused'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private taskDeletedSequence(_task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    tl.call(() => this.avatar.setEmotion('confused'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private taskOverdueSequence(_task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Confused → Error sequence for overdue
    tl.call(() => this.avatar.setEmotion('confused'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('error'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private taskExecutedSequence(_task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    tl.call(() => this.avatar.setEmotion('focused'))
      .to({}, { duration: 1 })
      .call(() => this.avatar.setEmotion('thinking'))
      .to({}, { duration: 3 }) // Show thinking while task executes
      .call(() => this.avatar.setEmotion('happy'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private reminderTriggeredSequence(_reminder: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Excited → Speaking for reminder
    tl.call(() => this.avatar.setEmotion('excited'))
      .to({}, { duration: 1.5 })
      .call(() => this.avatar.setEmotion('speaking'))
      .to({}, { duration: 3 }) // Time for reminder message
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private reminderCreatedSequence(_reminder: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    tl.call(() => this.avatar.setEmotion('happy'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private toolErrorSequence(_error: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Error → Confused sequence
    tl.call(() => this.avatar.setEmotion('error'))
      .call(() => {
        if (this.avatar.avatarRef.current) {
          avatarPresets.error(this.avatar.avatarRef.current);
        }
      })
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('confused'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }

  private appStartupSequence(): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Sleep → Wake up sequence
    tl.call(() => this.avatar.setEmotion('sleeping'))
      .to({}, { duration: 1 })
      .call(() => {
        if (this.avatar.avatarRef.current) {
          avatarPresets.wakeUp(this.avatar.avatarRef.current);
        }
      })
      .call(() => this.avatar.setEmotion('idle'))
      .to({}, { duration: 2 });
    
    return tl;
  }
  
  // Manual trigger methods
  public triggerCelebration() {
    this.playSequence('taskCompleted');
  }
  
  public triggerAttention() {
    if (this.avatar.avatarRef.current) {
      avatarPresets.attention(this.avatar.avatarRef.current);
    }
  }
  
  public triggerError() {
    this.playSequence('toolError');
  }
  
  // Cleanup
  public destroy() {
    this.currentSequence?.kill();
    
    // Remove event listeners
    window.removeEventListener('tasky:tool', this.handleToolStart);
    window.removeEventListener('task:created', () => {});
    window.removeEventListener('task:completed', () => {});
    window.removeEventListener('task:updated', () => {});
    window.removeEventListener('task:deleted', () => {});
    window.removeEventListener('task:overdue', () => {});
    window.removeEventListener('reminder:triggered', () => {});
    window.removeEventListener('reminder:created', () => {});
    window.removeEventListener('reminder:snoozed', () => {});
    window.removeEventListener('voice:listening', () => {});
    window.removeEventListener('voice:processing', () => {});
    window.removeEventListener('voice:speaking', () => {});
    window.removeEventListener('voice:idle', () => {});
    window.removeEventListener('notification:show', () => {});
    window.removeEventListener('app:startup', () => {});
  }
}
