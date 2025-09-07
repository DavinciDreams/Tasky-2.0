import React from 'react';

// Simple utility function to combine class names
export function cn(...inputs: (string | undefined)[]): string {
  return inputs.filter(Boolean).join(' ');
}
