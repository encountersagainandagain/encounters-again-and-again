import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QrReviewForm } from '@/components/public/QrReviewForm';
import { fetchReviewableCatalog } from '@/lib/qrProductReviews';
import { REVIEW_QR_SLUG } from '@/lib/reviewQrLink';

// El catálogo tiene que reflejar los productos publicados en el momento del
// escaneo, no una versión cacheada de hace horas.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Share your review',
  description: 'Tell Katie how your order arrived.',
  // La página no se enlaza desde ningún lado y tampoco se indexa: solo llega
  // quien escanea el QR de la etiqueta.
  robots: { index: false, follow: false },
};

export default async function QrReviewPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Cualquier ruta que no sea la del QR responde 404, indistinguible de una
  // página inexistente. Nada revela que exista un formulario acá.
  if (code !== REVIEW_QR_SLUG) notFound();

  const collections = await fetchReviewableCatalog();

  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16">
        <p className="font-body text-xs uppercase tracking-[0.18em] text-ocean">
          Thanks for wearing my designs
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-black md:text-5xl">
          How did you like your order?
        </h1>
        <p className="mt-4 max-w-xl font-body text-sm leading-relaxed text-black/60">
          Your review helps other ocean lovers find their next favorite piece and helps me keep
          creating designs you&rsquo;ll love. Thank you for your feedback!
        </p>

        <div className="mt-10">
          {collections.length === 0 ? (
            <div className="border border-black/10 bg-gray-50 p-8 text-center">
              <p className="font-body text-sm leading-relaxed text-black/60">
                The shop is between drops right now, so there is nothing to review yet. Please check
                back soon.
              </p>
            </div>
          ) : (
            <QrReviewForm collections={collections} />
          )}
        </div>
      </section>
    </main>
  );
}
