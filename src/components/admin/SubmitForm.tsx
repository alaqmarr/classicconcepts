"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";

interface SubmitFormProps {
  action: (formData: FormData) => Promise<any>;
  successMessage?: string;
  className?: string;
  children: React.ReactNode;
}

export function SubmitForm({ action, successMessage = "Saved successfully!", className, children }: SubmitFormProps) {
  const [isPending, startTransition] = useTransition();

  async function clientAction(formData: FormData) {
    startTransition(async () => {
      try {
        const res = await action(formData);
        
        // If the action returned a deliberate error object
        if (res?.error) {
          toast.error(res.error);
          return;
        }

        // Action succeeded without redirecting
        toast.success(successMessage);
      } catch (err: any) {
        // Next.js throws an error with message "NEXT_REDIRECT" when redirect() is called
        if (err.message === "NEXT_REDIRECT") {
          toast.success(successMessage);
          // We must re-throw this error so Next.js can handle the redirect!
          throw err;
        }
        
        console.error("SubmitForm Action Error:", err);
        toast.error(err.message || "An unexpected error occurred");
      }
    });
  }

  return (
    <form action={clientAction} className={className}>
      {children}
    </form>
  );
}
