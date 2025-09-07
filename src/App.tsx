"use client";

import { useSession, useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthContextProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Index from './pages/Index'; // Main dashboard content
import Drivers from './pages/Drivers';
import AdminChecklists from './pages/AdminChecklists';
import AdminUsersPage from './pages/admin/users/AdminUsersPage';
import CreateUserChoice from './pages/admin/users/CreateUserChoice';
import CreateDriver from './pages/admin/users/CreateDriver';
import CreateOffice from './pages/admin/users/CreateOffice';
import EditUser from './pages/admin/users/EditUser';
import CreateJob from './pages/CreateJob';
import JobDetail from './pages/JobDetail';
import DriverDailyCheck from './pages/driver/DailyCheck';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner'; // Import Toaster for sonner toasts

// PrivateRoute component to protect routes
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// MainLayout component for authenticated users
const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet /> {/* This is where nested routes will render */}
        </main>
      </div>
    </div>
  );
};

function App() {
  const session = useSession();
  const user = useUser();
  const supabaseClient = useSupabaseClient();

  if (session === undefined) {
    return <div>Loading session…</div>;
  }

  return (
    <BrowserRouter>
      <AuthContextProvider initialSession={session} initialUser={user}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
            <Route path="/" element={<Index />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/daily-check" element={<DriverDailyCheck />} />
            <Route path="/admin/checklists" element={<AdminChecklists />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/new" element={<CreateUserChoice />} />
            <Route path="/admin/users/new/driver" element={<CreateDriver />} />
            <Route path="/admin/users/new/office" element={<CreateOffice />} />
            <Route path="/admin/users/:id/edit" element={<EditUser />} />
            <Route path="/jobs/new" element={<CreateJob />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthContextProvider>
      <Toaster richColors /> {/* Add Toaster for sonner notifications */}
    </BrowserRouter>
  );
}

export default App;