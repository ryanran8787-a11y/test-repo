import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isModKey(e: { metaKey: boolean; ctrlKey: boolean }) {
  return e.metaKey || e.ctrlKey;
}
