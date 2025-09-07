"use client";

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Briefcase, Truck, CalendarCheck, Settings, Users, ListChecks } from 'lucide-react';
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
  { to: '/drivers', icon: Truck, label: 'Drivers', roles: ['admin', 'office'] },
  { to: '/daily-check', icon: CalendarCheck, label: 'Daily Check', roles: ['driver'] },
  { to: '/admin/checklists', icon: ListChecks, label: 'Admin Checklists', roles: ['admin'] },
  { to: '/admin/users', icon: Users, label: 'Admin Users', roles: ['admin'] },
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
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-gray-900 dark:hover:text-gray-50",
              isActive ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400"
            )
          }
          onClick={() => setIsOpen(false)} // Close sidebar on link click
        >
          <link.icon className="h-4 w-4" />
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
        <SheetContent side="left" className="flex flex-col w-[250px] sm:w-[280px]">
          <h2 className="text-xl font-bold p-4 border-b dark:border-gray-700">Navigation</h2>
          {renderNavLinks()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white dark:bg-gray-800 dark:border-gray-700 shadow-md">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 dark:border-gray-700">
        <span className="font-semibold text-lg">Haulage App</span>
      </div>
      <div className="flex-1 overflow-auto py-2">
        {renderNavLinks()}
      </div>
    </aside>
  );
};

export default Sidebar;