import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfiles, getTenants } from '@/lib/supabase';
import { Profile, Tenant } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

const Drivers: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentOrgId = profile?.org_id || 'demo-tenant-id';

  useEffect(() => {
    if (!user || !profile) {
      setLoadingData(false);
      return;
    }

    const fetchDrivers = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const fetchedTenants = await getTenants();
        const defaultOrgId = profile.org_id || fetchedTenants[0]?.id;

        if (defaultOrgId) {
          const fetchedProfiles = await getProfiles(defaultOrgId, userRole); // Pass userRole
          setDrivers(fetchedProfiles.filter(p => p.role === 'driver'));
        }
      } catch (err) {
        console.error("Failed to fetch drivers:", err);
        setError("Failed to load drivers. Please try again.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchDrivers();
  }, [user, profile, isLoadingAuth, userRole]); // Added userRole to dependencies

  if (isLoadingAuth || loadingData) {
    return (
      <div className="flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading drivers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Drivers List</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {drivers.length === 0 ? (
              <p className="text-gray-600">No drivers found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drivers.map(driver => (
                  <Card key={driver.id} className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-4">
                    <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
                      <CardTitle className="text-lg font-semibold text-gray-900">{driver.full_name}</CardTitle>
                      <Badge variant="secondary" className="capitalize">{driver.role}</Badge>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700 p-0 pt-2">
                      <p className="flex items-center mb-1">
                        <Truck className="h-4 w-4 mr-2 text-gray-500" />
                        Truck: {driver.truck_reg || 'N/A'}
                      </p>
                      <p className="flex items-center mb-1">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        Last Location: {driver.last_location ?
                          `${driver.last_location.lat.toFixed(2)}, ${driver.last_location.lon.toFixed(2)}` : 'N/A'}
                      </p>
                      {driver.last_location?.timestamp && (
                        <p className="text-xs text-gray-500 ml-6">
                          ({formatDistanceToNowStrict(parseISO(driver.last_location.timestamp), { addSuffix: true })})
                        </p>
                      )}
                      <p className="flex items-center mt-2">
                        <Badge variant="outline" className="capitalize">
                          Last Job Status: {driver.last_job_status || 'N/A'}
                        </Badge>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Drivers;