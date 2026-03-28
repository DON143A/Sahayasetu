'use client';

import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: number;
  loading?: boolean;
  color?: 'blue' | 'amber' | 'green' | 'purple' | 'red';
  trend?: string;
  prefix?: string;
  suffix?: string;
}

const COLOR_MAP = {
  blue:   'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  amber:  'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  green:  'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  red:    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function StatsCard({
  label, value, loading, color = 'blue', trend, prefix, suffix,
}: StatsCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', COLOR_MAP[color])}>
          {label.charAt(0)}
        </span>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        ) : (
          <p className="text-3xl font-semibold text-gray-900 dark:text-white">
            {prefix}{value.toLocaleString()}{suffix}
          </p>
        )}
      </div>

      {trend && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{trend}</p>
      )}
    </div>
  );
}
