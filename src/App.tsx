import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import JobDetail from "./pages/JobDetail";
import Drivers from "./pages/Drivers";
import AdminChecklists from "./pages/AdminChecklists";
import AdminUsersPage from "./pages/admin/users/AdminUsersPage"; // Updated import
import CreateUserChoice from "./pages/admin/users/CreateUserChoice"; // New import
import CreateDriver from "./pages/admin/users/CreateDriver"; // New import
import CreateOffice from "./pages/admin/users/CreateOffice"; // New import
import EditUser from "./pages/admin/users/EditUser"; // New import
import AdminUsersDebug from "./pages/admin/users/Debug"; // New import
import CreateJob from "./pages/CreateJob";
import { UserRoleProvider } from "./context/UserRoleContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserRoleProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/jobs/new" element={<CreateJob />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/admin/checklists" element={<AdminChecklists />} />
            <Route path="/admin/users" element={<AdminUsersPage />} /> {/* Updated route */}
            <Route path="/admin/users/new" element={<CreateUserChoice />} /> {/* New route */}
            <Route path="/admin/users/new/driver" element={<CreateDriver />} /> {/* New route */}
            <Route path="/admin/users/new/office" element={<CreateOffice />} /> {/* New route */}
            <Route path="/admin/users/:id/edit" element={<EditUser />} /> {/* New route */}
            <Route path="/admin/users/debug" element={<AdminUsersDebug />} /> {/* New route */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </UserRoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;