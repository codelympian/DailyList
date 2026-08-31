'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
import { StatusChip } from '@/components/status-chip';
import { useActiveBusiness } from '@/hooks/use-customers';
import {
  useRecordPayment,
  useSetTransactionStatus,
  useTransaction,
} from '@/hooks/use-transactions';

export default function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGate>
      <TransactionDetailView transactionId={id} />
    </AuthGate>
  );
}

function TransactionDetailView({ transactionId }: { transactionId: string }) {
  const { business } = useActiveBusiness();
  const transaction = useTransaction(business?.id, transactionId);
  const recordPayment = useRecordPayment(business?.id, transactionId);
  const setStatus = useSetTransactionStatus(business?.id, transactionId);
  const [paymentAmount, setPaymentAmount] = useState('');

  if (transaction.isPending) {
    return <main className="flex-1 py-24 text-center text-sm text-muted-foreground">Loading…</main>;
  }
  if (transaction.isError) {
    return (
      <main className="flex-1 py-24 text-center text-sm text-muted-foreground">
        Transaction not found.
      </main>
    );
  }

  const t = transaction.data;
  const due = Number(t.amountDue);
  const open = t.status === 'UNPAID' || t.status === 'PARTIALLY_PAID';

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link
        href={`/customers/${t.customerId}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {t.customerName}
      </Link>

      <Card className="mt-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>₦{Number(t.amount).toLocaleString()}</CardTitle>
            <StatusChip status={t.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(t.occurredAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {t.paymentMethod ? ` · ${t.paymentMethod}` : ''}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-1 text-sm">
            {t.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>
                  {item.description} × {item.quantity}
                </span>
                <span>₦{Number(item.subtotal).toLocaleString()}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Paid</span>
              <span>₦{Number(t.amountPaid).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Outstanding</span>
              <span className={due > 0 ? 'text-destructive' : ''}>₦{due.toLocaleString()}</span>
            </div>
          </div>

          {t.payments.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium">Payments</p>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {t.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between">
                    <span>
                      {new Date(payment.occurredAt).toLocaleDateString()} · {payment.method}
                    </span>
                    <span>₦{Number(payment.amount).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {open && due > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={due}
                  placeholder={`Amount (max ₦${due.toLocaleString()})`}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <Button
                  disabled={recordPayment.isPending || !paymentAmount}
                  onClick={() =>
                    recordPayment.mutate(
                      { amount: Number(paymentAmount) },
                      { onSuccess: () => setPaymentAmount('') },
                    )
                  }
                >
                  Record payment
                </Button>
              </div>
              <Button
                variant="outline"
                disabled={recordPayment.isPending}
                onClick={() => recordPayment.mutate({ amount: due })}
              >
                Mark fully paid (₦{due.toLocaleString()})
              </Button>
              {recordPayment.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {recordPayment.error.body.message}
                </p>
              )}
            </div>
          )}

          {t.status !== 'CANCELLED' && t.status !== 'REFUNDED' && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={setStatus.isPending}
                onClick={() => {
                  if (window.confirm('Mark this transaction as refunded?')) {
                    setStatus.mutate({ status: 'REFUNDED' });
                  }
                }}
              >
                Refund
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={setStatus.isPending}
                onClick={() => {
                  if (window.confirm('Cancel this transaction? It will not count toward stats.')) {
                    setStatus.mutate({ status: 'CANCELLED' });
                  }
                }}
              >
                Cancel transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
