"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="min-h-[65vh] flex items-center justify-center px-6 py-20 bg-[#fafbfc]">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-soft border border-slate-200 p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          We encountered a temporary issue loading this page. Please try again
          or return to the home page.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors text-sm"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
