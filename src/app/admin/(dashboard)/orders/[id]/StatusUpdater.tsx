"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function StatusUpdater({ orderId, currentStatus }: { orderId: string, currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function updateStatus(newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/order/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (res.ok) {
        setStatus(newStatus);
        toast.success(`Order status updated to ${newStatus}`);
        router.refresh();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-bold text-slate-500">Update Status:</label>
      <select
        value={status}
        onChange={(e) => updateStatus(e.target.value)}
        disabled={loading}
        className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-[#0056b3] focus:border-[#0056b3] block w-full p-2.5 outline-none font-medium disabled:opacity-50"
      >
        <option value="New">New</option>
        <option value="Processing">Processing</option>
        <option value="Completed">Completed</option>
        <option value="Cancelled">Cancelled</option>
      </select>
    </div>
  );
}
