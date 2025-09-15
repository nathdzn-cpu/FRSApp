"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ActiveJobBanner from '@/components/driver/ActiveJobBanner';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import DashboardStatCards from '@/components/dashboard/DashboardStatCards';
import JobsDisplay from '@/components/dashboard/JobsDisplay';
import DashboardDialogs from '@/components/dashboard/DashboardDialogs';

const Index = () => {
  const {
    user,
    profile,
    userRole,
    isOfficeOrAdmin,
    isLoading,
    error,
    navigate,
    filterRange, setFilterRange,
    jobStatusFilter, setJobStatusFilter,
    searchTerm, setSearchTerm,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    jobs,
    profiles,
    requestsCount,
    driverActiveJobs,
    filteredJobs,
    stats,
    dialogState, setDialogState,
    isActionBusy, setIsActionBusy,
    jobToCancel, setJobToCancel,
    viewingDriver, setViewingDriver,
    handleJobTableAction,
    handleUpdateProgress,
    handleAssignDriver,
    handleImageUploadSuccess,
    handleConfirmCancel,
  } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-600 font-bold mb-2">Dashboard failed to load</p>
        <p className="text-sm text-gray-700">{error.message}</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-600 font-bold mb-2">You are not logged in or your profile is missing.</p>
        <Button onClick={() => navigate('/login')} variant="outline">
          Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader userRole={userRole} isOfficeOrAdmin={isOfficeOrAdmin} onNavigate={navigate} />

        {userRole === 'driver' && driverActiveJobs.length > 0 && (
          <ActiveJobBanner activeJobs={driverActiveJobs} />
        )}

        {isOfficeOrAdmin && <DashboardStatCards stats={stats} />}

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-center p-0 pb-4 sticky top-0 bg-[var(--saas-card-bg)] z-10 border-b border-[var(--saas-border)] -mx-6 px-6 pt-6 -mt-6">
            <CardTitle className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Jobs</CardTitle>
            <DashboardFilters
              isOfficeOrAdmin={isOfficeOrAdmin}
              jobStatusFilter={jobStatusFilter}
              setJobStatusFilter={setJobStatusFilter}
              requestsCount={requestsCount}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterRange={filterRange}
              setFilterRange={setFilterRange}
              customStartDate={customStartDate}
              setCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate}
              setCustomEndDate={setCustomEndDate}
            />
          </CardHeader>
          <CardContent className="p-0 pt-4 -mx-6 px-6">
            <JobsDisplay
              isLoading={isLoading}
              error={error}
              jobs={filteredJobs}
              profiles={profiles}
              userRole={userRole}
              currentProfile={profile}
              currentOrgId={profile.org_id}
              onAction={handleJobTableAction}
              onCancelJob={setJobToCancel}
              onViewDriverProfile={setViewingDriver}
            />
          </CardContent>
        </Card>
      </div>

      <DashboardDialogs
        dialogState={dialogState}
        setDialogState={setDialogState}
        isActionBusy={isActionBusy}
        setIsActionBusy={setIsActionBusy}
        profiles={profiles}
        currentProfile={profile}
        userRole={userRole}
        driverActiveJobs={driverActiveJobs}
        onUpdateProgress={handleUpdateProgress}
        onAssignDriver={handleAssignDriver}
        onImageUploadSuccess={handleImageUploadSuccess}
        jobToCancel={jobToCancel}
        setJobToCancel={setJobToCancel}
        onConfirmCancel={handleConfirmCancel}
        viewingDriver={viewingDriver}
        setViewingDriver={setViewingDriver}
        allJobs={jobs}
      />
    </div>
  );
};

export default Index;