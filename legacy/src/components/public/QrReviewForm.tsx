'use client';

import { useState } from 'react';
import Image from 'next/image';
import { optimizeImageFile } from '@/lib/adminMedia';
import type { ReviewableCollection } from '@/lib/qrProductReviews';

const MAX_REVIEWS = 5;
// Lo que aceptamos del carrete antes de procesarla en el navegador.
const MAX_SOURCE_PHOTO_BYTES = 25 * 1024 * 1024;
// Tope real de Vercel para el cuerpo de una petición: 4,5 MB. Dejamos margen.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

type ReviewDraft = {
  key: string;
  collectionId: string;
  productId: string;
  rating: number;
  commentText: string;
  photoUrl: string | null;
  photoPreview: string | null;
  isUploadingPhoto: boolean;
  photoError: string;
};

function makeDraft(): ReviewDraft {
  return {
    key: crypto.randomUUID(),
    collectionId: '',
    productId: '',
    rating: 0,
    commentText: '',
    photoUrl: null,
    photoPreview: null,
    isUploadingPhoto: false,
    photoError: '',
  };
}

export function QrReviewForm({ collections }: { collections: ReviewableCollection[] }) {
  const [email, setEmail] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [website, setWebsite] = useState('');
  const [drafts, setDrafts] = useState<ReviewDraft[]>([makeDraft()]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDone, setIsDone] = useState(false);

  const update = (key: string, patch: Partial<ReviewDraft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft))
    );
  };

  const productsFor = (collectionId: string) =>
    collections.find((collection) => collection.id === collectionId)?.products ?? [];

  const handlePhoto = async (key: string, file: File | undefined) => {
    if (!file) return;

    if (file.size > MAX_SOURCE_PHOTO_BYTES) {
      update(key, { photoError: 'That photo is too large. Please choose another one.' });
      return;
    }

    update(key, { isUploadingPhoto: true, photoError: '' });

    try {
      // Achicar en el navegador antes de subir no es solo por velocidad: Vercel
      // rechaza cualquier cuerpo de más de 4,5 MB con un 413 de plataforma, y una
      // foto de teléfono moderna lo supera con facilidad. Además, en una conexión
      // móvil una subida larga se corta a mitad de camino.
      let uploadFile: File;
      try {
        uploadFile = await optimizeImageFile(file, {
          maxWidth: 1400,
          quality: 0.74,
          targetSize: 700 * 1024,
          minWidth: 800,
          minQuality: 0.5,
          watermark: false,
        });
      } catch {
        // Si el navegador no puede procesarla (un HEIC que no sabe decodificar,
        // por ejemplo), se manda el original y que decida el servidor.
        uploadFile = file;
      }

      if (uploadFile.size > MAX_UPLOAD_BYTES) {
        update(key, {
          isUploadingPhoto: false,
          photoError: 'That photo is too large to send. Please try a different one.',
        });
        return;
      }

      const body = new FormData();
      body.append('photo', uploadFile);
      const response = await fetch('/api/shop/reviews/photo', { method: 'POST', body });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.photoUrl) {
        update(key, {
          isUploadingPhoto: false,
          photoError: payload?.error || 'That photo could not be uploaded.',
        });
        return;
      }

      update(key, {
        isUploadingPhoto: false,
        photoUrl: payload.photoUrl,
        photoPreview: payload.photoUrl,
        photoError: '',
      });
    } catch {
      update(key, { isUploadingPhoto: false, photoError: 'That photo could not be uploaded.' });
    }
  };

  const isDraftComplete = (draft: ReviewDraft) =>
    Boolean(draft.productId) && draft.rating > 0 && draft.commentText.trim().length >= 3;

  const canAddAnother =
    drafts.length < MAX_REVIEWS && drafts.every(isDraftComplete) && drafts.length > 0;

  const submit = async () => {
    setError('');

    if (!email.trim() || !authorName.trim()) {
      setError('Please add your email and the name you want on the review.');
      return;
    }
    if (!drafts.every(isDraftComplete)) {
      setError('Every review needs a product, a rating, and a few words.');
      return;
    }
    if (drafts.some((draft) => draft.isUploadingPhoto)) {
      setError('A photo is still uploading. Give it a second.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/shop/reviews/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          newsletterOptIn,
          authorName: authorName.trim(),
          website,
          reviews: drafts.map((draft) => ({
            productId: draft.productId,
            rating: draft.rating,
            commentText: draft.commentText.trim(),
            photoUrl: draft.photoUrl,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || 'Your reviews could not be sent. Please try again.');
        return;
      }
      setIsDone(true);
    } catch {
      // Acá el servidor pudo haber guardado igual: la petición salió y lo que se
      // perdió fue la respuesta, algo habitual en datos móviles. Decir "no se
      // envió" haría que la persona reintente y queden reseñas duplicadas.
      setError(
        'We lost the connection before confirming. Your review may have gone through — please check with Katie before sending it again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isDone) {
    return (
      <div className="border border-black/10 bg-gray-50 p-8 text-center md:p-12">
        <h2 className="font-display text-4xl text-black md:text-5xl">Thank you.</h2>
        <p className="mx-auto mt-4 max-w-xl font-body text-sm leading-relaxed text-black/60">
          Your review means so much to me and helps support What Katie Seas. Thanks for taking the
          time to share your experience!
        </p>
        {/* Sin este aviso, quien va a buscar su reseña al producto y no la
            encuentra puede creer que se perdió. */}
        <p className="mx-auto mt-3 max-w-xl font-body text-sm leading-relaxed text-black/45">
          I read every review before it goes up on the shop, so give it a little time to appear.
          {newsletterOptIn ? ' You are also on the list for new stories and drops.' : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block font-body text-sm font-semibold text-black">Your email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="h-12 w-full border border-black/15 bg-white px-4 font-body text-sm text-black outline-none focus:border-ocean"
          />
          <span className="mt-2 block font-body text-xs leading-relaxed text-black/45">
            Only so Katie can reach you if there is a problem with your order. It is never shown on
            the shop.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={newsletterOptIn}
            onChange={(event) => setNewsletterOptIn(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--ocean)]"
          />
          <span className="font-body text-sm leading-relaxed text-black/70">
            Send me new travel stories, dive trip ideas, and new drops from the shop.
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block font-body text-sm font-semibold text-black">
            Name to show on your review
          </span>
          <input
            type="text"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            maxLength={60}
            placeholder="First name or nickname"
            className="h-12 w-full border border-black/15 bg-white px-4 font-body text-sm text-black outline-none focus:border-ocean"
          />
        </label>
      </div>

      {drafts.map((draft, index) => {
        const products = productsFor(draft.collectionId);
        return (
          <section key={draft.key} className="border border-black/10 bg-gray-50 p-5 md:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <p className="font-body text-xs uppercase tracking-[0.16em] text-black/45">
                {drafts.length > 1 ? `Product ${index + 1}` : 'Which product did you buy?'}
              </p>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDrafts((current) => current.filter((d) => d.key !== draft.key))}
                  className="font-body text-sm text-black/45 underline hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>

            <p className="mb-3 font-body text-sm font-semibold text-black">Pick a category</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {collections.map((collection) => {
                const isActive = collection.id === draft.collectionId;
                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() =>
                      update(draft.key, { collectionId: collection.id, productId: '' })
                    }
                    className={
                      isActive
                        ? 'border border-ocean bg-sky-50 px-4 py-2 font-body text-sm font-semibold text-ocean'
                        : 'border border-black/15 bg-white px-4 py-2 font-body text-sm text-black/65 hover:border-black/35'
                    }
                  >
                    {collection.name}
                  </button>
                );
              })}
            </div>

            {draft.collectionId && (
              <>
                <p className="mb-3 font-body text-sm font-semibold text-black">Pick the product</p>
                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {products.map((product) => {
                    const isActive = product.id === draft.productId;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => update(draft.key, { productId: product.id })}
                        className={
                          isActive
                            ? 'flex flex-col items-center gap-2 border-2 border-ocean bg-sky-50 p-3 text-center'
                            : 'flex flex-col items-center gap-2 border border-black/10 bg-white p-3 text-center hover:border-black/30'
                        }
                      >
                        {/* Los mockups son prendas claras sobre fondo blanco: sin este
                            gris de fondo, una remera blanca se vuelve invisible. */}
                        {product.imageUrl ? (
                          <span className="flex h-32 w-full items-center justify-center bg-gray-200">
                            <Image
                              src={product.imageUrl}
                              alt=""
                              width={200}
                              height={200}
                              className="h-full w-auto object-contain"
                            />
                          </span>
                        ) : (
                          <span className="h-32 w-full bg-gray-100" />
                        )}
                        <span className="font-body text-xs leading-snug text-black">
                          {product.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {draft.productId && (
              <div className="space-y-5 border-t border-black/10 pt-6">
                <div>
                  <p className="mb-2 font-body text-sm font-semibold text-black">Your rating</p>
                  <div className="flex gap-1" aria-label="Choose a rating from 1 to 5 stars">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update(draft.key, { rating: value })}
                        aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                        className={
                          value <= draft.rating
                            ? 'text-3xl leading-none text-ocean'
                            : 'text-3xl leading-none text-black/20 hover:text-black/40'
                        }
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block font-body text-sm font-semibold text-black">
                    Your review
                  </span>
                  <textarea
                    value={draft.commentText}
                    onChange={(event) => update(draft.key, { commentText: event.target.value })}
                    rows={4}
                    maxLength={2000}
                    placeholder="How did it feel, fit, and look in person?"
                    className="w-full border border-black/15 bg-white p-4 font-body text-sm text-black outline-none focus:border-ocean"
                  />
                </label>

                <div>
                  <p className="mb-2 font-body text-sm font-semibold text-black">
                    Add a photo wearing it{' '}
                    <span className="font-normal text-black/45">(optional)</span>
                  </p>
                  {draft.photoPreview ? (
                    <div className="flex items-center gap-4">
                      <Image
                        src={draft.photoPreview}
                        alt="Your upload"
                        width={96}
                        height={96}
                        className="h-24 w-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          update(draft.key, { photoUrl: null, photoPreview: null, photoError: '' })
                        }
                        className="font-body text-sm text-black/45 underline hover:text-red-700"
                      >
                        Remove photo
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept={ACCEPTED_PHOTO_TYPES}
                      disabled={draft.isUploadingPhoto}
                      onChange={(event) => void handlePhoto(draft.key, event.target.files?.[0])}
                      className="block w-full font-body text-sm text-black/65 file:mr-4 file:border file:border-black/15 file:bg-white file:px-4 file:py-2 file:font-body file:text-sm file:text-black"
                    />
                  )}
                  {draft.isUploadingPhoto && (
                    <p className="mt-2 font-body text-sm text-black/50">Uploading photo...</p>
                  )}
                  {draft.photoError && (
                    <p className="mt-2 font-body text-sm text-red-700">{draft.photoError}</p>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}

      {canAddAnother && (
        <button
          type="button"
          onClick={() => setDrafts((current) => [...current, makeDraft()])}
          className="flex w-full items-center justify-center gap-2 border border-dashed border-black/25 bg-white px-4 py-4 font-body text-sm text-black/65 hover:border-ocean hover:text-ocean"
        >
          <span className="text-lg leading-none">+</span>
          Bought more than one? Add another review
        </button>
      )}

      {drafts.length >= MAX_REVIEWS && (
        <p className="font-body text-sm text-black/45">
          That is the maximum of {MAX_REVIEWS} reviews in one go.
        </p>
      )}

      {/* Honeypot: fuera de la vista para las personas, irresistible para los bots. */}
      <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        Leave this field empty
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </label>

      {error && <p className="font-body text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={isSaving}
        className="btn-ocean w-full justify-center disabled:opacity-50"
      >
        {isSaving ? 'Sending...' : 'Send review'}
      </button>
    </div>
  );
}
