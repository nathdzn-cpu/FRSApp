"use client";

import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Briefcase, Settings, CalendarCheck, ChevronDown, PlusCircle, CreditCard } from 'lucide-react';
import { Truck, User, Map, FileText, MapPin, Users, CheckSquare } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';

interface NavLinkItem {
  to: string;
  icon: React.ElementType;
  label: string;
  roles?: Array<'admin' | 'office' | 'driver'>;
}

const navLinks: NavLinkItem[] = [
  { to: '/', icon: Truck, label: 'Jobs', roles: ['admin', 'office', 'driver'] },
  { to: '/drivers', icon: User, label: 'Drivers', roles: ['admin', 'office'] },
  { to: '/daily-check', icon: CalendarCheck, label: 'Daily Check', roles: ['driver'] },
  { to: '/map', icon: Map, label: 'Map', roles: ['admin', 'office', 'driver'] },
  { to: '/quotes', icon: FileText, label: 'Quotes', roles: ['admin', 'office'] },
  { to: '/admin/checklists', icon: CheckSquare, label: 'Admin Checklists', roles: ['admin'] },
  { to: '/admin/users', icon: Users, label: 'Admin Users', roles: ['admin'] },
  { to: '/admin/billing', icon: CreditCard, label: 'Admin Billing', roles: ['admin'] },
  { to: '/admin/saved-addresses', icon: MapPin, label: 'Saved Addresses', roles: ['admin', 'office'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'office', 'driver'] },
];

const Sidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, userRole, logout, isOfficeOrAdmin } = useAuth();
  const navigate = useNavigate();

  const filteredNavLinks = navLinks.filter(link =>
    !link.roles || (userRole && link.roles.includes(userRole))
  );

  const canCreateJob = isOfficeOrAdmin;

  const renderNavLinks = () => (
    <nav className="flex flex-col gap-1 p-2">
      {canCreateJob && isMobile && ( // Show "New Job" button only on mobile
        <Button onClick={() => { navigate('/jobs/new'); setIsOpen(false); }} className="bg-blue-600 text-white hover:bg-blue-700 rounded-md mb-2">
          <PlusCircle className="h-4 w-4 mr-2" /> New Job
        </Button>
      )}
      {filteredNavLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-sm font-medium",
              isActive ? "bg-[var(--saas-sidebar-active-bg)] text-[var(--saas-sidebar-active-text)] shadow-sm" : "text-[var(--saas-sidebar-text)] hover:bg-[var(--saas-sidebar-hover-bg)] hover:text-blue-600"
            )
          }
          onClick={() => setIsOpen(false)}
        >
          <link.icon className="h-4 w-4" size={18} />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );

  const userInitials = profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'JD';
  const userName = profile?.full_name || 'John Doe';
  const userRoleDisplay = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User';

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed top-4 left-4 z-50 bg-white shadow-md">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[250px] p-0">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
          </div>
          {renderNavLinks()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-background">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">FRS Logistics</h2>
      </div>
      <div className="flex-1 overflow-auto py-2">
        {/* User Profile Section */}
        {user && profile && (
          <div className="p-4 border-b border-[var(--saas-border)] mb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-auto py-2 px-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      {profile.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-base font-medium">{userInitials}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-gray-900">{userName}</span>
                      <span className="text-xs text-gray-500">{userRoleDisplay}</span>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white shadow-lg rounded-md">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>Log Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {renderNavLinks()}
      </div>
    </aside>
  );
};

export default Sidebar;