'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, Heart, Loader2 } from 'lucide-react';
import { trackSupportEvent } from '@/lib/analytics';

const presetAmounts = [5, 10, 25];

type SupportUsFormProps = {
  isStripeConfigured: boolean;
  checkoutStatus?: 'success' | 'cancelled';
};

export function SupportUsForm({ isStripeConfigured, checkoutStatus }: SupportUsFormProps) {
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasTrackedReturnStatus = useRef(false);

  const amount = useMemo(() => {
    if (!useCustomAmount) return selectedAmount;
    return Number(customAmount);
  }, [customAmount, selectedAmount, useCustomAmount]);

  useEffect(() => {
    if (!checkoutStatus || hasTrackedReturnStatus.current) return;

    hasTrackedReturnStatus.current = true;
    trackSupportEvent({
      eventName: 'support_return_status',
      status: checkoutStatus,
    });
  }, [checkoutStatus]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (!isStripeConfigured) {
      setErrorMessage('Stripe is not configured yet.');
      trackSupportEvent({
        eventName: 'support_checkout_error',
        amount,
        amountType: useCustomAmount ? 'custom' : 'preset',
        errorMessage: 'Stripe is not configured yet.',
      });
      return;
    }

    if (!Number.isFinite(amount) || amount < 1) {
      setErrorMessage('Please choose an amount of at least $1.');
      trackSupportEvent({
        eventName: 'support_checkout_error',
        amount: Number.isFinite(amount) ? amount : undefined,
        amountType: useCustomAmount ? 'custom' : 'preset',
        errorMessage: 'Invalid amount.',
      });
      return;
    }

    setIsSubmitting(true);
    trackSupportEvent({
      eventName: 'support_checkout_start',
      amount,
      amountType: useCustomAmount ? 'custom' : 'preset',
    });

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    }).catch(() => null);

    setIsSubmitting(false);

    const body = await response?.json().catch(() => null);

    if (response?.ok && body?.url) {
      trackSupportEvent({
        eventName: 'support_checkout_redirect',
        amount,
        amountType: useCustomAmount ? 'custom' : 'preset',
      });
      window.location.assign(body.url);
      return;
    }

    const message = body?.error || 'Unable to start checkout. Please try again.';
    setErrorMessage(message);
    trackSupportEvent({
      eventName: 'support_checkout_error',
      amount,
      amountType: useCustomAmount ? 'custom' : 'preset',
      errorMessage: message,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div>
        <span className="mb-3 block font-body text-sm text-black/65">
          Choose an amount
        </span>
        <div className="grid grid-cols-3 gap-3">
          {presetAmounts.map((presetAmount) => (
            <button
              key={presetAmount}
              type="button"
              onClick={() => {
                setSelectedAmount(presetAmount);
                setUseCustomAmount(false);
                setErrorMessage('');
                trackSupportEvent({
                  eventName: 'support_amount_select',
                  amount: presetAmount,
                  amountType: 'preset',
                });
              }}
              className={`border px-4 py-3 font-body text-base transition-colors ${
                !useCustomAmount && selectedAmount === presetAmount
                  ? 'border-ocean bg-ocean text-white'
                  : 'border-black/10 bg-white text-black hover:border-ocean hover:text-ocean'
              }`}
            >
              ${presetAmount}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="custom-amount" className="mb-2 block font-body text-sm text-black/65">
          Custom amount
        </label>
        <div className="flex items-center border border-black/10 bg-white transition-colors focus-within:border-ocean">
          <span className="px-4 font-body text-base text-black/45">$</span>
          <input
            id="custom-amount"
            type="number"
            min="1"
            max="5000"
            step="1"
            inputMode="decimal"
            value={customAmount}
            onFocus={() => setUseCustomAmount(true)}
            onChange={(event) => {
              setCustomAmount(event.target.value);
              setUseCustomAmount(true);
              setErrorMessage('');
            }}
            onBlur={() => {
              const parsedAmount = Number(customAmount);
              if (!Number.isFinite(parsedAmount) || parsedAmount < 1) return;

              trackSupportEvent({
                eventName: 'support_amount_select',
                amount: parsedAmount,
                amountType: 'custom',
              });
            }}
            className="h-12 w-full bg-transparent pr-4 font-body text-base text-black outline-none"
            placeholder="Enter another amount"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isStripeConfigured}
        className="btn-ocean w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Heart className="h-5 w-5" />
        )}
        <span>{isSubmitting ? 'Opening checkout...' : `Support with $${amount || selectedAmount}`}</span>
      </button>

      {!isStripeConfigured && (
        <p className="flex items-start gap-2 font-body text-sm leading-relaxed text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Stripe is not configured in this environment yet.</span>
        </p>
      )}

      {errorMessage && (
        <p className="flex items-start gap-2 font-body text-sm leading-relaxed text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </form>
  );
}
