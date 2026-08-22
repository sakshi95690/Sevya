import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Filter,
  User,
  AlertCircle,
  Building,
  DollarSign,
  Calendar,
  Layers,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import {
  fetchApprovalRequests,
  createApprovalRequestApi,
  processApprovalActionApi,
  ApprovalRequest,
} from '../services/workflowApi';

export const ApprovalsView: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
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

  const setActiveTab = (tab: 'pending' | 'history' | 'all') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('sevya_approvals_tab', tab);
      window.location.hash = `approvals/${tab}`;
    } catch {}
  };
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionComment, setActionComment] = useState('');

  // Submit Modal State
  const [approvalType, setApprovalType] = useState('leave');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await fetchApprovalRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load approval requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleProcessAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedRequest) return;
    try {
      await processApprovalActionApi(selectedRequest.id, action, actionComment);
      setSelectedRequest(null);
      setActionComment('');
      loadApprovals();
    } catch (err) {
      alert(`Failed to ${action.toLowerCase()} request.`);
    }
  };

  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createApprovalRequestApi({
        approvalType,
        title,
        description,
        amount: Number(amount) || 0,
      });
      setShowSubmitModal(false);
      setTitle('');
      setDescription('');
      setAmount(0);
      loadApprovals();
    } catch (err) {
      alert('Failed to submit approval request.');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'pending') return r.status === 'PENDING';
    if (activeTab === 'history') return r.status === 'APPROVED' || r.status === 'REJECTED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Approval Inbox & Workflows</h1>
          </div>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl">
            Multi-level dynamic approval engine for leaves, expenses, sevas, task reviews, department changes, and announcements.
          </p>
        </div>
        <div className="shrink-0">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs sm:text-sm font-semibold shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-3 sm:gap-6 whitespace-nowrap">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending ({requests.filter((r) => r.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            History ({requests.filter((r) => r.status !== 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'all'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            All ({requests.length})
          </button>
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map((req) => (
          <div
            key={req.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 uppercase tracking-wide">
                  {req.approvalType}
                </span>
                {req.status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    <Clock className="w-3 h-3" />
                    Level {req.currentLevel}/{req.totalLevels} Pending
                  </span>
                )}
                {req.status === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Approved
                  </span>
                )}
                {req.status === 'REJECTED' && (
                  <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    <XCircle className="w-3 h-3" />
                    Rejected
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 line-clamp-1">{req.title}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{req.description || 'No detailed notes provided.'}</p>

              {req.amount > 0 && (
                <div className="mt-3 text-sm font-bold text-emerald-700 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Amount: ₹{req.amount.toLocaleString()}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 min-w-0">
                <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{req.requesterName || 'Requested User'}</span>
              </span>

              {req.status === 'PENDING' ? (
                <button
                  onClick={() => setSelectedRequest(req)}
                  className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition cursor-pointer text-center"
                >
                  Review Request
                </button>
              ) : (
                <span className="font-medium text-slate-400">{new Date(req.updatedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No approval requests found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              All approval workflow steps are currently up to date.
            </p>
          </div>
        )}
      </div>

      {/* REVIEW & APPROVE MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Level {selectedRequest.currentLevel}/{selectedRequest.totalLevels} Review
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{selectedRequest.title}</h3>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 text-xs text-slate-700">
              <div><strong className="text-slate-900">Type:</strong> {selectedRequest.approvalType}</div>
              <div><strong className="text-slate-900">Requester:</strong> {selectedRequest.requesterName || 'User'}</div>
              <div><strong className="text-slate-900">Description:</strong> {selectedRequest.description || 'N/A'}</div>
              {selectedRequest.amount > 0 && (
                <div><strong className="text-slate-900">Amount:</strong> ₹{selectedRequest.amount.toLocaleString()}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approver Comment / Remarks</label>
              <textarea
                rows={3}
                placeholder="Add optional remarks for requester..."
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleProcessAction('REJECT')}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleProcessAction('APPROVE')}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs sm:text-sm font-semibold shadow transition cursor-pointer"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW REQUEST MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Submit Approval Request</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Type</label>
                <select
                  value={approvalType}
                  onChange={(e) => setApprovalType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="leave">Leave Request</option>
                  <option value="expense">Expense Request</option>
                  <option value="seva">Seva Special Approval</option>
                  <option value="task">Task Completion Waiver</option>
                  <option value="announcement">Announcement Broadcast</option>
                  <option value="user_role">User Role Change</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Request Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Festival Equipment Purchase"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Justification</label>
                <textarea
                  rows={3}
                  placeholder="Provide detailed reasons for approval..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {approvalType === 'expense' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
