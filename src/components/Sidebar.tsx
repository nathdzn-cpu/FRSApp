"use client";

import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom'; // Import Link
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Briefcase, Users, ClipboardList, Shield, Settings, CalendarCheck, MapPin } from 'lucide-react'; // Import MapPin icon
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface NavLinkItem {
  to: string;
  icon: React.ElementType;
  label: string;
  roles?: Array<'admin' | 'office' | 'driver'>;
}

const navLinks: NavLinkItem[] = [
  { to: '/', icon: Briefcase, label: 'Jobs', roles: ['admin', 'office', 'driver'] },
  { to: '/drivers', icon: Users, label: 'Drivers', roles: ['admin', 'office'] },
  { to: '/daily-check', icon: CalendarCheck, label: 'Daily Check', roles: ['driver'] },
  { to: '/admin/checklists', icon: ClipboardList, label: 'Admin Checklists', roles: ['admin'] },
  { to: '/admin/users', icon: Shield, label: 'Admin Users', roles: ['admin'] },
  { to: '/admin/saved-addresses', icon: MapPin, label: 'Saved Addresses', roles: ['admin', 'office'] }, // New: Saved Addresses
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'office', 'driver'] },
];

const Sidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const { userRole } = useAuth();

  const filteredNavLinks = navLinks.filter(link =>
    !link.roles || (userRole && link.roles.includes(userRole))
  );

  const renderNavLinks = () => (
    <nav className="flex flex-col gap-1 p-2">
      {filteredNavLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-sm font-medium", // Increased rounded-md to rounded-lg
              isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
            )
          }
          onClick={() => setIsOpen(false)} // Close sidebar on link click
        >
          <link.icon className="h-4 w-4" size={18} />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col w-[250px] sm:w-[280px] bg-white">
          <Link to="/" className="flex items-center p-4 border-b border-gray-200" onClick={() => setIsOpen(false)}>
            <img src="/FRS_Logo_NO_BG.png" alt="FRS Haulage Logo" className="h-10 w-auto" />
          </Link>
          {renderNavLinks()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white shadow-md">
      <div className="flex h-14 items-center border-b border-gray-200 px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center">
          <img src="/FRS_Logo_NO_BG.png" alt="FRS Haulage Logo" className="h-8 w-auto" />
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        {renderNavLinks()}
      </div>
    </aside>
  );
};

export default Sidebar;