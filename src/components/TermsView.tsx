import React from 'react';
import { LegalLayout } from './LegalLayout';
import { FileText, CheckCircle2, ShieldAlert, Scale, UserCheck, AlertTriangle, HelpCircle, Mail } from 'lucide-react';

interface TermsViewProps {
  onNavigate: (route: string) => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onNavigate }) => {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Terms and conditions governing the access, administration, and devotional use of the SEVYA platform."
      lastUpdated="August 2026"
      activeDoc="terms"
      onNavigate={onNavigate}
    >
      {/* 1. Acceptance of Terms */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          1. Acceptance of Terms
        </h2>
        <p>
          By accessing, registering for, or using the <strong>SEVYA</strong> application and associated services (the &quot;Platform&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy. If you are using SEVYA on behalf of a temple organization, trust, or community committee, you represent and warrant that you have the authority to bind that entity to these Terms.
        </p>
        <p>
          If you do not agree to these Terms in their entirety, you must discontinue the use of the platform immediately.
        </p>
      </section>

      {/* 2. Platform Description & Service Scope */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          2. Platform Description & Service Scope
        </h2>
        <p>
          SEVYA is a SaaS management platform designed for temples, non-profit institutions, and devotional organizations to organize seva volunteer projects, assign and verify tasks, maintain meeting minutes (MOM), manage roles and departments, coordinate announcements, and facilitate transparent reporting.
        </p>
      </section>

      {/* 3. User Accounts, Authentication & Roles */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          3. User Accounts, Authentication & Security
        </h2>
        <p>
          Access to certain administrative and seva workflows requires account creation via Email OTP verification, Google Identity Services, or administrative invitation.
        </p>
        <div className="space-y-2 text-sm pl-4 border-l-2 border-amber-500/40">
          <p><strong>Account Responsibility:</strong> You are responsible for safeguarding your credentials and for all activities that occur under your session.</p>
          <p><strong>Accuracy of Information:</strong> You agree to provide accurate, up-to-date, and authentic information regarding your identity and seva activities.</p>
          <p><strong>Role-Based Access Control (RBAC):</strong> SEVYA enforces distinct administrative privilege tiers. You agree not to attempt to circumvent or escalate permission tiers without explicit authorization from the Temple Administrator or Super Admin.</p>
        </div>
      </section>

      {/* 4. Acceptable Use & Conduct */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          4. Acceptable Use Policy
        </h2>
        <p>You agree not to misuse the SEVYA platform. Prohibited activities include, but are not limited to:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-rose-600 dark:text-rose-400">✗ Unauthorized Access</span>
            <p className="text-slate-500 dark:text-slate-400">Attempting to reverse-engineer, exploit, or breach API endpoints, database tables, or server security layers.</p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-rose-600 dark:text-rose-400">✗ Fraudulent Proofs</span>
            <p className="text-slate-500 dark:text-slate-400">Submitting misleading, falsified, or fraudulent seva completion proofs, attendance logs, or financial donation claims.</p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-rose-600 dark:text-rose-400">✗ Spam & Harassment</span>
            <p className="text-slate-500 dark:text-slate-400">Using announcement or messaging systems to distribute commercial spam, promotional solicitations, or abusive content.</p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-rose-600 dark:text-rose-400">✗ Automated Scraping</span>
            <p className="text-slate-500 dark:text-slate-400">Extracting platform data using automated scrapers, crawlers, or unauthorized bots without prior written permission.</p>
          </div>
        </div>
      </section>

      {/* 5. User-Generated Content & Task Proofs */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          5. User Content & Intellectual Property
        </h2>
        <p>
          You retain ownership of any media, notes, minutes, or proof documents you upload to SEVYA. By uploading content, you grant SEVYA and your respective temple institution a limited, non-exclusive license to store, process, display, and archive that content solely for temple governance and operational verification.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The SEVYA name, branding, visual design, custom components, and software code are the intellectual property of SEVYA and its licensors.
        </p>
      </section>

      {/* 6. Disclaimers & Limitation of Liability */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          6. Disclaimers & Limitation of Liability
        </h2>
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <p><strong>&quot;AS-IS&quot; PROVISION:</strong> SEVYA is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, either express or implied, including warranties of merchantability, fitness for a particular devotional purpose, or non-infringement.</p>
          <p><strong>LIMITATION OF LIABILITY:</strong> Under no circumstances shall SEVYA or its operators be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from the use of or inability to use the platform.</p>
        </div>
      </section>

      {/* 7. Modifications & Termination */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          7. Modifications to Terms & Termination
        </h2>
        <p className="text-sm">
          We reserve the right to revise or update these Terms at any time. When modifications occur, the &quot;Last Updated&quot; date at the top will be updated. Your continued use of the platform following the posting of revised Terms constitutes acceptance of those changes.
        </p>
        <p className="text-sm">
          Temple Administrators and Platform Administrators reserve the right to suspend or terminate accounts that violate these Terms or disrupt devotional operations.
        </p>
      </section>

      {/* 8. Contact Information */}
      <section className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          8. Questions & Contact Information
        </h2>
        <p className="text-sm">
          For legal inquiries, terms clarification, or temple administrative agreements, please contact:
        </p>
        <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
          <p><strong>SEVYA Legal & Compliance Team</strong></p>
          <p>Email: <a href="mailto:legal@sevya.org" className="text-amber-600 dark:text-amber-400 font-semibold underline">legal@sevya.org</a> / <a href="mailto:contact@sevya.org" className="text-amber-600 dark:text-amber-400 font-semibold underline">contact@sevya.org</a></p>
          <p>Temple & Seva Project Management Platform</p>
        </div>
      </section>
    </LegalLayout>
  );
};
