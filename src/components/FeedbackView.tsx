import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Feedback } from '../types';
import { ApiError } from '../services/apiClient';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
  UserCheck,
  Building,
  RefreshCw,
  Sparkles,
  Search,
  Star,
  Shield,
  HelpCircle,
  ThumbsUp,
  Inbox,
  User as UserIcon,
} from 'lucide-react';

export const FeedbackView: React.FC = () => {
  const { user, authUser } = useAuth();
  const activeUser = user || authUser;
  const { showSuccess, showError } = useToast();

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatusState] = useState<string>(() => {
    try {
      return localStorage.getItem('sevya_feedback_filter') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const setFilterStatus = (status: string) => {
    setFilterStatusState(status);
    try {
      localStorage.setItem('sevya_feedback_filter', status);
    } catch {}
  };

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form state for submitting feedback
  const [category, setCategory] = useState<'GENERAL' | 'FACILITY' | 'PRASADAM' | 'SEVA' | 'IT_SYSTEM' | 'EVENT' | 'OTHER'>('GENERAL');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Admin response state
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<'IN_REVIEW' | 'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [submittingResponse, setSubmittingResponse] = useState<boolean>(false);

  const isSuperAdmin = activeUser?.role === 'super_admin';
  const isTempleAdmin = activeUser?.role === 'temple_admin';
  const isManagement = isSuperAdmin || isTempleAdmin;

  const isAdminOrHead =
    isManagement ||
    activeUser?.role === 'department_head';

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await api.getFeedback();
      setFeedbacks(res.data || []);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.problemDetail?.detail || err.message : err.message || 'Failed to load feedback';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showError('Please enter both subject and message');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitFeedback({
        category,
        subject: subject.trim(),
        message: message.trim(),
        rating,
      });

      showSuccess(res.message || 'Feedback submitted successfully!');
      setSubject('');
      setMessage('');
      setCategory('GENERAL');
      setRating(5);
      await fetchFeedbacks();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.problemDetail?.detail || err.message : err.message || 'Failed to submit feedback';
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminRespond = async (id: string) => {
    if (!responseText.trim()) {
      showError('Please enter response details');
      return;
    }

    setSubmittingResponse(true);
    try {
      const res = await api.respondFeedback(id, {
        adminResponse: responseText.trim(),
        status: responseStatus,
      });

      showSuccess(res.message || 'Feedback response saved successfully!');
      setRespondingId(null);
      setResponseText('');
      await fetchFeedbacks();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.problemDetail?.detail || err.message : err.message || 'Failed to record response';
      showError(msg);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter((item) => {
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesQuery =
      searchQuery.trim() === '' ||
      item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> In Review
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3.5 h-3.5" /> Closed
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <AlertCircle className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'FACILITY':
        return 'Facilities & Cleanliness';
      case 'PRASADAM':
        return 'Prasadam & Kitchen';
      case 'SEVA':
        return 'Seva & Rituals';
      case 'IT_SYSTEM':
        return 'App / IT System';
      case 'EVENT':
        return 'Festival & Events';
      case 'GENERAL':
      default:
        return 'General Feedback';
    }
  };

  const totalFeedbacks = feedbacks.length;
  const pendingFeedbacks = feedbacks.filter((f) => f.status === 'PENDING' || f.status === 'IN_REVIEW').length;
  const resolvedFeedbacks = feedbacks.filter((f) => f.status === 'RESOLVED').length;
  const avgRating =
    totalFeedbacks > 0
      ? (feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0) / totalFeedbacks).toFixed(1)
      : '5.0';

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 shadow-2xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {isSuperAdmin
                ? 'Super Admin Feedback & Devotee Inquiries'
                : 'Member Feedback & Service Inquiries'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isSuperAdmin
              ? 'Centralized repository of all devotee feedback, complaints, suggestions, and seva inquiries across all temple operations.'
              : isAdminOrHead
              ? 'Review and respond to devotee questions, seva recommendations, and temple feedback.'
              : 'Direct line to temple management for suggestions, questions, seva assistance, and experience feedback.'}
          </p>
        </div>

        <button
          onClick={fetchFeedbacks}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Super Admin Sentiment / Health Overview Cards */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Total</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{totalFeedbacks}</div>
            <span className="text-[10px] text-slate-500 font-semibold truncate block">Devotee messages</span>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider truncate">Pending</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-900 mt-2">{pendingFeedbacks}</div>
            <span className="text-[10px] text-amber-700 font-semibold truncate block">Needs response</span>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider truncate">Resolved</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-2">{resolvedFeedbacks}</div>
            <span className="text-[10px] text-emerald-700 font-semibold truncate block">Addressed</span>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-purple-700 uppercase tracking-wider truncate">Devotee Rating</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
                <Star className="w-4 h-4 fill-purple-500 text-purple-500" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-900 mt-2">{avgRating} / 5.0</div>
            <span className="text-[10px] text-purple-700 font-semibold truncate block">Experience score</span>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isSuperAdmin ? 'grid-cols-1' : 'lg:grid-cols-3'} gap-4 sm:gap-6`}>
        {/* Submit Form Column (Hidden for Super Admin) */}
        {!isSuperAdmin && (
          <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Send className="w-4 h-4 text-amber-600" /> Submit New Feedback
            </h2>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
                >
                  <option value="GENERAL">General Feedback</option>
                  <option value="SEVA">Seva & Worship Rituals</option>
                  <option value="FACILITY">Temple Facilities & Cleanliness</option>
                  <option value="PRASADAM">Prasadam & Annakoot</option>
                  <option value="EVENT">Festivals & Celebrations</option>
                  <option value="IT_SYSTEM">SEVYA App / Technical Assistance</option>
                  <option value="OTHER">Other Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Question about Morning Aarti Seva timings"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Message & Details
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or details regarding your experience..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800 leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Experience Rating
                </label>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : 'Needs Improvement'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Submit to Temple Administration
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Feedback Listing Column */}
        <div className={`${isSuperAdmin ? 'col-span-full' : 'lg:col-span-2'} bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900">
                {isAdminOrHead ? 'Temple Feedback Inbox' : 'My Submitted Feedback'}
              </h2>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {filteredFeedbacks.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search feedback..."
                  className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 w-36 sm:w-44"
                />
              </div>

              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-bold animate-pulse space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600" />
              <p>Loading feedback records from database...</p>
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No feedback entries found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || filterStatus !== 'ALL'
                  ? 'Try changing your search keywords or status filter.'
                  : 'Submit a feedback inquiry using the form on the left to reach temple administrators.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedbacks.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/90 space-y-3 transition-all hover:border-amber-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                          {getCategoryLabel(item.category)}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight">
                        {item.subject}
                      </h3>
                    </div>

                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Submitter info for Admin View */}
                  {isAdminOrHead && item.userName && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100">
                      {item.userAvatar ? (
                        <img
                          src={item.userAvatar}
                          alt={item.userName}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {item.userName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="font-bold text-slate-900">{item.userName}</span>
                      {item.userEmail && (
                        <span className="text-[11px] text-slate-400">({item.userEmail})</span>
                      )}
                      {item.userRole && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.userRole.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-700 leading-relaxed font-normal bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs">
                    {item.message}
                  </p>

                  {/* Existing Admin Response */}
                  {(item.adminResponse || item.response) && (
                    <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                          Official Temple Response {item.respondedByName ? `by ${item.respondedByName}` : ''}
                        </span>
                        {item.respondedAt && (
                          <span className="text-[10px] font-semibold text-amber-700">
                            {new Date(item.respondedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {item.adminResponse || item.response}
                      </p>
                    </div>
                  )}

                  {/* Admin Reply Action Form */}
                  {isAdminOrHead && (
                    <div className="pt-2 border-t border-slate-200/70">
                      {respondingId === item.id ? (
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                          <label className="block text-xs font-bold text-slate-900">
                            Provide Administrative Response
                          </label>
                          <textarea
                            rows={3}
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Type resolution or administrative instructions for the devotee..."
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
                          />

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <select
                              value={responseStatus}
                              onChange={(e) => setResponseStatus(e.target.value as any)}
                              className="text-xs p-1.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700"
                            >
                              <option value="RESOLVED">Status: Resolved</option>
                              <option value="IN_REVIEW">Status: In Review</option>
                              <option value="CLOSED">Status: Closed</option>
                            </select>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setRespondingId(null)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={submittingResponse}
                                onClick={() => handleAdminRespond(item.id)}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
                              >
                                {submittingResponse ? 'Saving...' : 'Send Response'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRespondingId(item.id);
                            setResponseText(item.adminResponse || item.response || '');
                            setResponseStatus((item.status as any) || 'RESOLVED');
                          }}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 cursor-pointer py-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {item.adminResponse || item.response ? 'Update Response & Status' : 'Respond to Devotee'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
