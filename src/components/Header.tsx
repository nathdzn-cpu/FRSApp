"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile'; // Assuming this hook exists

const Header: React.FC = () => {
  const { logout } = useAuth();
  const isMobile = useIsMobile();

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Haulage Dashboard</h1>
      <Button onClick={logout} variant="default" size={isMobile ? "icon" : "default"}>
        <LogOut className="h-4 w-4" />
        {!isMobile && <span className="ml-2">Logout</span>}
      </Button>
    </header>
  );
};

export default Header;