import { prisma } from "@/lib/db";
import { Metadata } from "next";
import { BarChart3, TrendingUp, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics | Classic Concepts Admin",
};

export default async function AnalyticsPage() {
  const visits = await prisma.pageVisit.findMany({
    orderBy: { visits: 'desc' }
  });

  const totalVisits = visits.reduce((acc, curr) => acc + curr.visits, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Analytics</h1>
          <p className="text-slate-500">Track page views and user engagement across your platform.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Eye size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Page Views</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalVisits.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Unique Pages Visited</p>
              <h3 className="text-2xl font-bold text-slate-900">{visits.length.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Most Visited</p>
              <h3 className="text-xl font-bold text-slate-900 truncate max-w-[200px]" title={visits[0]?.path || 'N/A'}>
                {visits[0]?.path || 'N/A'}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Top Performing Pages</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-sm text-slate-500 bg-white">
                <th className="p-4 font-semibold">Rank</th>
                <th className="p-4 font-semibold">Page Path</th>
                <th className="p-4 font-semibold text-right">Unique Session Visits</th>
                <th className="p-4 font-semibold text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visits.map((visit, index) => {
                const percentage = totalVisits > 0 ? ((visit.visits / totalVisits) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-slate-500 font-medium">#{index + 1}</td>
                    <td className="p-4">
                      <a href={visit.path} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                        {visit.path}
                      </a>
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-700">{visit.visits.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-slate-500 text-sm">{percentage}%</span>
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {visits.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No analytics data collected yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
