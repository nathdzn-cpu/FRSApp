"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from './Sidebar';

const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const userInitials = profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isMobile) {
    return (
      <header className="flex items-center justify-between p-4 bg-[var(--saas-card-bg)] border-b sticky top-0 z-40">
        <Sidebar />
        <NotificationBell />
      </header>
    );
  }

  return (
    <header className="flex items-center justify-end p-4 space-x-4 bg-[var(--saas-card-bg)] border-b sticky top-0 z-40">
      <NotificationBell />
      {user && profile && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>Log Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
};

export default Header;