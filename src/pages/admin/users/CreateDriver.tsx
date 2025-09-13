import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfiles, createUser } from '@/lib/supabase';
import { Profile } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import CreateDriverForm from '@/components/admin/users/CreateDriverForm';
import { Card, CardContent } from '@/components/ui/card';

const CreateDriver: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminProfile, setCurrentAdminProfile] = useState<Profile | undefined>(undefined);

  const currentOrgId = profile?.org_id;

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user || userRole !== 'admin' || !currentOrgId) {
      toast.error("You do not have permission to access this page or your organization ID is missing.");
      navigate('/');
      return;
    }

    const fetchAdminProfile = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const profiles = await getProfiles(currentOrgId, userRole);
        const adminProfile = profiles.find(p => p.user_id === user.id);
        if (!adminProfile) {
          throw new Error("Admin profile not found in the database.");
        }
        setCurrentAdminProfile(adminProfile);
      } catch (err: any) {
        console.error("Failed to fetch admin profile:", err);
        setError(err.message || "Failed to load admin profile. Please try again.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchAdminProfile();
  }, [user, userRole, isLoadingAuth, navigate, currentOrgId]);

  const handleSubmit = async (values: any) => {
    if (!currentAdminProfile || !currentOrgId || !userRole) {
      toast.error("Admin profile, organization ID, or role not found. Cannot create user.");
      return;
    }

    try {
      const dobString = `${values.dob_year}-${values.dob_month}-${values.dob_day}`;

      const newDriverData: any = {
        full_name: values.full_name,
        dob: dobString,
        phone: values.phone,
        role: 'driver' as const,
        email: values.email,
        password: values.password, // Include password for Edge Function
        is_demo: false,
      };

      const promise = createUser(currentOrgId, newDriverData, currentAdminProfile.id, userRole);
      toast.promise(promise, {
        loading: 'Creating driver...',
        success: 'Driver created successfully!',
        error: (err) => `Failed to create driver: ${err.message || String(err)}`,
      });
      await promise;
      navigate('/admin/users');
    } catch (err: any) {
      console.error("Error creating driver:", err);
    }
  };

  if (isLoadingAuth || loadingData) {
    return (
      <div className="flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error}</p>
        <Button onClick={() => navigate('/admin/users')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>
      </div>
    );
  }

  if (!user || userRole !== 'admin' || !currentOrgId) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">You do not have permission to access this page.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/admin/users/new')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Type Selection
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Driver</h1>
        <Card className="bg-white shadow-xl rounded-xl p-6">
          <CardContent className="p-0">
            <CreateDriverForm onSubmit={handleSubmit} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateDriver;