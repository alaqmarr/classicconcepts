"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-soft border border-red-200 p-8 space-y-4">
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle size={28} />
          <h2 className="text-xl font-bold text-slate-900">
            Admin Operation Error
          </h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          {error?.message ||
            "An unexpected error occurred while processing your admin request."}
        </p>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors text-sm"
          >
            <RefreshCw size={16} />
            Retry
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
