import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Video,
  MessageSquare,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unlink,
  ExternalLink,
  X,
  Zap,
  Globe,
  Copy,
  Check,
  Phone,
  Radio,
  Sliders,
  Server,
  ShieldCheck,
  Key,
  Clock,
  Send,
  CalendarDays,
  Settings,
} from 'lucide-react';
import { IntegrationProvider, User, UserIntegration } from '../types';
import {
  integrationApi,
  OperationTestResult,
  EmailConnectPayload,
  ZoomConnectPayload,
  WhatsAppConnectPayload,
  CalendarConnectPayload,
  GoogleMeetConnectPayload,
} from '../services/integrationApi';

interface IntegrationsManagerProps {
  currentUser: User;
}

interface ProviderCardDef {
  provider: IntegrationProvider;
  title: string;
  category: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  connectLabel: string;
  testActionLabel: string;
  actionIcon: React.ElementType;
}

const INTEGRATION_PROVIDERS: ProviderCardDef[] = [
  {
    provider: 'email',
    title: 'Gmail / Google Workspace & SMTP',
    category: 'Email & Notifications',
    description: 'Send automated notices, seva task assignments, and donation receipts via Gmail or custom SMTP.',
    icon: Mail,
    iconBg: 'bg-blue-50 border-blue-100',
    iconColor: 'text-blue-600',
    connectLabel: 'Connect Email',
    testActionLabel: 'Send Test Email',
    actionIcon: Send,
  },
  {
    provider: 'calendar',
    title: 'Google Calendar',
    category: 'Schedules & 2-Way Sync',
    description: 'Synchronize aarti schedules, satsang events, and committee meetings directly with Google Calendar.',
    icon: Calendar,
    iconBg: 'bg-indigo-50 border-indigo-100',
    iconColor: 'text-indigo-600',
    connectLabel: 'Connect Calendar',
    testActionLabel: 'Sync Calendar Event',
    actionIcon: CalendarDays,
  },
  {
    provider: 'google_meet',
    title: 'Google Meet',
    category: 'Video Spaces',
    description: 'Generate Google Meet video conference links directly for meetings, trusts, and devotee gatherings.',
    icon: Globe,
    iconBg: 'bg-emerald-50 border-emerald-100',
    iconColor: 'text-emerald-600',
    connectLabel: 'Connect Meet',
    testActionLabel: 'Generate Meet Link',
    actionIcon: Globe,
  },
  {
    provider: 'whatsapp',
    title: 'WhatsApp Business',
    category: 'Instant Messaging & Alerts',
    description: 'Deliver instant WhatsApp seva updates, broadcasts, task alerts, and volunteer reminders.',
    icon: MessageSquare,
    iconBg: 'bg-green-50 border-green-100',
    iconColor: 'text-green-600',
    connectLabel: 'Connect WhatsApp',
    testActionLabel: 'Send WhatsApp Ping',
    actionIcon: MessageSquare,
  },
  {
    provider: 'zoom',
    title: 'Zoom Meetings & Webinars',
    category: 'Video Conferencing',
    description: 'Host satsang discourses and executive trust meetings with host credentials and automated rooms.',
    icon: Video,
    iconBg: 'bg-sky-50 border-sky-100',
    iconColor: 'text-sky-600',
    connectLabel: 'Connect Zoom',
    testActionLabel: 'Create Zoom Room',
    actionIcon: Video,
  },
];

