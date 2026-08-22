import React, { useState, useEffect } from 'react';
import { Task, Project, Department, User, AuditLog, TempleInfo } from '../types';
import { FileText, Download, Printer, Shield, CheckCircle2, AlertTriangle, Layers, Calendar, Users, Building, BarChart3 } from 'lucide-react';
import { formatDate, formatAuditDateTime } from '../utils/taskUtils';
import { api } from '../services/api';

interface ReportsViewProps {
  tasks: Task[];
  projects: Project[];
  departments: Department[];
  users: User[];
  auditLogs: AuditLog[];
  temple: TempleInfo;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  tasks,
  projects,
  departments,
  users,
  auditLogs,
  temple,
}) => {
  const [activeTab, setActiveTabState] = useState<'audit' | 'report' | 'person_workload' | 'dept_workload'>(() => {
    try {
      const rawHash = window.location.hash.replace(/^#\/?/, '');
      const parts = rawHash.split('?')[0].split('/');
      if (parts[0] === 'reports' && ['audit', 'report', 'person_workload', 'dept_workload'].includes(parts[1])) {
        return parts[1] as 'audit' | 'report' | 'person_workload' | 'dept_workload';
      }
      const saved = localStorage.getItem('sevya_reports_tab');
      if (saved && ['audit', 'report', 'person_workload', 'dept_workload'].includes(saved)) {
        return saved as 'audit' | 'report' | 'person_workload' | 'dept_workload';
      }
    } catch {}
    return 'audit';
  });

  const setActiveTab = (tab: 'audit' | 'report' | 'person_workload' | 'dept_workload') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('sevya_reports_tab', tab);
      window.location.hash = `reports/${tab}`;
    } catch {}
  };
  const [personWorkloads, setPersonWorkloads] = useState<any[]>([]);
  const [deptWorkloads, setDeptWorkloads] = useState<any[]>([]);

  useEffect(() => {
    api.getWorkloadPerson().then(setPersonWorkloads).catch(() => {});
    api.getWorkloadDepartment().then(setDeptWorkloads).catch(() => {});
  }, [tasks]);

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `sevya_report_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'audit') {
      filename = `sevya_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Log ID', 'User Name', 'User Role', 'Action', 'Details', 'Timestamp'];
      rows = (auditLogs || []).map((l) => [
        l.id,
        `"${(l.actorUserName || l.userName || 'System').replace(/"/g, '""')}"`,
        l.actorUserRole || l.userRole || 'Admin',
        l.action || '',
        `"${(l.details || '').replace(/"/g, '""')}"`,
        formatAuditDateTime(l.createdAt || l.timestamp),
      ]);
    } else if (activeTab === 'person_workload') {
      filename = `sevya_person_workload_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Member Name', 'Role', 'Total Assigned', 'Pending', 'In Progress', 'Under Review', 'Completed', 'Overdue', 'Completion Rate %'];
      const currentList = personWorkloads.length > 0 ? personWorkloads : users.map(u => {
        const userTasks = tasks.filter(t => t.assignedTo === u.id || t.ownerId === u.id);
        const total = userTasks.length;
        const completed = userTasks.filter(t => t.status === 'completed').length;
        return {
          userName: u.name,
          userRole: u.role,
          totalAssigned: total,
          pending: userTasks.filter(t => t.status === 'pending').length,
          inProgress: userTasks.filter(t => t.status === 'in_progress').length,
          review: userTasks.filter(t => t.status === 'review').length,
          completed,
          overdue: userTasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]).length,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });
      rows = currentList.map((p) => [
        `"${p.userName.replace(/"/g, '""')}"`,
        p.userRole,
        p.totalAssigned,
        p.pending,
        p.inProgress,
        p.review,
        p.completed,
        p.overdue,
        `${p.completionRate}%`,
      ]);
    } else if (activeTab === 'dept_workload') {
      filename = `sevya_department_workload_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Department Name', 'Total Tasks', 'Pending', 'Completed', 'Overdue', 'Completion Rate %'];
      const currentDeptList = deptWorkloads.length > 0 ? deptWorkloads : departments.map(d => {
        const dTasks = tasks.filter(t => t.departmentId === d.id);
        const total = dTasks.length;
        const completed = dTasks.filter(t => t.status === 'completed').length;
        return {
          departmentName: d.name,
          totalTasks: total,
          pendingTasks: dTasks.filter(t => t.status !== 'completed').length,
          completedTasks: completed,
          overdueTasks: dTasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]).length,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });
      rows = currentDeptList.map((d) => [
        `"${d.departmentName.replace(/"/g, '""')}"`,
        d.totalTasks,
        d.pendingTasks,
        d.completedTasks,
        d.overdueTasks,
        `${d.completionRate}%`,
      ]);
    } else {
      filename = `sevya_task_board_report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Task ID', 'Title', 'Department', 'Owner', 'Priority', 'Status', 'Due Date', 'Created At'];
      rows = tasks.map((t) => {
        const dept = departments.find((d) => d.id === t.departmentId)?.name || '';
        const owner = users.find((u) => u.id === t.ownerId || u.id === t.assignedTo)?.name || '';
        return [
          t.id,
          `"${t.title.replace(/"/g, '""')}"`,
          `"${dept}"`,
          `"${owner}"`,
          t.priority,
          t.status,
          t.dueDate,
          t.createdAt,
        ];
      });
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const overdueTasks = tasks.filter((t) => t.status !== 'completed' && t.dueDate < new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600 shrink-0" />
            Audit Trail & Workload Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time audit logging, trustee board summaries, and person & department workload breakdown
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-2.5 py-1.5 sm:p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Audit Trail
            </button>
            <button
              onClick={() => setActiveTab('person_workload')}
              className={`px-2.5 py-1.5 sm:p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'person_workload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-600" /> Person Workload
            </button>
            <button
              onClick={() => setActiveTab('dept_workload')}
              className={`px-2.5 py-1.5 sm:p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'dept_workload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-blue-600" /> Dept Workload
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-2.5 py-1.5 sm:p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'report' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Board Report
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadCsv}
              className="flex-1 sm:flex-initial py-2 px-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-800"
              title="Export Current View to CSV"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={handlePrintReport}
              className="flex-1 sm:flex-initial py-2 px-3 bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-amber-700"
              title="Print or Save View as PDF"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                Immutable System Audit Logs
              </h3>
              <p className="text-xs text-slate-500">Tracking every user edit, task creation, and status transition</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 shrink-0">{(auditLogs || []).length} Records</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(auditLogs || []).length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No system audit logs recorded yet.
              </div>
            ) : (
              (auditLogs || []).map((log) => {
                const actorName = log.actorUserName || log.userName || 'System';
                const actorRole = log.actorUserRole || log.userRole || 'Admin';
                const formattedTime = formatAuditDateTime(log.createdAt || log.timestamp);

                return (
                  <div key={log.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{actorName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                          {actorRole}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                          {log.action}
                        </span>
                        {log.entityType && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            [{log.entityType}]
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 break-words">{log.details}</p>
                    </div>

                    <span className="text-[11px] font-medium text-slate-500 shrink-0">
                      {formattedTime}
                    </span>
                  </div>
                );
              }))}
          </div>
        </div>
      )}

      {activeTab === 'person_workload' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600 shrink-0" />
                Person-Wise Workload Analytics
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Task load distribution, pending duties, and completion rates per team member
              </p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 sm:px-3 py-1 rounded-full border border-amber-200 shrink-0">
              {personWorkloads.length || users.length} Members
            </span>
          </div>

          {/* Mobile Card List for Member Workloads */}
          <div className="block md:hidden space-y-3">
            {(personWorkloads.length > 0 ? personWorkloads : users.map(u => {
              const userTasks = tasks.filter(t => t.assignedTo === u.id || t.ownerId === u.id);
              const total = userTasks.length;
              const completed = userTasks.filter(t => t.status === 'completed').length;
              return {
                userId: u.id,
                userName: u.name,
                userRole: u.role,
                totalAssigned: total,
                pending: userTasks.filter(t => t.status === 'pending').length,
                inProgress: userTasks.filter(t => t.status === 'in_progress').length,
                underReview: userTasks.filter(t => t.status === 'under_review').length,
                completed,
                overdue: userTasks.filter(t => t.status !== 'completed' && t.dueDate < new Date().toISOString().split('T')[0]).length,
                completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
              };
            })).map((item) => (
              <div key={item.userId} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{item.userName}</h4>
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 bg-slate-200/70 rounded-md inline-block mt-0.5">
                      {item.userRole}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {item.completionPercentage}% Done
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${item.completionPercentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-2 border-t border-slate-200/60 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Total</span>
                    <span className="font-black text-slate-800">{item.totalAssigned}</span>
                  </div>
                  <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                    <span className="text-[9px] text-amber-700 block font-bold uppercase">Pending</span>
                    <span className="font-black text-amber-600">{item.pending}</span>
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                    <span className="text-[9px] text-blue-700 block font-bold uppercase">Active</span>
                    <span className="font-black text-blue-600">{item.inProgress}</span>
                  </div>
                  <div className="bg-purple-50/50 p-2 rounded-xl border border-purple-100">
                    <span className="text-[9px] text-purple-700 block font-bold uppercase">Review</span>
                    <span className="font-black text-purple-600">{item.underReview}</span>
                  </div>
                  <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[9px] text-emerald-700 block font-bold uppercase">Done</span>
                    <span className="font-black text-emerald-600">{item.completed}</span>
                  </div>
                  <div className="bg-rose-50/50 p-2 rounded-xl border border-rose-100">
                    <span className="text-[9px] text-rose-700 block font-bold uppercase">Overdue</span>
                    <span className="font-black text-rose-600">{item.overdue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Member</th>
                  <th className="p-3 text-center">Role</th>
                  <th className="p-3 text-center">Total Assigned</th>
                  <th className="p-3 text-center">Pending</th>
                  <th className="p-3 text-center">In Progress</th>
                  <th className="p-3 text-center">Under Review</th>
                  <th className="p-3 text-center">Completed</th>
                  <th className="p-3 text-center">Overdue</th>
                  <th className="p-3 text-right">Completion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(personWorkloads.length > 0 ? personWorkloads : users.map(u => {
                  const userTasks = tasks.filter(t => t.assignedTo === u.id || t.ownerId === u.id);
                  const total = userTasks.length;
                  const completed = userTasks.filter(t => t.status === 'completed').length;
                  return {
                    userId: u.id,
                    userName: u.name,
                    userRole: u.role,
                    totalAssigned: total,
                    pending: userTasks.filter(t => t.status === 'pending').length,
                    inProgress: userTasks.filter(t => t.status === 'in_progress').length,
                    underReview: userTasks.filter(t => t.status === 'under_review').length,
                    completed,
                    overdue: userTasks.filter(t => t.status !== 'completed' && t.dueDate < new Date().toISOString().split('T')[0]).length,
                    completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
                  };
                })).map((item) => (
                  <tr key={item.userId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{item.userName}</td>
                    <td className="p-3 text-center uppercase text-[10px] font-bold text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                        {item.userRole}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">{item.totalAssigned}</td>
                    <td className="p-3 text-center font-medium text-amber-600">{item.pending}</td>
                    <td className="p-3 text-center font-medium text-blue-600">{item.inProgress}</td>
                    <td className="p-3 text-center font-medium text-purple-600">{item.underReview}</td>
                    <td className="p-3 text-center font-bold text-emerald-600">{item.completed}</td>
                    <td className="p-3 text-center font-bold text-rose-600">{item.overdue}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${item.completionPercentage}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-700 w-9 text-right">
                          {item.completionPercentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'dept_workload' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600 shrink-0" />
                Department-Wise Workload Analytics
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of Seva duties, task completion rates, and bottlenecks grouped by department
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {(deptWorkloads.length > 0 ? deptWorkloads : departments.map(d => {
              const deptTasks = tasks.filter(t => t.departmentId === d.id);
              const total = deptTasks.length;
              const completed = deptTasks.filter(t => t.status === 'completed').length;
              return {
                departmentId: d.id,
                departmentName: d.name,
                totalTasks: total,
                pending: deptTasks.filter(t => t.status === 'pending').length,
                inProgress: deptTasks.filter(t => t.status === 'in_progress').length,
                underReview: deptTasks.filter(t => t.status === 'under_review').length,
                completed,
                overdue: deptTasks.filter(t => t.status !== 'completed' && t.dueDate < new Date().toISOString().split('T')[0]).length,
                completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
              };
            })).map((dept) => (
              <div key={dept.departmentId} className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{dept.departmentName}</h4>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 shrink-0">
                    {dept.totalTasks} Tasks
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>Completion Progress</span>
                    <span className="font-bold text-slate-800">{dept.completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${dept.completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-200/60 text-center">
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold">Pending</span>
                    <span className="text-xs font-bold text-amber-600">{dept.pending}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold">Active</span>
                    <span className="text-xs font-bold text-blue-600">{dept.inProgress + (dept.underReview || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold">Done</span>
                    <span className="text-xs font-bold text-emerald-600">{dept.completed}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold">Overdue</span>
                    <span className="text-xs font-bold text-rose-600">{dept.overdue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div id="print-section" className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 md:p-8 shadow-2xs space-y-4 sm:space-y-6">
          <div className="border-b border-slate-200 pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {temple.name && !/radha damodar/i.test(temple.name) ? temple.name : 'Seva & Operations Report'}
              </h1>
              <p className="text-xs text-slate-500">{temple.tagline}</p>
              <p className="text-xs text-slate-400 mt-1">{temple.address}, {temple.city}</p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest block">
                Official Trustee Seva Audit Report
              </span>
              <span className="text-xs text-slate-500 font-mono block mt-1">
                Generated: {formatDate(new Date().toISOString().split('T')[0])}
              </span>
            </div>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold truncate">Total Tasks</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{(tasks || []).length}</span>
            </div>
            <div className="p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] sm:text-xs text-emerald-800 block uppercase font-bold truncate">Completed</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700">{(completedTasks || []).length}</span>
            </div>
            <div className="p-3 sm:p-4 bg-rose-50 rounded-xl border border-rose-200 text-center">
              <span className="text-[10px] sm:text-xs text-rose-800 block uppercase font-bold truncate">Overdue</span>
              <span className="text-xl sm:text-2xl font-black text-rose-700">{(overdueTasks || []).length}</span>
            </div>
            <div className="p-3 sm:p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] sm:text-xs text-amber-900 block uppercase font-bold truncate">Active Projects</span>
              <span className="text-xl sm:text-2xl font-black text-amber-800">{(projects || []).length}</span>
            </div>
          </div>

          {/* Task Breakdown Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Department Seva Task Summary</h3>

            {/* Mobile Card List (< md) */}
            <div className="block md:hidden print:hidden space-y-2.5">
              {tasks.map((t) => {
                const dept = departments.find((d) => d.id === t.departmentId)?.name || 'General';
                const owner = users.find((u) => u.id === t.ownerId)?.name || 'Unassigned';
                return (
                  <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 line-clamp-1">{t.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize shrink-0">
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      <span className="font-medium">{dept} • {owner}</span>
                      <span className="text-slate-400">Due: {formatDate(t.dueDate)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop & Print Table */}
            <div className="overflow-x-auto hidden md:block print:block">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden min-w-[500px]">
                <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">Title</th>
                    <th className="p-2.5">Dept</th>
                    <th className="p-2.5">Owner</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((t) => {
                    const dept = departments.find((d) => d.id === t.departmentId)?.name || 'General';
                    const owner = users.find((u) => u.id === t.ownerId)?.name || 'Unassigned';
                    return (
                      <tr key={t.id}>
                        <td className="p-2.5 font-bold text-slate-800">{t.title}</td>
                        <td className="p-2.5">{dept}</td>
                        <td className="p-2.5">{owner}</td>
                        <td className="p-2.5 capitalize">{t.status.replace('_', ' ')}</td>
                        <td className="p-2.5">{formatDate(t.dueDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
