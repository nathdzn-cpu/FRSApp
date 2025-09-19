"use client";

import React from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  setSidebarOpen: (isOpen: boolean) => void;
}

const Header = ({ setSidebarOpen }: HeaderProps) => {
  const { user, profile } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-[var(--saas-header-bg)] sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-6 w-6" />
        </Button>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search..." className="pl-9 w-64" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
            {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:flex flex-col text-right">
            <span className="font-semibold text-sm">{profile?.full_name}</span>
            <span className="text-xs text-gray-500 capitalize">{profile?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;