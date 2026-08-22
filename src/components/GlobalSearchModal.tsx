import React, { useState, useEffect } from 'react';
import { Search, X, CheckSquare, FolderKanban, Calendar, Users, Landmark, ArrowRight, Shield } from 'lucide-react';
import { Task, Project, Meeting, User, Department } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  meetings: Meeting[];
  users: User[];
  departments: Department[];
  onNavigate: (tab: string, entityId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  meetings,
  users,
  departments,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredTasks = q
    ? (tasks || []).filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      )
    : [];

  const filteredProjects = q
    ? (projects || []).filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      )
    : [];

  const filteredMeetings = q
    ? (meetings || []).filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.agenda && m.agenda.toLowerCase().includes(q)) ||
          (m.location && m.location.toLowerCase().includes(q))
      )
    : [];

  const filteredUsers = q
    ? (users || []).filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      )
    : [];

  const filteredDepts = q
    ? (departments || []).filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
      )
    : [];

  const totalResults =
    filteredTasks.length +
    filteredProjects.length +
    filteredMeetings.length +
    filteredUsers.length +
    filteredDepts.length;

  return (
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-black/80 backdrop-blur-xs z-50 flex items-start justify-center pt-6 sm:pt-20 px-3 sm:px-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search tasks, projects, meetings, sevaits, departments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!q ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
              <Search className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Global Search across SEVYA</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Type keywords to query Tasks, Projects, Meetings, Sevaits, or Departments.
              </p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching records found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Try searching with a different keyword like "puja", "bhandara", or a name.</p>
            </div>
          ) : (
            <>
              {/* Tasks */}
              {filteredTasks.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Tasks ({filteredTasks.length})
                  </h4>
                  <div className="space-y-1.5">
                    {filteredTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onNavigate('tasks', t.id);
                          onClose();
                        }}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 rounded-xl border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between group transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400">{t.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{t.description || 'No description'}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {filteredProjects.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Projects ({filteredProjects.length})
                  </h4>
                  <div className="space-y-1.5">
                    {filteredProjects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigate('projects', p.id);
                          onClose();
                        }}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 rounded-xl border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between group transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">{p.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.category}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meetings */}
              {filteredMeetings.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Meetings ({filteredMeetings.length})
                  </h4>
                  <div className="space-y-1.5">
                    {filteredMeetings.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          onNavigate('meetings', m.id);
                          onClose();
                        }}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50/60 dark:hover:bg-purple-950/40 rounded-xl border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between group transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-400">{m.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.date} • {m.location}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Users */}
              {filteredUsers.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Users & Sevaits ({filteredUsers.length})
                  </h4>
                  <div className="space-y-1.5">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          onNavigate('users', u.id);
                          onClose();
                        }}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 rounded-xl border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between group transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{u.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.email} • {u.role}</p>
                        </div>
                        <Shield className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Departments */}
              {filteredDepts.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Departments ({filteredDepts.length})
                  </h4>
                  <div className="space-y-1.5">
                    {filteredDepts.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          onNavigate('seva', d.id);
                          onClose();
                        }}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 rounded-xl border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between group transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400">{d.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{d.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Keyboard Footer Hint */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded text-[10px] font-mono shadow-2xs text-slate-700 dark:text-slate-200">ESC</kbd> to exit search
        </div>
      </div>
    </div>
  );
};
