# GSAP PNG Avatar Animation System

## Overview
Animate the existing `tasky.png` avatar using GSAP for smooth, performant animation loops with different emotional states.

## Core Concept
Use GSAP's powerful animation engine to create simple but expressive animations on the PNG image through transforms, filters, and effects.

## Implementation

### 1. Avatar Component with GSAP

```typescript
// src/components/avatar/TaskyGSAPAvatar.tsx
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import taskyAvatar from '../../assets/tasky.png';

export type AvatarEmotion = 
  | 'idle'
  | 'listening' 
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'confused'
  | 'sleeping'
  | 'excited'
  | 'focused'
  | 'error';

interface TaskyGSAPAvatarProps {
  emotion: AvatarEmotion;
  audioLevel?: number;
  size?: number;
  onClick?: () => void;
}

export const TaskyGSAPAvatar: React.FC<TaskyGSAPAvatarProps> = ({
  emotion = 'idle',
  audioLevel = 0,
  size = 128,
  onClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  
  // Store animation timeline
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const audioTlRef = useRef<gsap.core.Tween | null>(null);
  
  // Initialize GSAP defaults
  useEffect(() => {
    gsap.defaults({
      ease: "power2.inOut",
      duration: 0.5
    });
    
    return () => {
      // Cleanup animations on unmount
      tlRef.current?.kill();
      audioTlRef.current?.kill();
    };
  }, []);
  
  // Emotion-based animations
  useEffect(() => {
    if (!avatarRef.current || !containerRef.current) return;
    
    // Kill previous animation
    tlRef.current?.kill();
    
    // Create new timeline
    const tl = gsap.timeline();
    tlRef.current = tl;
    
    // Reset transforms
    gsap.set(avatarRef.current, {
      clearProps: "all"
    });
    
    switch (emotion) {
      case 'idle':
        // Gentle floating animation
        tl.to(avatarRef.current, {
          y: -5,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
        
        // Subtle scale breathing
        tl.to(avatarRef.current, {
          scale: 1.02,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        }, 0);
        break;
        
      case 'listening':
        // Pulse effect
        tl.to(avatarRef.current, {
          scale: 1.05,
          duration: 0.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
        
        // Add glow effect
        if (glowRef.current) {
          tl.to(glowRef.current, {
            opacity: 1,
            scale: 1.2,
            duration: 1,
            repeat: -1,
            yoyo: true
          }, 0);
        }
        
        // Tilt animation
        tl.to(avatarRef.current, {
          rotation: -5,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        }, 0);
        break;
        
      case 'thinking':
        // Rotate back and forth
        tl.to(avatarRef.current, {
          rotation: -10,
          duration: 1,
          ease: "power1.inOut"
        })
        .to(avatarRef.current, {
          rotation: 10,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
        
        // Scale down slightly
        tl.to(avatarRef.current, {
          scale: 0.95,
          duration: 0.5
        }, 0);
        
        // Add thinking particles
        if (particlesRef.current) {
          createThinkingParticles(particlesRef.current);
        }
        break;
        
      case 'speaking':
        // Bounce animation synced with speaking
        tl.to(avatarRef.current, {
          y: -8,
          duration: 0.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
        
        // Slight rotation wiggle
        tl.to(avatarRef.current, {
          rotation: -3,
          duration: 0.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        }, 0);
        break;
        
      case 'happy':
        // Jump animation
        tl.to(avatarRef.current, {
          y: -20,
          duration: 0.3,
          ease: "back.out(2)"
        })
        .to(avatarRef.current, {
          y: 0,
          duration: 0.3,
          ease: "bounce.out"
        })
        .to(avatarRef.current, {
          rotation: 360,
          duration: 0.6,
          ease: "power2.out"
        }, 0.3);
        
        // Squash and stretch
        tl.to(avatarRef.current, {
          scaleX: 1.2,
          scaleY: 0.8,
          duration: 0.1
        }, 0)
        .to(avatarRef.current, {
          scaleX: 0.9,
          scaleY: 1.1,
          duration: 0.1
        })
        .to(avatarRef.current, {
          scaleX: 1,
          scaleY: 1,
          duration: 0.2,
          ease: "elastic.out(1, 0.3)"
        });
        
        // Add happy particles
        if (particlesRef.current) {
          createHappyParticles(particlesRef.current);
        }
        break;
        
      case 'confused':
        // Wobble animation
        tl.to(avatarRef.current, {
          rotation: -15,
          duration: 0.2
        })
        .to(avatarRef.current, {
          rotation: 15,
          duration: 0.2
        })
        .to(avatarRef.current, {
          rotation: -10,
          duration: 0.2
        })
        .to(avatarRef.current, {
          rotation: 10,
          duration: 0.2
        })
        .to(avatarRef.current, {
          rotation: 0,
          duration: 0.3,
          ease: "elastic.out(1, 0.5)"
        });
        
        // Slight shrink
        tl.to(avatarRef.current, {
          scale: 0.9,
          duration: 0.5
        }, 0);
        break;
        
      case 'sleeping':
        // Slow breathing
        tl.to(avatarRef.current, {
          scale: 0.95,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
        
        // Gentle sway
        tl.to(avatarRef.current, {
          rotation: -2,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        }, 0);
        
        // Fade slightly
        tl.to(avatarRef.current, {
          opacity: 0.8,
          duration: 1
        }, 0);
        
        // Z particles
        if (particlesRef.current) {
          createSleepingZs(particlesRef.current);
        }
        break;
        
      case 'excited':
        // Rapid bounce
        tl.to(avatarRef.current, {
          y: -15,
          duration: 0.2,
          repeat: 5,
          yoyo: true,
          ease: "power2.out"
        });
        
        // Scale pulse
        tl.to(avatarRef.current, {
          scale: 1.1,
          duration: 0.2,
          repeat: 5,
          yoyo: true,
          ease: "power2.out"
        }, 0);
        
        // Rotation shake
        tl.to(avatarRef.current, {
          rotation: -10,
          duration: 0.1,
          repeat: 10,
          yoyo: true,
          ease: "none"
        }, 0);
        break;
        
      case 'focused':
        // Lock in position with subtle pulse
        tl.to(avatarRef.current, {
          scale: 1.05,
          duration: 0.3
        })
        .to(avatarRef.current, {
          scale: 1,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
        
        // Add focus lines
        if (glowRef.current) {
          gsap.to(glowRef.current, {
            opacity: 0.5,
            scale: 0.9,
            duration: 1
          });
        }
        break;
        
      case 'error':
        // Shake animation
        tl.to(avatarRef.current, {
          x: -5,
          duration: 0.1,
          repeat: 5,
          yoyo: true,
          ease: "none"
        });
        
        // Red tint flash
        tl.to(avatarRef.current, {
          filter: "hue-rotate(-50deg) saturate(2)",
          duration: 0.3,
          repeat: 2,
          yoyo: true
        }, 0);
        
        // Scale down
        tl.to(avatarRef.current, {
          scale: 0.9,
          duration: 0.5
        }, 0);
        break;
    }
    
  }, [emotion]);
  
  // Audio level animation (for speaking)
  useEffect(() => {
    if (!avatarRef.current || emotion !== 'speaking') return;
    
    // Kill previous audio animation
    audioTlRef.current?.kill();
    
    // Animate scale based on audio level
    audioTlRef.current = gsap.to(avatarRef.current, {
      scaleY: 1 + audioLevel * 0.2,
      scaleX: 1 - audioLevel * 0.05,
      duration: 0.1,
      ease: "none"
    });
    
  }, [audioLevel, emotion]);
  
  return (
    <div 
      ref={containerRef}
      className="tasky-avatar-container"
      onClick={onClick}
      style={{
        width: size,
        height: size,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {/* Glow effect layer */}
      <div
        ref={glowRef}
        className="avatar-glow"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120%',
          height: '120%',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, transparent 70%)',
          borderRadius: '50%',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />
      
      {/* Main avatar image */}
      <img
        ref={avatarRef}
        src={taskyAvatar}
        alt="Tasky"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transformOrigin: 'center bottom'
        }}
        draggable={false}
      />
      
      {/* Particle container */}
      <div
        ref={particlesRef}
        className="avatar-particles"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

// Particle creation functions
function createThinkingParticles(container: HTMLElement) {
  // Clear existing particles
  container.innerHTML = '';
  
  // Create thinking dots
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'thinking-dot';
    dot.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: #667eea;
      border-radius: 50%;
      top: -20px;
      right: ${-10 - i * 15}px;
    `;
    container.appendChild(dot);
    
    gsap.to(dot, {
      opacity: 1,
      y: -5,
      duration: 0.5,
      delay: i * 0.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }
}

