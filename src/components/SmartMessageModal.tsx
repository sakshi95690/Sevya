import React, { useState, useEffect } from 'react';
import { Send, Copy, RefreshCw, Check, AlertCircle, Mail, MessageSquare, ShieldCheck, User as UserIcon, Globe, FileText } from 'lucide-react';
import { User, SmartMessagePayload, SmartMessageResult } from '../types';
import { aiApi } from '../services/aiApi';
import { getRoleDisplayName } from '../utils/roleHierarchy';

interface SmartMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  usersList?: User[];
  defaultRecipient?: User;
  defaultChannel?: 'email' | 'whatsapp';
  defaultIntent?: 'seva_reminder' | 'meeting_invite' | 'task_reminder' | 'announcement' | 'donation_thankyou' | 'custom';
}

export const SmartMessageModal: React.FC<SmartMessageModalProps> = ({
  isOpen,
  onClose,
  usersList = [],
  defaultRecipient,
  defaultChannel = 'email',
  defaultIntent = 'seva_reminder',
}) => {
  const [recipientId, setRecipientId] = useState(defaultRecipient?.id || '');
  const [recipientName, setRecipientName] = useState(defaultRecipient?.displayName || defaultRecipient?.name || '');
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipient?.email || '');
  const [recipientPhone, setRecipientPhone] = useState(defaultRecipient?.phone || '');

  const [channel, setChannel] = useState<'email' | 'whatsapp'>(defaultChannel);
  const [tone, setTone] = useState<'Devotional' | 'Professional' | 'Friendly' | 'Formal'>('Devotional');
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Hinglish'>('English');
  const [length, setLength] = useState<'Short' | 'Medium' | 'Detailed'>('Medium');
  const [intent, setIntent] = useState<'seva_reminder' | 'meeting_invite' | 'task_reminder' | 'announcement' | 'donation_thankyou' | 'custom'>(defaultIntent);
  const [customPrompt, setCustomPrompt] = useState('');

  const [generating, setGenerating] = useState(false);
  const [draftResult, setDraftResult] = useState<SmartMessageResult | null>(null);

  // Editable draft fields
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (defaultRecipient) {
      setRecipientId(defaultRecipient.id);
      setRecipientName(defaultRecipient.displayName || defaultRecipient.name);
      setRecipientEmail(defaultRecipient.email || '');
      setRecipientPhone(defaultRecipient.phone || '');
    }
  }, [defaultRecipient]);

  if (!isOpen) return null;

  const handleSelectUser = (uId: string) => {
    setRecipientId(uId);
    const matched = usersList.find((u) => u.id === uId);
    if (matched) {
      setRecipientName(matched.displayName || matched.name);
      setRecipientEmail(matched.email || '');
      setRecipientPhone(matched.phone || '');
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setStatusMsg(null);

      const payload: SmartMessagePayload = {
        recipientId,
        recipientName,
        recipientEmail,
        recipientPhone,
        channel,
        tone,
        language,
        length,
        intent,
        customPrompt,
      };

      const result = await aiApi.generateSmartMessage(payload);
      setDraftResult(result);
      setEditedSubject(result.subject || '');
      setEditedBody(result.body || '');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to generate smart message draft.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = channel === 'email' ? `Subject: ${editedSubject}\n\n${editedBody}` : editedBody;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmSend = async () => {
    try {
      setSending(true);
      setStatusMsg(null);

      const res = await aiApi.sendSmartMessage({
        channel,
        recipientEmail,
        recipientPhone,
        recipientName,
        subject: editedSubject,
        message: editedBody,
        userConfirmed: true,
      });

      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message || 'Message sent successfully.' });
        setConfirmSendOpen(false);
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Failed to send message.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred while sending message.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2 truncate">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" /> <span className="truncate">AI Smart Message Assistant</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Draft context-aware emails and WhatsApp messages using real Sevya assignment data.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-lg p-1 shrink-0">
            ✕
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Form Controls */}
        <div className="space-y-4">
          {/* Recipient Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-amber-600" /> Select Recipient
              </label>
              {usersList.length > 0 ? (
                <select
                  value={recipientId}
                  onChange={(e) => handleSelectUser(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                >
                  <option value="">-- Choose Member or Coordinator --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName || u.name} ({getRoleDisplayName(u.role)})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. Sri Ramesh Pujari"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email</label>
                <input
                  type="email"
                  placeholder="ramesh@temple.org"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Phone (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Channel & Intent Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Communication Channel</label>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    channel === 'email' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    channel === 'whatsapp' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Message Intent</label>
              <select
                value={intent}
                onChange={(e: any) => setIntent(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="seva_reminder">Seva Duty & Shift Reminder</option>
                <option value="task_reminder">Task Deadline Follow-up</option>
                <option value="meeting_invite">Meeting / Sync Invitation</option>
                <option value="announcement">General Festival Announcement</option>
                <option value="donation_thankyou">Donation Acknowledgement</option>
                <option value="custom">Custom Prompt / Freeform</option>
              </select>
            </div>
          </div>

          {/* Tone, Language & Length */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tone</label>
              <select
                value={tone}
                onChange={(e: any) => setTone(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 bg-white"
              >
                <option value="Devotional">Devotional (Hari Om / Namaste)</option>
                <option value="Professional">Professional & Direct</option>
                <option value="Friendly">Friendly & Warm</option>
                <option value="Formal">Formal Administrative</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Language</label>
              <select
                value={language}
                onChange={(e: any) => setLanguage(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 bg-white"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (Devanagari)</option>
                <option value="Hinglish">Hinglish (Hindi in Roman script)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Length</label>
              <select
                value={length}
                onChange={(e: any) => setLength(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 bg-white"
              >
                <option value="Short">Short & Concise</option>
                <option value="Medium">Medium Balanced</option>
                <option value="Detailed">Detailed with Instructions</option>
              </select>
            </div>
          </div>

          {/* Custom Prompt Context */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Custom Notes / Context (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Mention that Mahaprasadam distribution starts at 6:00 PM at Gate 2"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Synthesizing Smart Draft...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> {draftResult ? 'Regenerate Smart Draft' : 'Generate Smart Message'}
              </>
            )}
          </button>
        </div>

        {/* Generated Draft Preview & Editor */}
        {draftResult && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" /> Generated Draft (Editable)
              </span>
              <button
                onClick={handleCopy}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Draft'}
              </button>
            </div>

            {channel === 'email' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject Line</label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Message Content</label>
              <textarea
                rows={6}
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 font-sans leading-relaxed"
              />
            </div>

            {/* Action Bar */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Explicit user confirmation is required prior to sending.</span>
              </div>
              <button
                onClick={() => setConfirmSendOpen(true)}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Send Message
              </button>
            </div>
          </div>
        )}

        {/* CONFIRMATION DIALOG */}
        {confirmSendOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="p-2.5 bg-amber-100 rounded-xl">
                  <Send className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Confirm Message Dispatch</h4>
                  <p className="text-xs text-slate-500">Please review recipient and channel details</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Channel:</span>
                  <span className="font-bold uppercase text-slate-800">{channel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient:</span>
                  <span className="font-bold text-slate-800">{recipientName || 'Devotee'}</span>
                </div>
                <div className="flex justify-between truncate">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-bold text-slate-800 truncate">{channel === 'email' ? recipientEmail : recipientPhone}</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmSendOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSend}
                  disabled={sending}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Confirm & Dispatch Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
