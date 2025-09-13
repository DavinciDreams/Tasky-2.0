export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  accent: string;
  muted: string;
  border: string;
  card: string;
  destructive: string;
  success: string;
  warning: string;
  info: string;
}

export interface ThemePreset {
  name: string;
  colors: ThemeColors;
  description: string;
}

export class ThemeManager {
  private static instance: ThemeManager;
  
  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  // Predefined theme presets
  getPresets(): ThemePreset[] {
    return [
      {
        name: 'Perano Purple',
        description: 'Beautiful purple-blue gradient theme',
        colors: {
          primary: '237 83% 70%',      // Perano-400
          secondary: '237 90% 75%',    // Perano-300
          background: '237 83% 70%',   // Perano-400
          foreground: '240 100% 98%',  // Very light
          accent: '240 100% 98%',      // Light accent
          muted: '237 70% 60%',        // Perano-600
          border: '237 90% 80%',       // Perano-200
          card: '237 76% 65%',         // Perano-500
          destructive: '0 72% 45%',    // Red
          success: '120 70% 40%',      // Green
          warning: '45 93% 48%',       // Yellow
          info: '240 100% 98%'         // Light blue
        }
      },
      {
        name: 'Ocean Blue',
        description: 'Deep ocean blue with aqua accents',
        colors: {
          primary: '200 80% 50%',      // Ocean blue
          secondary: '180 70% 60%',    // Aqua
          background: '200 80% 50%',   // Ocean background
          foreground: '210 100% 98%',  // Very light
          accent: '180 100% 80%',      // Light aqua
          muted: '200 60% 40%',        // Darker blue
          border: '180 50% 70%',       // Light aqua border
          card: '200 70% 45%',         // Darker ocean
          destructive: '0 72% 45%',    // Red
          success: '150 70% 40%',      // Sea green
          warning: '45 93% 48%',       // Yellow
          info: '180 100% 80%'         // Light aqua
        }
      },
      {
        name: 'Forest Green',
        description: 'Natural forest green with earth tones',
        colors: {
          primary: '120 60% 40%',      // Forest green
          secondary: '100 50% 50%',    // Lighter green
          background: '120 60% 40%',   // Forest background
          foreground: '120 100% 95%',  // Very light green
          accent: '60 80% 70%',        // Light lime
          muted: '120 40% 30%',        // Dark forest
          border: '100 60% 60%',       // Medium green
          card: '120 50% 35%',         // Darker forest
          destructive: '0 72% 45%',    // Red
          success: '120 80% 50%',      // Bright green
          warning: '45 93% 48%',       // Yellow
          info: '180 60% 60%'          // Blue-green
        }
      },
      {
        name: 'Sunset Orange',
        description: 'Warm sunset colors with golden accents',
        colors: {
          primary: '25 85% 55%',       // Orange
          secondary: '35 80% 60%',     // Light orange
          background: '25 85% 55%',    // Orange background
          foreground: '25 100% 95%',   // Very light orange
          accent: '45 100% 80%',       // Light yellow
          muted: '20 70% 45%',         // Dark orange
          border: '35 70% 70%',        // Light orange border
          card: '25 75% 50%',          // Darker orange
          destructive: '0 72% 45%',    // Red
          success: '120 70% 40%',      // Green
          warning: '45 100% 60%',      // Bright yellow
          info: '200 60% 60%'          // Blue
        }
      },
      {
        name: 'Midnight Dark',
        description: 'Dark theme with purple accents',
        colors: {
          primary: '250 80% 60%',      // Purple
          secondary: '240 70% 70%',    // Light purple
          background: '240 20% 8%',    // Very dark
          foreground: '240 100% 98%',  // Very light
          accent: '250 100% 80%',      // Light purple
          muted: '240 15% 15%',        // Dark gray
          border: '240 20% 25%',       // Medium gray
          card: '240 18% 12%',         // Dark card
          destructive: '0 72% 45%',    // Red
          success: '120 70% 40%',      // Green
          warning: '45 93% 48%',       // Yellow
          info: '200 80% 60%'          // Blue
        }
      },
      {
        name: 'Rose Gold',
        description: 'Elegant rose gold with pink accents',
        colors: {
          primary: '340 60% 60%',      // Rose
          secondary: '350 70% 70%',    // Light rose
          background: '340 60% 60%',   // Rose background
          foreground: '340 100% 95%',  // Very light rose
          accent: '320 80% 80%',       // Light pink
          muted: '340 40% 50%',        // Dark rose
          border: '350 50% 75%',       // Light rose border
          card: '340 55% 55%',         // Darker rose
          destructive: '0 72% 45%',    // Red
          success: '120 70% 40%',      // Green
          warning: '45 93% 48%',       // Yellow
          info: '200 60% 60%'          // Blue
        }
      }
    ];
  }

