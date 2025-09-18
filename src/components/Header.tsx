import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings, CreditCard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from './Sidebar';

const Header: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await logout();
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
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile.full_name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            {profile.role === 'admin' && (
              <DropdownMenuItem onClick={() => navigate('/admin/billing')}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Admin: Billing</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
};

export default Header;