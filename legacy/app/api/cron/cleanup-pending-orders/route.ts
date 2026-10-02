import { NextResponse } from 'next/server';
import { cleanupStalePendingShopOrders } from '@/lib/shopPendingOrders';

export const runtime = 'nodejs';
// El barrido consulta Stripe una vez por orden, con un tope de 12 por corrida.
export const maxDuration = 60;

/**
 * Barrido diario de checkouts abandonados.
 *
 * `cleanupStalePendingShopOrders` ya existía, pero se llamaba únicamente desde
 * `app/api/shop/checkout/route.ts` como efecto secundario de una compra nueva.
 * Eso lo dejaba sin correr justo cuando más falta hace: en una tienda con poco
 * tráfico, la basura se acumula precisamente porque no hay tráfico que la limpie.
 * Dos órdenes quedaron en `pending` ocho días por este motivo, ensuciando el
 * aviso de "requiere atención" del admin.
 *
 * El barrido pregunta a Stripe por cada sesión y solo cancela las que Stripe
 * reporta como expiradas. Si una sesión figura pagada, la deja intacta y avisa
 * por log en vez de tocarla.
 *
 * Es idempotente: cada corrida re-evalúa el estado real contra Stripe, así que
 * una corrida perdida o repetida no cambia el resultado. Vercel avisa que la
 * entrega de crons es best-effort en ambos sentidos.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  try {
    await cleanupStalePendingShopOrders(stripeSecretKey);
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error('[cron-cleanup-pending-orders] failed', {
      reason: error instanceof Error ? error.message : 'Unknown error.',
    });
    return NextResponse.json({ error: 'Cleanup failed.' }, { status: 500 });
  }
}
