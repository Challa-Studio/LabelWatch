import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const dateStr = start.toLocaleDateString('en-US', options);
  
  const timeOptions: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  };
  
  const startTime = start.toLocaleTimeString('en-US', timeOptions);
  const endTime = end.toLocaleTimeString('en-US', timeOptions);
  
  const diffMs = end.getTime() - start.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  
  let durationStr = '';
  if (diffHrs < 1) {
    const diffMins = Math.round(diffMs / (1000 * 60));
    durationStr = `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
  } else {
    // Format nicely like 1.5 hours if needed, or round to 1 decimal
    const rounded = Math.round(diffHrs * 10) / 10;
    durationStr = `${rounded} hour${rounded !== 1 ? 's' : ''}`;
  }
  
  return `${dateStr} ${startTime}-${endTime} (${durationStr})`;
}

export function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatHoursMinutes(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return `${hours}:${pad(minutes)}`;
}
