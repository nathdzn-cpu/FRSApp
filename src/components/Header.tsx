"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Header: React.FC = () => {
  const { logout } = useAuth();
  const isMobile = useIsMobile();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
      <h1 className="font-bold text-lg text-gray-900">Haulage Dashboard</h1>
      <Button onClick={logout} className="bg-blue-600 text-white hover:bg-blue-700" size={isMobile ? "icon" : "default"}>
        <LogOut className="h-4 w-4" />
        {!isMobile && <span className="ml-2">Logout</span>}
      </Button>
    </header>
  );
};

export default Header;