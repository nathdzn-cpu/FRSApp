"use client";

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Job } from '@/types';
import { DataTable } from '@/components/data-table/DataTable';
import { columns } from '@/components/job-dashboard/columns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Jobs: React.FC = () => {
  const { user, userRole, profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    const fetchJobs = async () => {
      if (!user || !profile?.org_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      let query = supabase
        .from('jobs')
        .select('*')
        .eq('org_id', profile.org_id)
        .is('deleted_at', null);

      if (userRole === 'driver') {
        query = query.eq('assigned_driver_id', user.id);
      }

      if (activeTab === 'active') {
        query = query.not('status', 'in', '("delivered", "cancelled")');
      } else if (activeTab === 'completed') {
        query = query.eq('status', 'delivered');
      } else if (activeTab === 'cancelled') {
        query = query.eq('status', 'cancelled');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        setError('Failed to load jobs.');
        toast.error('Failed to load jobs.');
      } else {
        setJobs(data || []);
      }
      setLoading(false);
    };

    fetchJobs();
  }, [user, userRole, profile, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)] text-red-500">
        <p>{error}</p>
      </div>
    );
  );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Jobs Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <DataTable
                columns={columns}
                data={jobs}
                filterColumn="order_number"
                filterPlaceholder="Filter by order number..."
              />
            </TabsContent>
            <TabsContent value="active">
              <DataTable
                columns={columns}
                data={jobs}
                filterColumn="order_number"
                filterPlaceholder="Filter by order number..."
              />
            </TabsContent>
            <TabsContent value="completed">
              <DataTable
                columns={columns}
                data={jobs}
                filterColumn="order_number"
                filterPlaceholder="Filter by order number..."
              />
            </TabsContent>
            <TabsContent value="cancelled">
              <DataTable
                columns={columns}
                data={jobs}
                filterColumn="order_number"
                filterPlaceholder="Filter by order number..."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Jobs;