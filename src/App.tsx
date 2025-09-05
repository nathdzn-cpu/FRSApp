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
import AdminUsers from "./pages/AdminUsers";
import CreateJob from "./pages/CreateJob"; // Import the new page
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
            <Route path="/jobs/new" element={<CreateJob />} /> {/* New route */}
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/admin/checklists" element={<AdminChecklists />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </UserRoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;