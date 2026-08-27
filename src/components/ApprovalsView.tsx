import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Filter,
  User,
  ShieldCheck,
  DollarSign,
  Calendar,
  Layers,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  UserCheck,
  Send,
  Loader2,
  Users,
  Info,
  Check,
  ArrowRight,
} from 'lucide-react';
import {
  fetchApprovalRequests,
  createApprovalRequestApi,
  processApprovalActionApi,
  ApprovalRequest,
} from '../services/workflowApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { User as UserType, UserRole } from '../types';
import { normalizeRole, getRequiredParentRole } from '../utils/roleHierarchy';

export const ApprovalsView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentCandidates, setParentCandidates] = useState<UserType[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // Tab & Filter States
  const [activeTab, setActiveTabState] = useState<'pending' | 'history' | 'all'>(() => {
    try {
      const rawHash = window.location.hash.replace(/^#\/?/, '');
      const parts = rawHash.split('?')[0].split('/');
      if (parts[0] === 'approvals' && (parts[1] === 'pending' || parts[1] === 'history' || parts[1] === 'all')) {
        return parts[1] as 'pending' | 'history' | 'all';
      }
      const saved = localStorage.getItem('sevya_approvals_tab');
      if (saved === 'pending' || saved === 'history' || saved === 'all') return saved;
    } catch {}
    return 'pending';
  });

  const [pendingFilter, setPendingFilter] = useState<'all' | 'needs_my_review' | 'my_requests'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const setActiveTab = (tab: 'pending' | 'history' | 'all') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('sevya_approvals_tab', tab);
      window.location.hash = `approvals/${tab}`;
    } catch {}
  };

  // Modals & Action States
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit Modal Form State
  const [approvalType, setApprovalType] = useState('leave');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  // Fetch approval requests
  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await fetchApprovalRequests();
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to load approval requests:', err);
      showError(err.message || 'Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch eligible parent candidates for the logged in user
  const loadParentCandidates = async () => {
    if (!currentUser) return;
    setLoadingParents(true);
    try {
      const reqRole = currentUser.role || 'member';
      let eligible: UserType[] = [];

      try {
        eligible = await api.getHierarchyParents(reqRole, currentUser.departmentId, currentUser.templeId);
      } catch (e) {
        console.warn('Hierarchy parents fetch failed, falling back to all users:', e);
      }

      if (!eligible || eligible.length === 0) {
        // Fallback to all users who have parent-eligible roles
        const allUsers = await api.getUsers();
        eligible = allUsers.filter(
          (u) =>
            u.id !== currentUser.id &&
            (u.role === 'temple_admin' ||
              u.role === 'super_admin' ||
              u.role === 'department_head' ||
              u.role === 'coordinator')
        );
      }

      setParentCandidates(eligible);

      // Auto-select parent if current user has an assigned parentId
      if (currentUser.parentId && eligible.some((p) => p.id === currentUser.parentId)) {
        setSelectedParentId(currentUser.parentId);
      } else if (eligible.length > 0) {
        setSelectedParentId(eligible[0].id);
      }
    } catch (err) {
      console.error('Failed to load parent candidates:', err);
    } finally {
      setLoadingParents(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  useEffect(() => {
    if (showSubmitModal) {
      loadParentCandidates();
    }
  }, [showSubmitModal, currentUser]);

  // Selected parent user object from parentCandidates or currentUser.parentName
  const assignedParentUser = useMemo(() => {
    if (!currentUser) return null;
    if (selectedParentId) {
      const found = parentCandidates.find((p) => p.id === selectedParentId);
      if (found) return found;
    }
    if (currentUser.parentId) {
      const found = parentCandidates.find((p) => p.id === currentUser.parentId);
      if (found) return found;
      return {
        id: currentUser.parentId,
        name: currentUser.parentName || 'Assigned Parent',
        role: (currentUser.parentRole as UserRole) || 'temple_admin',
        email: '',
      } as Partial<UserType>;
    }
    return parentCandidates[0] || null;
  }, [selectedParentId, parentCandidates, currentUser]);

  const handleProcessAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedRequest) return;
    setActionProcessing(true);
    try {
      await processApprovalActionApi(selectedRequest.id, action, actionComment);
      showSuccess(
        action === 'APPROVE'
          ? `Request "${selectedRequest.title}" approved successfully!`
          : `Request "${selectedRequest.title}" rejected.`
      );
      setSelectedRequest(null);
      setActionComment('');
      loadApprovals();
    } catch (err: any) {
      showError(err.message || `Failed to ${action.toLowerCase()} request.`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showError('Please enter a request title.');
      return;
    }

    const finalParentId = selectedParentId || currentUser?.parentId;
    if (!finalParentId && parentCandidates.length === 0 && currentUser?.role !== 'super_admin') {
      showError('Please select a parent guardian to send this approval to.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createApprovalRequestApi({
        approvalType,
        title: title.trim(),
        description: description.trim(),
        amount: amount ? Number(amount) : 0,
        parentUserId: finalParentId || undefined,
        approverUserId: finalParentId || undefined,
        templeId: currentUser?.templeId,
      });

      showSuccess('Approval request submitted to your parent supervisor successfully!');
      setShowSubmitModal(false);
      setTitle('');
      setDescription('');
      setAmount('');
      loadApprovals();
    } catch (err: any) {
      console.error('Submit approval error:', err);
      showError(err.message || 'Failed to submit approval request. Please check all fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter requests according to tabs, searches, and roles
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // 1. Tab filtering
      if (activeTab === 'pending' && req.status !== 'PENDING') return false;
      if (activeTab === 'history' && req.status === 'PENDING') return false;

      // 2. Pending sub-filters
      if (activeTab === 'pending' && currentUser) {
        const isMyOwnRequest = req.requesterId === currentUser.id;
        const isAssignedToMe =
          req.canApprove ||
          req.parentUserId === currentUser.id ||
          req.steps?.some(
            (s) => s.level === req.currentLevel && s.approverUserId === currentUser.id
          );

        if (pendingFilter === 'needs_my_review' && !isAssignedToMe) return false;
        if (pendingFilter === 'my_requests' && !isMyOwnRequest) return false;
      }

      // 3. Type filter
      if (typeFilter !== 'all' && req.approvalType.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = req.title?.toLowerCase().includes(q);
        const matchDesc = req.description?.toLowerCase().includes(q);
        const matchRequester = req.requesterName?.toLowerCase().includes(q);
        const matchParent = req.parentName?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchRequester && !matchParent) return false;
      }

      return true;
    });
  }, [requests, activeTab, pendingFilter, typeFilter, searchQuery, currentUser]);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const needsMyReviewCount = requests.filter(
    (r) =>
      r.status === 'PENDING' &&
      (r.canApprove ||
        r.parentUserId === currentUser?.id ||
        r.steps?.some((s) => s.level === r.currentLevel && s.approverUserId === currentUser?.id))
  ).length;
  const myRequestsPendingCount = requests.filter(
    (r) => r.status === 'PENDING' && r.requesterId === currentUser?.id
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Approvals & Requests
              </h1>
              <span className="text-[11px] font-bold bg-amber-100/70 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-600" />
                Parent Hierarchy Routing
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              End-to-end role-based approval requests routed directly to your designated Parent / Guardian supervisor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            id="btn-new-approval-request"
            onClick={() => setShowSubmitModal(true)}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Approval Request</span>
          </button>
        </div>
      </div>

      {/* Role & Parent Indicator Card */}
      {currentUser && (
        <div className="bg-linear-to-r from-emerald-50 to-teal-50 dark:from-slate-800/60 dark:to-slate-800/40 border border-emerald-200/80 dark:border-slate-700 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold rounded-md uppercase text-[10px]">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Reporting in temple hierarchy with direct parent routing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-emerald-100 dark:border-slate-700 self-start md:self-auto shadow-2xs">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Your Parent Guardian:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {currentUser.parentName || assignedParentUser?.name || 'Temple Administrator'}
            </span>
            {currentUser.parentRole && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold uppercase">
                {currentUser.parentRole}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Tabs and Filter Controls */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-6 whitespace-nowrap overflow-x-auto pb-px">
            <button
              id="tab-pending"
              onClick={() => setActiveTab('pending')}
              className={`pb-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'pending'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pending Requests</span>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs rounded-full font-bold">
                {pendingCount}
              </span>
            </button>

            <button
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approval History</span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-full font-bold">
                {requests.filter((r) => r.status !== 'PENDING').length}
              </span>
            </button>

            <button
              id="tab-all"
              onClick={() => setActiveTab('all')}
              className={`pb-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'all'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>All Requests</span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-full font-bold">
                {requests.length}
              </span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={loadApprovals}
            disabled={loading}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 py-1 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 self-end sm:self-center cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            <span>Refresh</span>
          </button>
        </div>

        {/* Sub-filters for Pending tab */}
        {activeTab === 'pending' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Scope:
            </span>
            <button
              onClick={() => setPendingFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                pendingFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Pending ({pendingCount})
            </button>

            <button
              onClick={() => setPendingFilter('needs_my_review')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                pendingFilter === 'needs_my_review'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Needs My Review as Parent ({needsMyReviewCount})</span>
            </button>

            <button
              onClick={() => setPendingFilter('my_requests')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                pendingFilter === 'my_requests'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>My Requests to Parent ({myRequestsPendingCount})</span>
            </button>
          </div>
        )}

        {/* Search and Category Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, requester, parent, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Approval Types</option>
              <option value="leave">Leave Requests</option>
              <option value="expense">Expense Claims</option>
              <option value="seva">Seva Approvals</option>
              <option value="task">Task Waivers</option>
              <option value="announcement">Announcement Broadcasts</option>
              <option value="user_role">Role Changes</option>
              <option value="general">General Requests</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading approval requests and parent routes...
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 space-y-3">
          <FileCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No approval requests found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'No pending approval requests requiring parent action in this filter.'
              : 'No historical approval requests match the current criteria.'}
          </p>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Request</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((req) => {
            const isMyRequest = currentUser && req.requesterId === currentUser.id;
            const canUserApprove =
              req.status === 'PENDING' &&
              (req.canApprove ||
                req.parentUserId === currentUser?.id ||
                currentUser?.role === 'super_admin' ||
                currentUser?.role === 'temple_admin');

            return (
              <div
                key={req.id}
                id={`approval-card-${req.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                      {req.approvalType}
                    </span>

                    {req.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/80 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Parent Review
                      </span>
                    )}
                    {req.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Approved
                      </span>
                    )}
                    {req.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Rejected
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                    {req.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">
                    {req.description || 'No additional justification notes provided.'}
                  </p>

                  {/* Amount Badge if applicable */}
                  {req.amount > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-lg">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Amount: ₹{req.amount.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Parent Routing Route Pill */}
                  <div className="mt-3.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="font-semibold flex items-center gap-1">
                        <Send className="w-3 h-3 text-slate-400" />
                        Send Approval To:
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase bg-emerald-100/80 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                        Parent Guardian
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{req.parentName || 'Assigned Parent Supervisor'}</span>
                      {req.parentRole && (
                        <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded font-semibold uppercase shrink-0">
                          {req.parentRole}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Info & Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {req.requesterName ? req.requesterName.charAt(0).toUpperCase() : 'D'}
                      </div>
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                        {isMyRequest ? 'You (Requester)' : req.requesterName || 'Devotee'}
                      </span>
                    </div>

                    <span className="text-[11px] font-medium text-slate-400 shrink-0">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  {req.status === 'PENDING' ? (
                    canUserApprove ? (
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Review & Endorse</span>
                      </button>
                    ) : (
                      <div className="w-full py-1.5 px-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 font-medium text-center flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Awaiting Parent Review</span>
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>View Outcome Details</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REVIEW & APPROVE MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Parent Approval Endorsement
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                  {selectedRequest.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-2.5 text-xs border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Approval Type:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 uppercase px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">
                  {selectedRequest.approvalType}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Requester:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedRequest.requesterName || 'Devotee'} {selectedRequest.requesterRole ? `(${selectedRequest.requesterRole})` : ''}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Send Approval To:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Parent: {selectedRequest.parentName || 'Designated Supervisor'}
                </span>
              </div>

              {selectedRequest.amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Claim Amount:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{selectedRequest.amount.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">Justification:</span>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedRequest.description || 'No additional justification notes provided.'}
                </p>
              </div>

              {/* Status Outcome if already decided */}
              {selectedRequest.status !== 'PENDING' && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">Outcome Status:</span>
                  <div
                    className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                      selectedRequest.status === 'APPROVED'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {selectedRequest.status === 'APPROVED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      {selectedRequest.status === 'APPROVED' ? 'Approved by Parent Supervisor' : 'Rejected'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Approver Remarks form (if pending) */}
            {selectedRequest.status === 'PENDING' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Parent Approver Remarks / Feedback
                </label>
                <textarea
                  rows={3}
                  placeholder="Add approval comments or feedback for the requester..."
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                disabled={actionProcessing}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Close
              </button>

              {selectedRequest.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleProcessAction('REJECT')}
                    disabled={actionProcessing}
                    className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProcessAction('APPROVE')}
                    disabled={actionProcessing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Approve Request</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW APPROVAL REQUEST MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Submit Approval Request
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Routed directly to your assigned Parent Guardian in the temple
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRequest} className="space-y-4">
              {/* Send Approval To: Parent Section */}
              <div className="p-3.5 bg-emerald-50/70 dark:bg-slate-800/90 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Send Approval To: Parent</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300/50">
                    Direct Supervisor
                  </span>
                </div>

                {loadingParents ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Finding your parent guardian in temple hierarchy...</span>
                  </div>
                ) : parentCandidates.length > 0 ? (
                  <div>
                    <select
                      id="select-parent-guardian"
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {parentCandidates.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.name || parent.displayName} ({parent.role ? parent.role.toUpperCase() : 'PARENT'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                      <Info className="w-3 h-3 text-emerald-600 shrink-0" />
                      Approval requests can only be sent to your assigned parent / guardian supervisor.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 font-bold text-xs flex items-center justify-center">
                      P
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {currentUser?.parentName || 'Temple Administrator'}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        {currentUser?.parentRole || 'temple_admin'} (Default Parent)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Approval Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Approval Type
                </label>
                <select
                  id="select-approval-type"
                  value={approvalType}
                  onChange={(e) => setApprovalType(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                >
                  <option value="leave">Leave Request</option>
                  <option value="expense">Expense Reimbursement / Claim</option>
                  <option value="seva">Seva Special Approval</option>
                  <option value="task">Task Completion / Waiver</option>
                  <option value="announcement">Announcement Broadcast</option>
                  <option value="user_role">User Role Change / Assignment</option>
                  <option value="general">General Temple Request</option>
                </select>
              </div>

              {/* Request Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Request Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-approval-title"
                  type="text"
                  required
                  placeholder="e.g. Leave for Family Pilgrimage / Festival Audio Equipment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Justification & Notes
                </label>
                <textarea
                  id="input-approval-description"
                  rows={3}
                  placeholder="Provide complete context and details for your parent to review and endorse..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Amount (if expense or seva) */}
              {(approvalType === 'expense' || approvalType === 'seva') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      id="input-approval-amount"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-approval"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting to Parent...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Approval To Parent</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
