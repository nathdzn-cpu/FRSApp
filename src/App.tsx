import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
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
import EnvDebug from './pages/EnvDebug'; // New import
import { UserRoleProvider } from "./context/UserRoleContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserRoleProvider>
          <nav className="p-4 bg-gray-800 text-white flex flex-wrap gap-4 items-center">
            <Link to="/" className="font-bold text-lg hover:text-gray-300">Home</Link>
            <Link to="/admin/daily-checks" className="hover:text-gray-300">Admin Daily Checks</Link>
            <Link to="/driver/daily-check" className="hover:text-gray-300">Driver Daily Check</Link>
            <Link to="/drivers" className="hover:text-gray-300">Drivers List</Link>
            <Link to="/admin/users" className="hover:text-gray-300">Admin Users</Link>
            <Link to="/admin/checklists" className="hover:text-gray-300">Admin Checklists (Old)</Link>
            <Link to="/env-debug" className="hover:text-gray-300">Env Debug</Link> {/* New link */}
          </nav>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/jobs/new" element={<CreateJob />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/admin/checklists" element={<AdminChecklists />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/new" element={<CreateUserChoice />} />
            <Route path="/admin/users/new/driver" element={<CreateDriver />} />
            <Route path="/admin/users/new/office" element={<CreateOffice />} />
            <Route path="/admin/users/:id/edit" element={<EditUser />} />
            <Route path="/admin/daily-checks" element={<AdminDailyChecks />} />
            <Route path="/driver/daily-check" element={<DriverDailyCheck />} />
            <Route path="/env-debug" element={<EnvDebug />} /> {/* New route */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </UserRoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;