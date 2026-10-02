'use client';

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { ArrowLeft, Edit, GripVertical, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { uploadMediaFile } from '@/lib/adminMedia';
import {
  createGearItem,
  deleteGearItem,
  fetchAdminGearItems,
  updateGearItem,
  updateGearSortOrders,
  type GearItem,
  type GearItemInput,
} from '@/lib/gearItems';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';
import { defaultSiteSettings, fetchSiteSettings, updateSiteSettings } from '@/lib/siteSettings';

const emptyForm: GearItemInput = {
  name: '',
  description: '',
  image_url: '',
  link: '',
  tag: '',
  sort_order: 0,
  is_visible: true,
};

export function AdminGear() {
  const [items, setItems] = useState<GearItem[]>([]);
  const [form, setForm] = useState<GearItemInput>(emptyForm);
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
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);
  const [disclosureText, setDisclosureText] = useState(defaultSiteSettings.gearDisclosureText);
  const [isSavingDisclosure, setIsSavingDisclosure] = useState(false);
  const [disclosureError, setDisclosureError] = useState('');
  const [disclosureSuccess, setDisclosureSuccess] = useState('');
  const touchDragRef = useRef<{
    itemId: string;
    pointerId: number;
    targetItemId: string | null;
  } | null>(null);

  const loadItems = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const nextItems = await fetchAdminGearItems();
      setItems(nextItems);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load gear. Make sure docs/supabase-gear.sql has been run in Supabase.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
    fetchSiteSettings()
      .then((s) => {
        setSiteSettings(s);
        setDisclosureText(s.gearDisclosureText);
      })
      .catch(() => setSiteSettings(defaultSiteSettings));
  }, []);

  const handleDisclosureSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDisclosureError('');
    setDisclosureSuccess('');
    setIsSavingDisclosure(true);
    try {
      const nextSettings = await updateSiteSettings({
        ...siteSettings,
        gearDisclosureText: disclosureText.trim(),
      });
      setSiteSettings(nextSettings);
      setDisclosureText(nextSettings.gearDisclosureText);
      await requestAdminRevalidation({ scope: 'gear' });
      setDisclosureSuccess('Disclosure text saved.');
    } catch (error) {
      setDisclosureError(
        error instanceof Error ? error.message : 'Unable to save disclosure text.'
      );
    } finally {
      setIsSavingDisclosure(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setUploadError('');
    setSuccessMessage('');
  };

  const startEdit = (item: GearItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      link: item.link,
      tag: item.tag,
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
      const publicUrl = await uploadMediaFile(file, 'gear', {
        maxWidth: 1200,
        quality: 0.74,
        targetSize: 350 * 1024,
        minWidth: 800,
        minQuality: 0.54,
        watermarkText: siteSettings.imageWatermarkText.trim(),
      });
      setForm((current) => ({ ...current, image_url: publicUrl }));
      setSuccessMessage('Image uploaded. Save the item to publish it.');
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
      const input: GearItemInput = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim(),
        link: form.link.trim(),
        tag: form.tag.trim(),
        sort_order: editingId
          ? Number.isFinite(form.sort_order) ? form.sort_order : 0
          : getNextSortOrder(),
      };

      if (!input.name || !input.image_url) {
        throw new Error('Name and image are required.');
      }

      if (editingId) {
        await updateGearItem(editingId, input);
        await requestAdminRevalidation({ scope: 'gear' });
        setSuccessMessage('Gear item updated.');
      } else {
        await createGearItem(input);
        await requestAdminRevalidation({ scope: 'gear' });
        setSuccessMessage('Gear item created.');
      }

      resetForm();
      await loadItems();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save gear item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: GearItem) => {
    const confirmed = window.confirm(`Delete "${item.name}"?`);
    if (!confirmed) return;
    try {
      await deleteGearItem(item.id);
      await requestAdminRevalidation({ scope: 'gear' });
      setItems((current) => current.filter((i) => i.id !== item.id));
      if (editingId === item.id) resetForm();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete gear item.');
    }
  };

  const getNextSortOrder = () => {
    if (items.length === 0) return 10;
    return Math.max(...items.map((item) => item.sort_order)) + 10;
  };

  const reorderItems = async (sourceItemId: string, targetItemId: string) => {
    if (sourceItemId === targetItemId) return;
    const fromIndex = items.findIndex((item) => item.id === sourceItemId);
    const toIndex = items.findIndex((item) => item.id === targetItemId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reorderedItems = [...items];
    const [movedItem] = reorderedItems.splice(fromIndex, 1);
    reorderedItems.splice(toIndex, 0, movedItem);

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
      await updateGearSortOrders(
        normalizedItems.map((item) => ({ id: item.id, sort_order: item.sort_order }))
      );
      await requestAdminRevalidation({ scope: 'gear' });
      setSuccessMessage('Order saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save order.');
      await loadItems();
    } finally {
      setIsReordering(false);
    }
  };

  const handleDesktopDrop = async (targetItemId: string) => {
    if (!draggedItemId) return;
    await reorderItems(draggedItemId, targetItemId);
  };

  const handleTouchReorderStart = (itemId: string, event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    touchDragRef.current = { itemId, pointerId: event.pointerId, targetItemId: itemId };
    setDraggedItemId(itemId);
    setTouchTargetItemId(itemId);
  };

  const handleTouchReorderMove = (event: PointerEvent<HTMLButtonElement>) => {
    const currentDrag = touchDragRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-gear-item-id]');
    const targetItemId = target?.dataset.gearItemId ?? currentDrag.itemId;
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
            <h1 className="font-display text-5xl text-black md:text-6xl">My Gear</h1>
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
            Saving order...
          </div>
        )}

        <form
          onSubmit={(event) => void handleDisclosureSubmit(event)}
          className="mb-12 border border-black/10 bg-gray-50 p-5 md:p-7"
        >
          <h2 className="mb-2 font-display text-3xl text-black">Gear disclosure</h2>
          <p className="mb-5 font-body text-sm leading-relaxed text-black/55">
            This appears near the top of /gear. Use it for experience-based recommendation and
            affiliate disclosure copy.
          </p>

          {disclosureError && (
            <div className="mb-4 border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
              {disclosureError}
            </div>
          )}
          {disclosureSuccess && (
            <div className="mb-4 border border-ocean/20 bg-sky-50 p-4 font-body text-sm text-ocean">
              {disclosureSuccess}
            </div>
          )}

          <label className="block">
            <span className="mb-2 block font-body text-sm text-black/60">Disclosure text</span>
            <textarea
              value={disclosureText}
              onChange={(event) => {
                setDisclosureText(event.target.value);
                setDisclosureSuccess('');
              }}
              rows={5}
              className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
            />
          </label>

          <div className="mt-5">
            <button type="submit" disabled={isSavingDisclosure} className="btn-ocean">
              {isSavingDisclosure ? 'Saving...' : 'Save disclosure text'}
            </button>
          </div>
        </form>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mb-12 border border-black/10 bg-gray-50 p-5 md:p-7"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="font-display text-3xl text-black">
              {editingId ? 'Edit item' : 'New item'}
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
              <span className="mb-2 block font-body text-sm text-black/60">Name *</span>
              <input
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                required
                placeholder="Scubapro Hydros Pro BCD"
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Tag / Category</span>
              <input
                value={form.tag}
                onChange={(e) => setForm((c) => ({ ...c, tag: e.target.value }))}
                placeholder="Diving, Camera, Travel, Clothing..."
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block font-body text-sm text-black/60">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                rows={3}
                placeholder="Why you love this gear, tips for using it..."
                className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean resize-none"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block font-body text-sm text-black/60">Link (Amazon, shop...)</span>
              <input
                value={form.link}
                onChange={(e) => setForm((c) => ({ ...c, link: e.target.value }))}
                type="url"
                placeholder="https://www.amazon.com/..."
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <label className="flex items-center gap-3 font-body text-sm text-black/65">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(e) => setForm((c) => ({ ...c, is_visible: e.target.checked }))}
                className="h-4 w-4 accent-ocean"
              />
              Visible on public page
            </label>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_200px] md:items-start">
            <div>
              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Image URL *</span>
                <input
                  value={form.image_url}
                  onChange={(e) => setForm((c) => ({ ...c, image_url: e.target.value }))}
                  required
                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => void handleImageUpload(e.target.files?.[0])}
                  className="font-body text-sm text-black/55 file:mr-4 file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-body file:text-sm file:text-white hover:file:bg-ocean-light"
                />
                {uploadingImage && (
                  <span className="font-body text-sm text-black/45">Uploading...</span>
                )}
              </div>

              <p className="mt-3 font-body text-xs leading-relaxed text-black/45">
                Recommended: 1200 × 1200 px (My Gear photo). JPG, PNG, WebP. Images are optimized before upload.
              </p>

              {uploadError && (
                <p className="mt-3 font-body text-sm text-red-700">{uploadError}</p>
              )}
            </div>

            <div className="aspect-square overflow-hidden bg-white">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt={form.name || 'Gear preview'}
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

          <div className="mt-7">
            <button type="submit" disabled={isSaving || uploadingImage} className="btn-ocean">
              <Plus className="h-4 w-4" />
              {isSaving ? 'Saving...' : editingId ? 'Save item' : 'Create item'}
            </button>
          </div>
        </form>

        {isLoading ? (
          <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">Loading...</p>
        ) : items.length === 0 ? (
          <div className="border border-black/10 bg-gray-50 p-8">
            <h2 className="mb-3 font-display text-3xl text-black">No gear yet</h2>
            <p className="font-body text-base leading-relaxed text-black/60">
              Create the first gear item and it will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 border border-black/10 bg-gray-50 p-4 font-body text-sm leading-relaxed text-black/55">
              Drag an item on desktop, or press and hold the handle on touch devices, to reorder.
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  data-gear-item-id={item.id}
                  draggable
                  onDragStart={() => setDraggedItemId(item.id)}
                  onDragEnd={() => setDraggedItemId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void handleDesktopDrop(item.id)}
                  className={`border bg-white transition-all ${
                    draggedItemId === item.id
                      ? 'border-ocean/60 opacity-55'
                      : touchTargetItemId === item.id
                        ? 'border-ocean/60 bg-sky-50'
                        : 'border-black/10 hover:border-ocean/35'
                  }`}
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-display text-xl text-black">{item.name}</h2>
                        {item.tag && (
                          <p className="mt-1 font-body text-xs uppercase tracking-[0.14em] text-ocean">
                            {item.tag}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onPointerDown={(e) => handleTouchReorderStart(item.id, e)}
                          onPointerMove={handleTouchReorderMove}
                          onPointerUp={(e) => void handleTouchReorderEnd(e)}
                          onPointerCancel={(e) => void handleTouchReorderEnd(e)}
                          className="touch-none text-black/30 transition-colors hover:text-ocean"
                          aria-label={`Reorder ${item.name}`}
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

                    {item.description && (
                      <p className="mb-3 font-body text-sm leading-relaxed text-black/60 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {item.link && (
                      <p className="mb-4 font-body text-xs text-black/35 truncate">{item.link}</p>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-black/50 transition-colors hover:text-ocean"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="text-black/45 transition-colors hover:text-red-700"
                        aria-label={`Delete ${item.name}`}
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
