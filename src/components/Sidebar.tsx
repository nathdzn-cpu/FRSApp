"use client";

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Briefcase, Users, Map, BarChart2, Settings, LifeBuoy, LogOut, Building, CheckSquare, FileText, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  currentPath: string;
  onClick?: () => void;
}

const NavItem = ({ to, icon: Icon, children, currentPath, onClick }: NavItemProps) => {
  const isActive = currentPath === to || (to !== '/' && currentPath.startsWith(to));
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-[var(--saas-sidebar-active-bg)] text-[var(--saas-sidebar-active-text)]"
          : "hover:bg-[var(--saas-sidebar-hover-bg)]"
      )}
    >
      <Icon className="mr-3 h-5 w-5" />
      <span>{children}</span>
    </NavLink>
  );
};

interface SidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isSidebarOpen, setSidebarOpen }: SidebarProps) => {
  const { userRole, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const closeSidebar = () => setSidebarOpen(false);

  const commonNavItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/map', icon: Map, label: 'Map' },
  ];

  const officeNavItems = [
    ...commonNavItems,
    { to: '/drivers', icon: Users, label: 'Drivers' },
    { to: '/quotes', icon: FileText, label: 'Quotes' },
  ];

  const driverNavItems = [
    { to: '/', icon: Home, label: 'My Jobs' },
    { to: '/daily-check', icon: CheckSquare, label: 'Daily Check' },
  ];

  const adminNavItems = [
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/checklists', icon: CheckSquare, label: 'Checklists' },
    { to: '/admin/daily-checks', icon: Briefcase, label: 'Daily Checks' },
    { to: '/admin/saved-addresses', icon: Building, label: 'Saved Addresses' },
    { to: '/admin/billing', icon: BarChart2, label: 'Billing' },
  ];

  let navItems = commonNavItems;
  if (userRole === 'office') navItems = officeNavItems;
  if (userRole === 'driver') navItems = driverNavItems;
  if (userRole === 'admin') navItems = [...officeNavItems, ...adminNavItems];

  return (
    <>
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[240px] bg-[var(--saas-sidebar-bg)] text-[var(--saas-sidebar-text)] flex flex-col z-40 transform transition-transform duration-300 ease-in-out shadow-lg",
          "md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 h-16">
          <div className="flex items-center">
            <img src="/FRS_Logo_NO_BG.png" alt="FRS Logo" className="h-8 mr-2" />
            <h1 className="text-xl font-bold">HOSS</h1>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={closeSidebar}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} currentPath={location.pathname} onClick={closeSidebar}>
              {item.label}
            </NavItem>
          ))}
        </nav>
        <div className="p-4 mt-auto space-y-2">
          <NavItem to="/settings" icon={Settings} currentPath={location.pathname} onClick={closeSidebar}>
            Settings
          </NavItem>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[var(--saas-sidebar-hover-bg)]"
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;