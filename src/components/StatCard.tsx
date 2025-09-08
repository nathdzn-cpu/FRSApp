"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColorClass?: string;
  valueColorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  iconColorClass = 'text-gray-500',
  valueColorClass = 'text-gray-900',
}) => {
  return (
    <Card className="bg-white shadow-sm rounded-xl"> {/* Removed border border-gray-200 */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", iconColorClass)} />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColorClass)}>{value}</div>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

export default StatCard;