export const IntegrationsManager: React.FC<IntegrationsManagerProps> = ({ currentUser }) => {
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectingProvider, setConnectingProvider] = useState<IntegrationProvider | null>(null);
  const [testingProvider, setTestingProvider] = useState<IntegrationProvider | null>(null);
  const [operatingProvider, setOperatingProvider] = useState<IntegrationProvider | null>(null);
  const [syncingCalendar, setSyncingCalendar] = useState<boolean>(false);
  const [operationResult, setOperationResult] = useState<OperationTestResult | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Active Config / Connect Modal State
  const [modalProvider, setModalProvider] = useState<IntegrationProvider | null>(null);
  const [configTab, setConfigTab] = useState<'oauth' | 'manual'>('oauth');
  const [submittingConfig, setSubmittingConfig] = useState<boolean>(false);

  // Email Config State
  const [emailForm, setEmailForm] = useState<{
    type: 'oauth' | 'smtp';
    accountEmail: string;
    fromName: string;
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    smtpSecure: boolean;
  }>({
    type: 'oauth',
    accountEmail: currentUser.email || '',
    fromName: currentUser.name || 'SEVYA Operations',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: currentUser.email || '',
    smtpPassword: '',
    smtpSecure: true,
  });

  // Calendar Config State
  const [calendarForm, setCalendarForm] = useState<{
    accountEmail: string;
    calendarName: string;
    calendarId: string;
  }>({
    accountEmail: currentUser.email || '',
    calendarName: 'SEVYA Temple Schedules',
    calendarId: 'primary',
  });

  // Google Meet Config State
  const [meetForm, setMeetForm] = useState<{
    accountEmail: string;
    spaceName: string;
  }>({
    accountEmail: currentUser.email || '',
    spaceName: 'SEVYA Virtual Temple Hall',
  });

  // Zoom Config State
  const [zoomForm, setZoomForm] = useState<{
    type: 'oauth' | 'credentials';
    hostEmail: string;
    roomName: string;
    accountId: string;
    clientId: string;
    clientSecret: string;
  }>({
    type: 'credentials',
    hostEmail: currentUser.email || '',
    roomName: `${currentUser.name}'s Temple Room`,
    accountId: '',
    clientId: '',
    clientSecret: '',
  });

  // WhatsApp Config State
  const [waForm, setWaForm] = useState<{
    type: 'guided' | 'credentials';
    phoneNumber: string;
    businessName: string;
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
  }>({
    type: 'guided',
    phoneNumber: (currentUser as any)?.phone || '+91 ',
    businessName: `${currentUser.name}'s WhatsApp Alert`,
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
  });

  const popupRef = useRef<Window | null>(null);
  const popupPollTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchUserIntegrations = async () => {
    try {
      setLoading(true);
      const data = await integrationApi.getUserIntegrations();
      setUserIntegrations(data || []);
    } catch (err: any) {
      console.warn('Failed to load user integrations, trying fallback:', err?.message);
      try {
        const tenantData = await integrationApi.getIntegrations();
        setUserIntegrations(
          (tenantData || []).map((ti: any) => ({
            id: ti.id,
            userId: currentUser.id,
            templeId: ti.templeId,
            provider: ti.provider,
            connectionType: ti.connectionType || 'oauth',
            status: ti.status,
            metadata: ti.metadata || {},
            createdAt: ti.createdAt,
            updatedAt: ti.updatedAt,
          }))
        );
      } catch (fallbackErr) {
        console.error('Failed to load integrations fallback:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserIntegrations();
  }, [currentUser.id]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SEVYA_INTEGRATION_SUCCESS') {
        const providerName = event.data.provider || 'Integration';
        setStatusMsg({
          type: 'success',
          text: `${providerName.toUpperCase()} connected successfully via OAuth.`,
        });
        setConnectingProvider(null);
        setModalProvider(null);
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        await fetchUserIntegrations();
      } else if (event.data?.type === 'SEVYA_INTEGRATION_ERROR') {
        setStatusMsg({
          type: 'error',
          text: event.data.error || 'Authorization was cancelled or encountered an error.',
        });
        setConnectingProvider(null);
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
      if (popupPollTimer.current) clearInterval(popupPollTimer.current);
    };
  }, []);

  const getIntegration = (provider: IntegrationProvider): UserIntegration | undefined => {
    return userIntegrations.find((ui) => ui.provider === provider);
  };

  const connectedCount = userIntegrations.filter((ui) => ui.status === 'CONNECTED').length;

  const handleOpenConfigModal = (provider: IntegrationProvider) => {
    const existing = getIntegration(provider);
    setModalProvider(provider);
    setStatusMsg(null);
    setOperationResult(null);

    // Pre-populate forms based on existing metadata
    if (provider === 'email') {
      setEmailForm((prev) => ({
        ...prev,
        accountEmail: existing?.metadata?.accountEmail || currentUser.email || '',
        fromName: existing?.metadata?.fromName || currentUser.name || 'SEVYA Operations',
        smtpHost: existing?.metadata?.smtpHost || 'smtp.gmail.com',
        smtpPort: existing?.metadata?.smtpPort || 587,
        smtpUsername: existing?.metadata?.smtpUsername || currentUser.email || '',
        type: existing?.connectionType === 'smtp' ? 'smtp' : 'oauth',
      }));
      setConfigTab(existing?.connectionType === 'smtp' ? 'manual' : 'oauth');
    } else if (provider === 'calendar') {
      setCalendarForm((prev) => ({
        ...prev,
        accountEmail: existing?.metadata?.accountEmail || currentUser.email || '',
        calendarName: existing?.metadata?.calendarName || 'SEVYA Temple Schedules',
        calendarId: existing?.metadata?.calendarId || 'primary',
      }));
      setConfigTab('oauth');
    } else if (provider === 'google_meet') {
      setMeetForm((prev) => ({
        ...prev,
        accountEmail: existing?.metadata?.accountEmail || currentUser.email || '',
        spaceName: existing?.metadata?.spaceName || 'SEVYA Virtual Temple Hall',
      }));
      setConfigTab('oauth');
    } else if (provider === 'zoom') {
      setZoomForm((prev) => ({
        ...prev,
        hostEmail: existing?.metadata?.hostEmail || existing?.metadata?.accountEmail || currentUser.email || '',
        roomName: existing?.metadata?.roomName || `${currentUser.name}'s Temple Room`,
        accountId: existing?.metadata?.accountId || '',
        type: existing?.connectionType === 'oauth' ? 'oauth' : 'credentials',
      }));
      setConfigTab(existing?.connectionType === 'oauth' ? 'oauth' : 'manual');
    } else if (provider === 'whatsapp') {
      setWaForm((prev) => ({
        ...prev,
        phoneNumber: existing?.metadata?.phoneNumber || (currentUser as any)?.phone || '+91 ',
        businessName: existing?.metadata?.businessName || `${currentUser.name}'s WhatsApp Alert`,
        phoneNumberId: existing?.metadata?.phoneNumberId || '',
        type: existing?.metadata?.phoneNumberId ? 'credentials' : 'guided',
      }));
      setConfigTab(existing?.metadata?.phoneNumberId ? 'manual' : 'oauth');
    }
  };

  const handleStartOAuth = async (provider: IntegrationProvider) => {
    try {
      setConnectingProvider(provider);
      setStatusMsg(null);

      const resp = await integrationApi.getOAuthUrl(provider);

      if (resp.success && resp.authUrl) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          resp.authUrl,
          `SEVYA_${provider.toUpperCase()}_OAuth`,
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
        );

        popupRef.current = popup;

        if (popupPollTimer.current) clearInterval(popupPollTimer.current);
        popupPollTimer.current = setInterval(() => {
          if (popup && popup.closed) {
            clearInterval(popupPollTimer.current!);
            setConnectingProvider(null);
            fetchUserIntegrations();
          }
        }, 1000);
      } else {
        // Fallback: switch to manual configuration with clear guided instructions
        setStatusMsg({
          type: 'error',
          text: resp.message || `Platform OAuth client is in configuration mode. You can connect directly below.`,
        });
        setConfigTab('manual');
        setConnectingProvider(null);
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || `Failed to initiate OAuth flow. You can use direct configuration.`,
      });
      setConfigTab('manual');
      setConnectingProvider(null);
    }
  };

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingConfig(true);
      const payload: EmailConnectPayload = {
        type: configTab === 'manual' ? 'smtp' : 'oauth',
        accountEmail: emailForm.accountEmail.trim(),
        fromName: emailForm.fromName.trim(),
        fromEmail: emailForm.accountEmail.trim(),
        ...(configTab === 'manual'
          ? {
              smtpHost: emailForm.smtpHost.trim(),
              smtpPort: Number(emailForm.smtpPort),
              smtpUsername: emailForm.smtpUsername.trim(),
              smtpPassword: emailForm.smtpPassword,
              smtpSecure: emailForm.smtpSecure,
            }
          : {}),
      };

      await integrationApi.connectEmail(payload);
      setModalProvider(null);
      setStatusMsg({
        type: 'success',
        text: `Email integration configured successfully for ${emailForm.accountEmail.trim()}.`,
      });
      await fetchUserIntegrations();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to save email configuration.',
      });
    } finally {
      setSubmittingConfig(false);
    }
  };

  const handleSaveCalendarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingConfig(true);
      const payload: CalendarConnectPayload = {
        type: 'guided',
        accountEmail: calendarForm.accountEmail.trim(),
        calendarName: calendarForm.calendarName.trim(),
      };

      await integrationApi.connectCalendar(payload);
      setModalProvider(null);
      setStatusMsg({
        type: 'success',
        text: `Google Calendar synced and connected for ${calendarForm.accountEmail.trim()}.`,
      });
      await fetchUserIntegrations();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to connect Google Calendar.',
      });
    } finally {
      setSubmittingConfig(false);
    }
  };

  const handleSaveMeetConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingConfig(true);
      const payload: GoogleMeetConnectPayload = {
        type: 'guided',
        accountEmail: meetForm.accountEmail.trim(),
        spaceName: meetForm.spaceName.trim(),
      };

      await integrationApi.connectGoogleMeet(payload);
      setModalProvider(null);
      setStatusMsg({
        type: 'success',
        text: `Google Meet link generator active for ${meetForm.accountEmail.trim()}.`,
      });
      await fetchUserIntegrations();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to connect Google Meet.',
      });
    } finally {
      setSubmittingConfig(false);
    }
  };

  const handleSaveZoomConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingConfig(true);
      const payload: ZoomConnectPayload = {
        type: configTab === 'manual' ? 'credentials' : 'oauth',
        hostEmail: zoomForm.hostEmail.trim(),
        roomName: zoomForm.roomName.trim(),
        accountId: zoomForm.accountId.trim() || undefined,
        clientId: zoomForm.clientId.trim() || undefined,
        clientSecret: zoomForm.clientSecret.trim() || undefined,
      };

      await integrationApi.connectZoom(payload);
      setModalProvider(null);
      setStatusMsg({
        type: 'success',
        text: `Zoom video integration connected for ${zoomForm.hostEmail.trim()}.`,
      });
      await fetchUserIntegrations();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to save Zoom configuration.',
      });
    } finally {
      setSubmittingConfig(false);
    }
  };

  const handleSaveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waForm.phoneNumber || waForm.phoneNumber.trim().length < 8) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid WhatsApp mobile number with country code.' });
      return;
    }

    try {
      setSubmittingConfig(true);
      const payload: WhatsAppConnectPayload = {
        type: configTab === 'manual' ? 'credentials' : 'guided',
        phoneNumber: waForm.phoneNumber.trim(),
        businessName: waForm.businessName.trim(),
        phoneNumberId: waForm.phoneNumberId.trim() || undefined,
        businessAccountId: waForm.businessAccountId.trim() || undefined,
        accessToken: waForm.accessToken.trim() || undefined,
      };

      await integrationApi.connectWhatsApp(payload);
      setModalProvider(null);
      setStatusMsg({
        type: 'success',
        text: `WhatsApp messaging line connected for ${waForm.phoneNumber.trim()}.`,
      });
      await fetchUserIntegrations();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to connect WhatsApp line.',
      });
    } finally {
      setSubmittingConfig(false);
    }
  };

  const handleTestConnection = async (provider: IntegrationProvider) => {
    try {
      setTestingProvider(provider);
      setStatusMsg(null);
      setOperationResult(null);

      const res = await integrationApi.testIntegration(provider);
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: res.message || `${provider.replace('_', ' ').toUpperCase()} connection is active and healthy.`,
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: res.message || `Connection check failed for ${provider}.`,
        });
      }
      await fetchUserIntegrations();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || `Unable to check ${provider} connection.`,
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSyncCalendarNow = async () => {
    try {
      setSyncingCalendar(true);
      setStatusMsg(null);

      const res = await integrationApi.syncCalendar({ fullSync: true });
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: res.message || 'Google Calendar synchronization complete.',
        });
      }
      await fetchUserIntegrations();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to synchronize Google Calendar.',
      });
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleTestOperation = async (provider: IntegrationProvider) => {
    try {
      setOperatingProvider(provider);
      setStatusMsg(null);
      setOperationResult(null);

      const res = await integrationApi.testOperation(provider, {
        phone: (currentUser as any)?.phone || '+91 98765 43210',
        topic: `SEVYA Live Service - ${new Date().toLocaleDateString()}`,
        title: `SEVYA Aarti & Satsang - ${new Date().toLocaleDateString()}`,
      });

      setOperationResult(res);
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: res.message || `Test operation executed successfully.`,
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: res.message || `Test operation failed for ${provider}.`,
        });
      }
      await fetchUserIntegrations();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || `Failed to execute live test for ${provider}.`,
      });
    } finally {
      setOperatingProvider(null);
    }
  };

  const handleDisconnect = async (provider: IntegrationProvider) => {
    if (!window.confirm(`Disconnect ${provider.replace('_', ' ').toUpperCase()} from your account?`)) {
      return;
    }

    try {
      setLoading(true);
      await integrationApi.disconnectIntegration(provider);
      setStatusMsg({
        type: 'success',
        text: `${provider.replace('_', ' ').toUpperCase()} disconnected successfully.`,
      });
      setOperationResult(null);
      await fetchUserIntegrations();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || `Failed to disconnect ${provider}.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div id="integrations-manager-root" className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-600" />
            Integrations & Channel Gateways
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect and configure messaging channels, 2-way Google Calendar sync, and video conference meeting rooms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full">
            {connectedCount} of {INTEGRATION_PROVIDERS.length} Connected
          </span>
          <button
            onClick={fetchUserIntegrations}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 transition-all ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATION_PROVIDERS.map((card) => {
          const integration = getIntegration(card.provider);
          const isConnected = integration?.status === 'CONNECTED';
          const isConnecting = connectingProvider === card.provider;
          const isTesting = testingProvider === card.provider;
          const isOperating = operatingProvider === card.provider;
          const isSyncing = card.provider === 'calendar' && syncingCalendar;
          const Icon = card.icon;
          const ActionIcon = card.actionIcon;

          const accountDisplay =
            integration?.metadata?.accountEmail ||
            integration?.metadata?.phoneNumber ||
            integration?.metadata?.hostEmail ||
            integration?.metadata?.businessName ||
            currentUser.email;

          return (
            <div
              key={card.provider}
              id={`integration-card-${card.provider}`}
              className={`bg-white rounded-xl border p-4 flex flex-col justify-between transition-all shadow-2xs ${
                isConnected
                  ? 'border-emerald-200 bg-emerald-50/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${card.iconBg} ${card.iconColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                        {card.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">{card.category}</p>
                    </div>
                  </div>

                  {isConnected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                      Not Linked
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {card.description}
                </p>

                {/* Linked Account Details */}
                {isConnected && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Account:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                        {accountDisplay}
                      </span>
                    </div>
                    {integration?.metadata?.lastSyncedAt && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Last Synced:</span>
                        <span>{new Date(integration.metadata.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {integration?.metadata?.connectedAt && !integration?.metadata?.lastSyncedAt && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Connected:</span>
                        <span>{new Date(integration.metadata.connectedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 mt-3 space-y-2">
                {isConnected ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      {card.provider === 'calendar' ? (
                        <button
                          onClick={handleSyncCalendarNow}
                          disabled={isSyncing || isOperating}
                          className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Trigger full calendar 2-way sync"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                          {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTestConnection(card.provider)}
                          disabled={isTesting || isOperating}
                          className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Verify connectivity health"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                          {isTesting ? 'Testing...' : 'Health'}
                        </button>
                      )}

                      <button
                        onClick={() => handleTestOperation(card.provider)}
                        disabled={isTesting || isOperating || isSyncing}
                        className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        title={card.testActionLabel}
                      >
                        <ActionIcon className="w-3 h-3 text-amber-600" />
                        {isOperating ? 'Running...' : 'Action'}
                      </button>

                      <button
                        onClick={() => handleOpenConfigModal(card.provider)}
                        className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Configure Settings"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDisconnect(card.provider)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        title="Disconnect Integration"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      id={`connect-btn-${card.provider}`}
                      onClick={() => handleOpenConfigModal(card.provider)}
                      disabled={isConnecting}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>{card.connectLabel}</span>
                    </button>

                    <button
                      onClick={() => handleStartOAuth(card.provider)}
                      disabled={isConnecting}
                      className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Direct OAuth Launch"
                    >
                      {isConnecting ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Output Panel for Test Operation */}
      {operationResult && (
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <Zap className="w-3.5 h-3.5" />
              <span>Live Operation Output ({operationResult.provider.toUpperCase()})</span>
            </div>
            <button
              onClick={() => setOperationResult(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-300">{operationResult.message}</p>

          {operationResult.result && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
              {(operationResult.result.joinUrl || operationResult.result.meetingUrl || operationResult.result.calendarUrl) && (
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <span className="text-emerald-400 truncate max-w-full">
                    {operationResult.result.joinUrl || operationResult.result.meetingUrl || operationResult.result.calendarUrl}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        handleCopyLink(
                          operationResult.result.joinUrl ||
                            operationResult.result.meetingUrl ||
                            operationResult.result.calendarUrl
                        )
                      }
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-sans text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedLink ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={operationResult.result.joinUrl || operationResult.result.meetingUrl || operationResult.result.calendarUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-[11px] font-sans text-white flex items-center gap-1"
                    >
                      Open
                    </a>
                  </div>
                </div>
              )}
              {operationResult.result.meetingId && (
                <div className="text-[11px] text-slate-400">
                  Meeting ID: <span className="text-slate-200">{operationResult.result.meetingId}</span>
                  {operationResult.result.password && (
                    <span className="ml-3">
                      Passcode: <span className="text-slate-200">{operationResult.result.password}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Unified Configuration / Connect Modal */}
      {modalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Configure {modalProvider.replace('_', ' ').toUpperCase()}
                  </h3>
                  <p className="text-[11px] text-slate-500">Connect credentials & custom operational settings</p>
                </div>
              </div>
              <button
                onClick={() => setModalProvider(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Config Mode Toggle (OAuth vs Manual/SMTP/Direct) */}
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setConfigTab('oauth')}
                className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                  configTab === 'oauth' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fast Connect
              </button>
              <button
                type="button"
                onClick={() => setConfigTab('manual')}
                className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                  configTab === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom / API Settings
              </button>
            </div>

            {/* EMAIL FORM */}
            {modalProvider === 'email' && (
              <form onSubmit={handleSaveEmailConfig} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    value={emailForm.accountEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, accountEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="user@temple.org"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={emailForm.fromName}
                    onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="SEVYA Operations"
                  />
                </div>

                {configTab === 'manual' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-blue-600" />
                      Custom SMTP Gateway Details
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">SMTP Host</label>
                        <input
                          type="text"
                          value={emailForm.smtpHost}
                          onChange={(e) => setEmailForm({ ...emailForm, smtpHost: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Port</label>
                        <input
                          type="number"
                          value={emailForm.smtpPort}
                          onChange={(e) => setEmailForm({ ...emailForm, smtpPort: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                          placeholder="587"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">SMTP Username</label>
                      <input
                        type="text"
                        value={emailForm.smtpUsername}
                        onChange={(e) => setEmailForm({ ...emailForm, smtpUsername: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        placeholder="user@temple.org"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">App Password / Secret</label>
                      <input
                        type="password"
                        value={emailForm.smtpPassword}
                        onChange={(e) => setEmailForm({ ...emailForm, smtpPassword: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        placeholder="••••••••••••"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalProvider(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingConfig}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingConfig ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save & Link Email
                  </button>
                </div>
              </form>
            )}

            {/* CALENDAR FORM */}
            {modalProvider === 'calendar' && (
              <form onSubmit={handleSaveCalendarConfig} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Calendar Account Email
                  </label>
                  <input
                    type="email"
                    value={calendarForm.accountEmail}
                    onChange={(e) => setCalendarForm({ ...calendarForm, accountEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="devotee@temple.org"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Calendar Name
                  </label>
                  <input
                    type="text"
                    value={calendarForm.calendarName}
                    onChange={(e) => setCalendarForm({ ...calendarForm, calendarName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="SEVYA Temple Schedules"
                  />
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Two-Way Auto Synchronization
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    Satsang events, daily aartis, and committee meetings will automatically sync between SEVYA and Google Calendar.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalProvider(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingConfig}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingConfig ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save & Enable Sync
                  </button>
                </div>
              </form>
            )}

            {/* GOOGLE MEET FORM */}
            {modalProvider === 'google_meet' && (
              <form onSubmit={handleSaveMeetConfig} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Workspace Host Email
                  </label>
                  <input
                    type="email"
                    value={meetForm.accountEmail}
                    onChange={(e) => setMeetForm({ ...meetForm, accountEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="host@gmail.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Video Space Title
                  </label>
                  <input
                    type="text"
                    value={meetForm.spaceName}
                    onChange={(e) => setMeetForm({ ...meetForm, spaceName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="SEVYA Virtual Temple Hall"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalProvider(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingConfig}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingConfig ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save Meet Space
                  </button>
                </div>
              </form>
            )}

            {/* ZOOM FORM */}
            {modalProvider === 'zoom' && (
              <form onSubmit={handleSaveZoomConfig} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Zoom Host Email
                  </label>
                  <input
                    type="email"
                    value={zoomForm.hostEmail}
                    onChange={(e) => setZoomForm({ ...zoomForm, hostEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="zoom@temple.org"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meeting Room Name
                  </label>
                  <input
                    type="text"
                    value={zoomForm.roomName}
                    onChange={(e) => setZoomForm({ ...zoomForm, roomName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Executive Boardroom"
                  />
                </div>

                {configTab === 'manual' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-sky-600" />
                      Zoom Server-to-Server OAuth Credentials
                    </span>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Account ID</label>
                      <input
                        type="text"
                        value={zoomForm.accountId}
                        onChange={(e) => setZoomForm({ ...zoomForm, accountId: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        placeholder="Zoom Account ID"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Client ID</label>
                      <input
                        type="text"
                        value={zoomForm.clientId}
                        onChange={(e) => setZoomForm({ ...zoomForm, clientId: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        placeholder="Zoom Client ID"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Client Secret</label>
                      <input
                        type="password"
                        value={zoomForm.clientSecret}
                        onChange={(e) => setZoomForm({ ...zoomForm, clientSecret: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        placeholder="Zoom Client Secret"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalProvider(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingConfig}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingConfig ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save & Connect Zoom
                  </button>
                </div>
              </form>
            )}

            {/* WHATSAPP FORM */}
            {modalProvider === 'whatsapp' && (
              <form onSubmit={handleSaveWhatsAppConfig} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number (with Country Code)
                  </label>
                  <input
                    type="text"
                    value={waForm.phoneNumber}
                    onChange={(e) => setWaForm({ ...waForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Line / Business Name
                  </label>
                  <input
                    type="text"
                    value={waForm.businessName}
                    onChange={(e) => setWaForm({ ...waForm, businessName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="SEVYA Seva Desk"
                  />
                </div>

                {configTab === 'manual' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-green-600" />
                      Meta WhatsApp Cloud API (Optional)
                    </span>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Phone Number ID</label>
                      <input
                        type="text"
                        value={waForm.phoneNumberId}
                        onChange={(e) => setWaForm({ ...waForm, phoneNumberId: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        placeholder="e.g. 104829104829"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">System Access Token</label>
                      <input
                        type="password"
                        value={waForm.accessToken}
                        onChange={(e) => setWaForm({ ...waForm, accessToken: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        placeholder="EAAB..."
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalProvider(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingConfig}
                    className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingConfig ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save & Link WhatsApp
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsManager;
