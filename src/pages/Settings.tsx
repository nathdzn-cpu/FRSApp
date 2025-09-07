"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Settings: React.FC = () => {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">Settings page coming soon!</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">This is where you'll be able to configure various aspects of your haulage operations.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;