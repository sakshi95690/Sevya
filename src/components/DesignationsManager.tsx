import React, { useState } from 'react';
import { Designation, User } from '../types';
import { Briefcase, Plus, Search, Edit2, Trash2, CheckCircle, AlertTriangle, X, Shield, Users, Info } from 'lucide-react';

interface DesignationsManagerProps {
  designations: Designation[];
  currentUser: User;
  onCreateDesignation: (data: Partial<Designation>) => Promise<void>;
  onUpdateDesignation: (id: string, data: Partial<Designation>) => Promise<void>;
  onDeleteDesignation: (id: string) => Promise<{ message: string; softDeactivated?: boolean }>;
}

export const DesignationsManager: React.FC<DesignationsManagerProps> = ({
  designations,
  currentUser,
  onCreateDesignation,
  onUpdateDesignation,
  onDeleteDesignation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const canManage = currentUser.role === 'super_admin' || currentUser.role === 'temple_admin';

  const filteredDesignations = designations.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingDesig(null);
    setName('');
    setDescription('');
    setStatus('ACTIVE');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEditModal = (d: Designation) => {
    setEditingDesig(d);
    setName(d.name);
    setDescription(d.description || '');
    setStatus(d.status);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Designation name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (editingDesig) {
        await onUpdateDesignation(editingDesig.id, {
          name: name.trim(),
          description: description.trim(),
          status,
        });
        setSuccessMsg(`Designation '${name.trim()}' updated successfully!`);
      } else {
        await onCreateDesignation({
          name: name.trim(),
          description: description.trim(),
          status,
        });
        setSuccessMsg(`Designation '${name.trim()}' created successfully!`);
      }
      setShowModal(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save designation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (d: Designation) => {
    const confirmMsg = d.userCount && d.userCount > 0
      ? `Designation '${d.name}' is currently assigned to ${d.userCount} member(s).\n\nDeactivating it will mark it INACTIVE to preserve user profile history. Proceed?`
      : `Are you sure you want to delete designation '${d.name}'?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await onDeleteDesignation(d.id);
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Error removing designation');
    }
  };

  const handleToggleStatus = async (d: Designation) => {
    const newStatus = d.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await onUpdateDesignation(d.id, { status: newStatus });
      setSuccessMsg(`Designation '${d.name}' status set to ${newStatus}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Informative Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <Briefcase className="w-5 h-5 text-amber-600" />
              Temple Custom Designations Directory
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Configure organizational positions specific to your temple (e.g. <strong>Managing Trustee, Pujari, Treasurer, Annadan Coordinator</strong>).
              Designations describe a member's title and responsibilities within the temple, independent of system permissions.
            </p>
          </div>

          {canManage && (
            <button
              onClick={handleOpenAddModal}
              className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" /> Add Custom Designation
            </button>
          )}
        </div>

        {/* Roles vs Designations Clarification Box */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <span className="font-bold text-amber-900">Key Architectural Rule: System Role vs. Temple Designation</span>
            <p className="text-amber-900/90">
              <strong>System Role</strong> (Super Admin, Temple Admin, Sevait) grants application permissions and access levels. 
              <strong>Temple Designation</strong> is temple-isolated and defines staff titles displayed across member cards, task assignments, and trust reports.
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search designations by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto text-xs font-medium">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All ({designations.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Active ({designations.filter((d) => d.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'INACTIVE' ? 'bg-white text-slate-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Inactive ({designations.filter((d) => d.status === 'INACTIVE').length})
          </button>
        </div>
      </div>

      {/* Designations Grid / List */}
      {filteredDesignations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Designations Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? 'No designation titles match your search filters.' : 'Your temple has not configured any custom designations yet.'}
          </p>
          {canManage && !searchTerm && (
            <button
              onClick={handleOpenAddModal}
              className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4" /> Create First Designation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDesignations.map((d) => {
            const isActive = d.status === 'ACTIVE';
            return (
              <div
                key={d.id}
                className={`bg-white border rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                  isActive ? 'border-slate-200 hover:border-amber-300' : 'border-slate-200/60 bg-slate-50/50 opacity-80'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                      {d.name}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                        isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>

                  {d.description ? (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{d.description}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No description provided</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {d.userCount || 0} Member{(d.userCount || 0) === 1 ? '' : 's'} Assigned
                  </span>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(d)}
                        className={`p-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          isActive ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={isActive ? 'Mark Inactive' : 'Mark Active'}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(d)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Edit Designation"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(d)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Designation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Designation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-4 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                {editingDesig ? 'Edit Designation' : 'Create Custom Designation'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg shrink-0"
              >
                <X className="w-5 h-5" />
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
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Designation Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pujari, Managing Trustee, Annadan In-charge"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Description / Responsibilities
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe key duties and roles attached to this position..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-semibold"
                >
                  <option value="ACTIVE">ACTIVE (Available for member assignment)</option>
                  <option value="INACTIVE">INACTIVE (Hidden from new assignments)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingDesig ? 'Save Changes' : 'Create Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
