import React, { useState, useEffect } from 'react';
import { User, Department, VolunteerOpportunity, Task } from '../types';
import { api } from '../services/api';
import {
  Landmark,
  Heart,
  Calendar,
  Clock,
  MapPin,
  Flame,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  Search,
  Filter,
  UserCheck,
  X,
  AlertCircle,
  Award,
  Trash2,
  Edit,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { formatDate } from '../utils/taskUtils';

interface BookSevaViewProps {
  currentUser: User;
  departments: Department[];
  onRefreshTasks?: () => void;
}

export const BookSevaView: React.FC<BookSevaViewProps> = ({
  currentUser,
  departments,
  onRefreshTasks,
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'my_bookings' | 'manage'>('available');
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Admin Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDepartmentId, setNewDepartmentId] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('Garbhagriha / Main Temple');
  const [newDescription, setNewDescription] = useState('');
  const [newPoints, setNewPoints] = useState<number>(50);
  const [newVolunteersNeeded, setNewVolunteersNeeded] = useState<number>(10);
  const [creatingSeva, setCreatingSeva] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Admin Volunteer management drawer state
  const [selectedSevaForVolunteers, setSelectedSevaForVolunteers] = useState<VolunteerOpportunity | null>(null);
  const [enrolledVolunteers, setEnrolledVolunteers] = useState<any[]>([]);
  const [volunteersLoading, setVolunteersLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isAdminOrLeader = ['super_admin', 'temple_admin', 'department_head', 'leader'].includes(currentUser.role);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const data = await api.getVolunteerOpportunities();
      setOpportunities(data || []);
    } catch (err) {
      console.error('Failed to load Seva opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleBookSeva = async (opp: VolunteerOpportunity) => {
    try {
      setBookingLoadingId(opp.id);
      setBookingSuccessMsg(null);
      const res = await api.enrollVolunteerOpportunity(opp.id);
      setBookingSuccessMsg(res.message || `Successfully booked Seva for "${opp.title}"!`);
      await fetchOpportunities();
      if (onRefreshTasks) onRefreshTasks();
      setTimeout(() => setBookingSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Booking Error: ${err.message || 'Could not complete Seva booking.'}`);
    } finally {
      setBookingLoadingId(null);
    }
  };

  const handleCancelBooking = async (oppId: string, title: string) => {
    if (!confirm(`Are you sure you want to cancel your Seva booking for "${title}"?`)) return;

    try {
      setCancellingId(oppId);
      await api.cancelVolunteerOpportunity(oppId);
      alert(`Seva booking for "${title}" has been cancelled.`);
      await fetchOpportunities();
      if (onRefreshTasks) onRefreshTasks();
    } catch (err: any) {
      alert(`Cancellation Error: ${err.message || 'Failed to cancel booking.'}`);
    } finally {
      setCancellingId(null);
    }
  };

  const handleCreateSevaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setModalError('Seva Title is required.');
      return;
    }

    const deptObj = departments.find((d) => d.id === newDepartmentId);
    const deptName = deptObj ? deptObj.name : 'General Seva';

    try {
      setCreatingSeva(true);
      setModalError(null);
      await api.createVolunteerOpportunity({
        title: newTitle.trim(),
        departmentId: newDepartmentId || undefined,
        deptName,
        time: newTime.trim() || 'Daily Duty Shifts',
        points: Number(newPoints) || 50,
        volunteersNeeded: Number(newVolunteersNeeded) || 10,
        description: newDescription.trim(),
        location: newLocation.trim(),
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewTime('');
      await fetchOpportunities();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create Seva opportunity.');
    } finally {
      setCreatingSeva(false);
    }
  };

  const handleOpenVolunteersDrawer = async (opp: VolunteerOpportunity) => {
    setSelectedSevaForVolunteers(opp);
    try {
      setVolunteersLoading(true);
      const res = await api.getOpportunityVolunteers(opp.id);
      setEnrolledVolunteers(res.volunteers || []);
    } catch (err) {
      console.error('Failed to load volunteers for opportunity:', err);
    } finally {
      setVolunteersLoading(false);
    }
  };

  const handleUpdateVolunteerStatus = async (enrollmentId: string, newStatus: string) => {
    if (!selectedSevaForVolunteers) return;
    try {
      setActionLoadingId(enrollmentId);
      await api.updateVolunteerStatus(selectedSevaForVolunteers.id, enrollmentId, newStatus);
      const updatedRes = await api.getOpportunityVolunteers(selectedSevaForVolunteers.id);
      setEnrolledVolunteers(updatedRes.volunteers || []);
      await fetchOpportunities();
      if (onRefreshTasks) onRefreshTasks();
    } catch (err: any) {
      alert(`Error updating volunteer status: ${err.message || 'Failed'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const myBookings = opportunities.filter((o) => o.isEnrolled);

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.deptName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opp.location && opp.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = selectedDept === 'ALL' || opp.deptName === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-amber-900/90 text-amber-100 p-4 sm:p-6 rounded-2xl shadow-xs border border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 sm:w-7 sm:h-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Book Temple Seva
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                Live
              </span>
            </h2>
            <p className="text-xs text-amber-200 mt-0.5">
              Select devotional Sevas, reserve shifts, and earn Seva Points for temple contributions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {isAdminOrLeader && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setModalError(null);
              }}
              className="py-2 px-3.5 sm:px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Create Seva
            </button>
          )}

          <button
            onClick={fetchOpportunities}
            className="p-2 bg-amber-800/80 hover:bg-amber-800 text-amber-200 rounded-xl border border-amber-700 transition-colors cursor-pointer shrink-0"
            title="Refresh Seva Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {bookingSuccessMsg && (
        <div className="p-3.5 sm:p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{bookingSuccessMsg}</span>
          </div>
          <button onClick={() => setBookingSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/80 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('available')}
            className={`py-3 px-4 sm:py-3.5 sm:px-6 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'available'
                ? 'border-amber-600 text-amber-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'available' ? 'text-amber-600' : 'text-slate-400'}`} />
            Available ({opportunities.length})
          </button>

          <button
            onClick={() => setActiveTab('my_bookings')}
            className={`py-3 px-4 sm:py-3.5 sm:px-6 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'my_bookings'
                ? 'border-amber-600 text-amber-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCheck className={`w-4 h-4 ${activeTab === 'my_bookings' ? 'text-amber-600' : 'text-slate-400'}`} />
            My Bookings ({myBookings.length})
          </button>
        </div>

        <div className="p-3.5 sm:p-6">
          {/* TAB 1: Available Sevas */}
          {activeTab === 'available' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by Seva title, department, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="flex-1 sm:flex-initial bg-white border border-slate-200 rounded-xl text-xs py-2 px-3 font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Departments</option>
                    {Array.from(new Set(opportunities.map((o) => o.deptName))).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-16">
                  <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Loading available Sevas from database...</p>
                </div>
              ) : filteredOpportunities.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Seva opportunities match your search.</p>
                  <p className="text-xs text-slate-500 mt-1">Try clearing your filters or check back later.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOpportunities.map((opp) => {
                    const isEnrolled = opp.isEnrolled;
                    const isProcessing = bookingLoadingId === opp.id;
                    const capacity = opp.volunteersNeeded || 10;
                    const enrolledCount = opp.enrolledCount ?? 0;
                    const remainingSlots = opp.remainingSlots ?? Math.max(0, capacity - enrolledCount);
                    const isFull = opp.isFull ?? (enrolledCount >= capacity);
                    const status = opp.enrollmentStatus;

                    return (
                      <div
                        key={opp.id}
                        className="p-5 bg-slate-50/80 hover:bg-white rounded-2xl border border-slate-200 hover:border-amber-400 transition-all shadow-2xs flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-200/80 uppercase tracking-wide">
                              {opp.deptName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isFull
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {enrolledCount}/{capacity} ({remainingSlots} left)
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">{opp.title}</h4>
                            {opp.description && (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                                {opp.description}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{opp.time}</span>
                            </div>
                            {opp.location && (
                              <div className="flex items-center gap-1.5 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{opp.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-700 flex items-center gap-1">
                            <Flame className="w-4 h-4 fill-amber-500 text-amber-600" />
                            +{opp.points} Seva Pts
                          </span>

                          <div className="flex items-center gap-2">
                            {isAdminOrLeader && (
                              <button
                                onClick={() => handleOpenVolunteersDrawer(opp)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                                title="Manage Member Bookings"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleBookSeva(opp)}
                              disabled={isEnrolled || isFull || isProcessing}
                              className={`py-1.5 px-3.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                                isEnrolled
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : isFull
                                  ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                              }`}
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isEnrolled ? (
                                <>
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  {status === 'confirmed' ? 'Confirmed' : status === 'completed' ? 'Completed' : 'Booked'}
                                </>
                              ) : isFull ? (
                                'Full'
                              ) : (
                                'Book Seva'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: My Booked Sevas */}
          {activeTab === 'my_bookings' && (
            <div className="space-y-4">
              {myBookings.length === 0 ? (
                <div className="text-center py-12 bg-amber-50/50 rounded-2xl border border-dashed border-amber-200">
                  <Landmark className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">You haven't booked any Seva shifts yet.</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Select an available Seva from the list above to contribute your time and earn Seva Points.
                  </p>
                  <button
                    onClick={() => setActiveTab('available')}
                    className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Browse Available Sevas
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myBookings.map((opp) => {
                    const status = opp.enrollmentStatus || 'pending';
                    const isCancelling = cancellingId === opp.id;

                    return (
                      <div key={opp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                            {opp.deptName}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border capitalize ${
                            status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : status === 'completed'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : status === 'rejected' || status === 'cancelled'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            {status === 'pending' ? 'Awaiting Admin Approval' : status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{opp.title}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">{opp.time}</p>
                          {opp.location && <p className="text-[11px] text-slate-500 mt-0.5">Location: {opp.location}</p>}
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                          <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                            +{opp.points} Seva Points
                          </span>

                          {(status === 'pending' || status === 'confirmed') && (
                            <button
                              onClick={() => handleCancelBooking(opp.id, opp.title)}
                              disabled={isCancelling}
                              className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADMIN MODAL: CREATE SEVA OPPORTUNITY */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-4 sm:p-6 border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-600 shrink-0" /> Create Seva Opportunity
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSevaSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Seva Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Janmashtami Bhandara & Prashadam Service"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={newDepartmentId}
                    onChange={(e) => setNewDepartmentId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Seva Points Reward</label>
                  <input
                    type="number"
                    value={newPoints}
                    onChange={(e) => setNewPoints(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift Timing / Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Tomorrow, 6:00 AM – 9:00 AM"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Member Capacity</label>
                  <input
                    type="number"
                    value={newVolunteersNeeded}
                    onChange={(e) => setNewVolunteersNeeded(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Location / Mandir Area</label>
                <input
                  type="text"
                  placeholder="e.g. Annakut Hall / Kitchen Premises"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Seva Responsibilities & Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the duties, requirements, or guidelines for members..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSeva}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {creatingSeva && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Seva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN DRAWER: MANAGE ENROLLED VOLUNTEERS */}
      {selectedSevaForVolunteers && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl p-4 sm:p-6 border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Member Seva Management
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedSevaForVolunteers.title}</h3>
              </div>
              <button onClick={() => setSelectedSevaForVolunteers(null)} className="text-slate-400 hover:text-slate-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {volunteersLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Fetching member bookings...</p>
              </div>
            ) : enrolledVolunteers.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No members have booked this Seva yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {enrolledVolunteers.map((v) => {
                  const isLoadingAction = actionLoadingId === v.enrollmentId;

                  return (
                    <div key={v.enrollmentId} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900 block font-bold">{v.name}</strong>
                          <span className="text-[11px] text-slate-500">{v.email} | {v.phone}</span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                          v.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-900'
                            : v.status === 'completed'
                            ? 'bg-blue-100 text-blue-900'
                            : v.status === 'rejected' || v.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {v.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-1.5">
                        {v.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateVolunteerStatus(v.enrollmentId, 'confirmed')}
                              disabled={isLoadingAction}
                              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateVolunteerStatus(v.enrollmentId, 'rejected')}
                              disabled={isLoadingAction}
                              className="py-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {v.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateVolunteerStatus(v.enrollmentId, 'completed')}
                            disabled={isLoadingAction}
                            className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                          >
                            Mark Completed (+Points)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
