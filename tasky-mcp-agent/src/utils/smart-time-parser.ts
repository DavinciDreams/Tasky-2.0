/**
 * Smart time parser for handling natural language time inputs
 * This is what the AI assistant will use to interpret user requests
 */

import { parseRelativeTime, getCurrentTime, getTimeFromNow } from './time-parser.js';

export interface SmartTimeResult {
  time: string; // HH:MM format
  days: string[]; // Days of the week
  isOneTime: boolean; // Whether this should be a one-time reminder
  interpretation: string; // How we interpreted the request
}

/**
 * Parse smart time inputs from natural language
 * Examples:
 * - "3 minutes from now" -> current time + 3 minutes, today only
 * - "tomorrow at 9am" -> 09:00, tomorrow only
 * - "every day at 14:00" -> 14:00, all days
 * - "weekdays at 8:30" -> 08:30, Monday-Friday
 */
export function parseSmartTime(input: string, timezone?: string): SmartTimeResult {
  const lowerInput = input.toLowerCase();
  const currentTime = getCurrentTime(timezone);
  
  // Get current day of week
  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[currentDayIndex];
  
  // Check for relative time (in X minutes/hours)
  if (lowerInput.includes('in ') || lowerInput.includes('from now')) {
    const parsed = parseRelativeTime(input);
    if (parsed.isRelative) {
      return {
        time: parsed.time,
        days: [currentDay], // Only today
        isOneTime: true,
        interpretation: `One-time reminder at ${parsed.time} today`,
      };
    }
  }
  
  // Check for "tomorrow"
  if (lowerInput.includes('tomorrow')) {
    const timeMatch = lowerInput.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    let time = '09:00'; // Default time
    
    if (timeMatch) {
      const hour = parseInt(timeMatch[1], 10);
      const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const isPM = timeMatch[3] === 'pm';
      
      let hour24 = hour;
      if (isPM && hour !== 12) hour24 += 12;
      if (!isPM && hour === 12) hour24 = 0;
      
      time = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
    
    const tomorrowIndex = (currentDayIndex + 1) % 7;
    return {
      time,
      days: [dayNames[tomorrowIndex]],
      isOneTime: true,
      interpretation: `One-time reminder at ${time} tomorrow (${dayNames[tomorrowIndex]})`,
    };
  }
  
  // Check for "every day" or "daily"
  if (lowerInput.includes('every day') || lowerInput.includes('daily')) {
    const timeMatch = lowerInput.match(/(\d{1,2}):(\d{2})/);
    const time = timeMatch ? input.match(/\d{1,2}:\d{2}/)![0] : '09:00';
    
    return {
      time,
      days: dayNames,
      isOneTime: false,
      interpretation: `Daily reminder at ${time}`,
    };
  }
  
  // Check for "weekdays"
  if (lowerInput.includes('weekday')) {
    const timeMatch = lowerInput.match(/(\d{1,2}):(\d{2})/);
    const time = timeMatch ? input.match(/\d{1,2}:\d{2}/)![0] : '09:00';
    
    return {
      time,
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      isOneTime: false,
      interpretation: `Weekday reminder at ${time}`,
    };
  }
  
  // Check for "weekends"
  if (lowerInput.includes('weekend')) {
    const timeMatch = lowerInput.match(/(\d{1,2}):(\d{2})/);
    const time = timeMatch ? input.match(/\d{1,2}:\d{2}/)![0] : '10:00';
    
    return {
      time,
      days: ['saturday', 'sunday'],
      isOneTime: false,
      interpretation: `Weekend reminder at ${time}`,
    };
  }
  
  // Check for specific day names
  const foundDays: string[] = [];
  for (const day of dayNames) {
    if (lowerInput.includes(day)) {
      foundDays.push(day);
    }
  }
  
  if (foundDays.length > 0) {
    const timeMatch = lowerInput.match(/(\d{1,2}):(\d{2})/);
    const time = timeMatch ? input.match(/\d{1,2}:\d{2}/)![0] : '09:00';
    
    // If only one day mentioned and it's not "every", make it one-time
    const isOneTime = foundDays.length === 1 && !lowerInput.includes('every');
    
    return {
      time,
      days: foundDays,
      isOneTime,
      interpretation: isOneTime 
        ? `One-time reminder at ${time} on ${foundDays.join(', ')}`
        : `Recurring reminder at ${time} on ${foundDays.join(', ')}`,
    };
  }
  
  // Default: parse as time for today
  const timeMatch = input.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return {
      time: input,
      days: [currentDay],
      isOneTime: true,
      interpretation: `One-time reminder at ${input} today`,
    };
  }
  
  // Fallback: current time + 5 minutes as a one-time reminder
  const fallbackTime = getTimeFromNow(5, 'minutes');
  return {
    time: fallbackTime,
    days: [currentDay],
    isOneTime: true,
    interpretation: `One-time reminder at ${fallbackTime} today (defaulted to 5 minutes from now)`,
  };
}
