import React, { useState, useEffect, useMemo } from 'react';
import { 
  Header 
} from './components/Header';
import { Navigation } from './components/Navigation';
import { SevaManagement } from './components/SevaManagement';
import { MemberDirectory } from './components/MemberDirectory';
import { InventoryManagement } from './components/InventoryManagement';
import { Financials } from './components/Financials';
import { Communication } from './components/Communication';
import { Reports } from './components/Reports';
import { UsersView } from './components/UsersView';
import { AuditLogsView } from './components/AuditLogsView';
import { PublicSevaBooking } from './components/PublicSevaBooking';
import { PublicDonations } from './components/PublicDonations';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AuthModal } from './components/AuthModal';
import { PWAOfflineIndicator } from './components/PWAOfflineIndicator';
import { TermsView } from './components/TermsView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { UserProfileModal } from './components/UserProfileModal';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { api } from './services/api';
import { authApi } from './services/authApi';
import { 
  User, 
  Role, 
  SevaOpportunity, 
  AttendanceRecord, 
  Announcement, 
  InventoryItem, 
  Transaction, 
  Donor, 
  AuditLog, 
  PublicBooking, 
  PublicDonation, 
  CommunicationItem,
  AccountStatus
} from './types';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Package, 
  DollarSign, 
  MessageSquare, 
  FileText, 
  Shield, 
  History,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  HeartHandshake
} from 'lucide-react';

