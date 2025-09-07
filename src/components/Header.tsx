"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom'; // Import Link

const Header: React.FC = () => {
  const { logout } = useAuth();
  const isMobile = useIsMobile();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
      <Link to="/" className="flex items-center"> {/* Wrap logo in Link */}
        <img src="/FRS_Logo_NO_BG.png" alt="FRS Haulage Logo" className="h-8 w-auto" />
      </Link>
      <Button onClick={logout} className="bg-blue-600 text-white hover:bg-blue-700" size={isMobile ? "icon" : "default"}>
        <LogOut className="h-4 w-4" />
        {!isMobile && <span className="ml-2">Logout</span>}
      </Button>
    </header>
  );
};

export default Header;