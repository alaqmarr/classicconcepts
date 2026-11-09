"use client";

import { useRef, useTransition } from "react";
import toast from "react-hot-toast";
import { isNextRedirectError } from "@/lib/is-redirect";

interface SubmitFormProps {
  action: (formData: FormData) => Promise<any>;
  successMessage?: string;
  className?: string;
  children: React.ReactNode;
}

export function SubmitForm({
  action,
  successMessage = "Saved successfully!",
  className,
  children,
}: SubmitFormProps) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const formEl = e.currentTarget;
    if (formEl.querySelector('[data-uploading="true"]')) {
      toast.error("Please wait for file cropping/uploading to finish before saving.");
      return;
    }

    const formData = new FormData(formEl);

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

        console.error("SubmitForm Action Error:", err);
        toast.error(err?.message || "An unexpected error occurred");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      aria-busy={isPending}
      className={`${className || ""} ${isPending ? "opacity-75 pointer-events-none" : ""}`.trim()}
    >
      {children}
    </form>
  );
}
