import { useState, useEffect, useRef } from 'react';
import { Play, Square, Plus, Trash2 } from 'lucide-react';
import type { TimeEntry, Project } from '../types';
import { formatTimer, formatHoursMinutes } from '../utils';

interface TimerProps {
  entries: TimeEntry[];
  setEntries: (entries: TimeEntry[]) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
}

export default function Timer({ entries, setEntries, projects, setProjects }: TimerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem('timer_state');
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state && state.isRecording && state.startTime) {
          setIsRecording(true);
          setStartTime(state.startTime);
          if (state.projectId) setSelectedProjectId(state.projectId);
        }
      }
      
      const savedProject = localStorage.getItem('timer_selected_project');
      if (savedProject && savedProject !== 'null' && !selectedProjectId) {
        setSelectedProjectId(savedProject);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleRecordToggle = () => {
    const validProject = projects.find(p => p.id === selectedProjectId);
    if (!isRecording && !validProject) {
      setIsCreatingProject(true);
      return;
    }

    if (isRecording && startTime) {
      // Stop
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const selectedProj = projects.find(p => p.id === selectedProjectId);
      const newEntry: TimeEntry = {
        id: Date.now().toString(),
        startTime,
        endTime,
        projectName: selectedProj ? selectedProj.name : undefined
      };
      
      setEntries([newEntry, ...entries]);
      
      setIsRecording(false);
      setStartTime(null);
      localStorage.removeItem('timer_state');
    } else {
      // Start
      const now = Date.now();
      setIsRecording(true);
      setStartTime(now);
      setCurrentTime(now);
      localStorage.setItem('timer_state', JSON.stringify({ 
        isRecording: true, 
        startTime: now,
        projectId: selectedProjectId 
      }));
    }
  };

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    localStorage.setItem('timer_selected_project', id);
  };

  const handlePlayProject = (id: string) => {
    if (isRecording) {
      if (selectedProjectId === id) {
        handleRecordToggle(); // Just stop
        return;
      } else {
        // Stop current
        const endTime = Date.now();
        const duration = endTime - startTime!;
        
        const selectedProj = projects.find(p => p.id === selectedProjectId);
        const newEntry: TimeEntry = {
          id: Date.now().toString(),
          startTime: startTime!,
          endTime,
          projectName: selectedProj ? selectedProj.name : undefined
        };
        setEntries([newEntry, ...entries]);
        
        // Start new
        setSelectedProjectId(id);
        localStorage.setItem('timer_selected_project', id);
        
        const now = Date.now();
        setIsRecording(true);
        setStartTime(now);
        setCurrentTime(now);
        localStorage.setItem('timer_state', JSON.stringify({ 
          isRecording: true, 
          startTime: now,
          projectId: id 
        }));
        return;
      }
    }
    
    // If not recording, select and start
    setSelectedProjectId(id);
    localStorage.setItem('timer_selected_project', id);
    
    const now = Date.now();
    setIsRecording(true);
    setStartTime(now);
    setCurrentTime(now);
    localStorage.setItem('timer_state', JSON.stringify({ 
      isRecording: true, 
      startTime: now,
      projectId: id 
    }));
  };

  // Auto-select valid project if none is selected
  useEffect(() => {
    const validProject = projects.find(p => p.id === selectedProjectId);
    if (!validProject && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
      localStorage.setItem('timer_selected_project', projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim()
    };
    
    setProjects([...projects, newProject]);
    setNewProjectName('');
    setIsCreatingProject(false);
    
    setSelectedProjectId(newProject.id);
    localStorage.setItem('timer_selected_project', newProject.id);

    if (isRecording && startTime) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const selectedProj = projects.find(p => p.id === selectedProjectId);
      const newEntry: TimeEntry = {
        id: Date.now().toString(),
        startTime,
        endTime,
        projectName: selectedProj ? selectedProj.name : undefined
      };
      setEntries([newEntry, ...entries]);
    }
    
    const now = Date.now();
    setIsRecording(true);
    setStartTime(now);
    setCurrentTime(now);
    localStorage.setItem('timer_state', JSON.stringify({ 
      isRecording: true, 
      startTime: now,
      projectId: newProject.id 
    }));
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      const newProjects = projects.filter(p => p.id !== id);
      setProjects(newProjects);
      if (selectedProjectId === id) {
        const newSelectedId = newProjects.length > 0 ? newProjects[0].id : null;
        setSelectedProjectId(newSelectedId);
        if (newSelectedId) {
          localStorage.setItem('timer_selected_project', newSelectedId);
        } else {
          localStorage.removeItem('timer_selected_project');
        }
      }
    }
  };

  const currentDuration = isRecording && startTime ? currentTime - startTime : 0;
  
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayTotal = entries
    .filter(e => e.startTime >= todayStart.getTime())
    .reduce((acc, curr) => acc + (curr.endTime - curr.startTime), 0) + currentDuration;

  const selectedProjectObj = projects.find(p => p.id === selectedProjectId);

  const selectedProjectTodayTime = entries
    .filter(e => e.startTime >= todayStart.getTime() && selectedProjectObj && e.projectName === selectedProjectObj.name)
    .reduce((acc, curr) => acc + (curr.endTime - curr.startTime), 0) + (isRecording && selectedProjectObj ? currentDuration : 0);

  // IPC Communication with Main Process Tray
  const handleToggleRef = useRef(handleRecordToggle);
  handleToggleRef.current = handleRecordToggle;

  useEffect(() => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('update-tray', formatTimer(selectedProjectTodayTime));
      } catch (e) {}
    }
  }, [selectedProjectTodayTime]);

  useEffect(() => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const listener = () => {
          handleToggleRef.current();
        };
        ipcRenderer.on('toggle-timer', listener);
        return () => {
          ipcRenderer.removeListener('toggle-timer', listener);
        };
      } catch (e) {}
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Timer Area */}
      <div className="pt-6 pb-2 flex flex-col items-center bg-white z-10 relative">
        <div className="bg-[#2A313C] text-white font-sans text-xl min-w-[170px] h-[48px] flex items-center justify-center rounded-xl font-bold tracking-widest shadow-sm mb-3 tabular-nums">
          {formatTimer(selectedProjectTodayTime)}
        </div>
        
        <div className="text-lg font-bold text-slate-800 mb-6 min-h-[28px]">
          {selectedProjectObj ? selectedProjectObj.name : 'No project selected'}
        </div>
        
        <button
          onClick={handleRecordToggle}
          className="w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all active:scale-95 z-20 bg-[#2575F5] text-white hover:bg-[#1A62D6] focus:outline-none"
        >
          {isRecording ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="16" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="ml-1">
              <path d="M6.5 4.5L20 12L6.5 19.5V4.5Z" />
            </svg>
          )}
        </button>

        <div className="w-full mt-4 flex justify-center text-xs font-medium text-slate-500">
          <span>Today: {formatHoursMinutes(todayTotal)}</span>
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white border-t border-border mt-4">
        {/* Organization Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#EFEFEF] border-b border-border sticky top-0 z-10">
          <span className="font-bold text-slate-800 text-sm">
            Add Project
          </span>
          <button 
            onClick={() => setIsCreatingProject(!isCreatingProject)}
            className="w-5 h-5 rounded-full bg-[#2575F5] text-white flex items-center justify-center hover:bg-[#1A62D6] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Create Project Modal */}
        {isCreatingProject && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
              <div className="px-4 py-4 text-center font-bold text-slate-800 text-base">
                Create Project
              </div>
              <div className="p-4">
                <form onSubmit={handleCreateProject}>
                  <div className="flex items-center gap-3 mb-6">
                    <label className="text-sm font-medium text-slate-700 w-12 text-right">Name :</label>
                    <input 
                      type="text" 
                      autoFocus
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded border border-border focus:outline-none focus:border-[#2575F5] focus:ring-1 focus:ring-[#2575F5]"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsCreatingProject(false);
                        setNewProjectName('');
                      }}
                      className="px-4 py-1.5 text-sm font-medium text-slate-600 bg-white border border-border rounded hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={!newProjectName.trim()}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-[#2575F5] rounded hover:bg-[#1A62D6] disabled:opacity-50 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex flex-col">
          {projects.map((project) => {
            const isSelected = selectedProjectId === project.id;
            const isProjRecording = isRecording && isSelected;
            
            const projTodayTime = entries
              .filter(e => e.startTime >= todayStart.getTime() && e.projectName === project.name)
              .reduce((acc, curr) => acc + (curr.endTime - curr.startTime), 0) + (isProjRecording ? currentDuration : 0);

            return (
              <div
                key={project.id}
                onClick={() => handleSelectProject(project.id)}
                className={`group flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#CBE3FA]' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayProject(project.id);
                    }}
                    className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors ${
                      isProjRecording ? 'bg-white text-[#2575F5]' : 'bg-[#2575F5] text-white hover:bg-[#1A62D6]'
                    }`}
                  >
                    {isProjRecording ? <Square className="w-2.5 h-2.5 fill-current text-[#2575F5]" /> : <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />}
                  </button>
                  <span className={`text-[13px] ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                    {project.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-slate-700">
                    {formatHoursMinutes(projTodayTime)}
                  </span>
                  <button
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
