import React, { useState, useEffect } from 'react';
import { VolunteerOpportunity, VolunteerDetail } from '../types';
import { api } from '../services/api';
import {
  Users,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Loader2,
  AlertCircle,
  FileCheck2,
  Mail,
  Phone,
  Building2,
  RefreshCw
} from 'lucide-react';

interface VolunteerManagementModalProps {
  opportunity: VolunteerOpportunity;
  onClose: () => void;
  onRefreshOpportunities: () => void;
}

export const VolunteerManagementModal: React.FC<VolunteerManagementModalProps> = ({
  opportunity,
  onClose,
  onRefreshOpportunities,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [oppDetails, setOppDetails] = useState<VolunteerOpportunity>(opportunity);
  const [volunteers, setVolunteers] = useState<VolunteerDetail[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getOpportunityVolunteers(opportunity.id);
      setOppDetails(res.opportunity);
      setVolunteers(res.volunteers || []);
    } catch (err: any) {
      console.error('Failed to load opportunity volunteers:', err);
      setError(err.message || 'Failed to load volunteers from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers();
  }, [opportunity.id]);

  const handleUpdateStatus = async (enrollmentId: string, status: 'confirmed' | 'rejected' | 'completed' | 'cancelled') => {
    try {
      setActionLoadingId(enrollmentId);
      const res = await api.updateVolunteerStatus(opportunity.id, enrollmentId, status);
      await fetchVolunteers();
      onRefreshOpportunities();
    } catch (err: any) {
      alert(`Error updating volunteer status: ${err.message || 'Operation failed'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const capacity = oppDetails.volunteersNeeded || oppDetails.volunteersNeeded || 10;
  const enrolledCount = oppDetails.enrolledCount ?? volunteers.filter((v) => v.status !== 'cancelled').length;
  const remainingSlots = Math.max(0, capacity - enrolledCount);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-500/40 text-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-amber-400/30">
                {oppDetails.deptName || 'Seva Department'}
              </span>
              <span className="text-[10px] font-medium text-amber-200">
                Time: {oppDetails.time}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold mt-1 text-white flex items-center gap-2 truncate">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
              <span className="truncate">{oppDetails.title}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capacity Overview Bar */}
        <div className="p-3 sm:p-4 bg-amber-50/70 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-6 text-xs font-semibold text-slate-800 flex-wrap">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Total Capacity</span>
              <span className="text-sm font-bold text-slate-900">{capacity} Volunteers</span>
            </div>
            <div className="h-8 w-px bg-amber-200 hidden sm:block" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Currently Enrolled</span>
              <span className="text-sm font-bold text-amber-800">{enrolledCount} Registered</span>
            </div>
            <div className="h-8 w-px bg-amber-200 hidden sm:block" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Remaining Slots</span>
              <span className={`text-sm font-bold ${remainingSlots === 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {remainingSlots} Slots
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
              <Award className="w-3.5 h-3.5 text-amber-700" /> +{oppDetails.points} Seva Pts
            </span>
            <button
              onClick={fetchVolunteers}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-1 font-semibold shrink-0 cursor-pointer"
              title="Refresh DB Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">Retrieving volunteer registrations from database...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          ) : volunteers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No devotees have volunteered for this opportunity yet.</p>
              <p className="text-xs text-slate-400 mt-1">Devotee enrollments will automatically appear here once submitted.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Enrolled Volunteers ({volunteers.length})</span>
                <span className="text-[11px] font-medium text-emerald-700">Live Roster</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-4">Volunteer Devotee</th>
                      <th className="py-3 px-4">Contact & Dept</th>
                      <th className="py-3 px-4">Enrolled Date</th>
                      <th className="py-3 px-4">Enrollment Status</th>
                      <th className="py-3 px-4">Task / Proof</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {volunteers.map((vol) => {
                      const isBusy = actionLoadingId === vol.enrollmentId;

                      const statusBadge = {
                        pending: { bg: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Pending Review' },
                        confirmed: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Accepted / Approved' },
                        rejected: { bg: 'bg-red-100 text-red-800 border-red-300', label: 'Rejected' },
                        completed: { bg: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Completed (+' + oppDetails.points + ' pts)' },
                        cancelled: { bg: 'bg-slate-100 text-slate-600 border-slate-300', label: 'Cancelled' },
                      }[vol.status] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: vol.status };

                      return (
                        <tr key={vol.enrollmentId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                                {vol.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{vol.name}</p>
                                <p className="text-[10px] text-slate-500 font-normal">ID: {vol.userId.substring(0, 8)}...</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="space-y-0.5">
                              <p className="text-[11px] flex items-center gap-1 font-medium text-slate-800">
                                <Mail className="w-3 h-3 text-slate-400" /> {vol.email}
                              </p>
                              <p className="text-[11px] flex items-center gap-1 text-slate-500">
                                <Phone className="w-3 h-3 text-slate-400" /> {vol.phone}
                              </p>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(vol.enrolledAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge.bg}`}>
                              {statusBadge.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[11px] whitespace-nowrap">
                            <div className="space-y-1">
                              <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                {vol.taskStatus.replace('_', ' ')}
                              </span>
                              {vol.proofSubmitted && (
                                <span className="block text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                                  <FileCheck2 className="w-3 h-3" /> Proof Uploaded
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-600 ml-auto" />
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {vol.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(vol.enrollmentId, 'confirmed')}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                                    >
                                      <CheckCircle2 className="w-3 h-3" /> Approve
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(vol.enrollmentId, 'rejected')}
                                      className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] border border-red-200"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {vol.status === 'confirmed' && (
                                  <button
                                    onClick={() => handleUpdateStatus(vol.enrollmentId, 'completed')}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                                  >
                                    <Award className="w-3 h-3" /> Mark Completed
                                  </button>
                                )}

                                {vol.status === 'completed' && (
                                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Awarded +{oppDetails.points} Pts
                                  </span>
                                )}

                                {vol.status === 'rejected' && (
                                  <span className="text-[11px] text-slate-400 font-medium">Rejected</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Updates saved automatically to temple records.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
