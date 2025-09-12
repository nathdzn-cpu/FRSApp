import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

const UsersDebug = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) setError(error.message);
    else setUsers(data.users);
  };

  const fetchTenants = async () => {
    const { data, error } = await supabase.from('orgs').select('*');
    if (error) setError(error.message);
    else setTenants(data || []);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) setError(error.message);
    else setProfiles(data || []);
  };

  useEffect(() => {
    fetchUsers();
    fetchTenants();
    fetchProfiles();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Users Debug Page</h1>
      {error && <p className="text-red-500">{error}</p>}
      <div className="my-4">
        <Button onClick={fetchUsers}>Refresh Users</Button>
        <Button onClick={fetchTenants} className="ml-2">Refresh Orgs</Button>
        <Button onClick={fetchProfiles} className="ml-2">Refresh Profiles</Button>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <h2 className="text-xl font-semibold">Auth Users ({users.length})</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto h-96">
            {JSON.stringify(users, null, 2)}
          </pre>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Orgs ({tenants.length})</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto h-96">
            {JSON.stringify(tenants, null, 2)}
          </pre>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Profiles ({profiles.length})</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto h-96">
            {JSON.stringify(profiles, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default UsersDebug;