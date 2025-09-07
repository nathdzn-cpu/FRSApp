"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthContextProvider } from './context/AuthContext';
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
import AdminDailyChecks from './pages/admin/DailyChecks'; // Import the new AdminDailyChecks page

function App() {
  return (
    <AuthContextProvider initialSession={null} initialUser={null}>
      <Router>
        <Toaster richColors position="top-right" />
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <div className="flex flex-col flex-1">
            <Header />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/jobs/new" element={<CreateJob />} />
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/daily-check" element={<DriverDailyCheck />} />
                <Route path="/admin/checklists" element={<AdminChecklists />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/users/new" element={<CreateUserChoice />} />
                <Route path="/admin/users/new/driver" element={<CreateDriver />} />
                <Route path="/admin/users/new/office" element={<CreateOffice />} />
                <Route path="/admin/users/:id/edit" element={<EditUser />} />
                <Route path="/admin/daily-checks" element={<AdminDailyChecks />} /> {/* Add route for AdminDailyChecks */}
                <Route path="/settings" element={<Settings />} />
                <Route path="/env-debug" element={<EnvDebug />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </AuthContextProvider>
  );
}

export default App;