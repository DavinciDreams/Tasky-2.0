import React from 'react';
import { createPortal } from 'react-dom';
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
  const _bgClass = tone === 'background' ? 'bg-background' : 'bg-card';
  const contentMaxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : (maxHeight || '70vh');
  return createPortal(
    <div className={`fixed inset-0 z-[2000] flex justify-center p-0 ${fullHeight ? 'items-stretch' : 'items-center'}`}>
      <div className={`absolute inset-0 ${backdropClass || 'bg-black/80'}`} onClick={onClose} />
      <div className={`relative w-full ${fullHeight ? 'h-full' : ''}`} style={{ maxWidth: maxWidthStyle }}>
        <div className={`bg-background rounded-none shadow-2xl overflow-hidden ${fullHeight ? 'h-full flex flex-col' : ''}`} style={{backgroundColor: 'hsl(var(--background))', backdropFilter: 'none'}}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-border" style={{backgroundColor: 'hsl(var(--background))'}}>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className={`${fullHeight ? 'flex-1' : ''} overflow-auto p-5 no-scrollbar`} style={fullHeight ? undefined : { maxHeight: contentMaxHeight }}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


