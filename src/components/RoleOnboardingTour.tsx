import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserRole } from '../types';
import { normalizeRole } from '../utils/roleHierarchy';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Shield,
  Landmark,
  Users,
  CheckSquare,
  Compass,
  Calendar,
  MessageSquare,
  Settings,
  Bell,
  FileText,
  FolderKanban,
  UserCheck,
  Zap,
  RotateCcw,
  FileCheck,
  ShieldCheck,
  HeartHandshake,
} from 'lucide-react';

interface RoleOnboardingTourProps {
  userRole: UserRole;
  userName: string;
  userId: string;
}

interface TourStepConfig {
  id: string;
  targetSelector: string;
  fallbackSelector?: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  roleBadge: string;
  badgeColor: string;
  actionTip?: string;
}

export const RoleOnboardingTour: React.FC<RoleOnboardingTourProps> = ({
  userRole,
  userName,
  userId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const storageKey = `sevya_tour_completed_${userId || userRole}`;

  // Check viewport size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-launch tour ONLY on first login if not completed/skipped yet
  useEffect(() => {
    if (!userId && !userRole) return;
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Allow DOM elements, sidebar, and dashboard components to mount cleanly
      const timer = setTimeout(() => {
        setIsOpen(true);
        setCurrentStepIndex(0);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [storageKey, userId, userRole]);

  // Define role-specific tour steps strictly matching each role's permissions
  const getRoleSteps = (): TourStepConfig[] => {
    const normRole = normalizeRole(userRole);
    switch (normRole) {
      case 'super_admin':
        return [
          {
            id: 'dashboard',
            targetSelector: '[data-tour="nav-dashboard"]',
            fallbackSelector: 'aside',
            title: 'Master Command Dashboard',
            subtitle: 'Super Admin Oversight',
            description:
              'Welcome to your central multi-temple command center. Monitor live temple telemetry, active seva workflows, system health, and branch performance in real time.',
            icon: <Shield className="w-5 h-5 text-amber-500" />,
            roleBadge: 'Super Admin',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            actionTip: 'Review aggregate metrics and seva velocity across all temple branches.',
          },
          {
            id: 'users',
            targetSelector: '[data-tour="nav-users"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'User & Role Administration',
            subtitle: 'RBAC Hierarchy Control',
            description:
              'Provision and oversee temple administrators, trustees, department heads, and coordinators with granular permissions and hierarchical security.',
            icon: <Users className="w-5 h-5 text-blue-500" />,
            roleBadge: 'User Hierarchy',
            badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
            actionTip: 'Grant administrator privileges and manage designation assignments.',
          },
          {
            id: 'reports',
            targetSelector: '[data-tour="nav-reports"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Audit & Compliance Ledger',
            subtitle: 'Security & Activity Logs',
            description:
              'Review cryptographic security audit trails, permission modifications, integration events, and complete multi-tenant history.',
            icon: <FileText className="w-5 h-5 text-indigo-500" />,
            roleBadge: 'Security Audit',
            badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
            actionTip: 'Filter audit records by actor, date range, or event severity.',
          },
          {
            id: 'settings',
            targetSelector: '[data-tour="nav-settings"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Integrations & Automations',
            subtitle: 'WhatsApp, Google & Zoom',
            description:
              'Configure Meta WhatsApp Cloud API, Google Calendar synchronization, and automated video conferencing pipelines for temple events.',
            icon: <Zap className="w-5 h-5 text-amber-600" />,
            roleBadge: 'Automations',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            actionTip: 'Test live notification triggers and automated channel webhooks.',
          },
          {
            id: 'approvals',
            targetSelector: '[data-tour="nav-approvals"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Governance & Approvals',
            subtitle: 'System-wide Governance',
            description:
              'Authorize top-tier administrative exceptions, multi-temple seva budgets, and policy requests requiring Super Admin sign-off.',
            icon: <FileCheck className="w-5 h-5 text-emerald-600" />,
            roleBadge: 'Governance',
            badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
            actionTip: 'Review pending high-level approval requests across organizations.',
          },
          {
            id: 'feedback',
            targetSelector: '[data-tour="nav-feedback"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Global Devotee Feedback',
            subtitle: 'Sentiment & Suggestions',
            description:
              'Review incoming feedback and suggestions from devotees across all temples. Monitor resolution timelines and devotee satisfaction.',
            icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
            roleBadge: 'Feedback Oversight',
            badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
            actionTip: 'Track unresolved devotee inquiries and ensure swift resolution.',
          },
        ];

      case 'temple_admin':
        return [
          {
            id: 'dashboard',
            targetSelector: '[data-tour="nav-dashboard"]',
            fallbackSelector: 'aside',
            title: 'Temple Administration Dashboard',
            subtitle: 'Welcome Temple Administrator',
            description:
              'Your central temple administration dashboard. Track daily seva schedules, active departments, festival calendars, and volunteer task progress.',
            icon: <Landmark className="w-5 h-5 text-amber-600" />,
            roleBadge: 'Temple Admin',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            actionTip: 'Check upcoming daily aarti rosters and urgent seva tasks.',
          },
          {
            id: 'tasks',
            targetSelector: '[data-tour="nav-tasks"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Seva Task Management',
            subtitle: 'Task Delegation & Tracking',
            description:
              'Create, prioritize, and assign seva tasks to department heads and coordinators. Monitor real-time completion status and due dates.',
            icon: <CheckSquare className="w-5 h-5 text-emerald-600" />,
            roleBadge: 'Seva Tasks',
            badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
            actionTip: 'Use quick assignment filters to distribute daily sevas efficiently.',
          },
          {
            id: 'projects',
            targetSelector: '[data-tour="nav-projects"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Temple Projects & Initiatives',
            subtitle: 'Utsav & Infrastructure Planning',
            description:
              'Organize major temple initiatives such as Janmashtami Celebrations, temple renovations, and Annakoot Mahotsav with assigned teams and real files.',
            icon: <FolderKanban className="w-5 h-5 text-blue-600" />,
            roleBadge: 'Projects',
            badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
            actionTip: 'Track project milestones, upload blueprints, and link subtasks.',
          },
          {
            id: 'meetings',
            targetSelector: '[data-tour="nav-meetings"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Trustee Meetings & Minutes (MOM)',
            subtitle: 'Governance & Coordination',
            description:
              'Schedule trustee meetings, generate automatic Zoom video links, invite department heads, and publish structured Minutes of Meeting.',
            icon: <Calendar className="w-5 h-5 text-indigo-600" />,
            roleBadge: 'Meetings',
            badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
            actionTip: 'Export official meeting minutes directly to attendees with 1 click.',
          },
          {
            id: 'approvals',
            targetSelector: '[data-tour="nav-approvals"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Administrative Approvals',
            subtitle: 'Budgets, Leaves & Requisitions',
            description:
              'Review and approve departmental budget allocations, special puja requests, volunteer leave requisitions, and reimbursement claims.',
            icon: <FileCheck className="w-5 h-5 text-emerald-600" />,
            roleBadge: 'Approvals',
            badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
            actionTip: 'Approve or reject requests with audit-logged administrative notes.',
          },
          {
            id: 'users',
            targetSelector: '[data-tour="nav-users"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Staff & Members',
            subtitle: 'User Management',
            description:
              'Manage temple staff, department heads, coordinators, and volunteer devotees. Assign custom designations and manage roles.',
            icon: <Users className="w-5 h-5 text-blue-600" />,
            roleBadge: 'Staff & Members',
            badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
            actionTip: 'Invite new volunteers and assign them to respective departments.',
          },
          {
            id: 'feedback',
            targetSelector: '[data-tour="nav-feedback"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Member Feedback Inbox',
            subtitle: 'Devotee Care & Resolution',
            description:
              'Review incoming feedback regarding temple cleanliness, prasadam, and festival inquiries. Respond directly to devotees.',
            icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
            roleBadge: 'Devotee Care',
            badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
            actionTip: 'Categorize feedback as In Review or Resolved with official notes.',
          },
          {
            id: 'settings',
            targetSelector: '[data-tour="nav-settings"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Departments & Settings',
            subtitle: 'Temple Configuration',
            description:
              'Configure temple departments, custom volunteer designations, and connect notification channels like WhatsApp and Google Calendar.',
            icon: <Settings className="w-5 h-5 text-slate-700" />,
            roleBadge: 'Configuration',
            badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
            actionTip: 'Customize roles like Head Priest, Prasadam Lead, or Security Incharge.',
          },
        ];

      case 'department_head':
        return [
          {
            id: 'dashboard',
            targetSelector: '[data-tour="nav-dashboard"]',
            fallbackSelector: 'aside',
            title: 'Department Leadership Dashboard',
            subtitle: 'Department Leadership',
            description:
              'Track your department’s ongoing projects, volunteer rosters, completion rates, and upcoming festival seva deadlines.',
            icon: <Users className="w-5 h-5 text-amber-600" />,
            roleBadge: 'Dept Head',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            actionTip: 'Monitor tasks assigned to coordinators under your leadership.',
          },
          {
            id: 'tasks',
            targetSelector: '[data-tour="nav-tasks"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Assign & Review Department Sevas',
            subtitle: 'Seva Execution',
            description:
              'Delegate department-specific duties to coordinators and volunteers. Track status from Pending to In-Progress and Completed.',
            icon: <CheckSquare className="w-5 h-5 text-emerald-600" />,
            roleBadge: 'Seva Dispatch',
            badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
            actionTip: 'Set recurring seva schedules for daily and weekly temple duties.',
          },
          {
            id: 'proofs',
            targetSelector: '[data-tour="nav-proofs"]',
            fallbackSelector: '[data-tour="nav-tasks"]',
            title: 'Proof Verification & Approvals',
            subtitle: 'Quality Assurance',
            description:
              'Inspect photo proof and completion notes uploaded by volunteers upon concluding their seva before marking duties as verified.',
            icon: <ShieldCheck className="w-5 h-5 text-orange-600" />,
            roleBadge: 'Verification',
            badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
            actionTip: 'Approve or request rework on submitted seva photos with 1 click.',
          },
          {
            id: 'projects',
            targetSelector: '[data-tour="nav-projects"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Department Projects & Initiatives',
            subtitle: 'Festival & Event Planning',
            description:
              'Manage multi-phase department initiatives such as Janmashtami Celebrations, Temple Renovation, or Annakoot Mahotsav.',
            icon: <FolderKanban className="w-5 h-5 text-blue-600" />,
            roleBadge: 'Projects',
            badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
            actionTip: 'Link department tasks directly to milestone projects.',
          },
          {
            id: 'meetings',
            targetSelector: '[data-tour="nav-meetings"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Department Meetings & MOM',
            subtitle: 'Coordination Sessions',
            description:
              'Coordinate with team members, launch Zoom meetings, and maintain clear records of action items and discussions.',
            icon: <Calendar className="w-5 h-5 text-indigo-600" />,
            roleBadge: 'Meetings',
            badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
            actionTip: 'Keep your department volunteers synchronized on upcoming tasks.',
          },
          {
            id: 'feedback',
            targetSelector: '[data-tour="nav-feedback"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Department Feedback & Inquiries',
            subtitle: 'Continuous Improvement',
            description:
              'Review feedback specific to your department from devotees and volunteers to improve seva delivery and temple experience.',
            icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
            roleBadge: 'Feedback',
            badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
            actionTip: 'Collaborate with temple admins on devotee recommendations.',
          },
        ];

      case 'coordinator':
        return [
          {
            id: 'dashboard',
            targetSelector: '[data-tour="nav-dashboard"]',
            fallbackSelector: 'aside',
            title: 'Coordinator Seva Dashboard',
            subtitle: 'Ground Seva Coordination',
            description:
              'Your personal seva dashboard. See tasks due today, assigned seva duties, daily Aarti timings, and urgent announcements.',
            icon: <Compass className="w-5 h-5 text-amber-600" />,
            roleBadge: 'Coordinator',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            actionTip: 'Review daily checklist before commencing temple seva shifts.',
          },
          {
            id: 'tasks',
            targetSelector: '[data-tour="nav-tasks"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Task Execution & Check-ins',
            subtitle: 'Active Seva Management',
            description:
              'Guide volunteer members, mark attendance, update real-time progress, and upload photo proof upon task completion.',
            icon: <CheckSquare className="w-5 h-5 text-emerald-600" />,
            roleBadge: 'Seva Tasks',
            badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
            actionTip: 'Quickly change task status to In Progress or Under Review.',
          },
          {
            id: 'recurring',
            targetSelector: '[data-tour="nav-recurring"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Recurring Seva Rosters',
            subtitle: 'Daily & Weekly Shifts',
            description:
              'Manage recurring temple seva rosters like daily flower preparation, altar cleaning, and prasadam distribution shifts.',
            icon: <RotateCcw className="w-5 h-5 text-teal-600" />,
            roleBadge: 'Rosters',
            badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
            actionTip: 'Automate repetitive daily seva assignments for your team.',
          },
          {
            id: 'proofs',
            targetSelector: '[data-tour="nav-proofs"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Proof Verification',
            subtitle: 'Review Seva Photos',
            description:
              'Inspect photo evidence and notes submitted by volunteers on duty before submitting for final verification.',
            icon: <ShieldCheck className="w-5 h-5 text-orange-600" />,
            roleBadge: 'Proof Review',
            badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
            actionTip: 'Ensure all completed duties have verified photographic proof.',
          },
          {
            id: 'calendar',
            targetSelector: '[data-tour="nav-calendar"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Temple Calendar & Shifts',
            subtitle: 'Schedules & Observances',
            description:
              'View upcoming seva shifts, festival rosters, committee coordination meetings, and important temple observances.',
            icon: <Calendar className="w-5 h-5 text-blue-600" />,
            roleBadge: 'Schedules',
            badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
            actionTip: 'Sync schedules with your personal calendar for shift reminders.',
          },
          {
            id: 'users',
            targetSelector: '[data-tour="nav-users"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Devotee Community & Volunteers',
            subtitle: 'Staff & Members',
            description:
              'Quickly look up volunteer contact information, WhatsApp numbers, and department affiliations to coordinate seva teams.',
            icon: <Users className="w-5 h-5 text-indigo-600" />,
            roleBadge: 'Volunteer Network',
            badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
            actionTip: 'Quickly message volunteers on WhatsApp for shift coordination.',
          },
          {
            id: 'feedback',
            targetSelector: '[data-tour="nav-feedback"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Feedback & Field Escalation',
            subtitle: 'Direct Line to Leadership',
            description:
              'Escalate on-ground devotee requests, logistical bottlenecks, or facility feedback directly to Department Heads and Admins.',
            icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
            roleBadge: 'Escalations',
            badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
            actionTip: 'Submit feedback to alert management of urgent ground requirements.',
          },
        ];

      case 'member':
      default:
        return [
          {
            id: 'dashboard',
            targetSelector: '[data-tour="nav-dashboard"]',
            fallbackSelector: 'aside',
            title: 'Welcome to Sevya 👋',
            subtitle: `Welcome ${userName || 'Devotee'} 🙏`,
            description:
              'This is your personal seva dashboard. Here you will find daily Aarti and Darshan schedules, auspicious announcements, and information relevant to your spiritual journey.',
            icon: <Compass className="w-5 h-5 text-amber-600" />,
            roleBadge: 'Devotee Portal',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            actionTip: 'View today’s darshan timings and devotional announcements.',
          },
          {
            id: 'calendar',
            targetSelector: '[data-tour="nav-calendar"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Temple Calendar & Darshan Timings',
            subtitle: 'Festivals & Special Pujas',
            description:
              'Explore holy festival dates, Ekadashi observances, special prasadam distributions, and scheduled online Zoom satsangs.',
            icon: <Calendar className="w-5 h-5 text-blue-600" />,
            roleBadge: 'Holy Calendar',
            badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
            actionTip: 'Never miss an auspicious temple observance or darshan.',
          },
          {
            id: 'feedback',
            targetSelector: '[data-tour="nav-feedback"]',
            fallbackSelector: '[data-tour="nav-dashboard"]',
            title: 'Submit Devotee Feedback & Questions',
            subtitle: 'Direct Line to Temple Trustees',
            description:
              'Share your temple visit experience, suggestions for prasadam or cleanliness, ask questions about seva rituals, and receive official replies.',
            icon: <MessageSquare className="w-5 h-5 text-emerald-600" />,
            roleBadge: 'Member Voice',
            badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
            actionTip: 'Submit feedback and track admin review status anytime.',
          },
          {
            id: 'notifications',
            targetSelector: '[data-tour="header-notifications"]',
            fallbackSelector: '[data-tour="nav-notifications"]',
            title: 'Instant Darshan Alerts & Updates',
            subtitle: 'Real-time Notifications',
            description:
              'Important updates, replies to your feedback, and upcoming festival seva announcements will appear here.',
            icon: <Bell className="w-5 h-5 text-rose-600" />,
            roleBadge: 'Alerts',
            badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
            actionTip: 'Click the bell icon anytime to review unread temple notices.',
          },
          {
            id: 'profile',
            targetSelector: '[data-tour="profile-card"]',
            fallbackSelector: 'aside',
            title: 'Seva Profile & Personal Details',
            subtitle: 'Track Your Devotional Journey',
            description:
              'Manage your contact details, emergency contacts, profile photo, and earn seva blessings and points for your temple participation.',
            icon: <HeartHandshake className="w-5 h-5 text-amber-600" />,
            roleBadge: 'My Profile',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            actionTip: 'Click your profile card anytime to edit your photo and seva bio.',
          },
        ];
    }
  };

  const steps = getRoleSteps();
  const currentStep = steps[currentStepIndex] || steps[0];

  // Update spotlight bounding rect whenever step changes or on window resize/scroll
  const updateSpotlight = useCallback(() => {
    if (!isOpen) return;

    let targetEl = document.querySelector(currentStep.targetSelector);
    if (!targetEl && currentStep.fallbackSelector) {
      targetEl = document.querySelector(currentStep.fallbackSelector);
    }

    if (targetEl) {
      // Scroll smoothly into view if needed
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

      const rect = targetEl.getBoundingClientRect();
      const padding = 6;
      setSpotlightRect({
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    } else {
      // Fallback center position
      setSpotlightRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateSpotlight();
    const handleScrollOrResize = () => updateSpotlight();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [updateSpotlight]);

  // Keyboard navigation support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length]);

  const handleClose = () => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  // Calculate Tooltip position based on spotlight position for desktop
  const getTooltipStyle = (): React.CSSProperties => {
    if (isMobile) {
      return {}; // Handled by bottom sheet container classes
    }

    if (!spotlightRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const cardWidth = 390;
    const cardHeight = 300;
    const margin = 16;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Prefer positioning to the right of target (standard for sidebar nav items)
    if (spotlightRect.left + spotlightRect.width + cardWidth + margin < screenWidth) {
      let top = spotlightRect.top;
      if (top + cardHeight > screenHeight) {
        top = Math.max(margin, screenHeight - cardHeight - margin);
      }
      return {
        position: 'fixed',
        top: `${top}px`,
        left: `${spotlightRect.left + spotlightRect.width + margin}px`,
      };
    }

    // Otherwise below target (e.g. For header items)
    if (spotlightRect.top + spotlightRect.height + cardHeight + margin < screenHeight) {
      let left = spotlightRect.left;
      if (left + cardWidth > screenWidth) {
        left = Math.max(margin, screenWidth - cardWidth - margin);
      }
      return {
        position: 'fixed',
        top: `${spotlightRect.top + spotlightRect.height + margin}px`,
        left: `${left}px`,
      };
    }

    // Otherwise above target
    if (spotlightRect.top - cardHeight - margin > 0) {
      let left = spotlightRect.left;
      if (left + cardWidth > screenWidth) {
        left = Math.max(margin, screenWidth - cardWidth - margin);
      }
      return {
        position: 'fixed',
        top: `${spotlightRect.top - cardHeight - margin}px`,
        left: `${left}px`,
      };
    }

    // Fallback: center screen
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none">
      {/* Dynamic SVG Mask for Darkened Backdrop with Spotlight Cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 ease-out"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White background means visible backdrop */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rectangle creates the transparent spotlight cutout */}
            {spotlightRect && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Darkened overlay fill with cutout mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.78)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Pulsing Glowing Ring around Spotlight Target */}
      {spotlightRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out rounded-2xl ring-4 ring-amber-500/90 shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`,
          }}
        />
      )}

      {/* Interactive Tour Card (Desktop Floating or Native Mobile Bottom Sheet) */}
      <div
        ref={cardRef}
        style={!isMobile ? getTooltipStyle() : undefined}
        className={`${
          isMobile
            ? 'fixed bottom-0 inset-x-0 rounded-t-3xl max-h-[85vh] p-6 shadow-2xl animate-in slide-in-from-bottom duration-250 border-t-2 border-amber-500'
            : 'w-full max-w-[390px] rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-slate-200'
        } bg-white text-slate-900 z-50 flex flex-col space-y-4`}
      >
        {/* Mobile Drag Handle Bar */}
        {isMobile && (
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-2 mb-1" />
        )}

        {/* Header with Role Pill & Close */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shadow-2xs">
              {currentStep.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${currentStep.badgeColor}`}
                >
                  {currentStep.roleBadge}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight mt-0.5">
                {currentStep.title}
              </h3>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Skip Tour (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description Body */}
        <div className="space-y-2.5">
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {currentStep.description}
          </p>

          {/* Action Tip Banner */}
          {currentStep.actionTip && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-xl text-amber-950 text-[11px] font-semibold leading-normal">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{currentStep.actionTip}</span>
            </div>
          )}
        </div>

        {/* Step Progress Indicators & Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-6 bg-amber-500'
                    : idx < currentStepIndex
                    ? 'w-2.5 bg-amber-200'
                    : 'w-1.5 bg-slate-200'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer min-h-[38px] flex items-center"
            >
              Skip
            </button>

            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[38px] flex items-center gap-1"
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              {currentStepIndex < steps.length - 1 ? (
                <>
                  Next <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Finish <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
