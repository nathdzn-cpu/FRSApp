"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Settings: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <p className="text-gray-700">Settings page coming soon!</p>
            <p className="text-gray-500 mt-2">This is where you'll be able to configure various aspects of your haulage operations.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;