import React, { useState, useEffect } from 'react';
import { Task, TaskProof, User } from '../types';
import {
  X,
  Upload,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Eye,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Share2,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../services/api';

interface ProofModalProps {
  task: Task;
  currentUser: User;
  onClose: () => void;
  onSubmitProofAndStatus?: (
    taskId: string,
    newStatus: string,
    proof?: any
  ) => void;
  onAddRemark: (taskId: string, remarkText: string) => void;
  onTaskUpdated?: (updatedTask: Task) => void;
}

export const ProofModal: React.FC<ProofModalProps> = ({
  task,
  currentUser,
  onClose,
  onSubmitProofAndStatus,
  onAddRemark,
  onTaskUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'proofs' | 'upload' | 'remarks'>('proofs');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Remarks state
  const [remarkInput, setRemarkInput] = useState('');

  // Proof list & review states
  const [proofsList, setProofsList] = useState<TaskProof[]>(task.proofs || []);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [activeProofViewUrl, setActiveProofViewUrl] = useState<{ id: string; url: string; mimeType?: string } | null>(null);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState<string | null>(null);

  // Rejection Dialog State
  const [rejectingProofId, setRejectingProofId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [copiedProofId, setCopiedProofId] = useState<string | null>(null);

  const handleShareWhatsApp = async (proof: TaskProof) => {
    try {
      const res = await api.getProofDownloadUrl(task.id, proof.id);
      const text = encodeURIComponent(
        `SEVYA TPMS\n` +
        `Task: ${task.title}\n` +
        `Submitted by: ${proof.uploaderName || task.ownerId || 'Sevait'}\n` +
        `Status: Under Review\n` +
        `Proof: ${window.location.origin}${res.url}`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert(err.message || 'Could not generate share link');
    }
  };

  const handleShareEmail = async (proof: TaskProof) => {
    try {
      const res = await api.getProofDownloadUrl(task.id, proof.id);
      const subject = encodeURIComponent(`SEVYA TPMS Seva Proof Review: ${task.title}`);
      const body = encodeURIComponent(
        `SEVYA TPMS Seva Proof Review\n\n` +
        `Task: ${task.title}\n` +
        `Submitted By: ${proof.uploaderName || task.ownerId || 'Sevait'}\n` +
        `Status: Under Review\n` +
        `Secure Proof Link: ${window.location.origin}${res.url}\n\n` +
        `Please review and approve or reject this Seva completion.`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } catch (err: any) {
      alert(err.message || 'Could not generate email link');
    }
  };

  const handleCopyLink = async (proof: TaskProof) => {
    try {
      const res = await api.getProofDownloadUrl(task.id, proof.id);
      const fullUrl = `${window.location.origin}${res.url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedProofId(proof.id);
      setTimeout(() => setCopiedProofId(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Could not copy link');
    }
  };

  const isLeaderOrAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'temple_admin' ||
    currentUser.role === 'leader';

  // Fetch latest proofs when modal opens
  useEffect(() => {
    let isMounted = true;
    setLoadingProofs(true);
    api.getTaskProofs(task.id)
      .then((data) => {
        if (isMounted) {
          setProofsList(data);
          setLoadingProofs(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProofsList(task.proofs || []);
          setLoadingProofs(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [task.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) return;

    // Validate size: 50 MB
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds the 50 MB limit. Please select a smaller file.');
      return;
    }

    // Validate type (images, videos, audio, pdf)
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isVideo && !isAudio && !isPdf) {
      setUploadError('Invalid file format. Please upload JPG, PNG, WEBP photo, MP4 video, or PDF document.');
      return;
    }

    setSelectedFile(file);
    if (isImage || isVideo) {
      const objectUrl = URL.createObjectURL(file);
      setFilePreviewUrl(objectUrl);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a photo or document file to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (remarks.trim()) {
        formData.append('remarks', remarks.trim());
      }

      const response = await api.uploadTaskProof(task.id, formData);
      setUploading(false);
      setUploadSuccess(true);
      setSelectedFile(null);
      setRemarks('');

      // Refresh local proof list
      const updatedProofs = await api.getTaskProofs(task.id);
      setProofsList(updatedProofs);

      if (onTaskUpdated && response.task) {
        onTaskUpdated(response.task);
      } else if (onSubmitProofAndStatus) {
        onSubmitProofAndStatus(task.id, 'under_review', response.proof);
      }

      setTimeout(() => {
        setUploadSuccess(false);
        setActiveTab('proofs');
      }, 1000);
    } catch (err: any) {
      setUploading(false);
      setUploadError(err.message || 'Failed to upload proof. Please try again.');
    }
  };

  // View / Download proof using temporary signed URL or direct URL
  const handleViewProof = async (proof: TaskProof) => {
    try {
      const url = proof.url || (proof as any).objectKey;
      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) {
        if (proof.mimeType === 'application/pdf' || proof.type === 'document') {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          setActiveProofViewUrl({ id: proof.id, url, mimeType: proof.mimeType || proof.type });
        }
        return;
      }

      setLoadingSignedUrl(proof.id);
      const res = await api.getProofDownloadUrl(task.id, proof.id);
      setLoadingSignedUrl(null);

      if (proof.mimeType === 'application/pdf' || proof.type === 'document') {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setActiveProofViewUrl({ id: proof.id, url: res.url, mimeType: proof.mimeType || proof.type });
      }
    } catch (err: any) {
      setLoadingSignedUrl(null);
      alert(err.message || 'Could not fetch secure proof link.');
    }
  };

  // Review (Approve or Reject)
  const handleReviewProof = async (proofId: string, decision: 'APPROVED' | 'REJECTED', comment?: string) => {
    setReviewing(true);
    try {
      const res = await api.reviewTaskProof(task.id, proofId, decision, comment);
      setReviewing(false);
      setRejectingProofId(null);
      setRejectionReason('');

      // Refresh local proof list
      const updated = await api.getTaskProofs(task.id);
      setProofsList(updated);

      if (onTaskUpdated && res.task) {
        onTaskUpdated(res.task);
      }
    } catch (err: any) {
      setReviewing(false);
      alert(err.message || 'Failed to complete review decision.');
    }
  };

  const handleRemarkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkInput.trim()) return;
    onAddRemark(task.id, remarkInput.trim());
    setRemarkInput('');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Seva Proof & Verification System
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white truncate">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('proofs')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'proofs'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Proof History ({proofsList.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'upload'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            Upload Proof
          </button>
          <button
            onClick={() => setActiveTab('remarks')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'remarks'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            Remarks ({(task.remarks || []).length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PROOFS LIST & REVIEW */}
          {activeTab === 'proofs' && (
            <div className="space-y-4">
              {task.proofRequired && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2 text-xs font-medium text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Proof of Seva completion is mandatory before final completion status.
                </div>
              )}

              {loadingProofs ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Loading task proofs...</p>
                </div>
              ) : proofsList.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No proof submitted yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload a photo or document proof after performing the task.
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 shadow-xs"
                  >
                    Upload Proof
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {proofsList.map((proof, idx) => (
                    <div
                      key={proof.id}
                      className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          {proof.type === 'image' || proof.mimeType?.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <div>
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">
                              {proof.originalFileName || proof.fileName || `Proof Attempt #${proofsList.length - idx}`}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatFileSize(proof.fileSize)} • {new Date(proof.uploadedAt || proof.createdAt || Date.now()).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {proof.status === 'APPROVED' && (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {proof.status === 'REJECTED' && (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                          {(proof.status === 'SUBMITTED' || !proof.status) && (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Waiting for Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Remarks */}
                      {proof.remarks || proof.note ? (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          "{proof.remarks || proof.note}"
                        </p>
                      ) : null}

                      {/* Review Comment if rejected/approved */}
                      {proof.reviewComment && (
                        <div className="bg-slate-100 p-2.5 rounded-lg text-xs border border-slate-200">
                          <span className="font-bold text-slate-700">Review Note: </span>
                          <span className="text-slate-600">{proof.reviewComment}</span>
                        </div>
                      )}

                      {/* Preview view area */}
                      {activeProofViewUrl?.id === proof.id && (
                        <div className="mt-2 p-3 bg-slate-900 rounded-xl text-center relative border border-slate-800 shadow-inner">
                          <button
                            onClick={() => setActiveProofViewUrl(null)}
                            className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-full hover:bg-slate-700 z-10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {activeProofViewUrl.mimeType?.startsWith('video/') || proof.type === 'video' ? (
                            <video
                              controls
                              autoPlay
                              src={activeProofViewUrl.url}
                              className="max-h-72 w-full mx-auto rounded-lg border border-slate-700 object-contain"
                            />
                          ) : activeProofViewUrl.mimeType?.startsWith('audio/') || proof.type === 'audio' ? (
                            <audio controls src={activeProofViewUrl.url} className="w-full mt-2" />
                          ) : activeProofViewUrl.mimeType === 'application/pdf' || proof.type === 'document' ? (
                            <div className="p-4 text-slate-200 text-xs flex flex-col items-center gap-2">
                              <FileText className="w-10 h-10 text-amber-400" />
                              <span className="font-semibold text-slate-300">PDF / Document Proof Preview</span>
                              <a
                                href={activeProofViewUrl.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open Document Fullscreen
                              </a>
                            </div>
                          ) : (
                            <img
                              src={activeProofViewUrl.url}
                              alt="Proof Preview"
                              className="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain"
                            />
                          )}
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={loadingSignedUrl === proof.id}
                            onClick={() => handleViewProof(proof)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            {loadingSignedUrl === proof.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            View / Download
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(proof)}
                            title="Share Proof via WhatsApp"
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareEmail(proof)}
                            title="Share Proof via Email"
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5 text-blue-600" /> Email
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(proof)}
                            title="Copy Secure Proof Link"
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            {copiedProofId === proof.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Link
                              </>
                            )}
                          </button>
                        </div>

                        {/* Reviewer Controls */}
                        {isLeaderOrAdmin && (proof.status === 'SUBMITTED' || !proof.status) && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={reviewing}
                              onClick={() => handleReviewProof(proof.id, 'APPROVED')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={reviewing}
                              onClick={() => setRejectingProofId(proof.id)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Rejection comment prompt */}
                      {rejectingProofId === proof.id && (
                        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                          <label className="block text-xs font-bold text-rose-800">
                            Reason for Rejection
                          </label>
                          <textarea
                            rows={2}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Please enter what needs correction or re-uploading..."
                            className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRejectingProofId(null)}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={reviewing}
                              onClick={() => handleReviewProof(proof.id, 'REJECTED', rejectionReason)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD PROOF */}
          {activeTab === 'upload' && (
            <form onSubmit={handleUploadProof} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Proof Document or Photo
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-6 text-center bg-slate-50 hover:bg-amber-50/20 transition-all cursor-pointer">
                  <input
                    type="file"
                    id="proofFileInput"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {!selectedFile ? (
                    <label htmlFor="proofFileInput" className="cursor-pointer space-y-2 block">
                      <Upload className="w-8 h-8 text-amber-600 mx-auto" />
                      <div className="text-xs font-bold text-slate-700">
                        Click to select photo or PDF document
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Supports JPG, PNG, WEBP, or PDF up to 10 MB
                      </div>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3 line-clamp-1">
                        {selectedFile.type.startsWith('image/') ? (
                          <ImageIcon className="w-5 h-5 text-blue-600 shrink-0" />
                        ) : (
                          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{selectedFile.name}</p>
                          <p className="text-[10px] text-slate-400">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveSelectedFile}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Preview */}
              {filePreviewUrl && (
                <div className="p-2 bg-slate-900 rounded-xl text-center">
                  <img
                    src={filePreviewUrl}
                    alt="Selected Preview"
                    className="max-h-48 mx-auto rounded border border-slate-700 object-contain"
                  />
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Seva Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter optional notes about work completed..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Errors & Success Feedback */}
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Proof submitted for review successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading proof to object storage...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Submit Proof
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: REMARKS */}
          {activeTab === 'remarks' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {(task.remarks || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    No remarks added yet. Add an audit note below.
                  </p>
                ) : (
                  (task.remarks || []).map((rem) => (
                    <div key={rem.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                      <div className="flex justify-between items-center mb-1 text-slate-700">
                        <span className="font-bold text-slate-900">{rem.userName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(rem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600">{rem.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleRemarkSubmit} className="pt-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={remarkInput}
                  onChange={(e) => setRemarkInput(e.target.value)}
                  placeholder="Type an audit remark..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Post Note
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
