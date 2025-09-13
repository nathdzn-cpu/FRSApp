import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const Index: React.FC = () => {
  const { isAuthenticated, isLoadingAuth, userRole } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    // This is handled by AuthContext, but we can show a message or spinner here
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Redirecting to login...</p>
      </div>
    );
  }

  // Authenticated user dashboard/landing
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Welcome to HOSS!</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-prose">
        Your Haulage One Stop Solution. Manage jobs, drivers, and daily operations efficiently.
      </p>
      <div className="space-x-4">
        {userRole === 'driver' && (
          <Button asChild size="lg">
            <Link to="/jobs">View My Jobs</Link>
          </Button>
        )}
        {(userRole === 'admin' || userRole === 'office') && (
          <>
            <Button asChild size="lg">
              <Link to="/jobs">Manage Jobs</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/create-job">Create New Job</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;