function createHappyParticles(container: HTMLElement) {
  container.innerHTML = '';
  
  // Create heart particles
  const hearts = ['❤️', '💜', '💙', '💚', '💛'];
  
  for (let i = 0; i < 5; i++) {
    const heart = document.createElement('div');
    heart.className = 'happy-particle';
    heart.textContent = hearts[i % hearts.length];
    heart.style.cssText = `
      position: absolute;
      font-size: 20px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    container.appendChild(heart);
    
    const angle = (i / 5) * Math.PI * 2;
    const distance = 60;
    
    gsap.fromTo(heart, {
      x: 0,
      y: 0,
      scale: 0,
      opacity: 1
    }, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 20,
      scale: 1,
      opacity: 0,
      duration: 1.5,
      ease: "power2.out",
      delay: i * 0.1
    });
  }
}

function createSleepingZs(container: HTMLElement) {
  container.innerHTML = '';
  
  // Create floating Z's
  const createZ = (delay: number) => {
    const z = document.createElement('div');
    z.className = 'sleep-z';
    z.textContent = 'Z';
    z.style.cssText = `
      position: absolute;
      font-size: ${20 - delay * 3}px;
      font-weight: bold;
      color: #6b7280;
      top: -10px;
      right: -20px;
    `;
    container.appendChild(z);
    
    gsap.fromTo(z, {
      x: 0,
      y: 0,
      opacity: 0
    }, {
      x: 20,
      y: -30,
      opacity: 1,
      duration: 2,
      delay: delay,
      repeat: -1,
      ease: "power1.out",
      onRepeat: function() {
        gsap.set(this.targets()[0], { x: 0, y: 0, opacity: 0 });
      }
    });
  };
  
  for (let i = 0; i < 3; i++) {
    createZ(i * 0.7);
  }
}
```

### 2. Hover and Interaction Effects

```typescript
// src/hooks/useAvatarInteraction.ts
import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export const useAvatarInteraction = (avatarRef: React.RefObject<HTMLElement>) => {
  const isHovered = useRef(false);
  
  useEffect(() => {
    if (!avatarRef.current) return;
    
    const element = avatarRef.current;
    
    const handleMouseEnter = () => {
      isHovered.current = true;
      gsap.to(element, {
        scale: 1.1,
        duration: 0.3,
        ease: "back.out(1.7)"
      });
    };
    
    const handleMouseLeave = () => {
      isHovered.current = false;
      gsap.to(element, {
        scale: 1,
        duration: 0.3,
        ease: "back.out(1.7)"
      });
    };
    
    const handleMouseDown = () => {
      gsap.to(element, {
        scale: 0.95,
        duration: 0.1
      });
    };
    
    const handleMouseUp = () => {
      gsap.to(element, {
        scale: isHovered.current ? 1.1 : 1,
        duration: 0.2,
        ease: "back.out(2)"
      });
    };
    
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
    };
  }, [avatarRef]);
};
```

### 3. Presets and Sequences

```typescript
// src/components/avatar/avatarPresets.ts
import { gsap } from 'gsap';

export const avatarPresets = {
  // Entrance animation
  entrance: (element: HTMLElement) => {
    return gsap.fromTo(element, {
      scale: 0,
      rotation: -180,
      opacity: 0
    }, {
      scale: 1,
      rotation: 0,
      opacity: 1,
      duration: 0.8,
      ease: "back.out(1.7)"
    });
  },
  
  // Task completed celebration
  celebrate: (element: HTMLElement, container: HTMLElement) => {
    const tl = gsap.timeline();
    
    // Jump and spin
    tl.to(element, {
      y: -30,
      rotation: 360,
      duration: 0.5,
      ease: "power2.out"
    })
    .to(element, {
      y: 0,
      duration: 0.3,
      ease: "bounce.out"
    });
    
    // Add confetti
    for (let i = 0; i < 20; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background: hsl(${Math.random() * 360}, 100%, 50%);
        top: 50%;
        left: 50%;
      `;
      container.appendChild(confetti);
      
      tl.to(confetti, {
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        rotation: Math.random() * 720,
        scale: 0,
        duration: 1,
        ease: "power2.out",
        onComplete: () => confetti.remove()
      }, 0);
    }
    
    return tl;
  },
  
  // Error shake
  error: (element: HTMLElement) => {
    return gsap.timeline()
      .to(element, {
        x: -10,
        duration: 0.1
      })
      .to(element, {
        x: 10,
        duration: 0.1
      })
      .to(element, {
        x: -10,
        duration: 0.1
      })
      .to(element, {
        x: 10,
        duration: 0.1
      })
      .to(element, {
        x: 0,
        duration: 0.1
      })
      .to(element, {
        filter: "hue-rotate(-20deg) brightness(1.2)",
        duration: 0.3
      }, 0)
      .to(element, {
        filter: "none",
        duration: 0.3
      });
  },
  
  // Notification pulse
  notify: (element: HTMLElement) => {
    return gsap.timeline({ repeat: 2 })
      .to(element, {
        scale: 1.2,
        duration: 0.3,
        ease: "power2.out"
      })
      .to(element, {
        scale: 1,
        duration: 0.3,
        ease: "power2.in"
      });
  }
};
```

### 4. CSS for Additional Effects

```css
/* src/styles/avatar-gsap.css */

