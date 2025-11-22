/**
 * Date utility functions for sir-hires Chrome extension
 */

/**
 * Format a timestamp as a relative save time
 * @param date - The date to format
 * @returns Formatted string like "at 3:45 PM", "1 day ago", "2 weeks ago"
 */
export function formatSaveTime(date: Date): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const daysDiff = Math.floor(
    (todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff === 0) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `at ${displayHours}:${minutes} ${ampm}`;
  } else if (daysDiff === 1) {
    return '1 day ago';
  } else if (daysDiff < 7) {
    return `${daysDiff} days ago`;
  } else if (daysDiff < 14) {
    return '1 week ago';
  } else if (daysDiff < 30) {
    const weeks = Math.floor(daysDiff / 7);
    return `${weeks} weeks ago`;
  } else if (daysDiff < 60) {
    return '1 month ago';
  } else {
    const months = Math.floor(daysDiff / 30);
    return `${months} months ago`;
  }
}
