/**
 * Time-of-day greeting used on the dashboard ("Good morning 👋").
 * Kept pure so it is trivially testable.
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning 👋';
  if (hour < 17) return 'Good afternoon 👋';
  return 'Good evening 👋';
}
