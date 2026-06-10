import { useState, useEffect } from 'react';
import Timer from './components/Timer';
import Dashboard from './components/Dashboard';
import type { TimeEntry, Project } from './types';
import { LayoutDashboard, Clock, FileText } from 'lucide-react';
import InvoiceManager from './components/InvoiceManager';

export default function App() {
  const [activeTab, setActiveTab] = useState<'timer' | 'dashboard' | 'invoice'>('timer');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        if (activeTab === 'invoice') {
          ipcRenderer.send('resize-window', { width: 1200, height: 850 });
        } else if (activeTab === 'dashboard') {
          ipcRenderer.send('resize-window', { width: 800, height: 750 });
        } else {
          ipcRenderer.send('resize-window', { width: 320, height: 750 });
        }
      } catch (e) {
        console.log('Not in electron env');
      }
    }
  }, [activeTab]);

  // Load state from local storage on mount
  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem('timer_entries');
      if (savedEntries) {
        setEntries(JSON.parse(savedEntries) || []);
      }
      
      const savedProjects = localStorage.getItem('timer_projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects) || []);
      }
    } catch (e) {
      console.error('Failed to load state', e);
      setEntries([]);
      setProjects([]);
    }
  }, []);

  // Save entries when they change
  useEffect(() => {
    localStorage.setItem('timer_entries', JSON.stringify(entries));
  }, [entries]);

  // Save projects when they change
  useEffect(() => {
    localStorage.setItem('timer_projects', JSON.stringify(projects));
  }, [projects]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Custom Title Bar Drag Region */}
      <div 
        className="h-[28px] w-full bg-white shrink-0 flex items-center justify-center relative z-50 border-b border-border/50" 
        style={{ WebkitAppRegion: 'drag' as any }}
      >
        <span className="text-[11px] font-semibold text-slate-400">LabelWatch</span>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex bg-white border-b border-border z-20 shrink-0">
        <button
          onClick={() => setActiveTab('timer')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors focus:outline-none ${
            activeTab === 'timer' 
              ? 'text-primary border-b-2 border-primary bg-primary/5' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Timer
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors focus:outline-none ${
            activeTab === 'dashboard' 
              ? 'text-primary border-b-2 border-primary bg-primary/5' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        {activeTab !== 'timer' && (
          <button
            onClick={() => setActiveTab('invoice')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors focus:outline-none ${
              activeTab === 'invoice' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Invoice
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'timer' && (
          <Timer 
            entries={entries} 
            setEntries={setEntries} 
            projects={projects}
            setProjects={setProjects}
          />
        )}
        {activeTab === 'dashboard' && <Dashboard entries={entries} />}
        {activeTab === 'invoice' && <InvoiceManager entries={entries} projects={projects} />}
      </div>
    </div>
  );
}
