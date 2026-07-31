import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class-name combiner — clsx for conditional composition, tailwind-merge
 * for conflict resolution (later classes win). The shadcn/ui standard util.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
