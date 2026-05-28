import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combine class names; resolves Tailwind conflicts. Used by shadcn-style components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
