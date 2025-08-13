import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  maxWidth?: number | string; // default: 560px
  maxHeight?: number | string; // default: 70vh
  tone?: 'card' | 'background'; // background makes it darker
  backdropClass?: string; // customize backdrop darkness
  fullHeight?: boolean; // when true, modal fills parent height (header→footer)
  children: React.ReactNode;
}

export function Modal({ open, title, onClose, maxWidth = 560, maxHeight, tone = 'card', backdropClass, fullHeight, children }: ModalProps) {
  if (!open) return null;
  const maxWidthStyle = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
  const bgClass = tone === 'background' ? 'bg-background' : 'bg-card';
  const contentMaxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : (maxHeight || '70vh');
  return (
    <div className={`absolute inset-0 z-50 flex justify-center p-0 ${fullHeight ? 'items-stretch' : 'items-center'}`}>
      <div className={`absolute inset-0 ${backdropClass || 'bg-black/80'}`} onClick={onClose} />
      <div className={`relative w-full ${fullHeight ? 'h-full' : ''}`} style={{ maxWidth: maxWidthStyle }}>
        <div className={`${bgClass} rounded-none shadow-2xl overflow-hidden ${fullHeight ? 'h-full flex flex-col' : ''}`}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
            <div className="text-sm font-semibold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-secondary/30 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className={`${fullHeight ? 'flex-1' : ''} overflow-auto p-5`} style={fullHeight ? undefined : { maxHeight: contentMaxHeight }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}


