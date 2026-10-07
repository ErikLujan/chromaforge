import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class-name composer for ChromaForge surfaces.
 *
 * Merges conditional lists with `clsx`, then collapses conflicting Tailwind
 * utilities with `twMerge`. SCSS Modules classes pass through untouched.
 *
 * @param {...ClassValue[]} inputs Conditional class lists.
 * @returns {string} The merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
