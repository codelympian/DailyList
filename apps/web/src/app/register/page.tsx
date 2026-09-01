import { redirect } from 'next/navigation';

/** Signup lives at /signup now; keep this working for existing links. */
export default function RegisterPage() {
  redirect('/signup');
}
