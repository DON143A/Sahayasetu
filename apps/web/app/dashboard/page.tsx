'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RequestsChart } from '@/components/charts/RequestsChart';
import { PriorityBreakdown } from '@/components/charts/PriorityBreakdown';
import { AgentPerformanceTable } from '@/components/dashboard/AgentPerformanceTable';
import { RecentRequests } from '@/components/dashboard/RecentRequests';
import { FraudAlerts } from '@/components/dashboard/FraudAlerts';
import { api } from '@/lib/api';
import type { RequestStats } from '@sahayasetu/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<RequestStats>('/requests/stats')
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Dashboard
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Total Requests"
          value={stats?.total ?? 0}
          loading={loading}
          color="blue"
          trend="+12% this week"
        />
        <StatsCard
          label="Pending"
          value={stats?.pending ?? 0}
          loading={loading}
          color="amber"
        />
        <StatsCard
          label="In Progress"
          value={stats?.inProgress ?? 0}
          loading={loading}
          color="purple"
        />
        <StatsCard
          label="Completed"
          value={stats?.completed ?? 0}
          loading={loading}
          color="green"
          trend={`${stats ? Math.round((stats.completed / (stats.total || 1)) * 100) : 0}% resolution rate`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RequestsChart />
        </div>
        <div>
          <PriorityBreakdown stats={stats} loading={loading} />
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentRequests />
        <FraudAlerts />
      </div>

      {/* Agent Performance */}
      <AgentPerformanceTable />
    </div>
  );
}
