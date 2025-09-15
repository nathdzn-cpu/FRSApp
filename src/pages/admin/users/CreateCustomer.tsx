"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createUser } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import CredentialsDisplayDialog from '@/components/admin/users/CredentialsDisplayDialog';
import CreateCustomerForm from '@/components/admin/users/CreateCustomerForm';

const CreateCustomer: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password?: string } | null>(null);

  const currentOrgId = profile?.org_id;

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user || userRole !== 'admin' || !currentOrgId) {
      toast.error("You do not have permission to access this page.");
      navigate('/');
    }
  }, [user, userRole, isLoadingAuth, navigate, currentOrgId]);

  const handleSubmit = async (values: any) => {
    if (!profile || !currentOrgId || !userRole) {
      toast.error("Admin profile, organization ID, or role not found. Cannot create user.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newCustomerData = {
        full_name: values.contact_name,
        company_name: values.company_name,
        phone: values.contact_number,
        role: 'customer' as const,
        email: values.email,
      };

      const promise = createUser(currentOrgId, newCustomerData, profile.id, userRole);
      toast.promise(promise, {
        loading: 'Creating customer account...',
        success: (data) => {
          setCredentials({ email: data.email!, password: data.generatedPassword });
          return 'Customer created successfully! Please save their credentials.';
        },
        error: (err) => `Failed to create customer: ${err.message || String(err)}`,
      });
      await promise;
    } catch (err: any) {
      console.error("Error creating customer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/admin/users/new')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Type Selection
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Customer</h1>
        <Card className="bg-white shadow-xl rounded-xl p-6">
          <CardContent className="p-0">
            <CreateCustomerForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
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

export default CreateCustomer;