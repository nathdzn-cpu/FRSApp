"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
export type JobStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

interface DashboardFiltersProps {
  jobStatusFilter: JobStatusFilter;
  setJobStatusFilter: (filter: JobStatusFilter) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterRange: DateRangeFilter;
  setFilterRange: (range: DateRangeFilter) => void;
  customStartDate?: Date;
  setCustomStartDate: (date?: Date) => void;
  customEndDate?: Date;
  setCustomEndDate: (date?: Date) => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  jobStatusFilter,
  setJobStatusFilter,
  searchTerm,
  setSearchTerm,
  filterRange,
  setFilterRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center p-0 pb-4 sticky top-0 bg-[var(--saas-card-bg)] z-10 border-b border-[var(--saas-border)] -mx-6 px-6 pt-6 -mt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Jobs</h2>
      <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
        {/* Status Filter Buttons */}
        <div className="flex space-x-1 rounded-full bg-gray-100 p-1">
          <Button
            variant={jobStatusFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              jobStatusFilter === 'all' ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700 hover:bg-gray-200"
            )}
            onClick={() => setJobStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={jobStatusFilter === 'active' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              jobStatusFilter === 'active' ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700 hover:bg-gray-200"
            )}
            onClick={() => setJobStatusFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={jobStatusFilter === 'completed' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              jobStatusFilter === 'completed' ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700 hover:bg-gray-200"
            )}
            onClick={() => setJobStatusFilter('completed')}
          >
            Completed
          </Button>
          <Button
            variant={jobStatusFilter === 'cancelled' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              jobStatusFilter === 'cancelled' ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700 hover:bg-gray-200"
            )}
            onClick={() => setJobStatusFilter('cancelled')}
          >
            Cancelled
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Date Range Filter */}
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
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-full",
                    !customStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate ? format(customStartDate, "PPP") : <span>Start Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white shadow-sm rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span>-</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-full",
                    !customEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, "PPP") : <span>End Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white shadow-sm rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardFilters;