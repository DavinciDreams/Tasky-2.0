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
  },

  // Wake up sequence
  wakeUp: (element: HTMLElement) => {
    return gsap.timeline()
      .from(element, {
        scale: 0.8,
        opacity: 0.5,
        duration: 0.5
      })
      .to(element, {
        scale: 1.1,
        duration: 0.3,
        ease: "back.out(2)"
      })
      .to(element, {
        scale: 1,
        duration: 0.2
      });
  },

  // Attention getter
  attention: (element: HTMLElement) => {
    return gsap.timeline()
      .to(element, {
        scale: 1.15,
        duration: 0.2,
        ease: "power2.out"
      })
      .to(element, {
        rotation: -10,
        duration: 0.1
      })
      .to(element, {
        rotation: 10,
        duration: 0.1
      })
      .to(element, {
        rotation: 0,
        scale: 1,
        duration: 0.3,
        ease: "elastic.out(1, 0.5)"
      });
  }
};
