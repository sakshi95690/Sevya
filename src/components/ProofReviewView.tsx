import React, { useState, useMemo } from 'react';
import { Task, TaskProof, Department, User, Project } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Music,
  File,
  Search,
  Filter,
  Download,
  ExternalLink,
  Share2,
  MessageSquare,
  Eye,
  Check,
  RotateCcw,
  Calendar,
  User as UserIcon,
  LayoutGrid,
  List,
  RefreshCw,
  Sparkles,
  ChevronDown,
  X,
  Info,
  CheckCircle,
  Copy,
  Mail,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { api } from '../services/api';
import { formatDate } from '../utils/taskUtils';
import { normalizeRole } from '../utils/roleHierarchy';

export interface ProofReviewItem {
  proof: TaskProof;
  task: Task;
  department?: Department;
  uploader?: User;
  reviewer?: User;
  isLatest: boolean;
  iterationIndex: number;
  totalIterations: number;
}

interface ProofReviewViewProps {
  tasks: Task[];
  departments: Department[];
  users: User[];
  projects: Project[];
  currentUser: User;
  onRefreshTasks?: () => void;
  onTaskUpdated?: (updatedTask: Task) => void;
  onOpenProofModal?: (task: Task) => void;
}

export const ProofReviewView: React.FC<ProofReviewViewProps> = ({
  tasks,
  departments,
  users,
  projects,
  currentUser,
  onRefreshTasks,
  onTaskUpdated,
  onOpenProofModal,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedProofType, setSelectedProofType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Review action modal state
  const [reviewModalData, setReviewModalData] = useState<{
    item: ProofReviewItem;
    action: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Lightbox / Media Viewer State
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    type: 'image' | 'audio' | 'document';
    title: string;
    uploaderName?: string;
    proof: TaskProof;
  } | null>(null);

  // Quick link copy state
  const [copiedProofId, setCopiedProofId] = useState<string | null>(null);

  // Role normalization & permissions check
  const normalizedUserRole = normalizeRole(currentUser.role);
  const canReview = [
    'super_admin',
    'temple_admin',
    'department_head',
    'leader',
    'coordinator',
  ].includes(normalizedUserRole);

  const departmentsMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  // Aggregate all proofs across all tasks
  const allProofItems = useMemo(() => {
    const items: ProofReviewItem[] = [];

    // Filter tasks based on role visibility
    const visibleTasks = tasks.filter((t) => {
      if (t.archived) return false;
      if (normalizedUserRole === 'super_admin' || normalizedUserRole === 'temple_admin') {
        return true;
      }
      if (normalizedUserRole === 'department_head') {
        return currentUser.departmentId ? t.departmentId === currentUser.departmentId : true;
      }
      if (normalizedUserRole === 'coordinator') {
        return (
          t.departmentId === currentUser.departmentId ||
          t.ownerId === currentUser.id ||
          (t.assignedUserIds && t.assignedUserIds.includes(currentUser.id)) ||
          t.assignedTo === currentUser.id
        );
      }
      // Member / Volunteer: sees tasks they are assigned to
      return (
        t.ownerId === currentUser.id ||
        (t.assignedUserIds && t.assignedUserIds.includes(currentUser.id)) ||
        t.assignedTo === currentUser.id
      );
    });

    visibleTasks.forEach((task) => {
      const proofs = task.proofs || [];
      if (proofs.length === 0) {
        // If task is under_review or has rejection reason but no explicit proof object
        if (task.status === 'under_review') {
          // Synthetic proof item for pending review tasks
          const syntheticProof: TaskProof = {
            id: `syn-${task.id}`,
            taskId: task.id,
            templeId: (task as any).templeId || currentUser.templeId,
            type: (task.expectedProofType as any) || 'image',
            url: '',
            fileName: 'Proof Pending Verification',
            status: 'SUBMITTED',
            uploadedBy: task.assignedTo || task.ownerId || currentUser.id,
            uploadedAt: task.updatedAt || task.createdAt,
            remarks: task.description,
          };
          items.push({
            proof: syntheticProof,
            task,
            department: departmentsMap.get(task.departmentId),
            uploader: usersMap.get(task.assignedTo || task.ownerId || ''),
            isLatest: true,
            iterationIndex: 1,
            totalIterations: 1,
          });
        }
        return;
      }

      // Sort proofs by createdAt/uploadedAt ascending to determine iterations
      const sortedProofs = [...proofs].sort(
        (a, b) => new Date(a.uploadedAt || a.createdAt || 0).getTime() - new Date(b.uploadedAt || b.createdAt || 0).getTime()
      );

      sortedProofs.forEach((proof, idx) => {
        const uploader = usersMap.get(proof.uploadedBy || task.assignedTo || task.ownerId || '');
        const reviewer = proof.reviewedBy ? usersMap.get(proof.reviewedBy) : undefined;
        items.push({
          proof,
          task,
          department: departmentsMap.get(task.departmentId),
          uploader,
          reviewer,
          isLatest: idx === sortedProofs.length - 1,
          iterationIndex: idx + 1,
          totalIterations: sortedProofs.length,
        });
      });
    });

    // Sort newest proofs first
    return items.sort((a, b) => {
      const timeA = new Date(a.proof.uploadedAt || a.proof.createdAt || a.task.createdAt).getTime();
      const timeB = new Date(b.proof.uploadedAt || b.proof.createdAt || b.task.createdAt).getTime();
      return timeB - timeA;
    });
  }, [tasks, normalizedUserRole, currentUser, departmentsMap, usersMap]);

  // Overall metric statistics
  const stats = useMemo(() => {
    let total = allProofItems.length;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    allProofItems.forEach((item) => {
      const st = (item.proof.status || '').toUpperCase();
      if (st === 'SUBMITTED' || item.task.status === 'under_review') {
        pending++;
      } else if (st === 'APPROVED' || item.task.status === 'completed') {
        approved++;
      } else if (st === 'REJECTED' || item.task.status === 'rejected') {
        rejected++;
      } else {
        pending++;
      }
    });

    return { total, pending, approved, rejected };
  }, [allProofItems]);

  // Filtered proof items
  const filteredProofItems = useMemo(() => {
    return allProofItems.filter((item) => {
      const pStatus = (item.proof.status || '').toUpperCase();
      const tStatus = item.task.status;

      // Status Tab filter
      if (activeStatusTab === 'pending') {
        if (!(pStatus === 'SUBMITTED' || tStatus === 'under_review')) return false;
      } else if (activeStatusTab === 'approved') {
        if (!(pStatus === 'APPROVED' || (tStatus === 'completed' && pStatus !== 'REJECTED'))) return false;
      } else if (activeStatusTab === 'rejected') {
        if (!(pStatus === 'REJECTED' || tStatus === 'rejected')) return false;
      }

      // Department filter
      if (selectedDepartment !== 'all' && item.task.departmentId !== selectedDepartment) {
        return false;
      }

      // Proof Type filter
      if (selectedProofType !== 'all') {
        const type = (item.proof.proofType || item.proof.type || '').toLowerCase();
        const mime = (item.proof.mimeType || '').toLowerCase();
        if (selectedProofType === 'image' && !type.includes('image') && !mime.includes('image')) return false;
        if (selectedProofType === 'document' && !type.includes('document') && !type.includes('pdf') && !mime.includes('pdf') && !mime.includes('document')) return false;
        if (selectedProofType === 'audio' && !type.includes('audio') && !mime.includes('audio')) return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && item.task.priority !== selectedPriority) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const titleMatch = item.task.title.toLowerCase().includes(term);
        const fileNameMatch = (item.proof.originalFileName || item.proof.fileName || '').toLowerCase().includes(term);
        const uploaderMatch = (item.uploader?.name || item.proof.uploaderName || '').toLowerCase().includes(term);
        const reviewerMatch = (item.reviewer?.name || '').toLowerCase().includes(term);
        const remarkMatch = (item.proof.remarks || item.proof.reviewComment || item.task.rejectionReason || '').toLowerCase().includes(term);
        const deptMatch = (item.department?.name || '').toLowerCase().includes(term);

        if (!titleMatch && !fileNameMatch && !uploaderMatch && !reviewerMatch && !remarkMatch && !deptMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allProofItems, activeStatusTab, selectedDepartment, selectedProofType, selectedPriority, searchTerm]);

  // Handle Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefreshTasks) {
      await onRefreshTasks();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Open Preview Lightbox
  const handleOpenPreview = async (item: ProofReviewItem) => {
    const { proof, task, uploader } = item;
    try {
      let resolvedUrl = proof.url || (proof as any).objectKey;
      let pType: 'image' | 'audio' | 'document' = 'image';

      const mime = (proof.mimeType || '').toLowerCase();
      const typeStr = (proof.type || proof.proofType || '').toLowerCase();

      if (mime.includes('audio') || typeStr.includes('audio')) {
        pType = 'audio';
      } else if (mime.includes('pdf') || typeStr.includes('document') || typeStr.includes('pdf')) {
        pType = 'document';
      }

      // If url is relative or not directly accessible, get secure signed url
      if (!resolvedUrl || (!resolvedUrl.startsWith('http') && !resolvedUrl.startsWith('data:'))) {
        if (!proof.id.startsWith('syn-')) {
          try {
            const res = await api.getProofDownloadUrl(task.id, proof.id);
            resolvedUrl = res.url;
          } catch {
            resolvedUrl = proof.url || '/logo.png';
          }
        }
      }

      setPreviewMedia({
        url: resolvedUrl,
        type: pType,
        title: task.title,
        uploaderName: uploader?.name || proof.uploaderName || 'Volunteer Sevait',
        proof,
      });
    } catch (err: any) {
      alert(err.message || 'Unable to open media preview.');
    }
  };

  // Open Review Dialog (Approve or Reject)
  const handleInitiateReview = (item: ProofReviewItem, action: 'APPROVE' | 'REJECT') => {
    setReviewModalData({ item, action });
    setReviewRemark(
      action === 'APPROVE'
        ? 'Verified and approved. Seva completed satisfactorily.'
        : 'Proof photo/document requires revision. Please re-submit clear documentation.'
    );
  };

  // Submit Review Decision
  const handleConfirmReview = async () => {
    if (!reviewModalData) return;
    const { item, action } = reviewModalData;
    setIsSubmittingReview(true);

    try {
      if (item.proof.id.startsWith('syn-')) {
        // Fallback for synthetic task without standalone proof row
        if (action === 'APPROVE') {
          await api.updateTaskStatus(item.task.id, {
            status: 'completed',
            user: currentUser,
          });
        } else {
          await api.updateTaskStatus(item.task.id, {
            status: 'in_progress',
            user: currentUser,
            reopenReason: reviewRemark,
          });
        }
      } else {
        const response = await api.reviewTaskProof(
          item.task.id,
          item.proof.id,
          action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          reviewRemark
        );

        if (onTaskUpdated && response.task) {
          onTaskUpdated(response.task);
        }
      }

      setActionSuccessMessage(
        action === 'APPROVE'
          ? `Seva proof for "${item.task.title}" has been approved!`
          : `Revision requested with feedback for "${item.task.title}".`
      );

      if (onRefreshTasks) {
        onRefreshTasks();
      }

      setReviewModalData(null);
      setReviewRemark('');

      setTimeout(() => {
        setActionSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to record review decision.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Preset feedback suggestions for quick rejection remarks
  const rejectionPresets = [
    'Photo is blurry, dark, or illegible.',
    'Proof does not demonstrate completed seva parameters.',
    'Incorrect date / location / milestone shown.',
    'Official temple sign-off or stamp missing.',
    'Please attach a clear wide-angle photo of the completed work.',
  ];

  // Preset feedback suggestions for approval
  const approvalPresets = [
    'Verified and approved. Excellent seva!',
    'Work inspected and found in compliance with temple standards.',
    'High quality seva verified. Points awarded.',
  ];

  // Helper for WhatsApp Share
  const handleShareWhatsApp = (item: ProofReviewItem) => {
    const text = encodeURIComponent(
      `🚩 *SEVYA Mandir Seva Proof Verification*\n\n` +
      `*Task:* ${item.task.title}\n` +
      `*Department:* ${item.department?.name || 'General'}\n` +
      `*Volunteer:* ${item.uploader?.name || item.proof.uploaderName || 'Sevait'}\n` +
      `*Status:* ${item.proof.status || item.task.status}\n` +
      `*Submitted At:* ${formatDate(item.proof.uploadedAt || item.proof.createdAt || item.task.createdAt)}\n\n` +
      `Review online: ${window.location.origin}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // Helper for Email Share
  const handleShareEmail = (item: ProofReviewItem) => {
    const subject = encodeURIComponent(`SEVYA Work Proof Review: ${item.task.title}`);
    const body = encodeURIComponent(
      `SEVYA Mandir Management System - Work Proof Review\n\n` +
      `Task: ${item.task.title}\n` +
      `Department: ${item.department?.name || 'General'}\n` +
      `Submitted By: ${item.uploader?.name || item.proof.uploaderName || 'Sevait'}\n` +
      `Proof Status: ${item.proof.status || item.task.status}\n` +
      `Submission Date: ${formatDate(item.proof.uploadedAt || item.proof.createdAt || item.task.createdAt)}\n\n` +
      `Please review this work proof in the SEVYA portal.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Helper to copy direct reference
  const handleCopyLink = async (item: ProofReviewItem) => {
    try {
      const fullUrl = `${window.location.origin}/#/proofs?taskId=${item.task.id}&proofId=${item.proof.id}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedProofId(item.proof.id);
      setTimeout(() => setCopiedProofId(null), 2500);
    } catch {
      alert('Link copied to clipboard.');
    }
  };

  const getProofTypeIcon = (type?: string, mime?: string) => {
    const t = (type || '').toLowerCase();
    const m = (mime || '').toLowerCase();
    if (t.includes('audio') || m.includes('audio')) {
      return <Music className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
    if (t.includes('pdf') || t.includes('document') || m.includes('pdf') || m.includes('document')) {
      return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
    return <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return 'File Attachment';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div id="proof-review-module" className="space-y-6 animate-in fade-in duration-200">
      {/* Success Notification Alert */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              {actionSuccessMessage}
            </p>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:opacity-75 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Module Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Proof Review & Verification
              </h1>
              <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                Verification Desk
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspect submitted photos, documents, and audio evidence from Sevaits and Volunteers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metric Counters Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Submissions */}
        <div
          onClick={() => setActiveStatusTab('all')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeStatusTab === 'all'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Submissions
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            All submitted work proofs
          </div>
        </div>

        {/* Awaiting Review */}
        <div
          onClick={() => setActiveStatusTab('pending')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeStatusTab === 'pending'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Awaiting Review
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.pending}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Requires verifier action
          </div>
        </div>

        {/* Approved Proofs */}
        <div
          onClick={() => setActiveStatusTab('approved')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeStatusTab === 'approved'
              ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.approved}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Verified & Seva points granted
          </div>
        </div>

        {/* Revision Requested */}
        <div
          onClick={() => setActiveStatusTab('rejected')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeStatusTab === 'rejected'
              ? 'bg-rose-500/10 border-rose-500/50 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Revision Requested
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.rejected}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Returned with remarks
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Tabs & View Mode */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        {/* Top row: Status Tabs & View Mode */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveStatusTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeStatusTab === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Awaiting Review</span>
              <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full text-[10px]">
                {stats.pending}
              </span>
            </button>

            <button
              onClick={() => setActiveStatusTab('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeStatusTab === 'approved'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Approved</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px]">
                {stats.approved}
              </span>
            </button>

            <button
              onClick={() => setActiveStatusTab('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeStatusTab === 'rejected'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Revision Needed</span>
              <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 rounded-full text-[10px]">
                {stats.rejected}
              </span>
            </button>

            <button
              onClick={() => setActiveStatusTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeStatusTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>All Proofs</span>
              <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px]">
                {stats.total}
              </span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl self-end sm:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Audit Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom row: Search & Secondary Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by task, volunteer, proof file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Proof Type Filter */}
          <div>
            <select
              value={selectedProofType}
              onChange={(e) => setSelectedProofType(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All File Types</option>
              <option value="image">Photos & Images</option>
              <option value="document">PDF & Documents</option>
              <option value="audio">Voice & Audio</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Grid View or Table View */}
      {filteredProofItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Work Proofs Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
            {searchTerm || selectedDepartment !== 'all' || activeStatusTab !== 'all'
              ? 'No proof submissions match your active filter criteria. Try resetting your search or filters.'
              : 'There are currently no tasks awaiting proof verification.'}
          </p>
          {(searchTerm || selectedDepartment !== 'all' || selectedProofType !== 'all' || selectedPriority !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setSelectedProofType('all');
                setSelectedPriority('all');
                setActiveStatusTab('all');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredProofItems.map((item) => {
            const { proof, task, department, uploader, reviewer, isLatest, iterationIndex, totalIterations } = item;
            const pStatus = (proof.status || '').toUpperCase();
            const isApproved = pStatus === 'APPROVED' || task.status === 'completed';
            const isRejected = pStatus === 'REJECTED' || task.status === 'rejected';
            const isPending = !isApproved && !isRejected;

            return (
              <div
                key={`${task.id}-${proof.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top Section: Department & Status Badges */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {/* Department Tag */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: department?.color || '#f59e0b' }}
                      />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                        {department?.name || 'General Seva'}
                      </span>
                    </div>

                    {/* Verification Status Badge */}
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3 h-3" /> Revision Needed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3 animate-pulse" /> Awaiting Review
                      </span>
                    )}
                  </div>

                  {/* Task Title */}
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="capitalize font-medium">
                        Priority:{' '}
                        <strong
                          className={
                            task.priority === 'urgent'
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : task.priority === 'high'
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-slate-700 dark:text-slate-300'
                          }
                        >
                          {task.priority}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>Due: {formatDate(task.dueDate)}</span>
                      {totalIterations > 1 && (
                        <>
                          <span>•</span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            Attempt #{iterationIndex}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Proof Media Preview Box */}
                  <div
                    onClick={() => handleOpenPreview(item)}
                    className="group relative h-40 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/60 flex items-center justify-center cursor-pointer hover:border-amber-500/60 transition-all"
                  >
                    {proof.url && (proof.mimeType?.startsWith('image/') || proof.type === 'image' || !proof.mimeType) ? (
                      <img
                        src={proof.url || '/logo.png'}
                        alt={proof.fileName || task.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo.png';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-xs mb-2">
                          {getProofTypeIcon(proof.type, proof.mimeType)}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                          {proof.originalFileName || proof.fileName || 'Proof Attachment'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {formatBytes(proof.fileSize)}
                        </span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                      <span className="text-xs font-bold flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-lg">
                        <Eye className="w-3.5 h-3.5" /> View & Inspect
                      </span>
                    </div>

                    {/* File type chip at top-left of image */}
                    <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                      {getProofTypeIcon(proof.type, proof.mimeType)}
                      <span className="capitalize">{proof.type || 'Image'}</span>
                    </div>
                  </div>

                  {/* Submitter & Time Info */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {uploader?.avatarUrl ? (
                          <img
                            src={uploader.avatarUrl}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          uploader?.name?.charAt(0).toUpperCase() || 'V'
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                          {uploader?.name || proof.uploaderName || 'Volunteer Sevait'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatDate(proof.uploadedAt || proof.createdAt || task.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Quick share buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleShareWhatsApp(item)}
                        className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        title="Share via WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopyLink(item)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Copy reference link"
                      >
                        {copiedProofId === proof.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submitter Remarks if present */}
                  {proof.remarks && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                        Volunteer Notes:
                      </span>
                      <p className="text-xs italic">&quot;{proof.remarks}&quot;</p>
                    </div>
                  )}

                  {/* Review Outcome & Remarks if already reviewed */}
                  {(isApproved || isRejected) && (proof.reviewComment || task.rejectionReason) && (
                    <div
                      className={`p-2.5 rounded-xl text-xs border ${
                        isApproved
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                          : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-80">
                        <span>{isApproved ? 'Verifier Feedback:' : 'Rejection Reason:'}</span>
                        {reviewer?.name && <span>By {reviewer.name}</span>}
                      </div>
                      <p className="font-medium text-xs">
                        {proof.reviewComment || task.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Bottom: Review Actions for Authorized Users */}
                <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenPreview(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Proof
                  </button>

                  {/* Action buttons if user can review */}
                  {canReview ? (
                    isPending ? (
                      <>
                        <button
                          onClick={() => handleInitiateReview(item, 'REJECT')}
                          className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleInitiateReview(item, 'APPROVE')}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleInitiateReview(item, isApproved ? 'REJECT' : 'APPROVE')}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Re-evaluate
                      </button>
                    )
                  ) : isRejected && onOpenProofModal ? (
                    <button
                      onClick={() => onOpenProofModal(task)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Upload Revision
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Proof Media</th>
                  <th className="py-3.5 px-4">Task & Department</th>
                  <th className="py-3.5 px-4">Submitted By</th>
                  <th className="py-3.5 px-4">Status & Notes</th>
                  <th className="py-3.5 px-4 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredProofItems.map((item) => {
                  const { proof, task, department, uploader, reviewer } = item;
                  const pStatus = (proof.status || '').toUpperCase();
                  const isApproved = pStatus === 'APPROVED' || task.status === 'completed';
                  const isRejected = pStatus === 'REJECTED' || task.status === 'rejected';
                  const isPending = !isApproved && !isRejected;

                  return (
                    <tr
                      key={`tbl-${task.id}-${proof.id}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Media Thumbnail */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => handleOpenPreview(item)}
                          className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shrink-0 relative group"
                        >
                          {proof.url && (proof.mimeType?.startsWith('image/') || proof.type === 'image' || !proof.mimeType) ? (
                            <img
                              src={proof.url || '/logo.png'}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/logo.png';
                              }}
                            />
                          ) : (
                            getProofTypeIcon(proof.type, proof.mimeType)
                          )}
                          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </td>

                      {/* Task Info */}
                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="font-bold text-slate-900 dark:text-white text-xs mb-1 line-clamp-1">
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: department?.color || '#f59e0b' }}
                          />
                          <span>{department?.name || 'General'}</span>
                          <span>•</span>
                          <span className="capitalize">{task.priority} Priority</span>
                        </div>
                      </td>

                      {/* Submitter */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {uploader?.name || proof.uploaderName || 'Volunteer Sevait'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDate(proof.uploadedAt || proof.createdAt || task.createdAt)}
                        </div>
                      </td>

                      {/* Status & Feedback */}
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="mb-1">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <XCircle className="w-3 h-3" /> Revision Needed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" /> Pending Review
                            </span>
                          )}
                        </div>
                        {(proof.reviewComment || task.rejectionReason || proof.remarks) && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                            {proof.reviewComment || task.rejectionReason || proof.remarks}
                          </p>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenPreview(item)}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Inspect Proof"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canReview && isPending && (
                            <>
                              <button
                                onClick={() => handleInitiateReview(item, 'REJECT')}
                                className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleInitiateReview(item, 'APPROVE')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= REVIEW ACTION MODAL (Approve or Reject with Remarks) ================= */}
      {reviewModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div
              className={`p-4 sm:p-5 text-white flex items-center justify-between ${
                reviewModalData.action === 'APPROVE'
                  ? 'bg-emerald-700 dark:bg-emerald-900'
                  : 'bg-rose-700 dark:bg-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {reviewModalData.action === 'APPROVE' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
                <div>
                  <h3 className="text-base font-bold">
                    {reviewModalData.action === 'APPROVE'
                      ? 'Approve Work Proof'
                      : 'Reject & Request Revision'}
                  </h3>
                  <p className="text-xs opacity-90 truncate max-w-xs sm:max-w-sm">
                    {reviewModalData.item.task.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewModalData(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-black/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 mb-1">
                  <span>Volunteer Sevait:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {reviewModalData.item.uploader?.name ||
                      reviewModalData.item.proof.uploaderName ||
                      'Volunteer'}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>Department:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {reviewModalData.item.department?.name || 'General Seva'}
                  </strong>
                </div>
              </div>

              {/* Preset suggestions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {reviewModalData.action === 'APPROVE'
                    ? 'Optional Appreciation Note / Feedback:'
                    : 'Select Quick Reason or Type Below:'}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {(reviewModalData.action === 'APPROVE'
                    ? approvalPresets
                    : rejectionPresets
                  ).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReviewRemark(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-left transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                  placeholder={
                    reviewModalData.action === 'APPROVE'
                      ? 'Add any comments for the volunteer...'
                      : 'Provide clear instructions on what needs revision...'
                  }
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewModalData(null)}
                  disabled={isSubmittingReview}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReview}
                  disabled={isSubmittingReview}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    reviewModalData.action === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingReview ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving Decision...
                    </>
                  ) : reviewModalData.action === 'APPROVE' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Confirm Approval
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      Send Rejection Notice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LIGHTBOX / MEDIA PREVIEW MODAL ================= */}
      {previewMedia && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex flex-col max-h-[90vh] shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm sm:text-base font-bold truncate">{previewMedia.title}</h3>
                <p className="text-xs text-slate-400 truncate">
                  Submitted by {previewMedia.uploaderName} •{' '}
                  {previewMedia.proof.originalFileName || previewMedia.proof.fileName || 'Attachment'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {previewMedia.url && (
                  <a
                    href={previewMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={previewMedia.proof.fileName || 'proof-document'}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
                    title="Open Full File in New Window"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media Content */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950 min-h-[300px]">
              {previewMedia.type === 'image' ? (
                <img
                  src={previewMedia.url || '/logo.png'}
                  alt={previewMedia.title}
                  className="max-h-[68vh] max-w-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.png';
                  }}
                />
              ) : previewMedia.type === 'audio' ? (
                <div className="w-full max-w-md p-6 bg-slate-900 rounded-2xl text-center space-y-4 border border-slate-800">
                  <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                    <Music className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Audio Proof Recording</h4>
                  <audio controls className="w-full" src={previewMedia.url}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : (
                <div className="w-full max-w-md p-6 bg-slate-900 rounded-2xl text-center space-y-4 border border-slate-800 text-white">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold">Document / PDF Evidence</h4>
                  <p className="text-xs text-slate-400">
                    {previewMedia.proof.originalFileName || previewMedia.proof.fileName || 'Document.pdf'}
                  </p>
                  <a
                    href={previewMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Open / Download Document
                  </a>
                </div>
              )}
            </div>

            {/* Footer with proof remarks */}
            {previewMedia.proof.remarks && (
              <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-amber-400 mr-2">Note:</span>
                {previewMedia.proof.remarks}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
