// CSS module augmentation for Electron-specific styles
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
    wordBreak?: 'normal' | 'break-all' | 'keep-all' | 'break-word' | 'auto-phrase';
    overflowWrap?: 'normal' | 'break-word' | 'anywhere';
    maxWidth?: string | number;
    maxHeight?: string | number;
    backgroundColor?: string;
    color?: string;
  }
}

export {};
