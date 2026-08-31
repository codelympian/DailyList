import { redirect } from 'next/navigation';

/**
 * Today's list is the dashboard — there is only ever one daily list, and
 * splitting it across two routes made the owner choose between identical
 * screens. Kept as a redirect so existing links and bookmarks still work.
 */
export default function TodayPage() {
  redirect('/dashboard');
}
