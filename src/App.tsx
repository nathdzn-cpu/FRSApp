"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import JobDetail from "./pages/JobDetail";
import Drivers from "./pages/Drivers";
import AdminChecklists from "./pages/AdminChecklists";
import AdminUsersPage from "./pages/admin/users/AdminUsersPage";
import CreateUserChoice from "./pages/admin/users/CreateUserChoice";
import CreateDriver from "./pages/admin/users/CreateDriver";
import CreateOffice from "./pages/admin/users/CreateOffice";
import EditUser from "./pages/admin/users/EditUser";
import CreateJob from "./pages/CreateJob";
import AdminDailyChecks from "./pages/admin/DailyChecks";
import DriverDailyCheck from "./pages/driver/DailyCheck";
import EnvDebug from './pages/EnvDebug';
import UsersDebug from "@/pages/admin/UsersDebug";
import LoginPage from "./pages/Login";
import { AuthContextProvider, useAuth } from "./context/AuthContext";
import { Loader2 } from 'lucide-react';
import { useSession } from '@supabase/auth-helpers-react';

const queryClient = new QueryClient();

// PrivateRoute component to protect routes
const PrivateRoute = ({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: ('admin' | 'office' | 'driver')[] }) => {
  const { user, userRole, isLoadingAuth } = useAuth(); // This isLoadingAuth is for profile/role

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading user profile...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />; // Redirect to home or a permission denied page
  }

  return children;
};

const AppContent = () => {
  const { user, userRole, logout } = useAuth();

  return (
    <>
      <nav className="p-4 bg-gray-800 text-white flex flex-wrap gap-4 items-center">
        {user ? (
          <>
            <Link to="/" className="font-bold text-lg hover:text-gray-300">Home</Link>
            {userRole === 'admin' && (
              <>
                <Link to="/admin/daily-checks" className="hover:text-gray-300">Admin Daily Checks</Link>
                <Link to="/admin/users" className="hover:text-gray-300">Admin Users</Link>
                <Link to="/admin/checklists" className="hover:text-gray-300">Admin Checklists (Old)</Link>
                <Link to="/admin/users-debug" className="hover:text-gray-300">Users Debug</Link>
              </>
            )}
            {userRole === 'driver' && (
              <Link to="/driver/daily-check" className="hover:text-gray-300">Driver Daily Check</Link>
            )}
            {(userRole === 'admin' || userRole === 'office') && (
              <Link to="/drivers" className="hover:text-gray-300">Drivers List</Link>
            )}
            <button onClick={logout} className="ml-auto px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white">Log Out</button>
          </>
        ) : (
          <Link to="/login" className="font-bold text-lg hover:text-gray-300">Log In</Link>
        )}
        <Link to="/env-debug" className="hover:text-gray-300">Env Debug</Link>
      </nav>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Index /></PrivateRoute>} />
        <Route path="/jobs/new" element={<PrivateRoute allowedRoles={['admin', 'office']}><CreateJob /></PrivateRoute>} />
        <Route path="/jobs/:id" element={<PrivateRoute><JobDetail /></PrivateRoute>} />
        <Route path="/drivers" element={<PrivateRoute allowedRoles={['admin', 'office']}><Drivers /></PrivateRoute>} />
        <Route path="/admin/checklists" element={<PrivateRoute allowedRoles={['admin']}><AdminChecklists /></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute allowedRoles={['admin']}><AdminUsersPage /></PrivateRoute>} />
        <Route path="/admin/users/new" element={<PrivateRoute allowedRoles={['admin']}><CreateUserChoice /></PrivateRoute>} />
        <Route path="/admin/users/new/driver" element={<PrivateRoute allowedRoles={['admin']}><CreateDriver /></PrivateRoute>} />
        <Route path="/admin/users/new/office" element={<PrivateRoute allowedRoles={['admin']}><CreateOffice /></PrivateRoute>} />
        <Route path="/admin/users/:id/edit" element={<PrivateRoute allowedRoles={['admin']}><EditUser /></PrivateRoute>} />
        <Route path="/admin/daily-checks" element={<PrivateRoute allowedRoles={['admin']}><AdminDailyChecks /></PrivateRoute>} />
        <Route path="/driver/daily-check" element={<PrivateRoute allowedRoles={['driver']}><DriverDailyCheck /></PrivateRoute>} />
        <Route path="/env-debug" element={<EnvDebug />} />
        <Route path="/admin/users-debug" element={<PrivateRoute allowedRoles={['admin']}><UsersDebug /></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  // Robustly handle the return value of useSession
  const sessionData = useSession();
  const session = sessionData?.session || null;
  const isLoading = sessionData?.isLoading ?? true; // Default to true if undefined
  const user = sessionData?.user || null;

  console.log("App.tsx: useSession state - isLoading:", isLoading, "session:", session, "user:", user);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading session...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthContextProvider initialSession={session} initialUser={user}>
            <AppContent />
          </AuthContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;