export function App() {
  const { user: authUser, isAuthenticated, isLoading: isAuthLoading, logout, switchUser: switchUserAuth } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Active persona (Synced with authenticated Google user, or default Member guest)
  const defaultGuestUser: User = {
    id: 'guest_default',
    name: 'Devotee Guest',
    email: 'guest@sevya.org',
    role: 'member',
    accountStatus: 'ACTIVE',
    skills: ['Devotional Singing'],
    phone: '',
    authProvider: 'GOOGLE',
    createdAt: new Date().toISOString(),
  };

  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (authUser) return authUser;
    try {
      const cached = localStorage.getItem('sevya_auth_user');
      if (cached) return JSON.parse(cached);
    } catch {}
    return defaultGuestUser;
  });

  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  // Current active navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Application Data States
  const [sevas, setSevas] = useState<SevaOpportunity[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [publicBookings, setPublicBookings] = useState<PublicBooking[]>([]);
  const [publicDonations, setPublicDonations] = useState<PublicDonation[]>([]);
  const [communications, setCommunications] = useState<CommunicationItem[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Modals & Popups
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);

  // Initial Data Fetching from Database API
  const refreshAppData = async () => {
    try {
      const [
        sevasData,
        attendanceData,
        announcementsData,
        inventoryData,
        transactionsData,
        donorsData,
        auditLogsData,
        publicBookingsData,
        publicDonationsData,
        communicationsData,
        usersData,
      ] = await Promise.allSettled([
        api.getSevas(),
        api.getAttendance(),
        api.getAnnouncements(),
        api.getInventory(),
        api.getTransactions(),
        api.getDonors(),
        api.getAuditLogs(),
        api.getPublicBookings(),
        api.getPublicDonations(),
        api.getCommunications(),
        api.getUsers(),
      ]);

      if (sevasData.status === 'fulfilled') setSevas(sevasData.value || []);
      if (attendanceData.status === 'fulfilled') setAttendance(attendanceData.value || []);
      if (announcementsData.status === 'fulfilled') setAnnouncements(announcementsData.value || []);
      if (inventoryData.status === 'fulfilled') setInventory(inventoryData.value || []);
      if (transactionsData.status === 'fulfilled') setTransactions(transactionsData.value || []);
      if (donorsData.status === 'fulfilled') setDonors(donorsData.value || []);
      if (auditLogsData.status === 'fulfilled') setAuditLogs(auditLogsData.value || []);
      if (publicBookingsData.status === 'fulfilled') setPublicBookings(publicBookingsData.value || []);
      if (publicDonationsData.status === 'fulfilled') setPublicDonations(publicDonationsData.value || []);
      if (communicationsData.status === 'fulfilled') setCommunications(communicationsData.value || []);
      if (usersData.status === 'fulfilled') setUsersList(usersData.value || []);
    } catch (err) {
      console.warn('Background sync error:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && authUser) {
      refreshAppData();
    }
  }, [isAuthenticated, authUser?.id]);

  // Handle URL Hash routing for Terms, Privacy Policy & Public Views
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Public Standalone Views
  if (currentHash === '#/terms' || currentHash === '#terms') {
    return <TermsView onBack={() => { window.location.hash = ''; }} />;
  }

  if (currentHash === '#/privacy-policy' || currentHash === '#privacy-policy') {
    return <PrivacyPolicyView onBack={() => { window.location.hash = ''; }} />;
  }

  if (currentHash === '#/public-booking' || currentHash === '#public-booking') {
    return (
      <PublicSevaBooking 
        sevas={sevas}
        onBookingSubmit={async (booking) => {
          await api.createPublicBooking(booking);
          showSuccess('Booking request submitted successfully!');
          refreshAppData();
        }}
      />
    );
  }

  if (currentHash === '#/public-donations' || currentHash === '#public-donations') {
    return (
      <PublicDonations 
        onDonationSubmit={async (donation) => {
          await api.createPublicDonation(donation);
          showSuccess('Donation recorded successfully. Thank you for your support!');
          refreshAppData();
        }}
      />
    );
  }

  // Welcome Screen if not authenticated
  if (!isAuthenticated || !authUser) {
    return (
      <>
        <PWAOfflineIndicator />
        <WelcomeScreen
          onOpenLogin={() => setIsAuthModalOpen(true)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  // Authenticated Main Dashboard Layout
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      <PWAOfflineIndicator />
      
      {/* Top Application Header */}
      <Header
        currentUser={currentUser}
        onOpenProfile={() => {
          setSelectedProfileUser(currentUser);
          setIsProfileModalOpen(true);
        }}
        onOpenLogin={() => setIsAuthModalOpen(true)}
      />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Navigation Sidebar */}
        <Navigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={currentUser.role}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Welcome back, {currentUser.name}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Role: <span className="capitalize font-semibold text-amber-600 dark:text-amber-400">{currentUser.role.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Seva Quick Overview */}
              <SevaManagement
                sevas={sevas}
                attendance={attendance}
                currentUser={currentUser}
                onRefresh={refreshAppData}
              />
            </div>
          )}

          {activeTab === 'sevas' && (
            <SevaManagement
              sevas={sevas}
              attendance={attendance}
              currentUser={currentUser}
              onRefresh={refreshAppData}
            />
          )}

          {activeTab === 'members' && (
            <MemberDirectory
              users={usersList}
              currentUser={currentUser}
              onRefresh={refreshAppData}
              onInspectUser={(u) => {
                setSelectedProfileUser(u);
                setIsProfileModalOpen(true);
              }}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryManagement
              inventory={inventory}
              currentUser={currentUser}
              onRefresh={refreshAppData}
            />
          )}

          {activeTab === 'financials' && (
            <Financials
              transactions={transactions}
              donors={donors}
              currentUser={currentUser}
              onRefresh={refreshAppData}
            />
          )}

          {activeTab === 'communications' && (
            <Communication
              announcements={announcements}
              communications={communications}
              currentUser={currentUser}
              onRefresh={refreshAppData}
            />
          )}

          {activeTab === 'reports' && (
            <Reports
              sevas={sevas}
              transactions={transactions}
              inventory={inventory}
              attendance={attendance}
            />
          )}

          {activeTab === 'users' && (
            <UsersView
              users={usersList}
              currentUser={currentUser}
              onRefresh={refreshAppData}
              onInspectUser={(u) => {
                setSelectedProfileUser(u);
                setIsProfileModalOpen(true);
              }}
            />
          )}

          {activeTab === 'audit_logs' && (
            <AuditLogsView
              auditLogs={auditLogs}
              currentUser={currentUser}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          user={selectedProfileUser || currentUser}
          authUser={currentUser}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedProfileUser(null);
          }}
          onRefresh={refreshAppData}
        />
      )}
    </div>
  );
}
