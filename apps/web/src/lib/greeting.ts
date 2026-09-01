/**
 * Time-of-day greeting used on the dashboard. Returns the phrase only —
 * the caller adds the name and emoji, so it reads "Good morning, Ada 👋"
 * rather than putting the emoji before the comma.
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
