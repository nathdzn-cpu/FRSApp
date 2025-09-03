import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/context/UserRoleContext';
import { getProfiles, getTenants } from '@/lib/supabase';
import { Profile, Tenant } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

const Drivers: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedTenants = await getTenants();
        const defaultTenantId = fetchedTenants[0]?.id;

        if (defaultTenantId) {
          const fetchedProfiles = await getProfiles(defaultTenantId);
          setDrivers(fetchedProfiles.filter(p => p.role === 'driver'));
        }
      } catch (err) {
        console.error("Failed to fetch drivers:", err);
        setError("Failed to load drivers. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, [userRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading drivers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Drivers List</CardTitle>
          </CardHeader>
          <CardContent>
            {drivers.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No drivers found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drivers.map(driver => (
                  <Card key={driver.id} className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg">{driver.full_name}</CardTitle>
                      <Badge variant="secondary" className="capitalize">{driver.role}</Badge>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700 dark:text-gray-300">
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
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