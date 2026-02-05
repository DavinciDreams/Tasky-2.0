import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeManager } from './theme-manager';

describe('ThemeManager', () => {
  let tm: ThemeManager;

  beforeEach(() => {
    // Reset singleton between tests by accessing a fresh instance
    // The singleton pattern means getInstance always returns the same one,
    // so we use it directly.
    tm = ThemeManager.getInstance();
  });

  describe('getPresets()', () => {
    it('returns exactly 6 presets', () => {
      const presets = tm.getPresets();
      expect(presets).toHaveLength(6);
    });

    it('each preset has name, description, and colors', () => {
      const presets = tm.getPresets();
      for (const preset of presets) {
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.colors).toBeDefined();
        expect(preset.colors.primary).toBeTruthy();
        expect(preset.colors.background).toBeTruthy();
      }
    });

    it('includes expected preset names', () => {
      const names = tm.getPresets().map(p => p.name);
      expect(names).toContain('Perano Purple');
      expect(names).toContain('Ocean Blue');
      expect(names).toContain('Forest Green');
      expect(names).toContain('Sunset Orange');
      expect(names).toContain('Midnight Dark');
      expect(names).toContain('Rose Gold');
    });
  });

  describe('hexToHsl()', () => {
    it('converts pure red correctly', () => {
      const hsl = tm.hexToHsl('#ff0000');
      expect(hsl).toBe('0 100% 50%');
    });

    it('converts pure green correctly', () => {
      const hsl = tm.hexToHsl('#00ff00');
      expect(hsl).toBe('120 100% 50%');
    });

    it('converts pure blue correctly', () => {
      const hsl = tm.hexToHsl('#0000ff');
      expect(hsl).toBe('240 100% 50%');
    });

    it('converts white correctly', () => {
      const hsl = tm.hexToHsl('#ffffff');
      expect(hsl).toBe('0 0% 100%');
    });

    it('converts black correctly', () => {
      const hsl = tm.hexToHsl('#000000');
      expect(hsl).toBe('0 0% 0%');
    });
  });

  describe('hslToHex()', () => {
    it('converts pure red HSL to hex', () => {
      const hex = tm.hslToHex('0 100% 50%');
      expect(hex).toBe('#ff0000');
    });

    it('converts pure green HSL to hex', () => {
      const hex = tm.hslToHex('120 100% 50%');
      expect(hex).toBe('#00ff00');
    });

    it('converts pure blue HSL to hex', () => {
      const hex = tm.hslToHex('240 100% 50%');
      expect(hex).toBe('#0000ff');
    });

    it('converts white HSL to hex', () => {
      const hex = tm.hslToHex('0 0% 100%');
      expect(hex).toBe('#ffffff');
    });

    it('converts black HSL to hex', () => {
      const hex = tm.hslToHex('0 0% 0%');
      expect(hex).toBe('#000000');
    });
  });

  describe('round-trip hex -> hsl -> hex', () => {
    const testColors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000', '#808080'];

    for (const hex of testColors) {
      it(`round-trips ${hex}`, () => {
        const hsl = tm.hexToHsl(hex);
        const roundTripped = tm.hslToHex(hsl);
        expect(roundTripped).toBe(hex);
      });
    }
  });

  describe('applyTheme()', () => {
    it('sets CSS custom properties on document root', () => {
      const colors = tm.getPresets()[0].colors;
      tm.applyTheme(colors);

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--primary')).toBe(colors.primary);
      expect(root.style.getPropertyValue('--background')).toBe(colors.background);
      expect(root.style.getPropertyValue('--foreground')).toBe(colors.foreground);
      expect(root.style.getPropertyValue('--card')).toBe(colors.card);
      expect(root.style.getPropertyValue('--border')).toBe(colors.border);
      expect(root.style.getPropertyValue('--success')).toBe(colors.success);
      expect(root.style.getPropertyValue('--warning')).toBe(colors.warning);
    });
  });
});
