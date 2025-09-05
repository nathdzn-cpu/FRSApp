import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Updated import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Truck, Briefcase, Loader2 } from 'lucide-react'; // Added Loader2
import { toast } from 'sonner';

const CreateUserChoice: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoadingAuth } = useAuth(); // Use useAuth

  useEffect(() => {
    if (isLoadingAuth) return; // Wait for auth to load

    if (!user || userRole !== 'admin') {
      toast.error("You do not have permission to access this page.");
      navigate('/');
    }
  }, [user, userRole, isLoadingAuth, navigate]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return null; // Render nothing if access is denied, as a redirect will happen
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl mx-auto">
        <Button onClick={() => navigate('/admin/users')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Create New User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-700 dark:text-gray-300">
              Please select the type of user you would like to create.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center text-lg"
                onClick={() => navigate('/admin/users/new/driver')}
              >
                <Truck className="h-8 w-8 mb-2" />
                Create Driver
              </Button>
              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center text-lg"
                onClick={() => navigate('/admin/users/new/office')}
              >
                <Briefcase className="h-8 w-8 mb-2" />
                Create Office User
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateUserChoice;