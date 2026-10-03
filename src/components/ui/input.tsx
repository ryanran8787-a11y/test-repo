import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-subtle",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        className,
      )}
      {...props}
    />
  );
}
