"use client";

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthContextProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Index from './pages/Index';
import JobDetail from './pages/JobDetail';
import CreateJob from './pages/CreateJob';
import Drivers from './pages/Drivers';
import AdminChecklists from './pages/AdminChecklists';
import AdminUsersPage from './pages/admin/users/AdminUsersPage';
import CreateUserChoice from './pages/admin/users/CreateUserChoice';
import CreateDriver from './pages/admin/users/CreateDriver';
import CreateOffice from './pages/admin/users/CreateOffice';
import EditUser from './pages/admin/users/EditUser';
import DriverDailyCheck from './pages/driver/DailyCheck';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import LoginPage from './pages/Login';
import EnvDebug from './pages/EnvDebug';
import AdminDailyChecks from './pages/admin/DailyChecks';
import AdminSavedAddresses from './pages/admin/SavedAddresses';
import Map from './pages/Map'; // Import new Map page
import Quotes from './pages/Quotes'; // Import new Quotes page
import Jobs from './pages/Jobs'; // Import the new Jobs page
import { useNotifications } from './hooks/use-notifications';
import { supabase } from './lib/supabaseClient';
import { JobProgressLog } from './utils/mockData';
import { getDisplayStatus } from './lib/utils/statusUtils';

const AppContent = () => {
  const { userRole, profile } = useAuth();
  const { requestPermission, showNotification } = useNotifications();

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'office') {
      requestPermission();
    }
  }, [userRole, requestPermission]);

  useEffect(() => {
    if (!profile || (userRole !== 'admin' && userRole !== 'office')) {
      return;
    }

    const channel = supabase.channel('job_progress_log_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_progress_log' },
        async (payload) => {
          const newLog = payload.new as JobProgressLog;
          // Only notify for driver actions within the same org, and not for actions by the current user
          if (newLog.org_id === profile.org_id && newLog.actor_role === 'driver' && newLog.actor_id !== profile.id) {
            try {
              const { data: job, error: jobError } = await supabase.from('jobs').select('order_number').eq('id', newLog.job_id).single();
              const { data: actorProfile, error: profileError } = await supabase.from('profiles').select('full_name').eq('id', newLog.actor_id).single();

              if (jobError || profileError) {
                console.error("Error fetching details for notification:", jobError || profileError);
                return;
              }

              if (job && actorProfile) {
                const title = `Job Update: ${job.order_number}`;
                const body = `${actorProfile.full_name} updated status to "${getDisplayStatus(newLog.action_type)}".`;
                showNotification(title, { body, jobOrderNumber: job.order_number, tag: newLog.job_id });
              }
            } catch (error) {
              console.error("Failed to process notification:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, profile, showNotification]);

  return (
    <div className="flex min-h-screen bg-[var(--saas-background)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/jobs" element={<Jobs />} /> {/* Add the new Jobs dashboard route */}
            <Route path="/jobs/:orderNumber" element={<JobDetail />} />
            <Route path="/jobs/new" element={<CreateJob />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/daily-check" element={<DriverDailyCheck />} />
            <Route path="/map" element={<Map />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/admin/checklists" element={<AdminChecklists />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/new" element={<CreateUserChoice />} />
            <Route path="/admin/users/new/driver" element={<CreateDriver />} />
            <Route path="/admin/users/new/office" element={<CreateOffice />} />
            <Route path="/admin/users/:id/edit" element={<EditUser />} />
            <Route path="/admin/daily-checks" element={<AdminDailyChecks />} />
            <Route path="/admin/saved-addresses" element={<AdminSavedAddresses />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/env-debug" element={<EnvDebug />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthContextProvider initialSession={null} initialUser={null}>
        <Toaster richColors position="top-right" />
        <AppContent />
      </AuthContextProvider>
    </Router>
  );
}

export default App;