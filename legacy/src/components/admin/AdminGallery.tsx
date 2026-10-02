'use client';

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Edit,
  GripVertical,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { uploadMediaFile } from '@/lib/adminMedia';
import {
  createGalleryItem,
  deleteGalleryItem,
  fetchAdminGalleryItems,
  updateGalleryItem,
  updateGallerySortOrders,
  type GalleryItem,
  type GalleryItemInput,
  type GalleryItemOrientation,
} from '@/lib/galleryItems';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import type { Continent } from '@/types';

const continents: { value: Continent; label: string }[] = [
  { value: 'asia', label: 'Asia' },
  { value: 'europe', label: 'Europe' },
  { value: 'oceania', label: 'Oceania' },
  { value: 'north-america', label: 'North America' },
  { value: 'central-america', label: 'Central America' },
  { value: 'south-america', label: 'South America' },
  { value: 'africa', label: 'Africa' },
];

const orientations: { value: GalleryItemOrientation; label: string }[] = [
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'square', label: 'Square' },
];

const emptyForm: GalleryItemInput = {
  title: '',
  location: '',
  continent: 'asia',
  image_url: '',
  alt_text: '',
  orientation: 'landscape',
  sort_order: 0,
  is_visible: true,
};

const imageAspectClass: Record<GalleryItemOrientation, string> = {
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  square: 'aspect-square',
};

