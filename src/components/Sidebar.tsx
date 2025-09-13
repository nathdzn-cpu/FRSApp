"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  Users2,
  LineChart,
  Settings,
  Package,
  Package2,
  Truck,
  FileText,
  Map,
  Bell,
  Building,
  ClipboardCheck,
  Wrench,
  FilePlus,
  UserPlus,
  Save,
  List,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";

const getNavLinks = (role: "admin" | "office" | "driver" | undefined) => {
  const baseLinks = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/jobs", icon: List, label: "All Jobs" },
  ];

  const driverLinks = [
    ...baseLinks,
    { to: "/driver/daily-check", icon: ClipboardCheck, label: "Daily Check" },
    { to: "/map", icon: Map, label: "Map" },
  ];

  const officeLinks = [
    ...baseLinks,
    { to: "/create-job", icon: FilePlus, label: "Create Job" },
    { to: "/drivers", icon: Truck, label: "Drivers" },
    { to: "/quotes", icon: FileText, label: "Quotes" },
    { to: "/map", icon: Map, label: "Map" },
  ];

  const adminLinks = [
    ...officeLinks,
    { to: "/admin/users", icon: Users2, label: "Users" },
    { to: "/admin/saved-addresses", icon: Save, label: "Saved Addresses" },
    { to: "/admin/daily-checks", icon: Wrench, label: "Daily Checks" },
  ];

  switch (role) {
    case "admin":
      return adminLinks;
    case "office":
      return officeLinks;
    case "driver":
      return driverLinks;
    default:
      return [];
  }
};

export default function Sidebar() {
  const location = useLocation();
  const { userRole } = useAuth();
  const navLinks = getNavLinks(userRole);

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          to="/"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <Truck className="h-5 w-5 transition-all group-hover:scale-110" />
          <span className="sr-only">HOSS</span>
        </Link>
        <TooltipProvider>
          {navLinks.map((link) => (
            <Tooltip key={link.to}>
              <TooltipTrigger asChild>
                <Link
                  to={link.to}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    location.pathname === link.to && "bg-accent text-accent-foreground"
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  <span className="sr-only">{link.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{link.label}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <NotificationBell />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                  location.pathname === "/settings" && "bg-accent text-accent-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
    </aside>
  );
}