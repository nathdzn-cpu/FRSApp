"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Map: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Map</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="relative w-full h-[60vh] bg-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-lg font-medium p-4 bg-white/80 rounded-md shadow">
                Live tracking coming soon – placeholder map
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Map;