export function AdminGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [form, setForm] = useState<GalleryItemInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [touchTargetItemId, setTouchTargetItemId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [watermarkText, setWatermarkText] = useState(defaultSiteSettings.imageWatermarkText);
  const touchDragRef = useRef<{
    itemId: string;
    pointerId: number;
    targetItemId: string | null;
  } | null>(null);

  const loadItems = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const nextItems = await fetchAdminGalleryItems();
      setItems(nextItems);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load gallery. Make sure docs/supabase-gallery.sql has been run in Supabase.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
    fetchSiteSettings()
      .then((settings) => setWatermarkText(settings.imageWatermarkText))
      .catch(() => setWatermarkText(defaultSiteSettings.imageWatermarkText));
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setUploadError('');
    setSuccessMessage('');
  };

  const startEdit = (item: GalleryItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      location: item.location,
      continent: item.continent,
      image_url: item.image_url,
      alt_text: item.alt_text,
      orientation: item.orientation,
      sort_order: item.sort_order,
      is_visible: item.is_visible,
    });
    setUploadError('');
    setSuccessMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;

    setUploadError('');
    setUploadingImage(true);

    try {
      const publicUrl = await uploadMediaFile(file, 'gallery', {
        maxWidth: 1400,
        quality: 0.74,
        targetSize: 450 * 1024,
        minWidth: 1000,
        minQuality: 0.54,
        watermarkText: watermarkText.trim(),
      });
      setForm((current) => ({ ...current, image_url: publicUrl }));
      setSuccessMessage('Image uploaded and optimized. Save the gallery photo to publish it.');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      const input: GalleryItemInput = {
        ...form,
        title: form.title.trim(),
        location: form.location.trim(),
        image_url: form.image_url.trim(),
        alt_text: form.alt_text.trim(),
        sort_order: editingId
          ? Number.isFinite(form.sort_order)
            ? form.sort_order
            : 0
          : getFirstSortOrder(),
      };

      if (!input.title || !input.image_url) {
        throw new Error('Title and image are required.');
      }

      if (editingId) {
        await updateGalleryItem(editingId, input);
        await requestAdminRevalidation({ scope: 'gallery' });
        setSuccessMessage('Gallery photo updated.');
      } else {
        await createGalleryItem(input);
        await requestAdminRevalidation({ scope: 'gallery' });
        setSuccessMessage('Gallery photo created.');
      }

      resetForm();
      await loadItems();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save gallery photo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    const confirmed = window.confirm(`Delete "${item.title}" from the gallery?`);
    if (!confirmed) return;

    try {
      await deleteGalleryItem(item.id);
      await requestAdminRevalidation({ scope: 'gallery' });
      setItems((current) => current.filter((nextItem) => nextItem.id !== item.id));
      if (editingId === item.id) resetForm();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete gallery photo.');
    }
  };

  const getFirstSortOrder = () => {
    if (items.length === 0) return 10;
    return Math.min(...items.map((item) => item.sort_order)) - 10;
  };

  const saveReorderedItems = async (reorderedItems: GalleryItem[]) => {
    const normalizedItems = reorderedItems.map((item, index) => ({
      ...item,
      sort_order: (index + 1) * 10,
    }));

    setItems(normalizedItems);
    setDraggedItemId(null);
    setTouchTargetItemId(null);
    setIsReordering(true);
    setErrorMessage('');

    try {
      await updateGallerySortOrders(
        normalizedItems.map((item) => ({ id: item.id, sort_order: item.sort_order }))
      );
      await requestAdminRevalidation({ scope: 'gallery' });
      setSuccessMessage('Gallery order saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save gallery order.');
      await loadItems();
    } finally {
      setIsReordering(false);
    }
  };

  const moveItemToIndex = async (itemId: string, targetIndex: number) => {
    const fromIndex = items.findIndex((item) => item.id === itemId);
    const boundedTargetIndex = Math.max(0, Math.min(targetIndex, items.length - 1));
    if (fromIndex < 0 || fromIndex === boundedTargetIndex) return;

    const reorderedItems = [...items];
    const [movedItem] = reorderedItems.splice(fromIndex, 1);
    reorderedItems.splice(boundedTargetIndex, 0, movedItem);
    await saveReorderedItems(reorderedItems);
  };

  const reorderItems = async (sourceItemId: string, targetItemId: string) => {
    if (sourceItemId === targetItemId) return;

    const targetIndex = items.findIndex((item) => item.id === targetItemId);
    if (targetIndex < 0) return;
    await moveItemToIndex(sourceItemId, targetIndex);
  };

  const handleDesktopDrop = async (targetItemId: string) => {
    if (!draggedItemId) return;
    await reorderItems(draggedItemId, targetItemId);
  };

  const handleTouchReorderStart = (
    itemId: string,
    event: PointerEvent<HTMLButtonElement>
  ) => {
    if (event.pointerType === 'mouse') return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    touchDragRef.current = {
      itemId,
      pointerId: event.pointerId,
      targetItemId: itemId,
    };
    setDraggedItemId(itemId);
    setTouchTargetItemId(itemId);
  };

  const handleTouchReorderMove = (event: PointerEvent<HTMLButtonElement>) => {
    const currentDrag = touchDragRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    event.preventDefault();
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-gallery-item-id]');
    const targetItemId = target?.dataset.galleryItemId ?? currentDrag.itemId;

    if (targetItemId !== currentDrag.targetItemId) {
      touchDragRef.current = { ...currentDrag, targetItemId };
      setTouchTargetItemId(targetItemId);
    }
  };

  const handleTouchReorderEnd = async (event: PointerEvent<HTMLButtonElement>) => {
    const currentDrag = touchDragRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.currentTarget.releasePointerCapture(event.pointerId);
    touchDragRef.current = null;
    setDraggedItemId(null);
    setTouchTargetItemId(null);

    if (currentDrag.targetItemId && currentDrag.targetItemId !== currentDrag.itemId) {
      await reorderItems(currentDrag.itemId, currentDrag.targetItemId);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 flex flex-col gap-5 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex items-center gap-2 font-body text-sm uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-ocean"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
              Admin
            </span>
            <h1 className="font-display text-5xl text-black md:text-6xl">
              Gallery
            </h1>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 border border-ocean/20 bg-sky-50 p-4 font-body text-sm text-ocean">
            {successMessage}
          </div>
        )}

        {isReordering && (
          <div className="mb-6 border border-black/10 bg-gray-50 p-4 font-body text-sm text-black/55">
            Saving gallery order...
          </div>
        )}

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mb-12 border border-black/10 bg-gray-50 p-5 md:p-7"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="font-display text-3xl text-black">
              {editingId ? 'Edit photo' : 'New photo'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 font-body text-sm uppercase tracking-[0.14em] text-black/50 transition-colors hover:text-ocean"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Location</span>
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="Raja Ampat, Indonesia"
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Continent</span>
              <select
                value={form.continent}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    continent: event.target.value as Continent,
                  }))
                }
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              >
                {continents.map((continent) => (
                  <option key={continent.value} value={continent.value}>
                    {continent.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Orientation</span>
              <select
                value={form.orientation}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    orientation: event.target.value as GalleryItemOrientation,
                  }))
                }
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              >
                {orientations.map((orientation) => (
                  <option key={orientation.value} value={orientation.value}>
                    {orientation.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="border border-black/10 bg-white px-4 py-3 font-body text-sm leading-relaxed text-black/55">
              New photos appear first automatically. Use the numbered position, arrow buttons, or
              drag handle on each photo to change the gallery order.
            </div>

            <label className="flex items-center gap-3 pt-8 font-body text-sm text-black/65">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(event) =>
                  setForm((current) => ({ ...current, is_visible: event.target.checked }))
                }
                className="h-4 w-4 accent-ocean"
              />
              Visible on public gallery
            </label>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_220px] md:items-start">
            <div>
              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Image URL</span>
                <input
                  value={form.image_url}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, image_url: event.target.value }))
                  }
                  required
                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => void handleImageUpload(event.target.files?.[0])}
                  className="font-body text-sm text-black/55 file:mr-4 file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-body file:text-sm file:text-white hover:file:bg-ocean-light"
                />
                {uploadingImage && (
                  <span className="font-body text-sm text-black/45">Uploading image...</span>
                )}
              </div>

              <p className="mt-3 font-body text-xs leading-relaxed text-black/45">
                Recommended: 2048 × 1536 px for horizontal photos, 1536 × 2048 px for vertical photos, or 1200 × 1200 px for square photos. JPG, PNG, WebP, or GIF. Large JPG/PNG/WebP files are optimized before upload.
              </p>

              {uploadError && (
                <p className="mt-3 font-body text-sm leading-relaxed text-red-700">
                  {uploadError}
                </p>
              )}

              <label className="mt-5 block">
                <span className="mb-2 block font-body text-sm text-black/60">Alt text</span>
                <input
                  value={form.alt_text}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, alt_text: event.target.value }))
                  }
                  placeholder="Describe the photo for accessibility"
                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>
            </div>

            <div className={`${imageAspectClass[form.orientation]} overflow-hidden bg-white`}>
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt={form.alt_text || form.title || 'Gallery preview'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 border border-dashed border-black/15 text-black/35">
                  <ImagePlus className="h-8 w-8" />
                  <span className="font-body text-sm">Preview</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={isSaving || uploadingImage} className="btn-ocean">
              <Plus className="h-4 w-4" />
              {isSaving ? 'Saving...' : editingId ? 'Save photo' : 'Create photo'}
            </button>
          </div>
        </form>

        {isLoading ? (
          <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
            Loading gallery...
          </p>
        ) : items.length === 0 ? (
          <div className="border border-black/10 bg-gray-50 p-8">
            <h2 className="mb-3 font-display text-3xl text-black">No photos yet</h2>
            <p className="font-body text-base leading-relaxed text-black/60">
              Create the first gallery photo and it will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 border border-black/10 bg-gray-50 p-4 font-body text-sm leading-relaxed text-black/55">
              Choose a numbered position or use the arrow buttons for reliable ordering on a
              tablet. Drag-and-drop remains available on desktop and touch devices. Every change
              saves automatically.
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  data-gallery-item-id={item.id}
                  draggable
                  onDragStart={() => setDraggedItemId(item.id)}
                  onDragEnd={() => setDraggedItemId(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void handleDesktopDrop(item.id)}
                  className={`border bg-white transition-all ${
                    draggedItemId === item.id
                      ? 'border-ocean/60 opacity-55'
                      : touchTargetItemId === item.id
                        ? 'border-ocean/60 bg-sky-50'
                      : 'border-black/10 hover:border-ocean/35'
                  }`}
                >
                <div className={`${imageAspectClass[item.orientation]} bg-gray-100`}>
                  <img
                    src={item.image_url}
                    alt={item.alt_text || item.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl text-black">{item.title}</h2>
                      <p className="mt-1 font-body text-sm text-black/50">{item.location}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onPointerDown={(event) => handleTouchReorderStart(item.id, event)}
                        onPointerMove={handleTouchReorderMove}
                        onPointerUp={(event) => void handleTouchReorderEnd(event)}
                        onPointerCancel={(event) => void handleTouchReorderEnd(event)}
                        className="touch-none text-black/30 transition-colors hover:text-ocean"
                        aria-label={`Reorder ${item.title}`}
                      >
                        <GripVertical className="h-5 w-5 cursor-grab" />
                      </button>
                      <span
                        className={`px-3 py-1 font-body text-xs uppercase tracking-[0.14em] ${
                          item.is_visible
                            ? 'bg-ocean/10 text-ocean'
                            : 'bg-black/5 text-black/45'
                        }`}
                      >
                        {item.is_visible ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>

                  <p className="mb-4 font-body text-xs uppercase tracking-[0.14em] text-black/40">
                    {item.continent.replace('-', ' ')}
                  </p>

                  <div className="mb-5 border border-black/10 bg-gray-50 p-3">
                    <label className="block font-body text-xs uppercase tracking-[0.14em] text-black/50">
                      Gallery position
                      <select
                        value={index + 1}
                        onChange={(event) =>
                          void moveItemToIndex(item.id, Number(event.target.value) - 1)
                        }
                        disabled={isReordering}
                        className="mt-2 h-10 w-full border border-black/10 bg-white px-3 font-body text-sm text-black outline-none focus:border-ocean disabled:cursor-wait disabled:opacity-60"
                        aria-label={`Position of ${item.title}`}
                      >
                        {items.map((_, positionIndex) => (
                          <option key={positionIndex} value={positionIndex + 1}>
                            {positionIndex + 1}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void moveItemToIndex(item.id, index - 1)}
                        disabled={index === 0 || isReordering}
                        className="inline-flex h-10 items-center justify-center gap-2 border border-black/10 bg-white font-body text-xs uppercase tracking-[0.12em] text-black/55 transition-colors hover:border-ocean/40 hover:text-ocean disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`Move ${item.title} one position up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => void moveItemToIndex(item.id, index + 1)}
                        disabled={index === items.length - 1 || isReordering}
                        className="inline-flex h-10 items-center justify-center gap-2 border border-black/10 bg-white font-body text-xs uppercase tracking-[0.12em] text-black/55 transition-colors hover:border-ocean/40 hover:text-ocean disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`Move ${item.title} one position down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                        Down
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-black/50 transition-colors hover:text-ocean"
                      aria-label={`Edit ${item.title}`}
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      className="text-black/45 transition-colors hover:text-red-700"
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
