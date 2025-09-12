"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  canAccessAdminUsers: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ canAccessAdminUsers }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <h1 className="text-3xl font-bold text-gray-900">Haulage Office Dashboard</h1>
      <div className="flex items-center space-x-2">
        {canAccessAdminUsers && (
          <Button onClick={() => navigate('/admin/users')} variant="outline">
            <Users className="h-4 w-4 mr-2" /> Admin Users
          </Button>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;