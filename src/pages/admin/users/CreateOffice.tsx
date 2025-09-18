import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfiles, createUser } from '@/lib/supabase';
import { Profile } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import CreateOfficeForm from '@/components/admin/users/CreateOfficeForm';
import { Card, CardContent } from '@/components/ui/card';
import CredentialsDisplayDialog from '@/components/admin/users/CredentialsDisplayDialog';

const CreateOffice: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminProfile, setCurrentAdminProfile] = useState<Profile | undefined>(undefined);
  const [credentials, setCredentials] = useState<{ email: string; password?: string } | null>(null);

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
      const newOfficeData = {
        full_name: values.full_name,
        phone: values.phone,
        role: 'office' as const,
        email: values.email,
        dob: dobString,
        is_demo: false,
      };

      const promise = createUser(currentOrgId, newOfficeData, currentAdminProfile.id, userRole);
      toast.promise(promise, {
        loading: 'Creating office user...',
        success: (data) => {
          setCredentials({ email: data.email!, password: data.generatedPassword });
          return 'Office user created successfully! Please save their credentials.';
        },
        error: (err) => `Failed to create office user: ${err.message || String(err)}`,
      });
      await promise;
      navigate('/admin/users');
    } catch (err: any) {
      console.error("Error creating office user:", err);
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
    <div className="w-full px-6">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/admin/users/new')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Type Selection
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Office User</h1>
        <Card className="bg-white shadow-xl rounded-xl p-6">
          <CardContent className="p-0">
            <CreateOfficeForm onSubmit={handleSubmit} />
          </CardContent>
        </Card>
      </div>
      {credentials && (
        <CredentialsDisplayDialog
          open={!!credentials}
          onClose={() => {
            setCredentials(null);
            navigate('/admin/users');
          }}
          email={credentials.email}
          password={credentials.password}
        />
      )}
    </div>
  );
};

export default CreateOffice;