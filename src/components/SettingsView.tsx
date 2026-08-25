import React, { useState } from 'react';
import { TempleInfo, Department, SevaCategory, User, Designation } from '../types';
import {
  Settings,
  Briefcase,
  Landmark,
  Zap,
} from 'lucide-react';
import { DesignationsManager } from './DesignationsManager';
import { DepartmentsManager } from './DepartmentsManager';
import { IntegrationsManager } from './IntegrationsManager';
import { getRoleRank } from '../utils/roleHierarchy';

interface SettingsViewProps {
  temple: TempleInfo;
  departments: Department[];
  categories?: SevaCategory[];
  designations?: Designation[];
  currentUser: User;
  onUpdateTemple?: (data: Partial<TempleInfo>) => void;
  onCreateDesignation?: (data: Partial<Designation>) => Promise<void>;
  onUpdateDesignation?: (id: string, data: Partial<Designation>) => Promise<void>;
  onDeleteDesignation?: (id: string) => Promise<{ message: string; softDeactivated?: boolean }>;
  onCreateDepartment?: (data: Partial<Department>) => Promise<void>;
  onUpdateDepartment?: (id: string, data: Partial<Department>) => Promise<void>;
  onDeleteDepartment?: (id: string) => Promise<{ message: string; softDeactivated?: boolean }>;
  onRefreshCategories?: () => void;
  onProfileUpdated?: (updatedUser: User) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  temple,
  departments,
  categories = [],
  designations = [],
  currentUser,
  onUpdateTemple,
  onCreateDesignation,
  onUpdateDesignation,
  onDeleteDesignation,
  onCreateDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onRefreshCategories,
  onProfileUpdated,
}) => {
  // Check administrative privilege (Rank 4+ is Temple Admin / Super Admin)
  const isAdmin = getRoleRank(currentUser.role) >= 4;

  // Admin default tab is 'departments', non-admin default tab is 'integrations'
  const getInitialSettingsTab = (): string => {
    try {
      const rawHash = window.location.hash.replace(/^#\/?/, '');
      const parts = rawHash.split('?')[0].split('/');
      if (parts[0] === 'settings' && parts[1]) {
        return parts[1];
      }
      const saved = localStorage.getItem('sevya_settings_subtab');
      if (saved && (saved === 'departments' || saved === 'designations' || saved === 'integrations')) {
        if (!isAdmin && saved !== 'integrations') return 'integrations';
        return saved;
      }
    } catch {}
    return isAdmin ? 'departments' : 'integrations';
  };

  const [activeTab, setActiveTabState] = useState<string>(getInitialSettingsTab);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('sevya_settings_subtab', tab);
      window.location.hash = `settings/${tab}`;
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header Container */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-600" />
              {isAdmin ? 'Temple Settings & Configurations' : 'Integrations & Channels'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAdmin
                ? 'Manage organizational departments, custom designations, and channel integrations'
                : 'Configure personal connected channels and calendar syncing'}
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full w-fit">
            Role: <span className="capitalize">{currentUser.role?.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Dynamic Role-Based Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-0.5 overflow-x-auto">
          {isAdmin ? (
            /* ================= ADMIN TABS ================= */
            <>
              <button
                onClick={() => setActiveTab('departments')}
                className={`py-2 px-4 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'departments'
                    ? 'border-amber-600 text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Landmark className="w-4 h-4" /> Departments ({departments.length})
              </button>
              <button
                onClick={() => setActiveTab('designations')}
                className={`py-2 px-4 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'designations'
                    ? 'border-amber-600 text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Custom Designations ({designations.length})
              </button>
              <button
                onClick={() => setActiveTab('integrations')}
                className={`py-2 px-4 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'integrations'
                    ? 'border-amber-600 text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-600" /> Integrations & Channels
              </button>
            </>
          ) : (
            /* ================= MEMBER & NON-ADMIN TABS ================= */
            <>
              <button
                onClick={() => setActiveTab('integrations')}
                className={`py-2 px-4 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'integrations'
                    ? 'border-amber-600 text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-600" /> Integrations & Channels
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. INTEGRATIONS (Accessible to all authenticated roles) */}
      {activeTab === 'integrations' && (
        <IntegrationsManager currentUser={currentUser} />
      )}

      {/* 2. ADMIN ONLY TABS (Departments, Designations) */}
      {isAdmin && activeTab === 'departments' && (
        <DepartmentsManager
          departments={departments}
          currentUser={currentUser}
          onCreateDepartment={onCreateDepartment || (async () => {})}
          onUpdateDepartment={onUpdateDepartment || (async () => {})}
          onDeleteDepartment={onDeleteDepartment || (async () => ({ message: '' }))}
        />
      )}

      {isAdmin && activeTab === 'designations' && (
        <DesignationsManager
          designations={designations}
          currentUser={currentUser}
          onCreateDesignation={onCreateDesignation || (async () => {})}
          onUpdateDesignation={onUpdateDesignation || (async () => {})}
          onDeleteDesignation={onDeleteDesignation || (async () => ({ message: '' }))}
        />
      )}
    </div>
  );
};