.tasky-avatar-container {
  display: inline-block;
  user-select: none;
  -webkit-user-drag: none;
  filter: drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3));
  transition: filter 0.3s ease;
}

.tasky-avatar-container:hover {
  filter: drop-shadow(0 6px 20px rgba(102, 126, 234, 0.5));
}

/* Emotion-specific filters */
.tasky-avatar-container[data-emotion="happy"] {
  filter: drop-shadow(0 4px 12px rgba(251, 191, 36, 0.4)) brightness(1.1);
}

.tasky-avatar-container[data-emotion="error"] {
  filter: drop-shadow(0 4px 12px rgba(239, 68, 68, 0.4));
}

.tasky-avatar-container[data-emotion="thinking"] {
  filter: drop-shadow(0 4px 12px rgba(245, 158, 11, 0.4));
}

.tasky-avatar-container[data-emotion="listening"] {
  filter: drop-shadow(0 4px 12px rgba(59, 130, 246, 0.4));
}

/* Particle animations */
@keyframes float-up {
  to {
    transform: translateY(-20px);
    opacity: 0;
  }
}

.thinking-dot {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* Performance optimization */
.tasky-avatar-container img {
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}
```

### 5. Usage Example

```typescript
// src/components/VoiceAssistant.tsx
import React, { useState } from 'react';
import { TaskyGSAPAvatar } from './avatar/TaskyGSAPAvatar';
import { avatarPresets } from './avatar/avatarPresets';

export const VoiceAssistant: React.FC = () => {
  const [emotion, setEmotion] = useState<AvatarEmotion>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const avatarRef = useRef<HTMLDivElement>(null);
  
  // Handle voice events
  useEffect(() => {
    const handleVoiceEvent = (event: CustomEvent) => {
      switch(event.detail.type) {
        case 'wake_word':
          setEmotion('excited');
          if (avatarRef.current) {
            avatarPresets.entrance(avatarRef.current);
          }
          setTimeout(() => setEmotion('listening'), 1000);
          break;
          
        case 'listening':
          setEmotion('listening');
          break;
          
        case 'processing':
          setEmotion('thinking');
          break;
          
        case 'speaking':
          setEmotion('speaking');
          setAudioLevel(event.detail.audioLevel || 0);
          break;
          
        case 'task_completed':
          setEmotion('happy');
          if (avatarRef.current?.parentElement) {
            avatarPresets.celebrate(avatarRef.current, avatarRef.current.parentElement);
          }
          setTimeout(() => setEmotion('idle'), 3000);
          break;
          
        case 'error':
          setEmotion('error');
          if (avatarRef.current) {
            avatarPresets.error(avatarRef.current);
          }
          setTimeout(() => setEmotion('confused'), 1000);
          setTimeout(() => setEmotion('idle'), 3000);
          break;
      }
    };
    
    window.addEventListener('voice:event', handleVoiceEvent);
    return () => window.removeEventListener('voice:event', handleVoiceEvent);
  }, []);
  
  return (
    <div className="voice-assistant">
      <TaskyGSAPAvatar
        emotion={emotion}
        audioLevel={audioLevel}
        size={128}
        onClick={() => {
          // Toggle voice listening
          setEmotion(emotion === 'listening' ? 'idle' : 'listening');
        }}
      />
    </div>
  );
};
```

## Performance Considerations

1. **Use `will-change` sparingly** - Only on elements being animated
2. **Kill timelines** when component unmounts or emotion changes
3. **Use `clearProps`** to reset transforms between animations
4. **Batch DOM operations** in particle creation
5. **Use CSS for static effects**, GSAP for dynamic animations

## Installation

```bash
npm install gsap
```

## GSAP Animation Cheatsheet

| Emotion | Primary Animation | Secondary Effects |
|---------|------------------|-------------------|
| idle | Float (y: -5, 2s) | Scale breathing (1.02, 3s) |
| listening | Pulse (scale: 1.05) | Tilt (rotation: -5) + Glow |
| thinking | Rotate (-10 to 10) | Scale down (0.95) + Dots |
| speaking | Bounce (y: -8) | Audio-reactive scale |
| happy | Jump + Spin (360°) | Confetti particles |
| confused | Wobble (rotation) | Scale down (0.9) |
| sleeping | Slow breathing | Fade (0.8) + Z particles |
| excited | Rapid bounce | Scale pulse + Shake |
| focused | Lock position | Subtle pulse (1.05) |
| error | Shake (x: ±5) | Red tint flash |

## Tasky Event Mapping

### Avatar Emotion Triggers for Tasks, Reminders & Notifications

| Tasky Event | Avatar Emotion | Animation | Duration | Trigger |
|-------------|---------------|-----------|----------|---------|
| **Task Created** | `excited` → `happy` | Rapid bounce → Jump + Spin | 2s → 3s | MCP tool: `tasky_create_task` |
| **Task Completed** | `happy` | Jump + 360° spin + confetti | 4s | Task status → `COMPLETED` |
| **Task Updated** | `focused` | Lock position + subtle pulse | 2s | MCP tool: `tasky_update_task` |
| **Task Overdue** | `confused` → `error` | Wobble → Shake + red tint | 3s → 2s | Due date check |
| **Task Deleted** | `confused` | Wobble + scale down | 2s | MCP tool: `tasky_delete_task` |
| **Task Execution Started** | `focused` → `thinking` | Lock → Rotate + dots | 1s → continuous | MCP tool: `tasky_execute_task` |
| **Reminder Triggered** | `excited` → `speaking` | Rapid bounce → Audio bounce | 2s → 3s | Reminder time reached |
| **Reminder Created** | `happy` | Jump + confetti (small) | 2s | MCP tool: `tasky_create_reminder` |
| **Reminder Snoozed** | `sleeping` | Slow breathing + Z particles | 3s | Snooze action |
| **Voice Listening** | `listening` | Pulse + glow + tilt | continuous | Voice input active |
| **Voice Processing** | `thinking` | Rotate + thinking dots | continuous | AI processing |
| **Voice Speaking** | `speaking` | Audio-reactive bounce | continuous | TTS output |
| **Tool Call Success** | `happy` | Celebration sequence | 3s | MCP tool success |
| **Tool Call Error** | `error` → `confused` | Shake + red tint → Wobble | 2s → 2s | MCP tool error |
| **Notification Shown** | `focused` | Subtle pulse + notification icon | 2s | System notification |
| **App Startup** | `sleeping` → `idle` | Wake up sequence | 3s | Application launch |
| **Idle State** | `idle` | Gentle float + breathing | continuous | No activity |

### Implementation Integration

```typescript
// src/components/avatar/TaskyEventHandler.ts
import { TaskyGSAPAvatar } from './TaskyGSAPAvatar';
import { avatarPresets } from './avatarPresets';

export class TaskyEventHandler {
  private avatar: TaskyGSAPAvatar;
  private currentSequence: gsap.core.Timeline | null = null;
  
  constructor(avatarInstance: TaskyGSAPAvatar) {
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
    
    window.addEventListener('task:overdue', (event: CustomEvent) => {
      this.playSequence('taskOverdue', event.detail);
    });
    
    // Reminder Events
    window.addEventListener('reminder:triggered', (event: CustomEvent) => {
      this.playSequence('reminderTriggered', event.detail);
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
    
    // Notification Events
    window.addEventListener('notification:show', (event: CustomEvent) => {
      this.handleNotification(event.detail);
    });
  }
  
  private handleToolStart(toolName: string, args: any) {
    const toolMappings = {
      'tasky_create_task': 'focused',
      'tasky_update_task': 'focused', 
      'tasky_execute_task': 'thinking',
      'tasky_create_reminder': 'focused',
      'tasky_list_tasks': 'thinking'
    };
    
    const emotion = toolMappings[toolName] || 'thinking';
    this.avatar.setEmotion(emotion);
  }
  
  private handleToolSuccess(toolName: string, args: any, output: string) {
    const successMappings = {
      'tasky_create_task': () => this.playSequence('taskCreated', args),
      'tasky_update_task': () => this.playSequence('taskUpdated', args),
      'tasky_delete_task': () => this.playSequence('taskDeleted', args),
      'tasky_execute_task': () => this.playSequence('taskExecuted', args),
      'tasky_create_reminder': () => this.playSequence('reminderCreated', args),
      'tasky_list_tasks': () => this.avatar.setEmotion('happy')
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
    const { type, priority } = notification;
    
    if (priority === 'urgent') {
      this.avatar.setEmotion('excited');
      setTimeout(() => this.avatar.setEmotion('idle'), 3000);
    } else {
      this.avatar.setEmotion('focused');
      setTimeout(() => this.avatar.setEmotion('idle'), 1500);
    }
  }
  
  private async playSequence(sequenceName: string, data?: any) {
    // Kill any current sequence
    this.currentSequence?.kill();
    
    const sequences = {
      taskCreated: () => this.taskCreatedSequence(data),
      taskCompleted: () => this.taskCompletedSequence(data),
      taskUpdated: () => this.taskUpdatedSequence(data),
      taskDeleted: () => this.taskDeletedSequence(data),
      taskOverdue: () => this.taskOverdueSequence(data),
      taskExecuted: () => this.taskExecutedSequence(data),
      reminderTriggered: () => this.reminderTriggeredSequence(data),
      reminderCreated: () => this.reminderCreatedSequence(data),
      toolError: () => this.toolErrorSequence(data)
    };
    
    const sequence = sequences[sequenceName];
    if (sequence) {
      this.currentSequence = sequence();
    }
  }
  
  private taskCreatedSequence(task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Excited → Happy sequence
    tl.call(() => this.avatar.setEmotion('excited'))
      .to({}, { duration: 1 }) // Wait for excited animation
      .call(() => this.avatar.setEmotion('happy'))
      .to({}, { duration: 2 }) // Wait for happy animation
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private taskCompletedSequence(task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Celebration with confetti
    tl.call(() => this.avatar.setEmotion('happy'))
      .call(() => {
        if (this.avatar.containerRef.current && this.avatar.particlesRef.current) {
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
  
  private taskUpdatedSequence(task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    tl.call(() => this.avatar.setEmotion('focused'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private taskDeletedSequence(task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    tl.call(() => this.avatar.setEmotion('confused'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private taskOverdueSequence(task: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Confused → Error sequence for overdue
    tl.call(() => this.avatar.setEmotion('confused'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('error'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private taskExecutedSequence(task: any): gsap.core.Timeline {
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
  
  private reminderTriggeredSequence(reminder: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    // Excited → Speaking for reminder
    tl.call(() => this.avatar.setEmotion('excited'))
      .to({}, { duration: 1.5 })
      .call(() => this.avatar.setEmotion('speaking'))
      .to({}, { duration: 3 }) // Time for reminder message
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private reminderCreatedSequence(reminder: any): gsap.core.Timeline {
    const tl = gsap.timeline();
    
    tl.call(() => this.avatar.setEmotion('happy'))
      .to({}, { duration: 2 })
      .call(() => this.avatar.setEmotion('idle'));
    
    return tl;
  }
  
  private toolErrorSequence(error: any): gsap.core.Timeline {
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
}
```

### Usage in Main App

```typescript
// src/components/apps/ApplicationsTab.tsx
import React, { useEffect, useRef } from 'react';
import { TaskyGSAPAvatar } from '../avatar/TaskyGSAPAvatar';
import { TaskyEventHandler } from '../avatar/TaskyEventHandler';

export const ApplicationsTab: React.FC = () => {
  const avatarRef = useRef<TaskyGSAPAvatar>();
  const eventHandlerRef = useRef<TaskyEventHandler>();
  
  useEffect(() => {
    // Initialize avatar with event handling
    if (avatarRef.current) {
      eventHandlerRef.current = new TaskyEventHandler(avatarRef.current);
    }
    
    return () => {
      eventHandlerRef.current?.destroy();
    };
  }, []);
  
  return (
    <div className="applications-tab">
      <TaskyGSAPAvatar
        ref={avatarRef}
        emotion="idle"
        size={128}
        onClick={() => {
          // Manual avatar interaction
          avatarRef.current?.setEmotion('happy');
          setTimeout(() => avatarRef.current?.setEmotion('idle'), 2000);
        }}
      />
      
      {/* Rest of your app components */}
    </div>
  );
};
```

## Benefits of This Approach

1. **Simple**: Just one PNG image animated with GSAP
2. **Performant**: GPU-accelerated transforms
3. **Smooth**: 60fps animations with easing
4. **Contextual**: Avatar responds to all Tasky events
5. **Maintainable**: Clear event-to-emotion mapping
6. **Interactive**: Hover effects and click responses
7. **Lightweight**: ~30KB for GSAP core
8. **Integrated**: Seamlessly connects to MCP tools and notifications
