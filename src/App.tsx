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
import { useEphemeralScroll } from "@/hooks/useEphemeralScroll"; // Import the new hook

// PrivateRoute component to protect routes
const PrivateRoute = ({ children, roles }: { children: JSX.Element; roles?: Array<'admin' | 'office' | 'driver'> }) => {
  const { user, profile, userRole, isLoadingAuth } = useAuth();

  // Show spinner while still loading auth and profile
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Checking authentication…</p>
      </div>
    );
  }

  // Block if no user after loading
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block if user is authenticated but profile/role is not yet loaded (e.g., initial sync)
  if (!profile || userRole === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500">Your account is still being set up. Please try again shortly.</p>
      </div>
    );
  }

  // If role restriction applies and user's role is not in the allowed roles
  if (roles && !roles.includes(userRole)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500 text-lg mb-4">You do not have permission to access this page.</p>
        <Navigate to="/" replace /> {/* Redirect to dashboard if no permission */}
      </div>
    );
  }

  // Otherwise allow access
  return children;
};

// MainLayout component for authenticated users
const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="p-6 flex-1 overflow-y-auto bg-gray-50">
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

  // Call the ephemeral scroll hook
  useEphemeralScroll();

  console.log("Supabase Session State:", session); // Added for debugging

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
            <Route path="/drivers" element={<PrivateRoute roles={['admin', 'office']}><Drivers /></PrivateRoute>} />
            <Route path="/daily-check" element={<PrivateRoute roles={['driver']}><DriverDailyCheck /></PrivateRoute>} />
            <Route path="/admin/checklists" element={<PrivateRoute roles={['admin']}><AdminChecklists /></PrivateRoute>} />
            <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><AdminUsersPage /></PrivateRoute>} />
            <Route path="/admin/users/new" element={<PrivateRoute roles={['admin']}><CreateUserChoice /></PrivateRoute>} />
            <Route path="/admin/users/new/driver" element={<PrivateRoute roles={['admin']}><CreateDriver /></PrivateRoute>} />
            <Route path="/admin/users/new/office" element={<PrivateRoute roles={['admin']}><CreateOffice /></PrivateRoute>} />
            <Route path="/admin/users/:id/edit" element={<PrivateRoute roles={['admin']}><EditUser /></PrivateRoute>} />
            <Route path="/jobs/new" element={<PrivateRoute roles={['admin', 'office']}><CreateJob /></PrivateRoute>} />
            <Route path="/jobs/:id" element={<JobDetail />} /> {/* JobDetail is accessible by all authenticated roles */}
            <Route path="/settings" element={<Settings />} /> {/* Settings is accessible by all authenticated roles */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthContextProvider>
      <Toaster richColors />
    </BrowserRouter>
  );
}

export default App;