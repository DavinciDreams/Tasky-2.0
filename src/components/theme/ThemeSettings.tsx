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
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ settings, onSettingChange }) => {
  // Validate and sanitize theme colors
  const getDefaultColors = (): SimpleThemeColors => ({
    background: '#F3F4F6', // Default grey background
    foreground: '#1F2937',  // Dark grey text
    border: '#D1D5DB',      // Light grey border
    button: '#3B82F6'       // Default blue button
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
        </div>
      </div>
    </SettingSection>
  );
};
