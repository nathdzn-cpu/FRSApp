"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthContextProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Index from './pages/Index';
import JobDetail from './pages/JobDetail';
import CreateJob from './pages/CreateJob';
import Drivers from './pages/Drivers';
import AdminRoute from './components/auth/AdminRoute';
import BillingPage from './pages/admin/Billing';
import AdminChecklists from './pages/AdminChecklists';
import AdminUsersPage from './pages/admin/users/AdminUsersPage';
import CreateUserChoice from './pages/admin/users/CreateUserChoice';
import CreateDriver from './pages/admin/users/CreateDriver';
import CreateOffice from './pages/admin/users/CreateOffice';
import CreateCustomer from './pages/admin/users/CreateCustomer';
import EditUser from './pages/admin/users/EditUser';
import DriverDailyCheck from './pages/driver/DailyCheck';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import LoginPage from './pages/Login';
import EnvDebug from './pages/EnvDebug';
import AdminDailyChecks from './pages/admin/DailyChecks';
import AdminSavedAddresses from './pages/admin/SavedAddresses';
import Map from './pages/Map';
import Quotes from './pages/Quotes';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import ActiveJobBanner from './components/driver/ActiveJobBanner';
import { getJobs } from './lib/supabase';
import { Job } from './utils/mockData';

const queryClient = new QueryClient();

const MainLayout = () => {
  const { user, userRole, profile, isLoadingAuth } = useAuth();
  const currentOrgId = profile?.org_id;

  const { data: driverActiveJobs = [] } = useQuery<Job[], Error>({
    queryKey: ['driverActiveJobs', currentOrgId, user?.id],
    queryFn: () => getJobs(currentOrgId!, 'driver', undefined, undefined, 'active'),
    staleTime: 30 * 1000,
    enabled: userRole === 'driver' && !!currentOrgId && !!user?.id && !isLoadingAuth,
  });

  if (isLoadingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // AuthContext should handle redirection, but as a fallback, don't render layout
    return <Outlet />;
  }

  return (
    <div className="flex h-screen bg-[var(--saas-background)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        {userRole === 'driver' && driverActiveJobs.length > 0 && (
          <ActiveJobBanner activeJobs={driverActiveJobs} />
        )}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--saas-background)]">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Router>
      <AuthContextProvider initialSession={null} initialUser={null}>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<MainLayout />}>
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
            <Route path="/admin/users/new/customer" element={<CreateCustomer />} />
            <Route path="/admin/users/:id/edit" element={<EditUser />} />
            <Route path="/admin/daily-checks" element={<AdminDailyChecks />} />
            <Route path="/admin/saved-addresses" element={<AdminSavedAddresses />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/env-debug" element={<EnvDebug />} />
            <Route path="/admin/billing" element={<AdminRoute><BillingPage /></AdminRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthContextProvider>
    </Router>
  </QueryClientProvider>
);

export default App;