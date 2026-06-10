import { useMemo, useState } from 'react';
import type { TimeEntry } from '../types';
import { formatTimer, formatHoursMinutes } from '../utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardProps {
  entries: TimeEntry[];
}

export default function Dashboard({ entries }: DashboardProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);

  // Get start of the targeted week (Monday)
  const monday = useMemo(() => {
    const today = new Date();
    // Add offset weeks
    today.setDate(today.getDate() + (weekOffset * 7));
    
    const day = today.getDay() || 7; // Convert Sunday (0) to 7
    const mon = new Date(today);
    mon.setDate(today.getDate() - day + 1);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [monday]);

  const weekEntries = useMemo(() => {
    const endOfWeek = new Date(monday);
    endOfWeek.setDate(monday.getDate() + 7);
    return entries.filter(e => e.startTime >= monday.getTime() && e.startTime < endOfWeek.getTime());
  }, [entries, monday]);

  const totalWeekTime = weekEntries.reduce((acc, curr) => acc + (curr.endTime - curr.startTime), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 border-b border-border bg-white flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>
          <div className="text-sm font-semibold tabular-nums text-slate-800 bg-slate-100 px-3 py-1 rounded-md">
            Total: {formatHoursMinutes(totalWeekTime)}
          </div>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-1 border border-border">
          <button 
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 border border-transparent hover:border-border shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setWeekOffset(0)}
            className="text-sm font-medium text-slate-700 hover:text-primary transition-colors px-4 py-1"
          >
            {weekOffset === 0 ? "This Week" : `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </button>

          <button 
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 border border-transparent hover:border-border shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container - Single scroll area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex border border-border bg-white rounded-lg overflow-hidden relative shadow-sm">
          {/* Time axis (left) */}
          <div className="w-12 border-r border-border bg-slate-50 flex flex-col relative z-10 shrink-0">
            {/* Empty header block to align with the days header */}
            <div className="h-12 border-b border-border sticky top-0 bg-slate-50 z-20"></div>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-[50px] text-[10px] text-slate-400 text-right pr-2 pt-1 font-medium border-b border-border/30 last:border-0">
                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
              </div>
            ))}
          </div>

          {/* Days columns */}
          <div className="flex-1 flex overflow-x-auto relative min-w-[300px]">
            {weekDays.map((d, i) => {
              const dayEntries = weekEntries.filter(e => new Date(e.startTime).toDateString() === d.toDateString());
              
              const isToday = new Date().toDateString() === d.toDateString();
              
              return (
                <div key={i} className={`flex-1 border-r border-border min-w-[40px] relative ${isToday ? 'bg-blue-50/30' : ''}`}>
                  {/* Header */}
                  <div className={`h-12 border-b border-border flex flex-col items-center justify-center sticky top-0 z-20 ${isToday ? 'bg-blue-50 text-primary' : 'bg-slate-50'}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-slate-700'}`}>{d.getDate()}</span>
                  </div>
                  
                  {/* Day blocks grid (24 hours * 50px) */}
                  <div className="relative h-[1200px]">
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div key={h} className="absolute w-full h-[50px] border-b border-border/20 pointer-events-none" style={{ top: h * 50 }} />
                    ))}
                    
                    {/* Current time indicator */}
                    {isToday && (
                      <div 
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-40 pointer-events-none" 
                        style={{ top: (new Date().getHours() * 60 + new Date().getMinutes()) / 60 * 50 }}
                      >
                        <div className="absolute -left-1 -top-[5px] w-2 h-2 bg-red-500 rounded-full" />
                      </div>
                    )}
                    
                    {/* Render time blocks */}
                    {dayEntries.filter(e => (e.endTime - e.startTime) >= 60000).map(entry => {
                      const startObj = new Date(entry.startTime);
                      const endObj = new Date(entry.endTime);
                      
                      const exactStartMinutes = startObj.getHours() * 60 + startObj.getMinutes() + (startObj.getSeconds() / 60);
                      const exactEndMinutes = endObj.getHours() * 60 + endObj.getMinutes() + (endObj.getSeconds() / 60);
                      
                      const top = (exactStartMinutes / 60) * 50;
                      const height = ((exactEndMinutes - exactStartMinutes) / 60) * 50;
                      
                      return (
                        <div 
                          key={entry.id}
                          onClick={() => setSelectedEntry(entry)}
                          className="absolute left-[2px] right-[2px] bg-primary/20 border-l-2 border-primary rounded-sm p-1 overflow-hidden shadow-sm hover:z-30 hover:bg-primary/30 transition-colors cursor-pointer group flex flex-col"
                          style={{ top: top, height }}
                        >
                          <div className="text-[9px] font-bold text-slate-800 leading-tight truncate">
                            {entry.projectName || 'Uncategorized'}
                          </div>
                          <div className="text-[9px] font-medium text-slate-600 leading-none mt-0.5 truncate hidden group-hover:block">
                            {formatHoursMinutes(entry.endTime - entry.startTime)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Entry Details Popup */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-5 w-64 border border-slate-200 relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedEntry(null)} 
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h3 className="font-bold text-slate-800 text-lg mb-1 pr-6">{selectedEntry.projectName || 'Uncategorized'}</h3>
            <div className="text-sm font-medium text-primary mb-3">
              {formatHoursMinutes(selectedEntry.endTime - selectedEntry.startTime)}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-md border border-border">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {new Date(selectedEntry.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedEntry.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
