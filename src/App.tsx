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
import DriverDetailDialog from './components/DriverDetailDialog';
import AdminRoute from './components/auth/AdminRoute';
import BillingPage from './pages/admin/Billing';
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
import { useNotifications } from './hooks/use-notifications';
import { supabase } from './lib/supabaseClient';
import { JobProgressLog } from './utils/mockData';
import { getDisplayStatus } from './lib/utils/statusUtils';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import ActiveJobBanner from './components/driver/ActiveJobBanner';
import { getJobs } from './lib/supabase';
import { Job } from './utils/mockData';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Router>
      <AuthContextProvider initialSession={null} initialUser={null}>
        <Toaster richColors position="top-right" />
        <div className="flex h-screen bg-[var(--saas-background)]">
          {user && <Sidebar />}
          <div className="flex-1 flex flex-col overflow-hidden">
            {user && <Header />}
            {userRole === 'driver' && driverActiveJobs.length > 0 && (
              <ActiveJobBanner activeJobs={driverActiveJobs} />
            )}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--saas-background)]">
              <div className="p-6">
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={<Index />} />
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
                  <Route path="/admin/billing" element={<AdminRoute><BillingPage /></AdminRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </AuthContextProvider>
    </Router>
  </QueryClientProvider>
);

const ProtectedRoutes = () => {
  const { user, userRole, profile, isLoadingAuth } = useAuth();

  const currentOrgId = profile?.org_id;

  const { data: driverActiveJobs = [] } = useQuery<Job[], Error>({
    queryKey: ['driverActiveJobs', currentOrgId, user?.id],
    queryFn: () => getJobs(currentOrgId!, 'driver', undefined, undefined, 'active'),
    staleTime: 30 * 1000,
    enabled: userRole === 'driver' && !!currentOrgId && !!user?.id && !isLoadingAuth,
  });

  return (
    <div className="flex h-screen bg-[var(--saas-background)]">
      {user && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {user && <Header />}
        {userRole === 'driver' && driverActiveJobs.length > 0 && (
          <ActiveJobBanner activeJobs={driverActiveJobs} />
        )}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--saas-background)]">
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Index />} />
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
              <Route path="/admin/billing" element={<AdminRoute><BillingPage /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;