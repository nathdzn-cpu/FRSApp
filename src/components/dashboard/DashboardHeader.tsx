"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface DashboardHeaderProps {
  userRole: 'admin' | 'office' | 'driver' | 'customer' | undefined;
  isOfficeOrAdmin: boolean;
  onNavigate: (path: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userRole, isOfficeOrAdmin, onNavigate }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">Dashboard</h1>
      <div className="flex items-center gap-4">
        {isOfficeOrAdmin && (
          <Button onClick={() => onNavigate('/jobs/new')} className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Create Job
          </Button>
        )}
        {userRole === 'customer' && (
          <Button onClick={() => onNavigate('/jobs/new')} className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Request Job
          </Button>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;