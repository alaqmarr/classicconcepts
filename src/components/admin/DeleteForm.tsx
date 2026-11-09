"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { isNextRedirectError } from "@/lib/is-redirect";

interface DeleteFormProps {
  action: (formData: FormData) => Promise<any>;
  id?: string;
  confirmMessage?: string;
  successMessage?: string;
  children?: React.ReactNode;
}

export function DeleteForm({
  action,
  id,
  confirmMessage = "Are you sure you want to delete this item? This action cannot be undone.",
  successMessage = "Deleted successfully!",
  children,
}: DeleteFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await action(formData);

        if (res?.error) {
          toast.error(res.error);
          return;
        }

        toast.success(successMessage);
      } catch (err: any) {
        if (isNextRedirectError(err)) {
          toast.success(successMessage);
          throw err;
        }

        console.error("Delete Action Error:", err);
        toast.error(err?.message || "Failed to delete item");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={isPending ? "opacity-50 pointer-events-none" : ""}>
        {id && <input type="hidden" name="id" value={id} />}
        {children ?? (
          <button
            type="submit"
            disabled={isPending}
            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </form>
  );
}
