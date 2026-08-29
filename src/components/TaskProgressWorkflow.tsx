import React from 'react';
import { Task, User, TaskStatus } from '../types';
import {
  getTaskStatusInfo,
  getTaskWorkflowStages,
  calculateOverdueStatus,
  formatDate,
  formatDateTime,
} from '../utils/taskUtils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  XCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Check,
  RotateCcw,
  Ban,
  Upload,
  Calendar,
  Info,
} from 'lucide-react';

interface TaskProgressWorkflowProps {
  task: Task;
  currentUser: User;
  users: User[];
  onStatusChange: (taskId: string, status: TaskStatus, remarkOrReason?: string) => Promise<void>;
  onOpenProofModal?: (task: Task) => void;
}

export const TaskProgressWorkflow: React.FC<TaskProgressWorkflowProps> = ({
  task,
  currentUser,
  users,
  onStatusChange,
  onOpenProofModal,
}) => {
  const isProofRequired = task.proofRequired;
  const statusInfo = getTaskStatusInfo(task.status, isProofRequired);
  const stages = getTaskWorkflowStages(isProofRequired);
  const overdueInfo = calculateOverdueStatus(task.dueDate, task.status);

  const owner = users.find((u) => u.id === task.ownerId);
  const creator = users.find((u) => u.id === task.createdBy);

  const isAssignee = currentUser.id === task.ownerId;
  const isLeaderOrAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'temple_admin' ||
    currentUser.role === 'department_head' ||
    currentUser.role === 'leader' ||
    currentUser.id === task.createdBy;

  // Determine current stage index in stages array
  let currentStageIndex = 0;
  if (task.status === 'assigned' || task.status === 'pending') currentStageIndex = 0;
  else if (task.status === 'accepted') currentStageIndex = 1;
  else if (task.status === 'in_progress' || task.status === 'reopened') currentStageIndex = 2;
  else if (task.status === 'waiting_for_proof' || task.status === 'proof_submitted')
    currentStageIndex = isProofRequired ? 3 : 2;
  else if (task.status === 'under_review') currentStageIndex = isProofRequired ? 4 : 2;
  else if (task.status === 'approved') currentStageIndex = isProofRequired ? 5 : 3;
  else if (task.status === 'completed') currentStageIndex = stages.length - 1;

  // Next expected action text
  let nextActionText = '';
  if (task.status === 'pending' || task.status === 'assigned') {
    nextActionText = isAssignee
      ? 'Action Expected: Accept task assignment to begin work'
      : `Waiting for ${owner?.name || 'assignee'} to accept assignment`;
  } else if (task.status === 'accepted') {
    nextActionText = isAssignee
      ? 'Action Expected: Click "Start Work" when you begin'
      : `Waiting for ${owner?.name || 'assignee'} to start work`;
  } else if (task.status === 'in_progress') {
    if (isProofRequired) {
      nextActionText = isAssignee
        ? 'Action Expected: Complete work and upload verification proof'
        : `Waiting for ${owner?.name || 'assignee'} to upload completion proof`;
    } else {
      nextActionText = isAssignee
        ? 'Action Expected: Click "Mark Completed" once work is finished'
        : `Waiting for ${owner?.name || 'assignee'} to complete work`;
    }
  } else if (task.status === 'waiting_for_proof' || task.status === 'proof_submitted' || task.status === 'under_review') {
    nextActionText = isLeaderOrAdmin
      ? 'Action Expected: Review uploaded proof and Approve or Reject'
      : 'Proof submitted. Under review by Admin / Department Head';
  } else if (task.status === 'approved') {
    nextActionText = 'Proof approved! Task marked for final completion.';
  } else if (task.status === 'rejected') {
    nextActionText = isAssignee
      ? 'Task rejected. Review rejection reason and resubmit work/proof.'
      : 'Task was rejected. Waiting for assignee to correct work.';
  } else if (task.status === 'completed') {
    nextActionText = 'Task successfully completed and closed.';
  } else if (task.status === 'cancelled') {
    nextActionText = 'Task cancelled.';
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6">
      {/* Top Workflow Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${statusInfo.badgeBg} ${statusInfo.textColor} ${statusInfo.borderColor}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
              {statusInfo.label}
            </span>

            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                isProofRequired
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-blue-50 text-blue-900 border-blue-200'
              }`}
            >
              {isProofRequired ? '🛡️ Proof Required Workflow' : '⚡ Direct Workflow (No Proof Required)'}
            </span>

            {overdueInfo.isOverdue && (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                {overdueInfo.label}
              </span>
            )}
          </div>

          <p className="text-xs font-medium text-slate-600 pt-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            {nextActionText}
          </p>
        </div>

        {/* Progress % Pill */}
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900">{statusInfo.progress}%</div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Stage {statusInfo.stageIndex} of {statusInfo.totalStages}
          </span>
        </div>
      </div>

      {/* Progress Bar Component */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-700">
          <span>Overall Completion Progress</span>
          <span className="text-amber-700">{statusInfo.progress}%</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              task.status === 'completed' || task.status === 'approved'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                : task.status === 'rejected'
                ? 'bg-gradient-to-r from-rose-500 to-red-600'
                : task.status === 'under_review'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
            style={{ width: `${statusInfo.progress}%` }}
          />
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="pt-2">
        <div className="relative flex items-center justify-between">
          {/* Connector Line behind nodes */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0" />

          {stages.map((st, idx) => {
            const isCompletedStep = idx < currentStageIndex || task.status === 'completed';
            const isCurrentStep = idx === currentStageIndex && task.status !== 'completed';
            const isRejectedStep = task.status === 'rejected' && idx === currentStageIndex;

            return (
              <div key={st.id} className="relative z-10 flex flex-col items-center group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                    isRejectedStep
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                      : isCompletedStep
                      ? 'bg-emerald-600 text-white'
                      : isCurrentStep
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-100 font-extrabold scale-110'
                      : 'bg-white text-slate-400 border-2 border-slate-300'
                  }`}
                >
                  {isCompletedStep ? (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  ) : isRejectedStep ? (
                    <XCircle className="w-4 h-4 text-white" />
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="mt-2 text-center max-w-[80px]">
                  <p
                    className={`text-[11px] leading-tight font-extrabold truncate ${
                      isCurrentStep ? 'text-amber-900 font-black' : isCompletedStep ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {st.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rejection / Reopen Notice Box if applicable */}
      {task.rejectionReason && (
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-1">
          <div className="flex items-center gap-2 text-xs font-extrabold text-rose-900">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" /> Rejection Remark / Correction Needed
          </div>
          <p className="text-xs text-rose-800 font-medium pl-6">{task.rejectionReason}</p>
        </div>
      )}

      {task.reopenReason && (
        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-1">
          <div className="flex items-center gap-2 text-xs font-extrabold text-purple-900">
            <RotateCcw className="w-4 h-4 text-purple-600 shrink-0" /> Reopen Reason
          </div>
          <p className="text-xs text-purple-800 font-medium pl-6">{task.reopenReason}</p>
        </div>
      )}

      {/* Task Details Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Owner</span>
          <span className="font-bold text-slate-800 truncate block mt-0.5">{owner?.name || 'Unassigned'}</span>
          <span className="text-[10px] text-slate-500 uppercase">{owner?.role.replace('_', ' ')}</span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Date</span>
          <span className="font-bold text-slate-800 block mt-0.5">{formatDate(task.createdAt)}</span>
          <span className="text-[10px] text-slate-500">{formatDateTime(task.createdAt)}</span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Due Date</span>
          <span className="font-bold text-slate-800 block mt-0.5">{formatDate(task.dueDate)}</span>
          <span className={`text-[10px] font-bold ${overdueInfo.isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
            {overdueInfo.label}
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Updated</span>
          <span className="font-bold text-slate-800 block mt-0.5">
            {task.updatedAt ? formatDateTime(task.updatedAt) : formatDate(task.createdAt)}
          </span>
          <span className="text-[10px] text-slate-500">Auto-recorded</span>
        </div>
      </div>

      {/* Workflow Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
        <span className="text-xs font-bold text-slate-500">Available Workflow Actions:</span>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action 1: Accept Assignment (Assignee) */}
          {(task.status === 'assigned' || task.status === 'pending') && isAssignee && (
            <button
              onClick={() => onStatusChange(task.id, 'accepted')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" /> Accept Assignment
            </button>
          )}

          {/* Action 2: Start Work (Assignee) */}
          {task.status === 'accepted' && isAssignee && (
            <button
              onClick={() => onStatusChange(task.id, 'in_progress')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-4 h-4" /> Start Work
            </button>
          )}

          {/* Action 3: Upload Proof (If Proof Required) */}
          {(task.status === 'in_progress' || task.status === 'reopened' || task.status === 'rejected') &&
            isProofRequired &&
            onOpenProofModal && (
              <button
                onClick={() => onOpenProofModal(task)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Upload Verification Proof
              </button>
            )}

          {/* Action 4: Direct Complete (If Proof NOT Required) */}
          {(task.status === 'in_progress' || task.status === 'reopened') && !isProofRequired && (
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark as Completed
            </button>
          )}

          {/* Action 5: Admin / Leader Proof Verification */}
          {(task.status === 'under_review' || task.status === 'proof_submitted' || task.status === 'waiting_for_proof') &&
            isLeaderOrAdmin && (
              <>
                <button
                  onClick={() => onStatusChange(task.id, 'approved')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" /> Approve Proof
                </button>

                <button
                  onClick={() => {
                    const reason = prompt('Please specify rejection reason for the assignee:');
                    if (reason && reason.trim()) {
                      onStatusChange(task.id, 'rejected', reason.trim());
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Reject Proof
                </button>
              </>
            )}

          {/* Action 6: Approve to Completed transition */}
          {task.status === 'approved' && isLeaderOrAdmin && (
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Finalize Task Completion
            </button>
          )}

          {/* Action 7: Reopen Task */}
          {task.status === 'completed' && isLeaderOrAdmin && (
            <button
              onClick={() => {
                const reason = prompt('Please specify reason to reopen this task:');
                if (reason && reason.trim()) {
                  onStatusChange(task.id, 'reopened', reason.trim());
                }
              }}
              className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reopen Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
