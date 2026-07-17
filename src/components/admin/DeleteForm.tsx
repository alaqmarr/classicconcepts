"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";

interface DeleteFormProps {
  action: (formData: FormData) => Promise<any>;
  successMessage?: string;
  children: React.ReactNode;
}

export function DeleteForm({ action, successMessage = "Deleted successfully!", children }: DeleteFormProps) {
  const [isPending, startTransition] = useTransition();

  async function clientAction(formData: FormData) {
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await action(formData);
        
        if (res?.error) {
          toast.error(res.error);
          return;
        }

        toast.success(successMessage);
      } catch (err: any) {
        if (err.message === "NEXT_REDIRECT") {
          toast.success(successMessage);
          throw err;
        }
        
        console.error("Delete Action Error:", err);
        toast.error(err.message || "Failed to delete item");
      }
    });
  }

  return (
    <form action={clientAction}>
      <div className={isPending ? "opacity-50 pointer-events-none" : ""}>
        {children}
      </div>
    </form>
  );
}
