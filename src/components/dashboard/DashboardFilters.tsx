"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type JobStatusFilter = 'all' | 'active' | 'completed' | 'cancelled' | 'requested';

interface DashboardFiltersProps {
  isOfficeOrAdmin: boolean;
  jobStatusFilter: JobStatusFilter;
  setJobStatusFilter: (value: JobStatusFilter) => void;
  requestsCount: number;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterRange: DateRangeFilter;
  setFilterRange: (value: DateRangeFilter) => void;
  customStartDate?: Date;
  setCustomStartDate: (date?: Date) => void;
  customEndDate?: Date;
  setCustomEndDate: (date?: Date) => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  isOfficeOrAdmin,
  jobStatusFilter,
  setJobStatusFilter,
  requestsCount,
  searchTerm,
  setSearchTerm,
  filterRange,
  setFilterRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}) => {
  const statusFilters: { value: JobStatusFilter; label: string; colorClass?: string }[] = [
    { value: 'all', label: 'All', colorClass: 'bg-blue-600 text-white hover:bg-blue-700' },
    { value: 'active', label: 'Active', colorClass: 'bg-blue-600 text-white hover:bg-blue-700' },
    { value: 'completed', label: 'Completed', colorClass: 'bg-green-600 text-white hover:bg-green-700' },
    { value: 'cancelled', label: 'Cancelled', colorClass: 'bg-red-600 text-white hover:bg-red-700' },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
      <div className="flex space-x-1 rounded-full bg-gray-100 p-1">
        {isOfficeOrAdmin && (
          <Button
            variant={jobStatusFilter === 'requested' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium relative",
              jobStatusFilter === 'requested' ? "bg-orange-500 text-white hover:bg-orange-600" : "text-gray-700 hover:bg-gray-200"
            )}
            onClick={() => setJobStatusFilter('requested')}
          >
            Requests
            {requestsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
                {requestsCount}
              </span>
            )}
          </Button>
        )}
        {statusFilters.map(filter => (
          <Button
            key={filter.value}
            variant={jobStatusFilter === filter.value ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              jobStatusFilter === filter.value ? filter.colorClass : "text-gray-700 hover:bg-gray-200"
            )}
            onClick={() => setJobStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="relative w-full sm:w-60">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-3 py-2 rounded-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      <Label htmlFor="job-filter-range" className="sr-only sm:not-sr-only text-gray-500">Filter by date:</Label>
      <Select value={filterRange} onValueChange={(value: DateRangeFilter) => setFilterRange(value)}>
        <SelectTrigger id="job-filter-range" className="w-full sm:w-[180px] rounded-full">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent className="bg-white shadow-sm rounded-xl">
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {filterRange === 'custom' && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal rounded-full", !customStartDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, "PPP") : <span>Start Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white shadow-sm rounded-xl" align="start">
              <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} initialFocus />
            </PopoverContent>
          </Popover>
          <span>-</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal rounded-full", !customEndDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, "PPP") : <span>End Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white shadow-sm rounded-xl" align="start">
              <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;