  // Apply theme to document
  applyTheme(colors: ThemeColors): void {
    const root = document.documentElement;
    
    // Update CSS custom properties
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', this.getContrastColor(colors.primary));
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--secondary-foreground', this.getContrastColor(colors.secondary));
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--card-foreground', this.getContrastColor(colors.card));
    root.style.setProperty('--popover', colors.card);
    root.style.setProperty('--popover-foreground', this.getContrastColor(colors.card));
    root.style.setProperty('--muted', colors.muted);
    root.style.setProperty('--muted-foreground', this.getContrastColor(colors.muted));
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', this.getContrastColor(colors.accent));
    root.style.setProperty('--destructive', colors.destructive);
    root.style.setProperty('--destructive-foreground', this.getContrastColor(colors.destructive));
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--input', colors.card);
    root.style.setProperty('--ring', colors.accent);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--success-foreground', this.getContrastColor(colors.success));
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--warning-foreground', this.getContrastColor(colors.warning));
    root.style.setProperty('--info', colors.info);
    root.style.setProperty('--info-foreground', this.getContrastColor(colors.info));
    
    // Update status and priority colors with new theme
    this.updateStatusColors(colors);
  }

  // Get automatic contrast color (light or dark) based on background
  private getContrastColor(hslColor: string): string {
    // Convert HSL to RGB to calculate luminance
    const [h, s, l] = hslColor.split(' ').map((val, index) => {
      if (index === 0) return parseInt(val);
      return parseInt(val.replace('%', ''));
    });
    
    // Simple luminance check - if lightness > 50%, use dark text
    if (l > 50) {
      return '240 30% 15%'; // Dark text
    } else {
      return '240 100% 98%'; // Light text
    }
  }

  // Update status and priority colors to harmonize with theme
  private updateStatusColors(colors: ThemeColors): void {
    const root = document.documentElement;
    
    // Create harmonized status colors based on theme
    const isLightTheme = this.isLightTheme(colors.background);
    
    if (isLightTheme) {
      // Light theme status colors
      root.style.setProperty('--status-pending-bg', '240 100% 98%');
      root.style.setProperty('--status-pending-fg', '240 40% 25%');
      root.style.setProperty('--status-in-progress-bg', colors.secondary);
      root.style.setProperty('--status-in-progress-fg', this.getContrastColor(colors.secondary));
      root.style.setProperty('--status-completed-bg', colors.success);
      root.style.setProperty('--status-completed-fg', this.getContrastColor(colors.success));
    } else {
      // Dark theme status colors
      root.style.setProperty('--status-pending-bg', colors.muted);
      root.style.setProperty('--status-pending-fg', colors.foreground);
      root.style.setProperty('--status-in-progress-bg', colors.accent);
      root.style.setProperty('--status-in-progress-fg', this.getContrastColor(colors.accent));
      root.style.setProperty('--status-completed-bg', colors.success);
      root.style.setProperty('--status-completed-fg', this.getContrastColor(colors.success));
    }
  }

  // Check if theme is light based on background lightness
  private isLightTheme(background: string): boolean {
    const [, , l] = background.split(' ').map((val, index) => {
      if (index === 0) return parseInt(val);
      return parseInt(val.replace('%', ''));
    });
    return l > 50;
  }

  // Convert hex to HSL
  hexToHsl(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  // Convert HSL to hex
  hslToHex(hsl: string): string {
    const [h, s, l] = hsl.split(' ').map((val, index) => {
      if (index === 0) return parseInt(val) / 360;
      return parseInt(val.replace('%', '')) / 100;
    });

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 2/6) {
      r = x; g = c; b = 0;
    } else if (2/6 <= h && h < 3/6) {
      r = 0; g = c; b = x;
    } else if (3/6 <= h && h < 4/6) {
      r = 0; g = x; b = c;
    } else if (4/6 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
