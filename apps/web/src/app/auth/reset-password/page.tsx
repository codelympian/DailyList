'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClipboardList } from 'lucide-react';
import { passwordSchema } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { useUpdatePassword } from '@/hooks/use-auth';

const schema = z.object({ password: passwordSchema });
type FormInput = z.infer<typeof schema>;

/**
 * Where the emailed reset link lands. Supabase puts the user in a temporary
 * recovery session, so setting the new password is a normal authenticated
 * update — we just have to wait for that session to be established.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const update = useUpdatePassword();
  const [ready, setReady] = useState<'checking' | 'ready' | 'invalid'>('checking');

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady('ready');
    });
    // The recovery session arrives asynchronously as the link is processed.
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (session) setReady('ready');
        else if (event === 'SIGNED_OUT') setReady('invalid');
      },
    );
    const timer = setTimeout(
      () => setReady((state) => (state === 'checking' ? 'invalid' : state)),
      4000,
    );
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(values, { onSuccess: () => router.replace('/dashboard') });
  });

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
            <ClipboardList className="size-4" aria-hidden />
          </span>
          Dailylist
        </Link>

        <h1 className="text-title font-semibold tracking-tight">Set a new password</h1>

        {ready === 'checking' && (
          <p className="mt-2 text-sm text-muted-foreground">Checking your link…</p>
        )}

        {ready === 'invalid' && (
          <div className="mt-4 rounded-xl bg-destructive/5 p-4 ring-1 ring-destructive/20">
            <p className="text-sm text-muted-foreground">
              This reset link has expired or has already been used. Request a new one and it will
              arrive within a minute.
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              render={<Link href="/forgot-password" />}
            >
              Request a new link
            </Button>
          </div>
        )}

        {ready === 'ready' && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a password you have not used here before.
            </p>
            <form onSubmit={onSubmit} noValidate className="mt-7">
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.password}>
                  <FieldLabel htmlFor="password">New password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className="h-11"
                    {...form.register('password')}
                  />
                  <FieldDescription>At least 8 characters.</FieldDescription>
                  <FieldError errors={[form.formState.errors.password]} />
                </Field>

                {update.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    We could not update your password. The link may have expired — request a new
                    one.
                  </p>
                )}

                <Button
                  type="submit"
                  className="min-h-12 w-full text-base"
                  disabled={update.isPending}
                >
                  {update.isPending ? 'Saving…' : 'Save new password'}
                </Button>
              </FieldGroup>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
