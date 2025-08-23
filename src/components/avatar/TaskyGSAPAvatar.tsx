import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
  emotion?: AvatarEmotion;
  audioLevel?: number;
  size?: number;
  onClick?: () => void;
}

export interface TaskyGSAPAvatarRef {
  setEmotion: (emotion: AvatarEmotion) => void;
  setAudioLevel: (level: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  avatarRef: React.RefObject<HTMLImageElement>;
  particlesRef: React.RefObject<HTMLDivElement>;
}

export const TaskyGSAPAvatar = forwardRef<TaskyGSAPAvatarRef, TaskyGSAPAvatarProps>(({
  emotion = 'idle',
  audioLevel = 0,
  size = 128,
  onClick
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  
  // Store animation timeline
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const audioTlRef = useRef<gsap.core.Tween | null>(null);
  
  // Current state
  const currentEmotionRef = useRef<AvatarEmotion>(emotion);
  const currentAudioLevelRef = useRef<number>(audioLevel);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    setEmotion: (newEmotion: AvatarEmotion) => {
      currentEmotionRef.current = newEmotion;
      animateEmotion(newEmotion);
    },
    setAudioLevel: (level: number) => {
      currentAudioLevelRef.current = level;
      animateAudioLevel(level);
    },
    containerRef,
    avatarRef,
    particlesRef
  }));
  
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
  
  // Initial emotion animation
  useEffect(() => {
    animateEmotion(emotion);
  }, []);

  // Audio level animation
  useEffect(() => {
    animateAudioLevel(audioLevel);
  }, [audioLevel]);

  const animateEmotion = (targetEmotion: AvatarEmotion) => {
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
    
    switch (targetEmotion) {
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
  };

  const animateAudioLevel = (level: number) => {
    if (!avatarRef.current || currentEmotionRef.current !== 'speaking') return;
    
    // Kill previous audio animation
    audioTlRef.current?.kill();
    
    // Animate scale based on audio level
    audioTlRef.current = gsap.to(avatarRef.current, {
      scaleY: 1 + level * 0.2,
      scaleX: 1 - level * 0.05,
      duration: 0.1,
      ease: "none"
    });
  };
  
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
});

TaskyGSAPAvatar.displayName = 'TaskyGSAPAvatar';

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
