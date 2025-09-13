import React, { useState, useEffect } from 'react';
import { SettingSection } from '../SettingSection';
import { Settings } from '../../types';

interface ThemeSettingsProps {
  settings: Settings;
  onSettingChange: (key: keyof Settings, value: any) => void;
}

interface SimpleThemeColors {
  background: string;
  foreground: string;
  border: string;
  button: string;
  // Special UI element colors
  accent: string;
  success: string;
  warning: string;
  checkbox: string;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ settings, onSettingChange }) => {
  // Validate and sanitize theme colors
  const getDefaultColors = (): SimpleThemeColors => ({
    background: '#1F1F23', // Dark background matching the image
    foreground: '#FFFFFF',  // White text for good contrast
    border: '#2F2F35',      // Slightly lighter dark border
    button: '#5B57D9',      // Purple/indigo button color from image
    // Special UI element colors
    accent: '#5B57D9',      // Same purple for accents/progress
    success: '#10B981',     // Green for success/completed
    warning: '#F59E0B',     // Orange for warning/pending
    checkbox: '#5B57D9',    // Purple for checkboxes
    weekday: '#EC4899',     // Pink for weekday highlights
    pomodoro: '#EF4444'     // Red for Pomodoro timer
  });

  const validateColors = (colors: any): SimpleThemeColors => {
    const defaults = getDefaultColors();
    
    if (!colors || typeof colors !== 'object') {
      return defaults;
    }

    return {
      background: (colors.background && typeof colors.background === 'string' && colors.background.startsWith('#')) 
        ? colors.background : defaults.background,
      foreground: (colors.foreground && typeof colors.foreground === 'string' && colors.foreground.startsWith('#')) 
        ? colors.foreground : defaults.foreground,
      border: (colors.border && typeof colors.border === 'string' && colors.border.startsWith('#')) 
        ? colors.border : defaults.border,
      button: (colors.button && typeof colors.button === 'string' && colors.button.startsWith('#')) 
        ? colors.button : defaults.button,
      accent: (colors.accent && typeof colors.accent === 'string' && colors.accent.startsWith('#')) 
        ? colors.accent : defaults.accent,
      success: (colors.success && typeof colors.success === 'string' && colors.success.startsWith('#')) 
        ? colors.success : defaults.success,
      warning: (colors.warning && typeof colors.warning === 'string' && colors.warning.startsWith('#')) 
        ? colors.warning : defaults.warning,
      checkbox: (colors.checkbox && typeof colors.checkbox === 'string' && colors.checkbox.startsWith('#')) 
        ? colors.checkbox : defaults.checkbox,
      weekday: (colors.weekday && typeof colors.weekday === 'string' && colors.weekday.startsWith('#')) 
        ? colors.weekday : defaults.weekday,
      pomodoro: (colors.pomodoro && typeof colors.pomodoro === 'string' && colors.pomodoro.startsWith('#')) 
        ? colors.pomodoro : defaults.pomodoro,
    };
  };

  const [customColors, setCustomColors] = useState<SimpleThemeColors>(
    validateColors(settings.customTheme)
  );

  // Convert hex to HSL for CSS
  const hexToHsl = (hex: string): string => {
    // Validate hex input
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) {
      console.warn('Invalid hex color:', hex);
      return '0 0% 50%'; // Return a default gray color
    }

    try {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    } catch (error) {
      console.error('Error converting hex to HSL:', error, 'for hex:', hex);
      return '0 0% 50%'; // Return a default gray color
    }
  };

  // Helper function to calculate contrast color
  const getContrastColor = (hexColor: string): string => {
    try {
      // Convert hex to RGB
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      
      // Calculate relative luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Return white for dark colors, dark for light colors
      return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
    } catch (error) {
      console.error('Error calculating contrast color:', error);
      return '#FFFFFF'; // Default to white
    }
  };

  // Apply theme in real-time
  const applyTheme = (colors: SimpleThemeColors) => {
    try {
      const root = document.documentElement;
      
      // Validate colors before applying
      const validatedColors = validateColors(colors);
      
      // Apply only the working colors
      root.style.setProperty('--background', hexToHsl(validatedColors.background));
      root.style.setProperty('--foreground', hexToHsl(validatedColors.foreground));
      root.style.setProperty('--border', hexToHsl(validatedColors.border));
      
      // Set related colors based on background
      const bgHsl = hexToHsl(validatedColors.background);
      const fgHsl = hexToHsl(validatedColors.foreground);
      const borderHsl = hexToHsl(validatedColors.border);
      const buttonHsl = hexToHsl(validatedColors.button);
      
      // Calculate contrasting text color for button
      const buttonTextColor = getContrastColor(validatedColors.button);
      const buttonTextHsl = hexToHsl(buttonTextColor);
      
      // Card colors slightly different from background
      root.style.setProperty('--card', bgHsl);
      root.style.setProperty('--card-foreground', fgHsl);
      
      // Input and popover colors
      root.style.setProperty('--input', borderHsl);
      root.style.setProperty('--popover', bgHsl);
      root.style.setProperty('--popover-foreground', fgHsl);
      
      // Button colors using the custom button color with proper contrast
      root.style.setProperty('--primary', buttonHsl);
      root.style.setProperty('--primary-foreground', buttonTextHsl);
      
      // Special UI element colors
      root.style.setProperty('--accent', hexToHsl(validatedColors.accent));
      root.style.setProperty('--accent-foreground', hexToHsl(getContrastColor(validatedColors.accent)));
      root.style.setProperty('--success', hexToHsl(validatedColors.success));
      root.style.setProperty('--success-foreground', hexToHsl(getContrastColor(validatedColors.success)));
      root.style.setProperty('--warning', hexToHsl(validatedColors.warning));
      root.style.setProperty('--warning-foreground', hexToHsl(getContrastColor(validatedColors.warning)));
      root.style.setProperty('--checkbox', hexToHsl(validatedColors.checkbox));
      root.style.setProperty('--checkbox-foreground', hexToHsl(getContrastColor(validatedColors.checkbox)));
      root.style.setProperty('--weekday', hexToHsl(validatedColors.weekday));
      root.style.setProperty('--weekday-foreground', hexToHsl(getContrastColor(validatedColors.weekday)));
      root.style.setProperty('--pomodoro', hexToHsl(validatedColors.pomodoro));
      root.style.setProperty('--pomodoro-foreground', hexToHsl(getContrastColor(validatedColors.pomodoro)));
      
      // Debug logging
      console.log('Theme applied:', {
        buttonColor: validatedColors.button,
        buttonHsl,
        buttonTextColor,
        buttonTextHsl
      });
      
      // Secondary colors
      root.style.setProperty('--secondary', borderHsl);
      root.style.setProperty('--secondary-foreground', fgHsl);
    } catch (error) {
      console.error('Error applying theme:', error);
      // Fallback to default theme
      const defaults = getDefaultColors();
      try {
        const root = document.documentElement;
        const defaultButtonTextColor = getContrastColor(defaults.button);
        root.style.setProperty('--background', hexToHsl(defaults.background));
        root.style.setProperty('--foreground', hexToHsl(defaults.foreground));
        root.style.setProperty('--border', hexToHsl(defaults.border));
        root.style.setProperty('--primary', hexToHsl(defaults.button));
        root.style.setProperty('--primary-foreground', hexToHsl(defaultButtonTextColor));
      } catch (fallbackError) {
        console.error('Error applying fallback theme:', fallbackError);
      }
    }
  };

  // Apply theme when component mounts or settings change
  useEffect(() => {
    try {
      if (settings.customTheme) {
        const validatedColors = validateColors(settings.customTheme);
        setCustomColors(validatedColors);
        applyTheme(validatedColors);
      } else {
        // Apply default grey theme
        const defaultColors = getDefaultColors();
        applyTheme(defaultColors);
      }
    } catch (error) {
      console.error('Error in theme useEffect:', error);
      // Fallback to default
      const defaultColors = getDefaultColors();
      setCustomColors(defaultColors);
      applyTheme(defaultColors);
    }
  }, [settings.customTheme]);

  const handleColorChange = (colorKey: keyof SimpleThemeColors, hexValue: string) => {
    try {
      // Validate the hex value
      if (!hexValue || !hexValue.startsWith('#') || hexValue.length !== 7) {
        console.warn('Invalid hex value:', hexValue);
        return;
      }

      const newColors = {
        ...customColors,
        [colorKey]: hexValue
      };
      
      const validatedColors = validateColors(newColors);
      setCustomColors(validatedColors);
      onSettingChange('customTheme', validatedColors);
      
      // Apply theme in real-time
      applyTheme(validatedColors);
    } catch (error) {
      console.error('Error handling color change:', error);
    }
  };

  const resetToDefault = () => {
    const defaultColors = getDefaultColors();
    
    setCustomColors(defaultColors);
    onSettingChange('customTheme', defaultColors);
    onSettingChange('themeMode', 'custom');
    applyTheme(defaultColors);
  };

  return (
    <SettingSection title="Theme Customization" icon="🎨">
      <div className="space-y-4">
        
        {/* Reset to Default Button */}
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium text-foreground">Custom Colors</h4>
          <button
            onClick={resetToDefault}
            className="text-xs px-3 py-1 bg-muted/50 hover:bg-muted/70 rounded-lg transition-colors text-muted-foreground border border-border"
          >
            🔄 Reset to Default
          </button>
        </div>

        {/* Color Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-md border-2"
                style={{ backgroundColor: customColors.background, borderColor: customColors.border }}
              />
              <div>
                <label className="text-sm font-medium">Background</label>
                <p className="text-xs text-muted-foreground">Main application background color</p>
              </div>
            </div>
            <input
              type="color"
              value={customColors.background}
              onChange={(e) => handleColorChange('background', e.target.value)}
              className="w-12 h-8 rounded-md border border-border cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-md border-2 flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: customColors.foreground, color: customColors.background, borderColor: customColors.border }}
              >
                Aa
              </div>
              <div>
                <label className="text-sm font-medium">Text Color</label>
                <p className="text-xs text-muted-foreground">Main text and foreground color</p>
              </div>
            </div>
            <input
              type="color"
              value={customColors.foreground}
              onChange={(e) => handleColorChange('foreground', e.target.value)}
              className="w-12 h-8 rounded-md border border-border cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-md border-4"
                style={{ backgroundColor: customColors.background, borderColor: customColors.border }}
              />
              <div>
                <label className="text-sm font-medium">Border</label>
                <p className="text-xs text-muted-foreground">Lines, dividers, and component borders</p>
              </div>
            </div>
            <input
              type="color"
              value={customColors.border}
              onChange={(e) => handleColorChange('border', e.target.value)}
              className="w-12 h-8 rounded-md border border-border cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-md border-2 flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: customColors.button, borderColor: customColors.border }}
              >
                ✓
              </div>
              <div>
                <label className="text-sm font-medium">Button Color</label>
                <p className="text-xs text-muted-foreground">Primary buttons and interactive elements</p>
              </div>
            </div>
            <input
              type="color"
              value={customColors.button}
              onChange={(e) => handleColorChange('button', e.target.value)}
              className="w-12 h-8 rounded-md border border-border cursor-pointer"
            />
          </div>

          {/* Special UI Element Colors */}
          <div className="border-t border-border/30 pt-4 mt-4">
            <h5 className="text-sm font-medium text-foreground mb-3">Special Elements</h5>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-card/20 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: customColors.accent, color: getContrastColor(customColors.accent), borderColor: customColors.border }}
                  >
                    ★
                  </div>
                  <div>
                    <label className="text-xs font-medium">Accent</label>
                    <p className="text-xs text-muted-foreground">Progress indicators, active states</p>
                  </div>
                </div>
                <input
                  type="color"
                  value={customColors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-10 h-6 rounded border border-border cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-card/20 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: customColors.success, color: getContrastColor(customColors.success), borderColor: customColors.border }}
                  >
                    ✓
                  </div>
                  <div>
                    <label className="text-xs font-medium">Success</label>
                    <p className="text-xs text-muted-foreground">Completed states, success indicators</p>
                  </div>
                </div>
                <input
                  type="color"
                  value={customColors.success}
                  onChange={(e) => handleColorChange('success', e.target.value)}
                  className="w-10 h-6 rounded border border-border cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-card/20 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: customColors.warning, color: getContrastColor(customColors.warning), borderColor: customColors.border }}
                  >
                    !
                  </div>
                  <div>
                    <label className="text-xs font-medium">Warning</label>
                    <p className="text-xs text-muted-foreground">Pending states, warnings</p>
                  </div>
                </div>
                <input
                  type="color"
                  value={customColors.warning}
                  onChange={(e) => handleColorChange('warning', e.target.value)}
                  className="w-10 h-6 rounded border border-border cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-card/20 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded border flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: customColors.checkbox, color: getContrastColor(customColors.checkbox), borderColor: customColors.border }}
                  >
                    ☑
                  </div>
                  <div>
                    <label className="text-xs font-medium">Checkbox</label>
                    <p className="text-xs text-muted-foreground">Checkboxes, toggles, selections</p>
                  </div>
                </div>
                <input
                  type="color"
                  value={customColors.checkbox}
                  onChange={(e) => handleColorChange('checkbox', e.target.value)}
                  className="w-10 h-6 rounded border border-border cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-card/20 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: customColors.weekday, color: getContrastColor(customColors.weekday), borderColor: customColors.border }}
                  >
                    M
                  </div>
                  <div>
                    <label className="text-xs font-medium">Weekday</label>
                    <p className="text-xs text-muted-foreground">Days of the week highlights</p>
                  </div>
                </div>
                <input
                  type="color"
                  value={customColors.weekday}
                  onChange={(e) => handleColorChange('weekday', e.target.value)}
                  className="w-10 h-6 rounded border border-border cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-card/20 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: customColors.pomodoro, color: getContrastColor(customColors.pomodoro), borderColor: customColors.border }}
                  >
                    🍅
                  </div>
                  <div>
                    <label className="text-xs font-medium">Pomodoro</label>
                    <p className="text-xs text-muted-foreground">Pomodoro timer elements</p>
                  </div>
                </div>
                <input
                  type="color"
                  value={customColors.pomodoro}
                  onChange={(e) => handleColorChange('pomodoro', e.target.value)}
                  className="w-10 h-6 rounded border border-border cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingSection>
  );
};
