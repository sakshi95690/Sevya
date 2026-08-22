import React from 'react';
import { LegalLayout } from './LegalLayout';
import { Shield, Eye, Lock, Database, Mail, Globe, CheckCircle2, UserCheck, RefreshCw, KeyRound } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onNavigate: (route: string) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigate }) => {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How SEVYA collects, protects, uses, and manages your personal and devotional operational information."
      lastUpdated="August 2026"
      activeDoc="privacy"
      onNavigate={onNavigate}
    >
      {/* Overview Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          1. Introduction & Overview
        </h2>
        <p>
          Welcome to <strong>SEVYA</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), a unified temple and seva project management system designed to coordinate devotional volunteer assignments, meetings, tasks, proofs of work, and organizational workflows. We respect your privacy and are committed to safeguarding the personal information you share with us.
        </p>
        <p>
          This Privacy Policy explains how information is collected, used, disclosed, and protected when you access our application, connect via Google Sign-In / OAuth, or interact with our services through the SEVYA web and PWA application.
        </p>
      </section>

      {/* Information Collection */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          2. Information We Collect
        </h2>
        <p>We collect information that you directly provide or that is automatically generated during your use of SEVYA:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-sm">
              <UserCheck className="w-4 h-4 text-amber-600" />
              Account & Profile Data
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Full name, email address, phone number, profile avatar image, assigned temple designation/department, operational role, and voluntary bio.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-sm">
              <KeyRound className="w-4 h-4 text-amber-600" />
              Authentication & OAuth Data
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              When authenticating via Google Sign-In or Firebase Auth, we receive basic identity tokens (Google user ID, verified email address, full name, and avatar URL) to establish your secure session.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              Operational & Seva Activity Data
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Assigned seva tasks, project participation, proof of work uploads (images, receipts, completion notes), meeting minutes of meeting (MOM), and attendance records.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-sm">
              <Globe className="w-4 h-4 text-amber-600" />
              Technical & Device Information
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Browser type, operating system, PWA standalone status, IP address, system audit logs, and Web Push subscription endpoints (only when explicitly permitted).
            </p>
          </div>
        </div>
      </section>

      {/* Google User Data & OAuth Policy */}
      <section className="space-y-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-300/40 dark:border-amber-700/40">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          3. Google API Services & OAuth User Data Policy
        </h2>
        <p>
          SEVYA supports single sign-on (SSO) and account verification via <strong>Google Identity Services / Firebase Authentication</strong>.
        </p>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
            <span><strong>Requested Scopes:</strong> We strictly request read-only profile access (<code>openid</code>, <code>email</code>, and <code>profile</code>) to authenticate temple volunteers and administrators.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
            <span><strong>Data Limitation:</strong> We do NOT read, store, or modify your Google Drive, Gmail, or contacts unless explicitly requested through an authorized integration feature.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
            <span><strong>No Sale of Data:</strong> SEVYA never sells, rents, or monetizes any Google user data or personal data to third parties, data brokers, or advertising networks.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
            <span><strong>Google Limited Use Compliance:</strong> SEVYA&apos;s use and transfer of information received from Google APIs will strictly adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-amber-700 dark:text-amber-400 underline font-semibold">Google API Services User Data Policy</a>, including the Limited Use requirements.</span>
          </div>
        </div>
      </section>

      {/* How We Use Information */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          4. How We Use Your Information
        </h2>
        <p>We utilize the collected information strictly for authentic temple management functions:</p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li><strong>Identity & Role Authorization:</strong> Enforcing strict Role-Based Access Control (Super Admin, Temple Admin, Department Head, Coordinator, and Member).</li>
          <li><strong>Task & Seva Coordination:</strong> Assigning, tracking, scheduling, and verifying devotional seva projects, recurring tasks, and milestones.</li>
          <li><strong>Communications & Alerts:</strong> Sending operational notifications, reminders, meeting alerts, and announcements via email, push notifications, or optional messaging channels.</li>
          <li><strong>Audit & Transparency:</strong> Maintaining audit trail logs for administrative accountability, proof reviews, and temple resource management.</li>
          <li><strong>System Reliability & Security:</strong> Preventing fraud, unauthorized access, and maintaining database integrity.</li>
        </ul>
      </section>

      {/* Storage and Security */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          5. Data Storage, Security & Retention
        </h2>
        <p>
          We employ enterprise-grade security practices, including TLS/HTTPS encryption in transit, secure database hashing for credentials, JWT cryptographic signatures, and role-gated access policies.
        </p>
        <p className="text-sm">
          Task proof documents and images are stored in secure cloud storage buckets (Supabase Storage / Cloudinary) with authenticated access tokens. We retain information for the duration of your temple membership or until account deletion is requested by the temple administration.
        </p>
      </section>

      {/* User Rights */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          6. Your Rights & Data Choices
        </h2>
        <p>As a SEVYA user, you possess the right to:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm">
          <li>Access, inspect, and export your personal account profile and assigned seva records.</li>
          <li>Update or correct your personal contact details from the User Profile modal in the application.</li>
          <li>Revoke Google OAuth permissions at any time via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-amber-700 dark:text-amber-400 underline font-semibold">Google Account Security Settings</a>.</li>
          <li>Request deletion or deactivation of your account and personal data by contacting your Temple Administrator or via email.</li>
        </ul>
      </section>

      {/* Contact Information */}
      <section className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          7. Contact & Privacy Inquiries
        </h2>
        <p className="text-sm">
          If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact the SEVYA administration team:
        </p>
        <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
          <p><strong>SEVYA Platform Support & Privacy Office</strong></p>
          <p>Email: <a href="mailto:privacy@sevya.org" className="text-amber-600 dark:text-amber-400 font-semibold underline">privacy@sevya.org</a> / <a href="mailto:support@sevya.org" className="text-amber-600 dark:text-amber-400 font-semibold underline">support@sevya.org</a></p>
          <p>Devoted to Service with Transparency and Security.</p>
        </div>
      </section>
    </LegalLayout>
  );
};
