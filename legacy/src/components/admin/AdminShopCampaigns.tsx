'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';
import { supabase } from '@/lib/supabase';

type CampaignRow = {
  id: string;
  internal_code: string;
  name: string;
  discount_percent: number;
  code_valid_days: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  popup_enabled: boolean;
  banner_enabled: boolean;
  popup_title: string;
  popup_message: string;
  banner_text: string;
  last_reviewed_at: string | null;
  created_at: string;
};

type CampaignMetrics = {
  issued: number;
  redeemed: number;
  newSinceReview: number;
  revenueCents: number;
  discountCents: number;
};

type CampaignForm = Omit<CampaignRow, 'id' | 'created_at'>;

const newCampaign = (): CampaignForm => ({
  internal_code: '',
  name: '',
  discount_percent: 10,
  code_valid_days: 30,
  starts_at: null,
  ends_at: null,
  is_active: false,
  popup_enabled: true,
  banner_enabled: false,
  popup_title: 'Get 10% off your first order',
  popup_message: "Join Katie's newsletter and I’ll email your personal code.",
  banner_text: 'Get 10% off your first shop order when you join the newsletter',
  last_reviewed_at: null,
});

function makeInternalCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    cents / 100
  );
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function AdminShopCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [metrics, setMetrics] = useState<Record<string, CampaignMetrics>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(newCampaign);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving'>('loading');
  const [message, setMessage] = useState('');

  const loadCampaigns = useCallback(async () => {
    if (!supabase) return;
    const client = supabase;
    setStatus('loading');
    const { data, error } = await client
      .from('shop_marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(
        error.code === '42P01'
          ? 'Apply docs/supabase-shop-newsletter-campaigns.sql before using campaigns.'
          : 'Unable to load shop campaigns.'
      );
      setStatus('idle');
      return;
    }

    const rows = (data ?? []) as CampaignRow[];
    setCampaigns(rows);
    const nextMetrics: Record<string, CampaignMetrics> = {};
    await Promise.all(
      rows.map(async (campaign) => {
        const [{ data: codes }, { data: orders }] = await Promise.all([
          client
            .from('shop_discount_codes')
            .select('created_at,redeemed_at')
            .eq('campaign_id', campaign.id),
          client
            .from('orders')
            .select('id,total_cents,discount_cents,stripe_payment_intent_id')
            .eq('marketing_campaign_id', campaign.id),
        ]);
        const codeRows = (codes ?? []) as Array<{ created_at: string; redeemed_at: string | null }>;
        const orderRows = (orders ?? []) as Array<{
          id: string;
          total_cents: number;
          discount_cents: number;
          stripe_payment_intent_id: string | null;
        }>;
        const countedOrders = orderRows.filter((order) => order.stripe_payment_intent_id);
        const paidOrderIds = countedOrders.map((order) => order.id);
        const refundsResult =
          paidOrderIds.length > 0
            ? await client
                .from('order_refunds')
                .select('amount_cents')
                .in('order_id', paidOrderIds)
            : { data: [], error: null };
        const refundedCents = ((refundsResult.data ?? []) as Array<{ amount_cents: number }>).reduce(
          (sum, refund) => sum + refund.amount_cents,
          0
        );
        nextMetrics[campaign.id] = {
          issued: codeRows.length,
          redeemed: codeRows.filter((code) => code.redeemed_at).length,
          newSinceReview: codeRows.filter(
            (code) => !campaign.last_reviewed_at || code.created_at > campaign.last_reviewed_at
          ).length,
          revenueCents:
            countedOrders.reduce((sum, order) => sum + order.total_cents, 0) - refundedCents,
          discountCents: countedOrders.reduce((sum, order) => sum + order.discount_cents, 0),
        };
      })
    );
    setMetrics(nextMetrics);
    setStatus('idle');
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadCampaigns(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadCampaigns]);

  const currentMetrics = editingId ? metrics[editingId] : null;
  const conversion = currentMetrics?.issued
    ? Math.round((currentMetrics.redeemed / currentMetrics.issued) * 1000) / 10
    : 0;
  const validity = useMemo(() => {
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      return 'End date must be after the start date.';
    }
    if (form.internal_code.length < 3) return 'Internal campaign code needs at least 3 characters.';
    if (form.name.trim().length < 3) return 'Campaign name is required.';
    if (!Number.isInteger(form.discount_percent) || form.discount_percent < 1 || form.discount_percent > 50) {
      return 'Discount percent must be a whole number from 1 to 50.';
    }
    if (!Number.isInteger(form.code_valid_days) || form.code_valid_days < 1 || form.code_valid_days > 365) {
      return 'Code validity must be a whole number from 1 to 365 days.';
    }
    if (form.popup_title.trim().length < 3 || form.popup_message.trim().length < 3) {
      return 'Complete the popup headline and message.';
    }
    if (form.banner_text.trim().length < 3) return 'Complete the announcement bar message.';
    return '';
  }, [form]);

  const selectCampaign = (campaign: CampaignRow) => {
    setEditingId(campaign.id);
    setForm({
      internal_code: campaign.internal_code,
      name: campaign.name,
      discount_percent: campaign.discount_percent,
      code_valid_days: campaign.code_valid_days,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      is_active: campaign.is_active,
      popup_enabled: campaign.popup_enabled,
      banner_enabled: campaign.banner_enabled,
      popup_title: campaign.popup_title,
      popup_message: campaign.popup_message,
      banner_text: campaign.banner_text,
      last_reviewed_at: campaign.last_reviewed_at,
    });
    setMessage('');
  };

  const saveCampaign = async () => {
    if (!supabase || validity) return;
    setStatus('saving');
    setMessage('');
    const payload = {
      ...form,
      internal_code: makeInternalCode(form.internal_code),
      name: form.name.trim(),
      popup_title: form.popup_title.trim(),
      popup_message: form.popup_message.trim(),
      banner_text: form.banner_text.trim(),
    };
    const query = editingId
      ? supabase.from('shop_marketing_campaigns').update(payload).eq('id', editingId)
      : supabase.from('shop_marketing_campaigns').insert(payload);
    const { error } = await query;
    if (error) {
      setMessage(
        error.code === '23505'
          ? 'Only one campaign can be active at a time, and internal codes must be unique.'
          : error.message
      );
      setStatus('idle');
      return;
    }
    await requestAdminRevalidation({ scope: 'campaigns' });
    setMessage('Campaign saved. Public campaign surfaces were refreshed.');
    setEditingId(null);
    setForm(newCampaign());
    await loadCampaigns();
  };

  const markReviewed = async () => {
    if (!supabase || !editingId) return;
    const reviewedAt = new Date().toISOString();
    const { error } = await supabase
      .from('shop_marketing_campaigns')
      .update({ last_reviewed_at: reviewedAt })
      .eq('id', editingId);
    if (!error) {
      setForm((current) => ({ ...current, last_reviewed_at: reviewedAt }));
      await loadCampaigns();
      setMessage('New campaign signups marked as reviewed.');
    }
  };

  return (
    <section className="mb-12 border border-ocean/20 bg-sky-50 p-6 md:p-8">
      <span className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
        Shop acquisition
      </span>
      <h2 className="mt-2 font-display text-3xl text-black">Newsletter discount campaigns</h2>
      <p className="mt-3 max-w-3xl font-body text-sm leading-relaxed text-black/60">
        Turn the shop popup and announcement bar on only when you want them. Each signup gets a
        personal, one-use code; it is counted as used only after Stripe confirms payment.
      </p>

      {campaigns.length > 0 && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const campaignMetrics = metrics[campaign.id];
            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => selectCampaign(campaign)}
                className={`border p-4 text-left ${editingId === campaign.id ? 'border-ocean bg-white' : 'border-black/10 bg-white/70'}`}
              >
                <span className="font-body text-xs uppercase tracking-[0.12em] text-black/45">
                  {campaign.internal_code} · {campaign.is_active ? 'Active' : 'Inactive'}
                </span>
                <strong className="mt-1 block font-body text-base text-black">{campaign.name}</strong>
                <span className="mt-2 block font-body text-xs text-black/55">
                  {campaignMetrics?.issued ?? 0} codes · {campaignMetrics?.redeemed ?? 0} used ·{' '}
                  {campaignMetrics?.newSinceReview ?? 0} new to review
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-7 flex items-center justify-between border-t border-ocean/15 pt-6">
        <h3 className="font-display text-2xl">{editingId ? 'Edit campaign' : 'New campaign'}</h3>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setForm(newCampaign()); }} className="font-body text-sm text-ocean underline">
            Start a new campaign
          </button>
        )}
      </div>

      {currentMetrics && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['Codes sent', currentMetrics.issued],
            ['Used', currentMetrics.redeemed],
            ['Conversion', `${conversion}%`],
            ['Net paid sales', formatMoney(currentMetrics.revenueCents)],
            ['Discount given', formatMoney(currentMetrics.discountCents)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white p-3">
              <span className="block font-body text-[10px] uppercase tracking-[0.12em] text-black/45">{label}</span>
              <strong className="mt-1 block font-body text-lg">{value}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block font-body text-sm font-semibold">Campaign name
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, ...(!editingId ? { internal_code: makeInternalCode(event.target.value) } : {}) }))} className="mt-2 w-full border border-black/15 bg-white px-3 py-3 font-normal" />
          <span className="mt-1 block text-xs font-normal text-black/50">A private label Katie will recognize in reports.</span>
        </label>
        <label className="block font-body text-sm font-semibold">Internal campaign code
          <input value={form.internal_code} onChange={(event) => setForm((current) => ({ ...current, internal_code: makeInternalCode(event.target.value) }))} disabled={Boolean(editingId)} className="mt-2 w-full border border-black/15 bg-white px-3 py-3 font-normal disabled:bg-black/5" />
          <span className="mt-1 block text-xs font-normal text-black/50">Groups every signup, code, order, and metric. It stays fixed after creation.</span>
        </label>
        <label className="block font-body text-sm font-semibold">Discount percent
          <input type="number" min={1} max={50} value={form.discount_percent} onChange={(event) => setForm((current) => {
            const nextPercent = Number(event.target.value);
            return {
              ...current,
              discount_percent: nextPercent,
              popup_title: current.popup_title.replace(`${current.discount_percent}%`, `${nextPercent}%`),
              banner_text: current.banner_text.replace(`${current.discount_percent}%`, `${nextPercent}%`),
            };
          })} className="mt-2 w-full border border-black/15 bg-white px-3 py-3 font-normal" />
          <span className="mt-1 block text-xs font-normal text-black/50">Applied to merchandise, never shipping.</span>
        </label>
        <label className="block font-body text-sm font-semibold">Code valid for
          <div className="mt-2 flex items-center gap-2"><input type="number" min={1} max={365} value={form.code_valid_days} onChange={(event) => setForm((current) => ({ ...current, code_valid_days: Number(event.target.value) }))} className="w-28 border border-black/15 bg-white px-3 py-3 font-normal" /><span className="font-normal">days after signup</span></div>
        </label>
        <label className="block font-body text-sm font-semibold">Campaign starts (optional)
          <input type="datetime-local" value={toDateTimeLocal(form.starts_at)} onChange={(event) => setForm((current) => ({ ...current, starts_at: fromDateTimeLocal(event.target.value) }))} className="mt-2 w-full border border-black/15 bg-white px-3 py-3 font-normal" />
        </label>
        <label className="block font-body text-sm font-semibold">Campaign ends (optional)
          <input type="datetime-local" value={toDateTimeLocal(form.ends_at)} onChange={(event) => setForm((current) => ({ ...current, ends_at: fromDateTimeLocal(event.target.value) }))} className="mt-2 w-full border border-black/15 bg-white px-3 py-3 font-normal" />
        </label>
      </div>

      <div className="mt-6 grid gap-5">
        <label className="block font-body text-sm font-semibold">Popup headline
          <input value={form.popup_title} maxLength={100} onChange={(event) => setForm((current) => ({ ...current, popup_title: event.target.value }))} className="mt-2 w-full border border-black/15 bg-white px-3 py-3 font-normal" />
        </label>
        <label className="block font-body text-sm font-semibold">Popup message
          <textarea value={form.popup_message} maxLength={240} onChange={(event) => setForm((current) => ({ ...current, popup_message: event.target.value }))} className="mt-2 min-h-24 w-full border border-black/15 bg-white px-3 py-3 font-normal" />
        </label>
        <label className="block font-body text-sm font-semibold">Announcement bar message
          <input value={form.banner_text} maxLength={160} onChange={(event) => setForm((current) => ({ ...current, banner_text: event.target.value }))} className="mt-2 w-full border border-black/15 bg-white px-3 py-3 font-normal" />
        </label>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ['is_active', 'Campaign active', 'Allows this campaign to issue new personal codes.'],
          ['popup_enabled', 'Show shop popup', 'Opens on shop and cart after a short delay.'],
          ['banner_enabled', 'Show announcement bar', 'Displays above the navigation across the site.'],
        ].map(([key, label, help]) => (
          <label key={key} className="flex gap-3 border border-black/10 bg-white p-4 font-body text-sm">
            <input type="checkbox" checked={Boolean(form[key as keyof CampaignForm])} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))} className="mt-1 h-4 w-4 accent-ocean" />
            <span><strong className="block">{label}</strong><span className="mt-1 block text-xs leading-relaxed text-black/50">{help}</span></span>
          </label>
        ))}
      </div>

      <div className="mt-6 border border-dashed border-ocean/30 bg-white p-5">
        <span className="font-body text-xs uppercase tracking-[0.14em] text-ocean">Customer preview</span>
        <strong className="mt-2 block font-display text-2xl">{form.popup_title || 'Popup headline'}</strong>
        <p className="mt-2 font-body text-sm text-black/60">{form.popup_message || 'Popup message'}</p>
        <p className="mt-4 bg-[#d97052] px-4 py-2 text-center font-body text-xs font-semibold uppercase tracking-[0.12em] text-white">{form.banner_text || 'Announcement bar message'}</p>
      </div>

      {validity && <p className="mt-4 font-body text-sm text-red-700">{validity}</p>}
      {message && <p className="mt-4 font-body text-sm text-black/65">{message}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => void saveCampaign()} disabled={status === 'saving' || Boolean(validity)} className="btn-ocean disabled:cursor-not-allowed disabled:opacity-40">
          {status === 'saving' ? 'Saving…' : 'Save campaign'}
        </button>
        {editingId && (currentMetrics?.newSinceReview ?? 0) > 0 && (
          <button type="button" onClick={() => void markReviewed()} className="border border-ocean px-5 py-3 font-body text-sm font-semibold text-ocean">
            Mark new signups reviewed
          </button>
        )}
      </div>
    </section>
  );
}
