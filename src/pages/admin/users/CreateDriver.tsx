import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getTenants, getProfiles, createUser } from '@/lib/supabase';
import { Profile } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import CreateDriverForm from '@/components/admin/users/CreateDriverForm';

const CreateDriver: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | undefined>(undefined);

  const currentOrgId = profile?.org_id || 'demo-tenant-id';

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user || userRole !== 'admin') {
      toast.error("You do not have permission to access this page.");
      navigate('/');
      return;
    }

    const fetchProfiles = async () => {
      setLoadingData(true);
      setError(null);
      try {
        // getTenants and getProfiles are still mock-based or client-side RLS based.
        // We need current admin profile for actor_id in createUser.
        const profiles = await getProfiles(currentOrgId); // This now uses the Edge Function
        setCurrentProfile(profiles.find(p => p.user_id === user.id));
      } catch (err: any) {
        console.error("Failed to fetch profiles:", err);
        setError(err.message || "Failed to load profiles. Please try again.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchProfiles();
  }, [user, profile, userRole, isLoadingAuth, navigate, currentOrgId]);

  const handleSubmit = async (values: any) => {
    if (!currentProfile) {
      toast.error("Admin profile not found. Cannot create user.");
      return;
    }

    try {
      const newDriverData: any = {
        full_name: values.full_name,
        dob: values.dob ? values.dob.toISOString().split('T')[0] : undefined,
        phone: values.phone,
        role: 'driver' as const,
        email: values.email,
        password: values.password,
      };

      if (values.truck_reg) {
        newDriverData.truck_reg = values.truck_reg;
      }
      if (values.trailer_no) {
        newDriverData.trailer_no = values.trailer_no;
      }

      const promise = createUser(currentOrgId, newDriverData, currentProfile.id);
      toast.promise(promise, {
        loading: 'Creating driver...',
        success: 'Driver created successfully!',
        error: (err) => `Failed to create driver: ${err.message}`,
      });
      await promise;
      navigate('/admin/users');
    } catch (err: any) {
      console.error("Error creating driver:", err);
      toast.error("An unexpected error occurred while creating the driver.");
    }
  };

  if (isLoadingAuth || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error}</p>
        <Button onClick={() => navigate('/admin/users')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/admin/users/new')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Type Selection
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Driver</h1>
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardContent className="p-0">
            <CreateDriverForm onSubmit={handleSubmit} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateDriver;