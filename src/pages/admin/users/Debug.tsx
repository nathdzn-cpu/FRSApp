"use client";

import React, { useEffect, useState } from "react";
import { useUserRole } from "@/context/UserRoleContext";
import { getProfiles, getTenants, diagnosticCreateReadDelete } from "@/lib/supabase";
import { Profile, Tenant } from "@/utils/mockData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type MeInfo = {
  authUserId?: string;
  profile?: { id: string; role: string; tenant_id: string; full_name: string };
  error?: string;
};

export default function AdminUsersDebug() {
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [me, setMe] = useState<MeInfo>({});
  const [diagResult, setDiagResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingMe, setLoadingMe] = useState(true);

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data
  const currentUserId = userRole === 'admin' ? 'auth_user_alice' : userRole === 'office' ? 'auth_user_owen' : userRole === 'driver' ? 'auth_user_dave' : 'unknown';

  useEffect(() => {
    if (userRole !== 'admin') {
      toast.error("You do not have permission to access this page.");
      navigate('/');
      return;
    }

    const fetchMeInfo = async () => {
      setLoadingMe(true);
      try {
        const fetchedTenants = await getTenants();
        const defaultTenantId = fetchedTenants[0]?.id;

        if (defaultTenantId) {
          const fetchedProfiles = await getProfiles(defaultTenantId);
          const currentProfile = fetchedProfiles.find(p => p.user_id === currentUserId);

          if (currentProfile) {
            setMe({
              authUserId: currentUserId,
              profile: {
                id: currentProfile.id,
                role: currentProfile.role,
                tenant_id: currentProfile.tenant_id,
                full_name: currentProfile.full_name,
              },
            });
          } else {
            setMe({ authUserId: currentUserId, error: "Profile not found for current user." });
          }
        } else {
          setMe({ error: "No tenant found." });
        }
      } catch (e: any) {
        setMe({ error: e.message });
      } finally {
        setLoadingMe(false);
      }
    };
    fetchMeInfo();
  }, [userRole, navigate, currentUserId]);

  async function runDiag() {
    setBusy(true);
    setError(null);
    setDiagResult(null);
    if (!me.profile?.tenant_id || !me.profile?.id) {
      setError("Admin profile or tenant ID not available to run diagnostic.");
      setBusy(false);
      return;
    }
    try {
      const res = await diagnosticCreateReadDelete(me.profile.tenant_id, me.profile.id);
      setDiagResult(res);
      toast.success("Diagnostic ran successfully!");
    } catch (e:any) {
      setError(e.message);
      toast.error(`Diagnostic failed: ${e.message}`);
    }
    setBusy(false);
  }

  if (loadingMe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading debug info...</p>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">Access denied</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Button onClick={() => navigate('/admin/users')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Users — Debug</h1>

        <section className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Me (Current User Context)</h3>
          <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm overflow-auto">
{JSON.stringify(me, null, 2)}
          </pre>
        </section>

        <section className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Diagnostic create → read → delete</h3>
          <Button onClick={runDiag} disabled={busy || !me.profile?.id}>
            {busy ? "Running…" : "Run diagnostic"}
          </Button>
          {error && <p className="text-red-500 mt-2">Error: {error}</p>}
          {diagResult && (
            <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm mt-4 overflow-auto">
{JSON.stringify(diagResult, null, 2)}
            </pre>
          )}
        </section>

        <section className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Environment Sanity (Client-side)</h3>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
            <li>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? "✔ Set" : "✖ Not Set"}</li>
            <li>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? "✔ Set" : "✖ Not Set"}</li>
          </ul>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Note: Server-side environment variables (like `SUPABASE_SERVICE_ROLE`) are not directly accessible client-side.
            Their functionality is simulated in the mock API.
          </p>
        </section>
      </div>
    </div>
  );
}