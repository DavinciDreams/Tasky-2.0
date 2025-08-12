/**
 * Time parser utility for handling relative time inputs
 * Converts relative times like "in 5 minutes" to actual HH:MM format
 */

import { addMinutes, addHours, addDays, format } from 'date-fns';

export interface ParsedTime {
  time: string; // HH:MM format
  date?: string; // For future: specific date if not today
  isRelative: boolean;
}

/**
 * Parse relative time strings into absolute time
 * Examples:
 * - "in 5 minutes" -> current time + 5 minutes
 * - "in 2 hours" -> current time + 2 hours
 * - "in 30 seconds" -> current time + 1 minute (minimum)
 */
export function parseRelativeTime(input: string): ParsedTime {
  const now = new Date();
  const lowerInput = input.toLowerCase();
  
  // Regular expressions for different time patterns
  const patterns = {
    minutes: /in\s+(\d+)\s+minute?s?/i,
    hours: /in\s+(\d+)\s+hour?s?/i,
    seconds: /in\s+(\d+)\s+second?s?/i,
    fromNow: /(\d+)\s+(minute?s?|hour?s?|second?s?)\s+from\s+now/i,
  };
  
  let targetTime = now;
  let isRelative = false;
  
  // Check for "in X minutes"
  const minuteMatch = lowerInput.match(patterns.minutes);
  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1], 10);
    targetTime = addMinutes(now, minutes);
    isRelative = true;
  }
  
  // Check for "in X hours"
  const hourMatch = lowerInput.match(patterns.hours);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    targetTime = addHours(now, hours);
    isRelative = true;
  }
  
  // Check for "in X seconds" (minimum 1 minute)
  const secondMatch = lowerInput.match(patterns.seconds);
  if (secondMatch) {
    const seconds = parseInt(secondMatch[1], 10);
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    targetTime = addMinutes(now, minutes);
    isRelative = true;
  }
  
  // Check for "X minutes/hours from now"
  const fromNowMatch = lowerInput.match(patterns.fromNow);
  if (fromNowMatch) {
    const amount = parseInt(fromNowMatch[1], 10);
    const unit = fromNowMatch[2].toLowerCase();
    
    if (unit.includes('minute')) {
      targetTime = addMinutes(now, amount);
    } else if (unit.includes('hour')) {
      targetTime = addHours(now, amount);
    } else if (unit.includes('second')) {
      const minutes = Math.max(1, Math.ceil(amount / 60));
      targetTime = addMinutes(now, minutes);
    }
    isRelative = true;
  }
  
  // If no relative pattern matched, try to parse as absolute time
  if (!isRelative) {
    // Check if it's already in HH:MM format
    const timeMatch = input.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return {
        time: input,
        isRelative: false,
      };
    }
    
    // Otherwise, return the input as-is and let the caller handle validation
    return {
      time: input,
      isRelative: false,
    };
  }
  
  // Format the target time as HH:MM
  const formattedTime = format(targetTime, 'HH:mm');
  
  return {
    time: formattedTime,
    isRelative: true,
  };
}

/**
 * Get current time in HH:MM format with timezone awareness
 */
export function getCurrentTime(timezone?: string): string {
  const now = new Date();
  
  // If timezone is provided, use it
  if (timezone) {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(now);
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      return `${hour}:${minute}`;
    } catch (error) {
      console.warn(`Invalid timezone ${timezone}, using system time`);
    }
  }
  
  // Default to system time
  return format(now, 'HH:mm');
}

/**
 * Calculate the time X minutes/hours from now
 */
export function getTimeFromNow(amount: number, unit: 'minutes' | 'hours' | 'days'): string {
  const now = new Date();
  let targetTime: Date;
  
  switch (unit) {
    case 'minutes':
      targetTime = addMinutes(now, amount);
      break;
    case 'hours':
      targetTime = addHours(now, amount);
      break;
    case 'days':
      targetTime = addDays(now, amount);
      break;
    default:
      targetTime = now;
  }
  
  return format(targetTime, 'HH:mm');
}
