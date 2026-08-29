import React, { useState } from 'react';
import { Department, User } from '../types';
import {
  Landmark,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  Shield,
  Building,
  Flame,
  Utensils,
  Wrench,
  ShieldCheck,
  Receipt,
  Calendar,
  Layers,
} from 'lucide-react';

interface DepartmentsManagerProps {
  departments: Department[];
  currentUser: User;
  onCreateDepartment: (data: Partial<Department>) => Promise<void>;
  onUpdateDepartment: (id: string, data: Partial<Department>) => Promise<void>;
  onDeleteDepartment: (id: string) => Promise<{ message: string; softDeactivated?: boolean }>;
}

const COLOR_PRESETS = [
  { name: 'Saffron / Orange', value: '#f97316' },
  { name: 'Amber / Gold', value: '#eab308' },
  { name: 'Emerald / Green', value: '#10b981' },
  { name: 'Cyan / Teal', value: '#06b6d4' },
  { name: 'Purple / Violet', value: '#8b5cf6' },
  { name: 'Rose / Crimson', value: '#ef4444' },
  { name: 'Lime / Olive', value: '#84cc16' },
  { name: 'Pink / Magenta', value: '#ec4899' },
];

export const DepartmentsManager: React.FC<DepartmentsManagerProps> = ({
  departments,
  currentUser,
  onCreateDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#f97316');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const canManage = currentUser.role === 'super_admin' || currentUser.role === 'temple_admin';

  const filteredDepts = departments.filter((d) => {
    const dName = d.name || '';
    const dCode = d.code || '';
    const dDesc = d.description || '';
    const matchesSearch =
      dName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dDesc.toLowerCase().includes(searchTerm.toLowerCase());

    const deptStatus = d.status || (d.active !== false ? 'ACTIVE' : 'INACTIVE');
    const matchesStatus = statusFilter === 'ALL' || deptStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setDescription('');
    setColor('#f97316');
    setStatus('ACTIVE');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEditModal = (d: Department) => {
    setEditingDept(d);
    setName(d.name || '');
    setCode(d.code || '');
    setDescription(d.description || '');
    setColor(d.color || '#f97316');
    setStatus(d.status || (d.active !== false ? 'ACTIVE' : 'INACTIVE'));
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Department name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (editingDept) {
        await onUpdateDepartment(editingDept.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          color,
          status,
          active: status === 'ACTIVE',
        });
        setSuccessMsg(`Department '${name.trim()}' updated successfully!`);
      } else {
        await onCreateDepartment({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          color,
          status,
          active: status === 'ACTIVE',
        });
        setSuccessMsg(`Department '${name.trim()}' created successfully!`);
      }
      setShowModal(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (d: Department) => {
    const confirmMsg = `Are you sure you want to delete department '${d.name}'? If it is referenced by existing tasks or users, it will be marked INACTIVE safely.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await onDeleteDepartment(d.id);
      if (res.softDeactivated) {
        setSuccessMsg(`Department '${d.name}' is referenced by records. Marked as INACTIVE.`);
      } else {
        setSuccessMsg(`Department '${d.name}' deleted successfully!`);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete department.');
    }
  };

  const handleToggleStatus = async (d: Department) => {
    const currentStatus = d.status || (d.active !== false ? 'ACTIVE' : 'INACTIVE');
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      await onUpdateDepartment(d.id, {
        status: newStatus,
        active: newStatus === 'ACTIVE',
      });
      setSuccessMsg(`Department '${d.name}' marked as ${newStatus}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-600" />
              Dynamic Department Master Directory
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Manage organizational departments dynamically. All dropdowns across tasks, projects, and users update instantly.
            </p>
          </div>

          {canManage && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          )}
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search departments by name, code or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto shrink-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-amber-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({departments.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({departments.filter((d) => d.status === 'ACTIVE' || d.active !== false).length})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white text-rose-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive ({departments.filter((d) => d.status === 'INACTIVE' || d.active === false).length})
            </button>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredDepts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No departments found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {departments.length === 0
                ? 'No departments have been created yet. Click "Add Department" above to create your temple\'s first department.'
                : 'No departments match your current filter or search criteria.'}
            </p>
            {canManage && departments.length === 0 && (
              <button
                onClick={handleOpenAddModal}
                className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create First Department
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredDepts.map((dept) => {
                const dStatus = dept.status || (dept.active !== false ? 'ACTIVE' : 'INACTIVE');
                const isActive = dStatus === 'ACTIVE';

                return (
                  <div key={dept.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: dept.color || '#f97316' }}
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{dept.name}</h4>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                            {dept.code || dept.name.slice(0, 4).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {dStatus}
                      </span>
                    </div>

                    {dept.description && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                        {dept.description}
                      </p>
                    )}

                    {canManage && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleToggleStatus(dept)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isActive
                              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(dept)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                            title="Edit Department"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Delete Department"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                    {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredDepts.map((dept) => {
                    const dStatus = dept.status || (dept.active !== false ? 'ACTIVE' : 'INACTIVE');
                    const isActive = dStatus === 'ACTIVE';

                    return (
                      <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: dept.color || '#f97316' }}
                            />
                            <span className="font-semibold text-slate-900">{dept.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                            {dept.code || dept.name.slice(0, 4).toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-md truncate">
                          {dept.description || <span className="text-slate-400 italic">No description</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {dStatus}
                          </span>
                        </td>
                        {canManage && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleStatus(dept)}
                                title={isActive ? 'Deactivate Department' : 'Activate Department'}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  isActive
                                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                }`}
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(dept)}
                                title="Edit Department"
                                className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(dept)}
                                title="Delete Department"
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Department Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-600 shrink-0" />
                {editingDept ? 'Edit Department' : 'Create New Department'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Temple Maintenance & Estate"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., MAINT"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Responsibilities
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe duties managed by this department..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Theme Color Tag
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      className={`p-2 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        color === preset.value
                          ? 'border-slate-800 bg-slate-100 ring-2 ring-amber-500'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: preset.value }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
