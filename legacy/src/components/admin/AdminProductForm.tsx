'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminProductSavedSummary } from '@/components/admin/AdminProductSavedSummary';
import { uploadMediaFile } from '@/lib/adminMedia';
import {
  createEcommerceProduct,
  fetchAdminProduct,
  isProductSlugAvailable,
  permanentlyDeleteEcommerceProduct,
  updateEcommerceProduct,
  type AdminEcommerceProductDetail,
  type CreateEcommerceProductInput,
} from '@/lib/ecommerceProducts';
import { fetchAdminProviders } from '@/lib/ecommerceProviders';
import { getProviderPolicyMissingFields, isProviderSellable } from '@/lib/ecommerceProviderPolicy';
import type { EcommerceProvider } from '@/lib/ecommerceTypes';
import type { PodBaseProduct, PodVariant } from '@/lib/pod';
import {
  PRINT_FILE_UPLOAD_GUIDANCE,
  uploadPrintFile,
  validatePrintFileUpload,
} from '@/lib/printFileUpload';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';
import { deletePublicStorageObject } from '@/lib/storageObject';
import { createSlug } from '@/lib/slug';
import { supabase } from '@/lib/supabase';
import { formatShippingMode, type ShopCountry, type ShippingPriceMode } from '@/lib/shopShipping';
import {
  PRINTFUL_COST_REFERENCE_VERIFIED_AT,
  calculateStripeFeeCents,
  formatUsd,
} from '@/lib/ecommerceCostReference';

type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  retailPrice: string;
  shippingPriceMode: ShippingPriceMode;
  isActive: boolean;
};

type DesignFile = {
  placement: string;
  url: string;
};

type ExampleImage = {
  url: string;
  color: string;
  altText: string;
};

type ManualColor = {
  name: string;
  colorCode: string;
};

type ManualSizeGuideMeasurement = {
  length: string;
  shoulder: string;
  chest: string;
  sleeveLength: string;
};

type RequiredFieldName =
  | 'name'
  | 'retailPrice'
  | 'colors'
  | 'sizes'
  | 'manualCosts'
  | 'designFiles';

const emptyForm: ProductFormState = {
  name: '',
  slug: '',
  description: '',
  retailPrice: '',
  shippingPriceMode: 'included',
  isActive: false,
};

type ProviderShippingRateOption = {
  country_code: string;
  first_item_cents: number;
  additional_item_cents: number;
  currency: string;
  is_active: boolean;
};

type ProductShippingRateDraft = {
  useOverride: boolean;
  firstItem: string;
  additionalItem: string;
  sourceNote: string;
  verifiedAt: string;
};

const untouchedRequiredFields: Record<RequiredFieldName, boolean> = {
  name: false,
  retailPrice: false,
  colors: false,
  sizes: false,
  manualCosts: false,
  designFiles: false,
};

const PRINTFUL_CATALOG_PRODUCT_ID = 12;
const PRINT_PLACEMENTS = [
  {
    value: 'front',
    label: 'Front',
  },
  {
    value: 'back',
    label: 'Back',
  },
];
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

function dollarsToCents(value: string) {
  const normalized = value.trim().replace(',', '.');
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) <= 0) {
    throw new Error('Retail price must be greater than $0.');
  }

  return Math.round(amount * 100);
}

function getRetailPriceError(value: string) {
  if (!value.trim()) return 'Retail price is required.';

  const normalized = value.trim().replace(',', '.');
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) <= 0) {
    return 'Enter a retail price greater than $0.';
  }

  return '';
}

function getNonNegativeDollarError(value: string, fieldLabel: string) {
  if (!value.trim()) return `${fieldLabel} is required.`;

  const amount = Number(value.trim().replace(',', '.'));

  if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) < 0) {
    return `${fieldLabel} must be $0 or greater.`;
  }

  return '';
}

function getPositiveMeasurementError(value: string, fieldLabel: string) {
  if (!value.trim()) return `${fieldLabel} is required.`;

  const amount = Number(value.trim().replace(',', '.'));

  if (!Number.isFinite(amount) || amount <= 0) {
    return `${fieldLabel} must be greater than 0.`;
  }

  return '';
}

function dollarsToNonNegativeCents(value: string) {
  const amount = Number(value.trim().replace(',', '.'));

  if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) < 0) {
    throw new Error('Cost must be $0 or greater.');
  }

  return Math.round(amount * 100);
}

function centsToDollars(value: number | null | undefined) {
  return ((value ?? 0) / 100).toFixed(2);
}

function manualVariantKey(color: string, size: string) {
  return `${color}|||${size}`;
}

function sortSizes(sizes: string[]) {
  return [...sizes].sort((first, second) => {
    const firstIndex = SIZE_ORDER.indexOf(first.toUpperCase());
    const secondIndex = SIZE_ORDER.indexOf(second.toUpperCase());

    if (firstIndex !== -1 || secondIndex !== -1) {
      if (firstIndex === -1) return 1;
      if (secondIndex === -1) return -1;
      return firstIndex - secondIndex;
    }

    return first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function buildProductFiles(files: DesignFile[]) {
  const nextPositionByPlacement = new Map<string, number>();

  return files.map((file) => {
    const position = nextPositionByPlacement.get(file.placement) ?? 0;
    nextPositionByPlacement.set(file.placement, position + 1);

    return {
      placement: file.placement,
      file_url: file.url,
      provider_file_type: 'default',
      position,
    };
  });
}

function getProductSaveErrorMessage(error: unknown, action: 'create' | 'update') {
  const fallback = `Unable to ${action} product.`;

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const details = [record.message, record.details, record.hint, record.code]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ');

    return details || fallback;
  }

  return fallback;
}

type ProductSizeGuideData = {
  unit?: string | null;
  measurement_type?: string | null;
  guide?: unknown;
};

function normalizeMeasurementLabel(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stringifyMeasurementValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function parseManualSizeGuideMeasurements(
  sizeGuideData: ProductSizeGuideData
): Record<string, ManualSizeGuideMeasurement> {
  const guide = sizeGuideData.guide as {
    tables?: Array<{
      type?: string;
      unit?: string;
      measurements?: Array<{
        type_label?: string;
        values?: Array<{ size?: string; value?: unknown }>;
      }>;
    }>;
  };
  const expectedType = sizeGuideData.measurement_type ?? 'product_measure';
  const expectedUnit = sizeGuideData.unit ?? 'inches';
  const table =
    guide.tables?.find(
      (candidate) => candidate.type === expectedType && candidate.unit === expectedUnit
    ) ??
    guide.tables?.find((candidate) => candidate.type === expectedType) ??
    guide.tables?.[0];
  const nextMeasurements: Record<string, ManualSizeGuideMeasurement> = {};

  table?.measurements?.forEach((measurement) => {
    const label = normalizeMeasurementLabel(measurement.type_label);
    const field =
      label === 'length'
        ? 'length'
        : label === 'shoulder'
          ? 'shoulder'
          : label === 'chest'
            ? 'chest'
            : label === 'sleeve length'
              ? 'sleeveLength'
              : null;

    if (!field) return;

    measurement.values?.forEach((value) => {
      const size = value.size?.trim();
      if (!size) return;

      nextMeasurements[size] = {
        length: nextMeasurements[size]?.length ?? '',
        shoulder: nextMeasurements[size]?.shoulder ?? '',
        chest: nextMeasurements[size]?.chest ?? '',
        sleeveLength: nextMeasurements[size]?.sleeveLength ?? '',
        [field]: stringifyMeasurementValue(value.value),
      };
    });
  });

  return nextMeasurements;
}

export function AdminProductForm({ id, copyFromId }: { id?: string; copyFromId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(id);
  const isCopying = Boolean(copyFromId) && !isEditing;
  const originalExampleImagesRef = useRef<ExampleImage[]>([]);
  const originalDesignFileUrlsRef = useRef<string[]>([]);
  const originalSlugRef = useRef('');
  const currencyRef = useRef('USD');
  const providerMetaRef = useRef<Record<string, unknown>>({});
  const providerPrintProviderIdRef = useRef<number | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [isSlugUnlocked, setIsSlugUnlocked] = useState(!isEditing);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(isEditing);
  const [exampleImages, setExampleImages] = useState<ExampleImage[]>([]);
  const [designFiles, setDesignFiles] = useState<DesignFile[]>([]);
  const [designPlacement, setDesignPlacement] = useState('front');
  const [designWarnings, setDesignWarnings] = useState<string[]>([]);
  const [podProduct, setPodProduct] = useState<PodBaseProduct | null>(null);
  const [providers, setProviders] = useState<EcommerceProvider[]>([]);
  const [shopCountries, setShopCountries] = useState<ShopCountry[]>([]);
  const [providerShippingRates, setProviderShippingRates] = useState<ProviderShippingRateOption[]>([]);
  const [selectedProviderCode, setSelectedProviderCode] = useState('printful');
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>(['US']);
  const [productShippingRates, setProductShippingRates] = useState<
    Record<string, ProductShippingRateDraft>
  >({});
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [manualColors, setManualColors] = useState<ManualColor[]>([]);
  const [manualColorName, setManualColorName] = useState('');
  const [manualColorCode, setManualColorCode] = useState('#000000');
  const [manualSizeName, setManualSizeName] = useState('');
  const [manualVariantCosts, setManualVariantCosts] = useState<Record<string, string>>({});
  const [sizeGuideUnit, setSizeGuideUnit] = useState<'inches' | 'cm'>('inches');
  const [sizeGuideBaseGarmentName, setSizeGuideBaseGarmentName] = useState('');
  const [sizeGuideBaseGarmentIdentifier, setSizeGuideBaseGarmentIdentifier] = useState('');
  const [sizeGuideTolerance, setSizeGuideTolerance] = useState('');
  const [sizeGuideSource, setSizeGuideSource] = useState('');
  const [sizeGuideVerifiedAt, setSizeGuideVerifiedAt] = useState('');
  const [sizeGuideNoPublishedMeasurements, setSizeGuideNoPublishedMeasurements] = useState(false);
  const [sizeGuideMeasurements, setSizeGuideMeasurements] = useState<
    Record<string, ManualSizeGuideMeasurement>
  >({});
  const [isLoadingVariants, setIsLoadingVariants] = useState(true);
  const [isUploadingExample, setIsUploadingExample] = useState(false);
  const [isUploadingDesign, setIsUploadingDesign] = useState(false);
  const [deletingFileUrls, setDeletingFileUrls] = useState<string[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditing || isCopying);
  const [savedProductDetail, setSavedProductDetail] =
    useState<AdminEcommerceProductDetail | null>(null);
  const [copiedFromProductName, setCopiedFromProductName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [deleteProductConfirmation, setDeleteProductConfirmation] = useState('');
  const [deleteProductError, setDeleteProductError] = useState('');
  const [touchedRequiredFields, setTouchedRequiredFields] = useState(untouchedRequiredFields);
  const [errorMessage, setErrorMessage] = useState('');
  const [variantErrorMessage, setVariantErrorMessage] = useState('');
  const [providerErrorMessage, setProviderErrorMessage] = useState('');
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  const applySizeGuideFromProduct = async (productId: string, isMounted: () => boolean) => {
    if (!supabase) return;

    const { data: sizeGuideData } = await supabase
      .from('product_size_guides')
      .select(
        'unit,measurement_type,tolerance,source_url,source_note,source_checked_at,guide,no_published_measurements,base_garment_name,base_garment_provider_identifier'
      )
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('source_checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!isMounted() || !sizeGuideData) return;

    setSizeGuideUnit(sizeGuideData.unit === 'cm' ? 'cm' : 'inches');
    setSizeGuideBaseGarmentName(sizeGuideData.base_garment_name ?? '');
    setSizeGuideBaseGarmentIdentifier(sizeGuideData.base_garment_provider_identifier ?? '');
    setSizeGuideTolerance(sizeGuideData.tolerance ?? '');
    setSizeGuideSource(sizeGuideData.source_url || sizeGuideData.source_note || '');
    setSizeGuideVerifiedAt(sizeGuideData.source_checked_at?.slice(0, 10) ?? '');
    setSizeGuideNoPublishedMeasurements(Boolean(sizeGuideData.no_published_measurements));
    setSizeGuideMeasurements(parseManualSizeGuideMeasurements(sizeGuideData));
  };

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadProduct() {
      setIsLoadingProduct(true);
      setLoadErrorMessage('');

      try {
        const detail = await fetchAdminProduct(id as string);

        if (!isMounted) return;

        const selectedVariants = detail.variants.filter((variant) => variant.is_active);
        const nextManualColors = [
          ...new Map(
            selectedVariants.map((variant) => [
              variant.color,
              {
                name: variant.color,
                colorCode: variant.color_code || '#000000',
              },
            ])
          ).values(),
        ];
        const nextManualVariantCosts = selectedVariants.reduce<Record<string, string>>(
          (current, variant) => ({
            ...current,
            [manualVariantKey(variant.color, variant.size)]: (
              variant.provider_base_cost_cents / 100
            ).toFixed(2),
          }),
          {}
        );
        const nextExampleImages =
          detail.images.length > 0
            ? detail.images.map((image) => ({
                url: image.image_url,
                color: image.color ?? '',
                altText: image.alt_text || detail.product.name,
              }))
            : detail.product.example_images.map((url) => ({
                url,
                color: '',
                altText: detail.product.name,
              }));
        const nextDesignFiles = detail.files.map((file) => ({
          placement: file.placement,
          url: file.file_url,
        }));
        const loadedSlug = detail.product.slug || createSlug(detail.product.name);

        setForm({
          name: detail.product.name,
          slug: loadedSlug,
          description: detail.product.description,
          retailPrice: (detail.product.retail_price_cents / 100).toFixed(2),
          shippingPriceMode: detail.product.shipping_price_mode ?? 'included',
          isActive: detail.product.is_active,
        });
        setExampleImages(nextExampleImages);
        setDesignFiles(nextDesignFiles);
        setSelectedColors([
          ...new Set(selectedVariants.map((variant) => variant.color)),
        ]);
        setSelectedSizes(sortSizes([...new Set(selectedVariants.map((variant) => variant.size))]));
        setManualColors(nextManualColors);
        setManualVariantCosts(nextManualVariantCosts);
        setSavedProductDetail(detail);
        setSelectedProviderCode(detail.product.provider);
        setSelectedCountryCodes(
          detail.enabledCountries
            .filter((country) => country.is_enabled)
            .map((country) => country.country_code)
        );
        setProductShippingRates(
          detail.shippingRates.reduce<Record<string, ProductShippingRateDraft>>((current, rate) => {
            if (!rate.is_active) return current;

            return {
              ...current,
              [rate.country_code]: {
                useOverride: true,
                firstItem: centsToDollars(rate.first_item_cents),
                additionalItem: centsToDollars(rate.additional_item_cents),
                sourceNote: rate.source_note ?? '',
                verifiedAt: rate.verified_at ?? '',
              },
            };
          }, {})
        );
        setTouchedRequiredFields(untouchedRequiredFields);
        setIsSlugManuallyEdited(true);

        originalExampleImagesRef.current = nextExampleImages;
        originalDesignFileUrlsRef.current = nextDesignFiles.map((file) => file.url);
        originalSlugRef.current = loadedSlug;
        currencyRef.current = detail.product.currency;
        providerMetaRef.current = detail.product.provider_meta;
        providerPrintProviderIdRef.current = detail.product.provider_print_provider_id;

        if (supabase) {
          const { data: sizeGuideData } = await supabase
            .from('product_size_guides')
            .select(
              'unit,measurement_type,tolerance,source_url,source_note,source_checked_at,guide,no_published_measurements,base_garment_name,base_garment_provider_identifier'
            )
            .eq('product_id', detail.product.id)
            .eq('is_active', true)
            .order('source_checked_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (isMounted && sizeGuideData) {
            setSizeGuideUnit(sizeGuideData.unit === 'cm' ? 'cm' : 'inches');
            setSizeGuideBaseGarmentName(sizeGuideData.base_garment_name ?? '');
            setSizeGuideBaseGarmentIdentifier(
              sizeGuideData.base_garment_provider_identifier ?? ''
            );
            setSizeGuideTolerance(sizeGuideData.tolerance ?? '');
            setSizeGuideSource(sizeGuideData.source_url || sizeGuideData.source_note || '');
            setSizeGuideVerifiedAt(sizeGuideData.source_checked_at?.slice(0, 10) ?? '');
            setSizeGuideNoPublishedMeasurements(
              Boolean(sizeGuideData.no_published_measurements)
            );
            setSizeGuideMeasurements(parseManualSizeGuideMeasurements(sizeGuideData));
          }
        }
      } catch (error) {
        if (isMounted) {
          setLoadErrorMessage(
            error instanceof Error ? error.message : 'Unable to load this product.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingProduct(false);
        }
      }
    }

    void loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!copyFromId || isEditing) return;

    let isMounted = true;

    async function loadCopiedProduct() {
      setIsLoadingProduct(true);
      setLoadErrorMessage('');

      try {
        const detail = await fetchAdminProduct(copyFromId as string);

        if (!isMounted) return;

        const sourceVariants = detail.variants.filter((variant) => variant.is_active);
        const nextManualColors = [
          ...new Map(
            sourceVariants.map((variant) => [
              variant.color,
              {
                name: variant.color,
                colorCode: variant.color_code || '#000000',
              },
            ])
          ).values(),
        ];
        const nextManualVariantCosts = sourceVariants.reduce<Record<string, string>>(
          (current, variant) => ({
            ...current,
            [manualVariantKey(variant.color, variant.size)]: (
              variant.provider_base_cost_cents / 100
            ).toFixed(2),
          }),
          {}
        );

        setForm({
          name: '',
          slug: '',
          description: '',
          retailPrice: (detail.product.retail_price_cents / 100).toFixed(2),
          shippingPriceMode: detail.product.shipping_price_mode ?? 'included',
          isActive: false,
        });
        setExampleImages([]);
        setDesignFiles([]);
        setSelectedColors([...new Set(sourceVariants.map((variant) => variant.color))]);
        setSelectedSizes(sortSizes([...new Set(sourceVariants.map((variant) => variant.size))]));
        setManualColors(nextManualColors);
        setManualVariantCosts(nextManualVariantCosts);
        setSavedProductDetail(null);
        setCopiedFromProductName(detail.product.name);
        setSelectedProviderCode(detail.product.provider);
        setSelectedCountryCodes(
          detail.enabledCountries
            .filter((country) => country.is_enabled)
            .map((country) => country.country_code)
        );
        setProductShippingRates(
          detail.shippingRates.reduce<Record<string, ProductShippingRateDraft>>((current, rate) => {
            if (!rate.is_active) return current;

            return {
              ...current,
              [rate.country_code]: {
                useOverride: true,
                firstItem: centsToDollars(rate.first_item_cents),
                additionalItem: centsToDollars(rate.additional_item_cents),
                sourceNote: rate.source_note ?? '',
                verifiedAt: rate.verified_at ?? '',
              },
            };
          }, {})
        );
        setTouchedRequiredFields(untouchedRequiredFields);
        setIsSlugUnlocked(true);
        setIsSlugManuallyEdited(false);
        setUploadMessage('');

        originalExampleImagesRef.current = [];
        originalDesignFileUrlsRef.current = [];
        originalSlugRef.current = '';
        currencyRef.current = detail.product.currency;
        providerMetaRef.current = detail.product.provider_meta;
        providerPrintProviderIdRef.current = detail.product.provider_print_provider_id;

        await applySizeGuideFromProduct(detail.product.id, () => isMounted);
      } catch (error) {
        if (isMounted) {
          setLoadErrorMessage(
            error instanceof Error ? error.message : 'Unable to load product to copy.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingProduct(false);
        }
      }
    }

    void loadCopiedProduct();

    return () => {
      isMounted = false;
    };
  }, [copyFromId, isEditing]);

  useEffect(() => {
    let isMounted = true;

    async function loadShippingConfig() {
      if (!supabase) return;

      try {
        const [countriesResult, ratesResult] = await Promise.all([
          supabase
            .from('ecommerce_shop_countries')
            .select('code,name,is_enabled,requires_legal_review,legal_review_note,admin_note')
            .order('name', { ascending: true }),
          supabase
            .from('ecommerce_provider_shipping_rates')
            .select('country_code,first_item_cents,additional_item_cents,currency,is_active')
            .eq('provider', selectedProviderCode)
            .eq('is_active', true),
        ]);

        if (countriesResult.error) throw countriesResult.error;
        if (ratesResult.error) throw ratesResult.error;

        if (isMounted) {
          setShopCountries((countriesResult.data ?? []) as ShopCountry[]);
          setProviderShippingRates((ratesResult.data ?? []) as ProviderShippingRateOption[]);
        }
      } catch (error) {
        if (isMounted) {
          setProviderErrorMessage(
            error instanceof Error ? error.message : 'Unable to load provider shipping rates.'
          );
        }
      }
    }

    void loadShippingConfig();

    return () => {
      isMounted = false;
    };
  }, [selectedProviderCode]);

  useEffect(() => {
    let isMounted = true;

    async function loadProviders() {
      try {
        const nextProviders = await fetchAdminProviders();
        if (isMounted) {
          setProviders(nextProviders);
          const currentProvider = nextProviders.find(
            (provider) => provider.code === selectedProviderCode
          );
          if (!isEditing && !isCopying && (!currentProvider || !isProviderSellable(currentProvider))) {
            const firstSellableProvider = nextProviders.find(isProviderSellable);
            if (firstSellableProvider) {
              setSelectedProviderCode(firstSellableProvider.code);
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          setProviderErrorMessage(
            error instanceof Error ? error.message : 'Unable to load ecommerce providers.'
          );
        }
      }
    }

    void loadProviders();

    return () => {
      isMounted = false;
    };
  }, [isCopying, isEditing, selectedProviderCode]);

  useEffect(() => {
    let isMounted = true;

    async function loadPodVariants() {
      setIsLoadingVariants(true);
      setVariantErrorMessage('');

      try {
        if (selectedProviderCode !== 'printful') {
          setPodProduct(null);
          setIsLoadingVariants(false);
          return;
        }

        if (!supabase) {
          throw new Error('Supabase is not configured.');
        }

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          throw new Error('Admin session is missing. Sign in again and retry.');
        }

        const response = await fetch(
          `/api/admin/pod/variants?provider=printful&catalogProductId=${PRINTFUL_CATALOG_PRODUCT_ID}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const payload = (await response.json().catch(() => null)) as {
          product?: PodBaseProduct;
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Unable to load POD variants.');
        }

        if (!payload?.product) {
          throw new Error('The POD variants response was missing product data.');
        }

        if (isMounted) {
          setPodProduct(payload.product);
        }
      } catch (error) {
        if (isMounted) {
          setVariantErrorMessage(
            error instanceof Error ? error.message : 'Unable to load POD variants.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingVariants(false);
        }
      }
    }

    void loadPodVariants();

    return () => {
      isMounted = false;
    };
  }, [selectedProviderCode]);

  const selectedProvider = providers.find((provider) => provider.code === selectedProviderCode);
  const isManualProvider = selectedProvider?.fulfillment_mode === 'manual';
  const selectedProviderMissingFields = selectedProvider
    ? getProviderPolicyMissingFields(selectedProvider)
    : [];
  const selectedProviderSellable = selectedProvider ? isProviderSellable(selectedProvider) : false;
  const providerShippingRatesByCountry = new Map(
    providerShippingRates.map((rate) => [rate.country_code, rate])
  );
  const providerShippingCountries = new Set(selectedProvider?.shipping_countries ?? []);
  const eligibleCountries = shopCountries.filter(
    (country) =>
      country.is_enabled &&
      !country.requires_legal_review &&
      providerShippingCountries.has(country.code) &&
      providerShippingRatesByCountry.has(country.code)
  );
  const selectedCountryError =
    selectedCountryCodes.length > 0
      ? ''
      : 'Enable at least one country with a known shipping rate before activating this product.';
  const getEffectiveShippingRate = (countryCode: string) => {
    const productRate = productShippingRates[countryCode];
    const providerRate = providerShippingRatesByCountry.get(countryCode);

    if (productRate?.useOverride) {
      try {
        return {
          first_item_cents: dollarsToNonNegativeCents(productRate.firstItem),
          additional_item_cents: dollarsToNonNegativeCents(productRate.additionalItem),
          currency: currencyRef.current,
          rate_source: 'product' as const,
        };
      } catch {
        return null;
      }
    }

    return providerRate
      ? {
          first_item_cents: providerRate.first_item_cents,
          additional_item_cents: providerRate.additional_item_cents,
          currency: providerRate.currency,
          rate_source: 'provider' as const,
        }
      : null;
  };
  const firstSelectedShippingRate = selectedCountryCodes
    .map((countryCode) => getEffectiveShippingRate(countryCode))
    .find(Boolean);
  const productShippingRateErrors = selectedCountryCodes.flatMap((countryCode) => {
    const draft = productShippingRates[countryCode];
    if (!draft?.useOverride) return [];

    return [
      getNonNegativeDollarError(draft.firstItem, `${countryCode} first item shipping`),
      getNonNegativeDollarError(draft.additionalItem, `${countryCode} additional item shipping`),
    ].filter(Boolean);
  });
  const selectedVariantCount = useMemo(() => {
    if (isManualProvider) {
      return selectedColors.length * selectedSizes.length;
    }

    if (!podProduct) return 0;

    return podProduct.variants.filter(
      (variant) =>
        selectedColors.includes(variant.color) &&
        selectedSizes.includes(variant.size) &&
        variant.availableUS
    ).length;
  }, [isManualProvider, podProduct, selectedColors, selectedSizes]);

  const podProductSizes = useMemo(() => sortSizes(podProduct?.sizes ?? []), [podProduct]);
  const selectedCombinationCount = selectedColors.length * selectedSizes.length;
  const unavailableSelectedCombinationCount = selectedCombinationCount - selectedVariantCount;

  const selectedVariants = useMemo(() => {
    if (isManualProvider) return [];
    if (!podProduct) return [];

    return selectedColors.flatMap((color) =>
      selectedSizes.map((size) => podProduct.variants.find(
        (variant) => variant.color === color && variant.size === size
      ))
    ).filter((variant): variant is PodVariant => Boolean(variant));
  }, [isManualProvider, podProduct, selectedColors, selectedSizes]);

  const manualCostErrors = useMemo(() => {
    if (!isManualProvider) return [];

    return selectedColors.flatMap((color) =>
      selectedSizes
        .map((size) => ({
          color,
          size,
          error: getNonNegativeDollarError(
            manualVariantCosts[manualVariantKey(color, size)] ?? '',
            `${color} / ${size} base cost`
          ),
        }))
        .filter((item) => item.error)
    );
  }, [isManualProvider, manualVariantCosts, selectedColors, selectedSizes]);

  const manualSizeGuideErrors = useMemo(() => {
    if (!isManualProvider || !form.isActive) return [];

    const errors: string[] = [];
    if (!sizeGuideSource.trim()) errors.push('Enter the source for the size guide.');
    if (!sizeGuideVerifiedAt) errors.push('Enter the date Katie verified the size guide.');
    if (sizeGuideNoPublishedMeasurements) {
      errors.push('This product cannot be active until Katie has published garment measurements for every active size.');
      return errors;
    }

    if (!sizeGuideBaseGarmentName.trim()) {
      errors.push('Enter the exact base garment name these measurements belong to.');
    } else if (sizeGuideBaseGarmentName.trim().length > 160) {
      errors.push('Base garment name must be 160 characters or fewer.');
    }
    if (!sizeGuideBaseGarmentIdentifier.trim()) {
      errors.push('Enter the provider style, SKU, or product identifier for that base garment.');
    } else if (sizeGuideBaseGarmentIdentifier.trim().length > 120) {
      errors.push('Provider style / SKU must be 120 characters or fewer.');
    }
    if (!sizeGuideTolerance.trim()) errors.push('Enter the declared measurement tolerance.');

    selectedSizes.forEach((size) => {
      const measurement = sizeGuideMeasurements[size];
      const measurementErrors = [
        getPositiveMeasurementError(measurement?.length ?? '', `${size} Length`),
        getPositiveMeasurementError(measurement?.shoulder ?? '', `${size} Shoulder`),
        getPositiveMeasurementError(measurement?.chest ?? '', `${size} Chest`),
        getPositiveMeasurementError(measurement?.sleeveLength ?? '', `${size} Sleeve length`),
      ].filter(Boolean);

      errors.push(...measurementErrors);
    });

    return errors;
  }, [
    form.isActive,
    isManualProvider,
    selectedSizes,
    sizeGuideBaseGarmentIdentifier,
    sizeGuideBaseGarmentName,
    sizeGuideMeasurements,
    sizeGuideNoPublishedMeasurements,
    sizeGuideSource,
    sizeGuideTolerance,
    sizeGuideVerifiedAt,
  ]);

  const hasManualSizeGuideDraft = useMemo(() => {
    if (!isManualProvider) return false;
    return (
      Boolean(sizeGuideTolerance.trim()) ||
      Boolean(sizeGuideBaseGarmentName.trim()) ||
      Boolean(sizeGuideBaseGarmentIdentifier.trim()) ||
      Boolean(sizeGuideSource.trim()) ||
      Boolean(sizeGuideVerifiedAt) ||
      sizeGuideNoPublishedMeasurements ||
      Object.values(sizeGuideMeasurements).some(
        (measurement) =>
          Boolean(measurement.length.trim()) ||
          Boolean(measurement.shoulder.trim()) ||
          Boolean(measurement.chest.trim()) ||
          Boolean(measurement.sleeveLength.trim())
      )
    );
  }, [
    isManualProvider,
    sizeGuideMeasurements,
    sizeGuideBaseGarmentIdentifier,
    sizeGuideBaseGarmentName,
    sizeGuideNoPublishedMeasurements,
    sizeGuideSource,
    sizeGuideTolerance,
    sizeGuideVerifiedAt,
  ]);

  const manualSizeGuideDraftErrors = useMemo(() => {
    if (!isManualProvider || !hasManualSizeGuideDraft) return [];

    const errors: string[] = [];
    if (!sizeGuideSource.trim()) errors.push('Enter the source for the size guide.');
    if (!sizeGuideVerifiedAt) errors.push('Enter the date Katie verified the size guide.');

    if (sizeGuideNoPublishedMeasurements) return errors;

    if (!sizeGuideBaseGarmentName.trim()) {
      errors.push('Enter the exact base garment name these measurements belong to.');
    } else if (sizeGuideBaseGarmentName.trim().length > 160) {
      errors.push('Base garment name must be 160 characters or fewer.');
    }
    if (!sizeGuideBaseGarmentIdentifier.trim()) {
      errors.push('Enter the provider style, SKU, or product identifier for that base garment.');
    } else if (sizeGuideBaseGarmentIdentifier.trim().length > 120) {
      errors.push('Provider style / SKU must be 120 characters or fewer.');
    }
    if (!sizeGuideTolerance.trim()) errors.push('Enter the declared measurement tolerance.');

    selectedSizes.forEach((size) => {
      const measurement = sizeGuideMeasurements[size];
      const measurementErrors = [
        getPositiveMeasurementError(measurement?.length ?? '', `${size} Length`),
        getPositiveMeasurementError(measurement?.shoulder ?? '', `${size} Shoulder`),
        getPositiveMeasurementError(measurement?.chest ?? '', `${size} Chest`),
        getPositiveMeasurementError(measurement?.sleeveLength ?? '', `${size} Sleeve length`),
      ].filter(Boolean);

      errors.push(...measurementErrors);
    });

    return errors;
  }, [
    hasManualSizeGuideDraft,
    isManualProvider,
    selectedSizes,
    sizeGuideBaseGarmentIdentifier,
    sizeGuideBaseGarmentName,
    sizeGuideMeasurements,
    sizeGuideNoPublishedMeasurements,
    sizeGuideSource,
    sizeGuideTolerance,
    sizeGuideVerifiedAt,
  ]);

  const nameError = form.name.trim() ? '' : 'Product name is required.';
  const slugError = form.slug.trim()
    ? /^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())
      ? ''
      : 'Use lowercase letters, numbers, and hyphens only.'
    : 'Slug is required.';
  const retailPriceError = getRetailPriceError(form.retailPrice);
  const colorsError = selectedColors.length > 0 ? '' : 'Select at least one color.';
  const sizesError = selectedSizes.length > 0 ? '' : 'Select at least one size.';
  const designFilesError =
    designFiles.length > 0 ? '' : 'Upload at least one print-ready design PNG.';
  const exampleImagesAltError =
    exampleImages.length > 0 && exampleImages.some((image) => !image.altText.trim())
      ? 'Add alt text for every example photo.'
      : '';
  const variantsError =
    isManualProvider
      ? manualCostErrors.length > 0
        ? `Enter a base cost for every manual color/size variant. Missing: ${manualCostErrors
            .slice(0, 4)
            .map((item) => `${item.color} / ${item.size}`)
            .join(', ')}${manualCostErrors.length > 4 ? `, and ${manualCostErrors.length - 4} more` : ''}.`
        : ''
      : selectedColors.length > 0 && selectedSizes.length > 0 && selectedVariants.length === 0
        ? 'The selected colors and sizes do not form a valid catalog variant.'
        : '';
  const liveMarginRows = useMemo(() => {
    if (retailPriceError || selectedColors.length === 0 || selectedSizes.length === 0) return [];

    let retailPriceCents = 0;
    try {
      retailPriceCents = dollarsToCents(form.retailPrice);
    } catch {
      return [];
    }

    const stripeFeeCents = calculateStripeFeeCents(
      form.shippingPriceMode === 'separate' && firstSelectedShippingRate
        ? retailPriceCents + firstSelectedShippingRate.first_item_cents
        : retailPriceCents
    );

    if (isManualProvider) {
      return selectedColors.flatMap((color) =>
        selectedSizes.map((size) => {
          let baseCostCents = 0;
          try {
            baseCostCents = dollarsToNonNegativeCents(
              manualVariantCosts[manualVariantKey(color, size)] ?? ''
            );
          } catch {
            return null;
          }

          const includedShippingCents =
            form.shippingPriceMode === 'included'
              ? firstSelectedShippingRate?.first_item_cents ?? null
              : 0;
          if (includedShippingCents === null) return null;

          return {
            label: `${color} / ${size}`,
            marginCents: retailPriceCents - baseCostCents - includedShippingCents - stripeFeeCents,
          };
        })
      ).filter((row): row is { label: string; marginCents: number } => Boolean(row));
    }

    return selectedVariants.map((variant) => {
      const includedShippingCents =
        form.shippingPriceMode === 'included'
          ? firstSelectedShippingRate?.first_item_cents ?? 0
          : 0;
      return {
        label: `${variant.color} / ${variant.size}`,
        marginCents:
          retailPriceCents -
          variant.baseCostCents -
          includedShippingCents -
          stripeFeeCents,
      };
    });
  }, [
    firstSelectedShippingRate,
    form.retailPrice,
    form.shippingPriceMode,
    isManualProvider,
    manualVariantCosts,
    retailPriceError,
    selectedColors,
    selectedSizes,
    selectedVariants,
  ]);
  const providerRequirementsError =
    selectedProvider && !selectedProviderSellable
    ? selectedProvider.fulfillment_mode === 'api' && !selectedProvider.api_fulfillment_enabled
      ? `${selectedProvider.name} is blocked for production because API fulfillment is not enabled yet. Manual providers are the only production path for now.`
      : `Complete provider requirements before selling with ${selectedProvider.name}. Missing: ${selectedProviderMissingFields.join(', ') || 'provider is inactive'}.`
      : '';
  const providerCreateError =
    selectedProvider && !selectedProviderSellable
      ? `${selectedProvider.name} cannot be used for new products right now.`
      : '';
  const activationError =
    form.isActive && providerRequirementsError
      ? 'Product cannot be active until its provider is complete and sellable.'
      : form.isActive && selectedCountryError
        ? selectedCountryError
      : form.isActive && productShippingRateErrors.length > 0
        ? productShippingRateErrors[0]
      : form.isActive && manualSizeGuideErrors.length > 0
        ? manualSizeGuideErrors[0]
      : '';
  const isFormValid =
    !nameError &&
    !slugError &&
    !retailPriceError &&
    !colorsError &&
    !sizesError &&
    !designFilesError &&
    !exampleImagesAltError &&
    !variantsError &&
    productShippingRateErrors.length === 0 &&
    !providerCreateError &&
    !activationError;
  const missingRequirements = [
    nameError && 'product name',
    slugError && 'slug',
    retailPriceError && 'price above $0',
    colorsError && 'color',
    sizesError && 'size',
    variantsError && isManualProvider && 'manual variant cost',
    exampleImagesAltError && 'alt text for every example photo',
    designFilesError && 'print design',
    variantsError && !isManualProvider && 'valid color/size combination',
    (providerCreateError || (form.isActive && providerRequirementsError)) && 'sellable provider',
    productShippingRateErrors.length > 0 && 'product shipping rate',
    form.isActive && manualSizeGuideErrors.length > 0 && 'manual size guide',
    selectedCountryError && 'shipping destination',
  ].filter(Boolean) as string[];
  const isDeletingFile = deletingFileUrls.length > 0;

  const touchRequiredField = (field: RequiredFieldName) => {
    setTouchedRequiredFields((current) => ({ ...current, [field]: true }));
  };

  const updateForm = <Field extends keyof ProductFormState>(
    field: Field,
    value: ProductFormState[Field]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleCountry = (countryCode: string) => {
    setSelectedCountryCodes((current) =>
      current.includes(countryCode)
        ? current.filter((candidate) => candidate !== countryCode)
        : [...current, countryCode]
    );
  };

  const updateProductShippingRate = (
    countryCode: string,
    patch: Partial<ProductShippingRateDraft>
  ) => {
    setProductShippingRates((current) => {
      const providerRate = providerShippingRatesByCountry.get(countryCode);
      const currentDraft = current[countryCode] ?? {
        useOverride: false,
        firstItem: centsToDollars(providerRate?.first_item_cents),
        additionalItem: centsToDollars(providerRate?.additional_item_cents),
        sourceNote: '',
        verifiedAt: '',
      };

      return {
        ...current,
        [countryCode]: {
          ...currentDraft,
          ...patch,
        },
      };
    });
  };

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug:
        isSlugManuallyEdited || (isEditing && !isSlugUnlocked)
          ? current.slug
          : createSlug(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setIsSlugManuallyEdited(true);
    updateForm('slug', createSlug(value));
  };

  const toggleColor = (color: string) => {
    touchRequiredField('colors');
    setSelectedColors((current) =>
      current.includes(color)
        ? current.filter((candidate) => candidate !== color)
        : [...current, color]
    );
  };

  const toggleSize = (size: string) => {
    touchRequiredField('sizes');
    setSelectedSizes((current) =>
      current.includes(size)
        ? sortSizes(current.filter((candidate) => candidate !== size))
        : sortSizes([...current, size])
    );
  };

  const addManualColor = () => {
    const name = manualColorName.trim();
    const colorCode = manualColorCode.trim();

    if (!name || !/^#[0-9A-Fa-f]{6}$/.test(colorCode)) return;

    touchRequiredField('colors');
    setManualColors((current) => {
      if (current.some((color) => color.name.toLowerCase() === name.toLowerCase())) {
        return current;
      }

      return [...current, { name, colorCode }];
    });
    setSelectedColors((current) => (current.includes(name) ? current : [...current, name]));
    setManualColorName('');
    setManualColorCode('#000000');
  };

  const removeManualColor = (colorName: string) => {
    touchRequiredField('colors');
    setManualColors((current) => current.filter((color) => color.name !== colorName));
    setSelectedColors((current) => current.filter((color) => color !== colorName));
    setManualVariantCosts((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(`${colorName}|||`))
      )
    );
  };

  const addManualSize = () => {
    const size = manualSizeName.trim().toUpperCase();
    if (!size) return;

    touchRequiredField('sizes');
    setSelectedSizes((current) => (current.includes(size) ? current : sortSizes([...current, size])));
    setManualSizeName('');
  };

  const removeManualSize = (size: string) => {
    touchRequiredField('sizes');
    setSelectedSizes((current) => sortSizes(current.filter((candidate) => candidate !== size)));
    setManualVariantCosts((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.endsWith(`|||${size}`))
      )
    );
  };

  const updateManualVariantCost = (color: string, size: string, value: string) => {
    touchRequiredField('manualCosts');
    setManualVariantCosts((current) => ({
      ...current,
      [manualVariantKey(color, size)]: value,
    }));
  };

  const getManualProductVariants = () =>
    selectedColors.flatMap((color) => {
      const manualColor = manualColors.find((candidate) => candidate.name === color);

      return selectedSizes.map((size) => ({
        color,
        color_code: manualColor?.colorCode ?? '',
        size,
        provider_variant_id: null,
        provider_base_cost_cents: dollarsToNonNegativeCents(
          manualVariantCosts[manualVariantKey(color, size)] ?? ''
        ),
        available_us: true,
        is_active: true,
      }));
    });

  const saveManualSizeGuide = async (productId: string, slug: string) => {
    if (!isManualProvider || !hasManualSizeGuideDraft || !supabase) return;
    if (manualSizeGuideDraftErrors.length > 0) {
      throw new Error(manualSizeGuideDraftErrors[0]);
    }

    const checkedAt = new Date(`${sizeGuideVerifiedAt}T00:00:00Z`);
    if (Number.isNaN(checkedAt.getTime())) {
      throw new Error('Enter the date Katie verified the size guide.');
    }

    const timestamp = new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')
      .replaceAll('T', '')
      .replaceAll('Z', '')
      .slice(0, 17);
    const version = `${slug}-size-guide-${timestamp}`;
    const table = {
      type: 'product_measure',
      unit: sizeGuideUnit,
      description: `Measurements are for ${sizeGuideBaseGarmentName.trim()} (${sizeGuideBaseGarmentIdentifier.trim()}). ${sizeGuideTolerance.trim()}`,
      measurements: [
        {
          type_label: 'Length',
          values: selectedSizes.map((size) => ({
            size,
            value: sizeGuideMeasurements[size]?.length ?? '',
          })),
        },
        {
          type_label: 'Shoulder',
          values: selectedSizes.map((size) => ({
            size,
            value: sizeGuideMeasurements[size]?.shoulder ?? '',
          })),
        },
        {
          type_label: 'Chest',
          values: selectedSizes.map((size) => ({
            size,
            value: sizeGuideMeasurements[size]?.chest ?? '',
          })),
        },
        {
          type_label: 'Sleeve length',
          values: selectedSizes.map((size) => ({
            size,
            value: sizeGuideMeasurements[size]?.sleeveLength ?? '',
          })),
        },
      ],
    };
    const guide = sizeGuideNoPublishedMeasurements ? { tables: [] } : { tables: [table] };

    const { error: insertError } = await supabase.from('product_size_guides').insert({
      product_id: productId,
      version,
      unit: sizeGuideUnit,
      measurement_type: 'product_measure',
      title: `${sizeGuideBaseGarmentName.trim() || form.name.trim()} garment measurements`,
      base_garment_name: sizeGuideNoPublishedMeasurements
        ? ''
        : sizeGuideBaseGarmentName.trim(),
      base_garment_provider_identifier: sizeGuideNoPublishedMeasurements
        ? ''
        : sizeGuideBaseGarmentIdentifier.trim(),
      tolerance: sizeGuideNoPublishedMeasurements ? '' : sizeGuideTolerance.trim(),
      source_url: sizeGuideSource.startsWith('http') ? sizeGuideSource.trim() : '',
      source_note: sizeGuideSource.startsWith('http') ? '' : sizeGuideSource.trim(),
      source_checked_at: `${sizeGuideVerifiedAt}T00:00:00Z`,
      guide,
      no_published_measurements: sizeGuideNoPublishedMeasurements,
      is_active: true,
    });

    if (insertError) throw insertError;

    const { error: deactivateError } = await supabase
      .from('product_size_guides')
      .update({ is_active: false })
      .eq('product_id', productId)
      .neq('version', version);

    if (deactivateError) throw deactivateError;
  };

  const getSelectedCombination = (color: string, size: string) => {
    return podProduct?.variants.find(
      (variant) => variant.color === color && variant.size === size
    );
  };

  const handleExampleImageUpload = async (file: File | undefined) => {
    if (!file) return;

    setErrorMessage('');
    setUploadMessage('');
    setIsUploadingExample(true);

    try {
      const publicUrl = await uploadMediaFile(file, 'products/examples', {
        maxWidth: 1400,
        quality: 0.74,
        targetSize: 450 * 1024,
        minWidth: 1000,
        minQuality: 0.54,
        watermark: false,
      });

      setExampleImages((current) => [
        ...current,
        {
          url: publicUrl,
          color: '',
          altText: '',
        },
      ]);
      setUploadMessage(
        'Example photo uploaded and optimized. Assign its color and alt text in the photo card, then save the product.'
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload example photo.');
    } finally {
      setIsUploadingExample(false);
    }
  };

  const handleDesignFileUpload = async (file: File | undefined) => {
    if (!file) return;

    touchRequiredField('designFiles');
    setErrorMessage('');
    setUploadMessage('');
    setDesignWarnings([]);
    setIsUploadingDesign(true);

    try {
      const validation = await validatePrintFileUpload(file);
      setDesignWarnings(validation.warnings);

      const publicUrl = await uploadPrintFile(file);
      setDesignFiles((current) => [
        ...current,
        {
          placement: designPlacement,
          url: publicUrl,
        },
      ]);
      setUploadMessage(
        validation.warnings.length > 0
          ? 'Design PNG uploaded. Review the print quality warning before using it.'
          : 'Design PNG uploaded at the recommended print resolution.'
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload design PNG.');
    } finally {
      setIsUploadingDesign(false);
    }
  };

  const handleDeleteExampleImage = async (publicUrl: string) => {
    setErrorMessage('');
    setUploadMessage('');

    if (isEditing && originalExampleImagesRef.current.some((image) => image.url === publicUrl)) {
      setExampleImages((current) => current.filter((image) => image.url !== publicUrl));
      setUploadMessage(
        'Example photo removed from the form. Storage will be cleaned only after you save.'
      );
      return;
    }

    setDeletingFileUrls((current) => [...current, publicUrl]);

    try {
      await deletePublicStorageObject(publicUrl, 'media');
      setExampleImages((current) => current.filter((image) => image.url !== publicUrl));
      setUploadMessage('Example photo removed from the form and Supabase Storage.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to delete this example photo.'
      );
    } finally {
      setDeletingFileUrls((current) => current.filter((url) => url !== publicUrl));
    }
  };

  const handleDeleteDesignFile = async (publicUrl: string) => {
    touchRequiredField('designFiles');
    setErrorMessage('');
    setUploadMessage('');

    if (isEditing && originalDesignFileUrlsRef.current.includes(publicUrl)) {
      setDesignFiles((current) => current.filter((file) => file.url !== publicUrl));
      if (designFiles.length === 1) {
        setDesignWarnings([]);
      }
      setUploadMessage(
        'Print design removed from the form. Storage will be cleaned only after you save.'
      );
      return;
    }

    setDeletingFileUrls((current) => [...current, publicUrl]);

    try {
      await deletePublicStorageObject(publicUrl, 'print-files');
      setDesignFiles((current) => current.filter((file) => file.url !== publicUrl));
      if (designFiles.length === 1) {
        setDesignWarnings([]);
      }
      setUploadMessage('Print design removed from the form and Supabase Storage.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to delete this print design.'
      );
    } finally {
      setDeletingFileUrls((current) => current.filter((url) => url !== publicUrl));
    }
  };

  const deleteRemovedOriginalFiles = async () => {
    const removedExampleImages = originalExampleImagesRef.current.filter(
      (image) => !exampleImages.some((currentImage) => currentImage.url === image.url)
    );
    const currentDesignUrls = designFiles.map((file) => file.url);
    const removedDesignFiles = originalDesignFileUrlsRef.current.filter(
      (url) => !currentDesignUrls.includes(url)
    );
    const deletionResults = await Promise.allSettled([
      ...removedExampleImages.map((image) => deletePublicStorageObject(image.url, 'media')),
      ...removedDesignFiles.map((url) => deletePublicStorageObject(url, 'print-files')),
    ]);
    const failedDeletionCount = deletionResults.filter(
      (result) => result.status === 'rejected'
    ).length;

    if (failedDeletionCount > 0) {
      throw new Error(
        `Product saved, but ${failedDeletionCount} removed Storage object${
          failedDeletionCount === 1 ? '' : 's'
        } could not be deleted. Retry saving before leaving this page.`
      );
    }

    originalExampleImagesRef.current = [...exampleImages];
    originalDesignFileUrlsRef.current = currentDesignUrls;
  };

  const moveExampleImage = (index: number, direction: -1 | 1) => {
    setExampleImages((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const updateExampleImage = <Field extends keyof ExampleImage>(
    index: number,
    field: Field,
    value: ExampleImage[Field]
  ) => {
    setExampleImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index ? { ...image, [field]: value } : image
      )
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouchedRequiredFields({
      name: true,
      retailPrice: true,
      colors: true,
      sizes: true,
      manualCosts: true,
      designFiles: true,
    });
    setErrorMessage('');
    setSuccessMessage('');

    if (!isFormValid) {
      setErrorMessage(
        `Complete every required field before ${isEditing ? 'updating' : 'creating'} the product.`
      );
      return;
    }

    setIsSaving(true);

    try {
      const name = form.name.trim();
      const slug = form.slug.trim();
      const description = form.description.trim();
      const retailPriceCents = dollarsToCents(form.retailPrice);
      const isSlugAvailable = await isProductSlugAvailable(slug, id);

      if (!isSlugAvailable) {
        setErrorMessage('That slug is already used by another product. Choose a different URL.');
        setIsSaving(false);
        return;
      }

      const productInput: CreateEcommerceProductInput = {
        name,
        slug,
        description,
        retail_price_cents: retailPriceCents,
        currency: currencyRef.current,
        provider: selectedProviderCode,
        provider_catalog_product_id: isManualProvider ? null : PRINTFUL_CATALOG_PRODUCT_ID,
        provider_print_provider_id: providerPrintProviderIdRef.current,
        provider_meta: providerMetaRef.current,
        shipping_price_mode: form.shippingPriceMode,
        enabled_countries: selectedCountryCodes.map((countryCode) => ({
          country_code: countryCode,
          is_enabled: true,
        })),
        shipping_rates: selectedCountryCodes.flatMap((countryCode) => {
          const draft = productShippingRates[countryCode];
          if (!draft?.useOverride) return [];

          return [
            {
              country_code: countryCode,
              first_item_cents: dollarsToNonNegativeCents(draft.firstItem),
              additional_item_cents: dollarsToNonNegativeCents(draft.additionalItem),
              currency: currencyRef.current,
              source_note: draft.sourceNote.trim(),
              verified_at: draft.verifiedAt || null,
              is_active: true,
            },
          ];
        }),
        example_images: exampleImages.map((image) => image.url),
        product_images: exampleImages.map((image, index) => ({
          image_url: image.url,
          color: image.color || null,
          alt_text: image.altText.trim(),
          position: index,
        })),
        is_active: form.isActive,
        variants: isManualProvider
          ? getManualProductVariants()
          : selectedVariants.map((variant) => ({
              color: variant.color,
              color_code: variant.colorCode,
              size: variant.size,
              provider_variant_id: variant.providerVariantId,
              provider_base_cost_cents: variant.baseCostCents,
              available_us: variant.availableUS,
              is_active: variant.availableUS,
            })),
        files: buildProductFiles(designFiles),
      };

      if (
        isEditing &&
        id &&
        isManualProvider &&
        hasManualSizeGuideDraft &&
        manualSizeGuideDraftErrors.length === 0
      ) {
        await saveManualSizeGuide(id, slug);
      }

      let product: Awaited<ReturnType<typeof createEcommerceProduct>>;

      if (isEditing && id) {
        product = await updateEcommerceProduct(id, productInput);
      } else if (
        isManualProvider &&
        productInput.is_active &&
        hasManualSizeGuideDraft &&
        manualSizeGuideDraftErrors.length === 0
      ) {
        product = await createEcommerceProduct({
          ...productInput,
          is_active: false,
        });
      } else {
        product = await createEcommerceProduct(productInput);
      }

      if (
        !isEditing &&
        isManualProvider &&
        hasManualSizeGuideDraft &&
        manualSizeGuideDraftErrors.length === 0
      ) {
        await saveManualSizeGuide(product.id, slug);
      }

      if (
        !isEditing &&
        isManualProvider &&
        productInput.is_active &&
        hasManualSizeGuideDraft &&
        manualSizeGuideDraftErrors.length === 0
      ) {
        product = await updateEcommerceProduct(product.id, productInput);
      }

      if (isEditing) {
        await deleteRemovedOriginalFiles();
      }

      requestAdminRevalidation({
        scope: 'products',
        slugs: [product.slug, originalSlugRef.current],
      }).catch((error) => {
        console.warn('Product saved, but public product cache revalidation failed.', error);
      });

      setSuccessMessage(
        `Product ${isEditing ? 'updated' : 'created'}: ${product.name}. Product id: ${product.id}`
      );

      if (!isEditing) {
        setForm(emptyForm);
        setIsSlugUnlocked(true);
        setExampleImages([]);
        setDesignFiles([]);
        setDesignWarnings([]);
        setSelectedColors([]);
        setSelectedSizes([]);
        setSelectedCountryCodes(['US']);
        setSizeGuideUnit('inches');
        setSizeGuideBaseGarmentName('');
        setSizeGuideBaseGarmentIdentifier('');
        setSizeGuideTolerance('');
        setSizeGuideSource('');
        setSizeGuideVerifiedAt('');
        setSizeGuideNoPublishedMeasurements(false);
        setSizeGuideMeasurements({});
        setTouchedRequiredFields(untouchedRequiredFields);
        setIsSlugManuallyEdited(false);
        setUploadMessage('');
      }

      router.push('/admin/products');
    } catch (error) {
      setErrorMessage(getProductSaveErrorMessage(error, isEditing ? 'update' : 'create'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermanentProductDelete = async () => {
    if (!id || !savedProductDetail) return;

    const productName = savedProductDetail.product.name;
    if (form.isActive) {
      setDeleteProductError('Deactivate and save this product before deleting it permanently.');
      return;
    }
    if (deleteProductConfirmation !== productName) {
      setDeleteProductError(`Type “${productName}” exactly to confirm permanent deletion.`);
      return;
    }
    if (!window.confirm(`Permanently delete “${productName}”? This cannot be undone.`)) return;

    setIsDeletingProduct(true);
    setDeleteProductError('');

    try {
      const result = await permanentlyDeleteEcommerceProduct(id, productName);
      await requestAdminRevalidation({
        scope: 'products',
        slugs: [savedProductDetail.product.slug],
      });

      if (!result.storageCleanupComplete) {
        window.alert(
          `The product was deleted, but Storage cleanup needs attention: ${result.storageWarnings.join(', ')}.`
        );
      }

      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      setDeleteProductError(
        error instanceof Error ? error.message : 'Unable to delete this product permanently.'
      );
    } finally {
      setIsDeletingProduct(false);
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 pt-24">
        <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
          Loading product...
        </p>
      </div>
    );
  }

  if (loadErrorMessage) {
    return (
      <div className="min-h-screen bg-white px-6 pt-32">
        <div className="mx-auto max-w-xl border border-red-200 bg-red-50 p-6">
          <h1 className="font-display text-4xl text-black">
            {isCopying ? 'Unable to copy product' : 'Unable to edit product'}
          </h1>
          <p className="mt-3 font-body text-sm leading-relaxed text-red-700">
            {loadErrorMessage}
          </p>
          <Link href="/admin/products" className="btn-secondary mt-6 justify-center">
            Back to My Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 border-b border-black/10 pb-8">
          <Link
            href="/admin/products"
            className="mb-4 inline-block font-body text-sm uppercase tracking-[0.18em] text-ocean transition-colors hover:text-ocean/70"
          >
            ← My Products
          </Link>
          <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
            Ecommerce
          </span>
          <h1 className="font-display text-5xl text-black md:text-6xl">
            {isEditing ? 'Edit product' : 'New product'}
          </h1>
          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-black/60">
            {isEditing ? 'Update' : 'Create'} the product, choose or define its variants, and
            attach the example and print-ready artwork files in one atomic save.
          </p>
        </div>

        {isCopying && copiedFromProductName && (
          <div className="mb-8 border border-ocean/20 bg-sky-50 p-5">
            <h2 className="font-body text-sm font-semibold uppercase tracking-[0.16em] text-ocean">
              Starting from {copiedFromProductName}
            </h2>
            <p className="mt-3 font-body text-sm leading-relaxed text-black/65">
              Copied setup: provider, retail price, shipping mode, enabled countries, product
              shipping overrides, colors, sizes, variant base costs, and the size guide.
            </p>
            <p className="mt-2 font-body text-sm leading-relaxed text-black/65">
              Not copied: name, slug, product photos, print-ready design files, and product story
              text. Add those before activating so the new product cannot accidentally sell with
              the original design.
            </p>
          </div>
        )}

        {isEditing && savedProductDetail && (
          <AdminProductSavedSummary detail={savedProductDetail} />
        )}

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-8">
          <section className="border border-black/10 bg-gray-50 p-6">
            <h2 className="mb-5 font-display text-3xl text-black">Product basics</h2>

            <div className="grid gap-5">
              <label className="block">
                <span className="mb-2 block font-body text-sm font-semibold text-black">
                  Fulfillment provider
                </span>
                <select
                  value={selectedProviderCode}
                  onChange={(event) => {
                    setSelectedProviderCode(event.target.value);
                    setSelectedColors([]);
                    setSelectedSizes([]);
                    setManualColors([]);
                    setManualVariantCosts({});
                    setSizeGuideUnit('inches');
                    setSizeGuideBaseGarmentName('');
                    setSizeGuideBaseGarmentIdentifier('');
                    setSizeGuideTolerance('');
                    setSizeGuideSource('');
                    setSizeGuideVerifiedAt('');
                    setSizeGuideNoPublishedMeasurements(false);
                    setSizeGuideMeasurements({});
                  }}
                  className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-ocean"
                >
                  {providers.map((provider) => (
                    <option
                      key={provider.code}
                      value={provider.code}
                      disabled={!isProviderSellable(provider)}
                    >
                      {provider.name} · {provider.fulfillment_mode}
                      {!isProviderSellable(provider) ? ' · not sellable' : ''}
                    </option>
                  ))}
                  {providers.length === 0 && <option value="printful">Printful</option>}
                </select>
                {providerErrorMessage && (
                  <p className="mt-2 font-body text-sm text-amber-800">
                    {providerErrorMessage}
                  </p>
                )}
                {isManualProvider && (
                  <p className="mt-2 border border-ocean/20 bg-sky-50 p-3 font-body text-sm leading-relaxed text-black/70">
                    This provider does not have an automatic catalog. Katie defines the colors,
                    sizes, and base cost manually below.
                  </p>
                )}
                {providerRequirementsError && (
                  <p className="mt-2 border border-amber-200 bg-amber-50 p-3 font-body text-sm leading-relaxed text-amber-900">
                    {providerRequirementsError}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm font-semibold text-black">
                  Name
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  onBlur={() => touchRequiredField('name')}
                  aria-invalid={Boolean(nameError && touchedRequiredFields.name)}
                  aria-describedby={nameError && touchedRequiredFields.name ? 'product-name-error' : undefined}
                  className={
                    nameError && touchedRequiredFields.name
                      ? 'w-full border border-red-400 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-red-500'
                      : 'w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-ocean'
                  }
                  required
                />
                {nameError && touchedRequiredFields.name && (
                  <p id="product-name-error" className="mt-2 font-body text-sm text-red-700">
                    {nameError}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm font-semibold text-black">
                  Slug
                </span>
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(event) => handleSlugChange(event.target.value)}
                      disabled={isEditing && !isSlugUnlocked}
                      aria-invalid={Boolean(slugError)}
                      aria-describedby={slugError ? 'product-slug-error' : 'product-slug-help'}
                      className={
                        slugError
                          ? 'w-full border border-red-400 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-red-500 disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/45'
                          : 'w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-ocean disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/45'
                      }
                      required
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsSlugUnlocked((current) => !current)}
                        className="border border-black/10 px-4 py-3 font-body text-sm uppercase tracking-[0.12em] text-black/60 transition-colors hover:border-ocean hover:text-ocean"
                      >
                        {isSlugUnlocked ? 'Lock slug' : 'Unlock slug'}
                      </button>
                    )}
                  </div>

                  {slugError ? (
                    <p id="product-slug-error" className="font-body text-sm text-red-700">
                      {slugError}
                    </p>
                  ) : (
                    <p id="product-slug-help" className="font-body text-xs text-black/50">
                      Public URL: /shop/{form.slug}
                    </p>
                  )}

                  {isEditing && !isSlugUnlocked && (
                    <p className="font-body text-xs leading-relaxed text-black/45">
                      Slug is locked after creation to protect shared links and Google indexing.
                    </p>
                  )}

                  {isEditing &&
                    isSlugUnlocked &&
                    savedProductDetail?.product.is_active &&
                    form.slug !== originalSlugRef.current && (
                      <div className="border border-amber-300 bg-amber-50 p-4">
                        <p className="font-body text-sm leading-relaxed text-amber-900">
                          This product is active. Changing the slug changes the public URL, so old
                          shared links and Google indexing can break unless redirects are added.
                        </p>
                      </div>
                    )}
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm font-semibold text-black">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  rows={5}
                  className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-ocean"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm font-semibold text-black">
                  Retail price / USD
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.retailPrice}
                  onChange={(event) => updateForm('retailPrice', event.target.value)}
                  onBlur={() => touchRequiredField('retailPrice')}
                  placeholder="30.00"
                  aria-invalid={Boolean(
                    retailPriceError &&
                      (touchedRequiredFields.retailPrice || form.retailPrice.trim())
                  )}
                  aria-describedby={
                    retailPriceError &&
                    (touchedRequiredFields.retailPrice || form.retailPrice.trim())
                      ? 'retail-price-error'
                      : 'retail-price-help'
                  }
                  className={
                    retailPriceError &&
                    (touchedRequiredFields.retailPrice || form.retailPrice.trim())
                      ? 'w-full border border-red-400 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-red-500'
                      : 'w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-ocean'
                  }
                  required
                />
                {retailPriceError &&
                  (touchedRequiredFields.retailPrice || form.retailPrice.trim()) && (
                    <p id="retail-price-error" className="mt-2 font-body text-sm text-red-700">
                      {retailPriceError}
                    </p>
                  )}
                <p id="retail-price-help" className="mt-2 font-body text-xs text-black/50">
                  Saved as cents in Supabase, for example $30.00 → 3000.
                </p>
              </label>

              <section className="border border-ocean/15 bg-white p-4">
                <h3 className="font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/55">
                  Selling destinations and shipping
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-black/60">
                  A product can only be sold in a country when the shop allows that country, this
                  provider ships there, and a shipping rate is known. Never use $0 as a placeholder.
                </p>

                <label className="mt-4 block">
                  <span className="mb-2 block font-body text-sm font-semibold text-black">
                    Shipping display
                  </span>
                  <select
                    value={form.shippingPriceMode}
                    onChange={(event) =>
                      updateForm(
                        'shippingPriceMode',
                        event.target.value === 'separate' ? 'separate' : 'included'
                      )
                    }
                    className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                  >
                    <option value="included">Shipping included in product price</option>
                    <option value="separate">Show shipping as a separate checkout line</option>
                  </select>
                  <p className="mt-2 font-body text-xs leading-relaxed text-black/50">
                    Current setting: {formatShippingMode(form.shippingPriceMode)}. If shipping is
                    separate, Stripe and Supabase both record the shipping amount on the order.
                  </p>
                </label>

                <div className="mt-5">
                  <p className="mb-3 font-body text-sm font-semibold text-black">
                    Enabled countries
                  </p>
                  {eligibleCountries.length === 0 ? (
                    <p className="border border-amber-200 bg-amber-50 p-3 font-body text-sm leading-relaxed text-amber-900">
                      No country is eligible for this provider yet. Add a provider shipping rate
                      first, then come back to enable the product for that country.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {eligibleCountries.map((country) => {
                        const rate = providerShippingRatesByCountry.get(country.code);
                        const isChecked = selectedCountryCodes.includes(country.code);
                        return (
                          <label
                            key={country.code}
                            className={
                              isChecked
                                ? 'border border-ocean bg-sky-50 p-3'
                                : 'border border-black/10 bg-gray-50 p-3'
                            }
                          >
                            <span className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCountry(country.code)}
                                className="mt-1 h-4 w-4 accent-ocean"
                              />
                              <span>
                                <span className="block font-body text-sm font-semibold text-black">
                                  {country.name}
                                </span>
                                <span className="mt-1 block font-body text-xs leading-relaxed text-black/55">
                                  Inherited provider rate:{' '}
                                  {rate
                                    ? `$${(rate.first_item_cents / 100).toFixed(2)} first item / $${(rate.additional_item_cents / 100).toFixed(2)} additional`
                                    : 'missing'}
                                </span>
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {selectedCountryError && (
                    <p className="mt-3 font-body text-sm text-amber-800">
                      {selectedCountryError}
                    </p>
                  )}

                  {selectedCountryCodes.length > 0 && (
                    <div className="mt-5 space-y-3">
                      <p className="font-body text-sm font-semibold text-black">
                        Product-specific shipping rates
                      </p>
                      <p className="font-body text-xs leading-relaxed text-black/55">
                        Use the provider default unless this exact product ships at a different
                        cost. The effective rate below is what margin, cart, Stripe, and the order
                        use.
                      </p>
                      {selectedCountryCodes.map((countryCode) => {
                        const country = shopCountries.find(
                          (candidate) => candidate.code === countryCode
                        );
                        const providerRate = providerShippingRatesByCountry.get(countryCode);
                        const draft = productShippingRates[countryCode];
                        const usesOverride = Boolean(draft?.useOverride);
                        const effectiveRate = getEffectiveShippingRate(countryCode);

                        return (
                          <div key={countryCode} className="border border-black/10 bg-white p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-body text-sm font-semibold text-black">
                                  {country?.name ?? countryCode}
                                </p>
                                <p className="mt-1 font-body text-xs leading-relaxed text-black/50">
                                  Provider default:{' '}
                                  {providerRate
                                    ? `$${centsToDollars(providerRate.first_item_cents)} first / $${centsToDollars(providerRate.additional_item_cents)} additional`
                                    : 'missing'}
                                </p>
                                <p className="mt-1 font-body text-xs leading-relaxed text-ocean">
                                  Effective rate:{' '}
                                  {effectiveRate
                                    ? `$${centsToDollars(effectiveRate.first_item_cents)} first / $${centsToDollars(effectiveRate.additional_item_cents)} additional (${effectiveRate.rate_source})`
                                    : 'missing'}
                                </p>
                              </div>
                              <label className="flex items-center gap-2 font-body text-xs text-black/65">
                                <input
                                  type="checkbox"
                                  checked={usesOverride}
                                  onChange={(event) =>
                                    updateProductShippingRate(countryCode, {
                                      useOverride: event.target.checked,
                                    })
                                  }
                                  className="h-4 w-4 accent-ocean"
                                />
                                Use product-specific rate
                              </label>
                            </div>
                            {usesOverride && (
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="block">
                                  <span className="mb-1 block font-body text-xs uppercase tracking-[0.12em] text-black/35">
                                    First item shipping cost
                                  </span>
                                  <input
                                    value={draft?.firstItem ?? ''}
                                    onChange={(event) =>
                                      updateProductShippingRate(countryCode, {
                                        firstItem: event.target.value,
                                      })
                                    }
                                    placeholder="5.80"
                                    className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-1 block font-body text-xs uppercase tracking-[0.12em] text-black/35">
                                    Additional item shipping cost
                                  </span>
                                  <input
                                    value={draft?.additionalItem ?? ''}
                                    onChange={(event) =>
                                      updateProductShippingRate(countryCode, {
                                        additionalItem: event.target.value,
                                      })
                                    }
                                    placeholder="2.60"
                                    className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
                                  />
                                </label>
                                <label className="block sm:col-span-2">
                                  <span className="mb-1 block font-body text-xs uppercase tracking-[0.12em] text-black/35">
                                    Source note
                                  </span>
                                  <input
                                    value={draft?.sourceNote ?? ''}
                                    onChange={(event) =>
                                      updateProductShippingRate(countryCode, {
                                        sourceNote: event.target.value,
                                      })
                                    }
                                    placeholder="Provider quote, help-center table, or Katie’s verified note"
                                    className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-1 block font-body text-xs uppercase tracking-[0.12em] text-black/35">
                                    Verified at
                                  </span>
                                  <input
                                    type="date"
                                    value={draft?.verifiedAt ?? ''}
                                    onChange={(event) =>
                                      updateProductShippingRate(countryCode, {
                                        verifiedAt: event.target.value,
                                      })
                                    }
                                    className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {shopCountries.some((country) => country.requires_legal_review) && (
                    <details className="mt-4 border border-black/10 bg-gray-50 p-3 font-body text-xs leading-relaxed text-black/60">
                      <summary className="cursor-pointer font-semibold text-ocean">
                        Countries that need review before Katie can enable them
                      </summary>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {shopCountries
                          .filter((country) => country.requires_legal_review)
                          .map((country) => (
                            <li key={country.code}>
                              <strong>{country.name}:</strong> {country.legal_review_note}
                            </li>
                          ))}
                      </ul>
                    </details>
                  )}

                  <div className="mt-5 border border-black/10 bg-gray-50 p-4">
                    <p className="font-body text-sm font-semibold text-black">
                      Live margin check
                    </p>
                    <p className="mt-1 font-body text-xs leading-relaxed text-black/55">
                      Estimate uses the selected product price, variant base cost, the first
                      enabled country&apos;s shipping rate, and Stripe fee reference verified on{' '}
                      {PRINTFUL_COST_REFERENCE_VERIFIED_AT}. Provider tax and final shipping
                      adjustments are not guaranteed until fulfillment.
                    </p>
                    {liveMarginRows.length === 0 ? (
                      <p className="mt-3 font-body text-sm text-black/45">
                        Add price, variants, costs, and a shipping destination to preview margin.
                      </p>
                    ) : (
                      <div className="mt-3 max-h-44 overflow-y-auto">
                        {liveMarginRows.slice(0, 12).map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between border-b border-black/10 py-2 last:border-0"
                          >
                            <span className="font-body text-xs text-black/60">{row.label}</span>
                            <span
                              className={
                                row.marginCents < 0
                                  ? 'font-body text-sm font-semibold text-red-700'
                                  : row.marginCents < 800
                                    ? 'font-body text-sm font-semibold text-amber-800'
                                    : 'font-body text-sm font-semibold text-green-800'
                              }
                            >
                              {formatUsd(row.marginCents)}
                            </span>
                          </div>
                        ))}
                        {liveMarginRows.length > 12 && (
                          <p className="pt-2 font-body text-xs text-black/45">
                            Showing 12 of {liveMarginRows.length} variant margins.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-3 border border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-body text-sm font-semibold text-black">Product status</p>
                  <p className="mt-1 font-body text-sm text-black/55">
                    {form.isActive
                      ? 'Active products will be visible when the public shop is connected.'
                      : 'Inactive products stay hidden from the public shop.'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={form.isActive}
                  onClick={() => updateForm('isActive', !form.isActive)}
                  className={
                    form.isActive
                      ? 'border border-red-200 bg-red-50 px-4 py-2 font-body text-sm font-semibold text-red-800 transition-colors hover:bg-red-100'
                      : 'border border-green-200 bg-green-50 px-4 py-2 font-body text-sm font-semibold text-green-800 transition-colors hover:bg-green-100'
                  }
                >
                  {form.isActive ? 'Deactivate product' : 'Activate product'}
                </button>
                {activationError && (
                  <p className="mt-2 font-body text-sm text-amber-800">{activationError}</p>
                )}
              </div>
            </div>
          </section>

          {isManualProvider && (
            <section className="border border-black/10 bg-gray-50 p-6">
              <h2 className="mb-3 font-display text-3xl text-black">Manual size guide</h2>
              <p className="mb-5 font-body text-sm leading-relaxed text-black/60">
                Required before a manual-provider product can be active. These are garment
                measurements, not body measurements. If Katie changes this after orders exist, the
                save creates a new active version; old order snapshots stay untouched.
              </p>
              {!id && (
                <p className="mb-4 border border-ocean/20 bg-sky-50 p-3 font-body text-sm text-black/70">
                  For a new active manual product, the admin saves an inactive draft first, adds
                  this guide, and activates the product automatically in the same save flow.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-body text-sm font-semibold text-black">
                    Unit
                  </span>
                  <select
                    value={sizeGuideUnit}
                    onChange={(event) =>
                      setSizeGuideUnit(event.target.value === 'cm' ? 'cm' : 'inches')
                    }
                    className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                  >
                    <option value="inches">Inches</option>
                    <option value="cm">Centimeters</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block font-body text-sm font-semibold text-black">
                    Verified date
                  </span>
                  <input
                    type="date"
                    value={sizeGuideVerifiedAt}
                    onChange={(event) => setSizeGuideVerifiedAt(event.target.value)}
                    className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-body text-sm font-semibold text-black">
                    Base garment name
                  </span>
                  <input
                    value={sizeGuideBaseGarmentName}
                    onChange={(event) => setSizeGuideBaseGarmentName(event.target.value)}
                    disabled={sizeGuideNoPublishedMeasurements}
                    maxLength={160}
                    placeholder="Example: TapStitch oversized cotton tee"
                    className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean disabled:bg-black/[0.04] disabled:text-black/40"
                  />
                  <span className="mt-1 block font-body text-xs leading-relaxed text-black/45">
                    The exact blank or product whose size chart Katie copied. This prevents mixing
                    measurements from another garment.
                  </span>
                </label>
                <label className="block">
                  <span className="mb-2 block font-body text-sm font-semibold text-black">
                    Provider style / SKU
                  </span>
                  <input
                    value={sizeGuideBaseGarmentIdentifier}
                    onChange={(event) => setSizeGuideBaseGarmentIdentifier(event.target.value)}
                    disabled={sizeGuideNoPublishedMeasurements}
                    maxLength={120}
                    placeholder="Example: provider product code, SKU, or listing ID"
                    className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean disabled:bg-black/[0.04] disabled:text-black/40"
                  />
                  <span className="mt-1 block font-body text-xs leading-relaxed text-black/45">
                    The provider’s own identifier for that garment, so the guide can be traced back
                    later.
                  </span>
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block font-body text-sm font-semibold text-black">
                  Declared tolerance
                </span>
                <input
                  value={sizeGuideTolerance}
                  onChange={(event) => setSizeGuideTolerance(event.target.value)}
                  disabled={sizeGuideNoPublishedMeasurements}
                  placeholder='Example: Product measurements may vary by up to 2" (5 cm).'
                  className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean disabled:bg-black/[0.04] disabled:text-black/40"
                />
              </label>
              <label className="mt-4 flex items-start gap-3 border border-amber-200 bg-amber-50 p-4">
                <input
                  type="checkbox"
                  checked={sizeGuideNoPublishedMeasurements}
                  onChange={(event) => setSizeGuideNoPublishedMeasurements(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-ocean"
                />
                <span>
                  <span className="block font-body text-sm font-semibold text-amber-950">
                    This provider does not publish garment measurements
                  </span>
                  <span className="mt-1 block font-body text-xs leading-relaxed text-amber-900/80">
                    This records the truth for Katie, but the product cannot be active or sold
                    until measurements are available for every active size.
                  </span>
                </span>
              </label>
              <label className="mt-4 block">
                <span className="mb-2 block font-body text-sm font-semibold text-black">
                  Source
                </span>
                <textarea
                  rows={3}
                  value={sizeGuideSource}
                  onChange={(event) => setSizeGuideSource(event.target.value)}
                  placeholder="Provider URL, email from provider, or Katie’s measurement note."
                  className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                />
              </label>
              {!sizeGuideNoPublishedMeasurements &&
                (sizeGuideBaseGarmentName.trim() ||
                  sizeGuideBaseGarmentIdentifier.trim() ||
                  sizeGuideSource.trim()) && (
                  <div className="mt-4 border border-ocean/15 bg-white p-3 font-body text-sm leading-relaxed text-black/60">
                    <p className="font-semibold text-black">Size guide declaration</p>
                    <p className="mt-1">
                      These measurements are declared for{' '}
                      <span className="font-semibold text-black">
                        {sizeGuideBaseGarmentName.trim() || 'an unnamed garment'}
                      </span>
                      {sizeGuideBaseGarmentIdentifier.trim()
                        ? ` (${sizeGuideBaseGarmentIdentifier.trim()})`
                        : ''}
                      . Source: {sizeGuideSource.trim() || 'not entered yet'}.
                    </p>
                  </div>
                )}
              {sizeGuideNoPublishedMeasurements ? (
                <p className="mt-4 border border-amber-200 bg-white p-3 font-body text-sm text-amber-900">
                  No measurement table will be saved. This product must stay inactive.
                </p>
              ) : selectedSizes.length === 0 ? (
                <p className="mt-4 font-body text-sm text-black/45">
                  Select sizes above to enter measurements.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto border border-black/10 bg-white">
                  <table className="min-w-full font-body text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.12em] text-black/45">
                      <tr>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2">Length</th>
                        <th className="px-3 py-2">Shoulder</th>
                        <th className="px-3 py-2">Chest</th>
                        <th className="px-3 py-2">Sleeve length</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSizes.map((size) => {
                        const measurement = sizeGuideMeasurements[size] ?? {
                          length: '',
                          shoulder: '',
                          chest: '',
                          sleeveLength: '',
                        };
                        return (
                          <tr key={size} className="border-t border-black/10">
                            <td className="px-3 py-2 font-semibold">{size}</td>
                            {(['length', 'shoulder', 'chest', 'sleeveLength'] as const).map((field) => (
                              <td key={field} className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={measurement[field]}
                                  onChange={(event) =>
                                    setSizeGuideMeasurements((current) => ({
                                      ...current,
                                      [size]: {
                                        ...measurement,
                                        [field]: event.target.value,
                                      },
                                    }))
                                  }
                                  className="w-28 border border-black/15 bg-white px-2 py-1 text-sm outline-none focus:border-ocean"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {manualSizeGuideErrors.length > 0 && form.isActive && (
                <div className="mt-4 border border-amber-200 bg-amber-50 p-3">
                  <p className="font-body text-sm font-semibold text-amber-900">
                    Size guide requirements before activation:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-sm text-amber-900">
                    {manualSizeGuideErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="border border-black/10 bg-gray-50 p-6">
            <h2 className="mb-3 font-display text-3xl text-black">Colors and sizes</h2>
            <p className="mb-5 font-body text-sm leading-relaxed text-black/60">
              Pick the color and size combinations Katie wants to sell. API provider variant IDs
              stay hidden; manual providers use Katie&apos;s color, size, and cost entries.
            </p>

            {isManualProvider && (
              <div className="space-y-7">
                <div className="border border-ocean/20 bg-sky-50 p-4">
                  <p className="font-body text-sm font-semibold text-black">
                    Manual provider mode
                  </p>
                  <p className="mt-2 font-body text-sm leading-relaxed text-black/65">
                    This provider has no catalog API. Add each shirt color, add the sizes Katie
                    wants to sell, then enter the base cost this provider charges for every
                    color/size variant.
                  </p>
                </div>

                <div>
                  <h3 className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.16em] text-black/55">
                    Manual colors
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                    <input
                      type="text"
                      value={manualColorName}
                      onChange={(event) => setManualColorName(event.target.value)}
                      placeholder="Ivory"
                      className="border border-black/15 bg-white px-4 py-3 font-body text-sm text-black outline-none focus:border-ocean"
                    />
                    <input
                      type="color"
                      value={manualColorCode}
                      onChange={(event) => setManualColorCode(event.target.value)}
                      className="h-12 w-full border border-black/15 bg-white px-2 py-1"
                      aria-label="Manual color hex"
                    />
                    <button type="button" onClick={addManualColor} className="btn-secondary">
                      Add color
                    </button>
                  </div>

                  {manualColors.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {manualColors.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => removeManualColor(color.name)}
                          className="flex items-center gap-2 border border-black/10 bg-white px-3 py-2 font-body text-sm text-black transition-colors hover:border-red-300 hover:text-red-800"
                          title="Remove color"
                        >
                          <span
                            aria-hidden="true"
                            className="h-5 w-5 rounded-full border border-black/20"
                            style={{ backgroundColor: color.colorCode }}
                          />
                          {color.name}
                          <span className="text-black/35">×</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {colorsError && (
                    <p
                      className={`mt-3 font-body text-sm ${
                        touchedRequiredFields.colors ? 'text-red-700' : 'text-black/50'
                      }`}
                    >
                      {colorsError}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.16em] text-black/55">
                    Manual sizes
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      type="text"
                      value={manualSizeName}
                      onChange={(event) => setManualSizeName(event.target.value)}
                      placeholder="S, M, L, XL..."
                      className="border border-black/15 bg-white px-4 py-3 font-body text-sm text-black outline-none focus:border-ocean"
                    />
                    <button type="button" onClick={addManualSize} className="btn-secondary">
                      Add size
                    </button>
                  </div>

                  {selectedSizes.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {selectedSizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => removeManualSize(size)}
                          className="border border-black/10 bg-white px-3 py-2 font-body text-sm text-black transition-colors hover:border-red-300 hover:text-red-800"
                          title="Remove size"
                        >
                          {size} <span className="text-black/35">×</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {sizesError && (
                    <p
                      className={`mt-3 font-body text-sm ${
                        touchedRequiredFields.sizes ? 'text-red-700' : 'text-black/50'
                      }`}
                    >
                      {sizesError}
                    </p>
                  )}
                </div>

                {selectedCombinationCount > 0 && (
                  <div className="overflow-hidden border border-black/10">
                    <div className="grid grid-cols-[1fr_0.7fr_0.9fr] bg-white px-4 py-3 font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                      <span>Color</span>
                      <span>Size</span>
                      <span>Base cost / USD</span>
                    </div>
                    {manualCostErrors.length > 0 && (
                      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 font-body text-sm leading-relaxed text-amber-900">
                        <p className="font-semibold">Base cost is required before saving.</p>
                        <p className="mt-1">
                          Fill the TapStitch cost for:{' '}
                          {manualCostErrors
                            .map((item) => `${item.color} / ${item.size}`)
                            .join(', ')}
                          .
                        </p>
                      </div>
                    )}
                    <div className="max-h-96 divide-y divide-black/10 overflow-y-auto bg-white">
                      {selectedColors.flatMap((color) =>
                        selectedSizes.map((size) => {
                          const key = manualVariantKey(color, size);
                          const costValue = manualVariantCosts[key] ?? '';
                          const costError = getNonNegativeDollarError(
                            costValue,
                            `${color} / ${size} base cost`
                          );

                          return (
                            <div
                              key={key}
                              className="grid gap-3 px-4 py-3 font-body text-sm text-black sm:grid-cols-[1fr_0.7fr_0.9fr] sm:items-center"
                            >
                              <span>{color}</span>
                              <span>{size}</span>
                              <label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={costValue}
                                  onChange={(event) =>
                                    updateManualVariantCost(color, size, event.target.value)
                                  }
                                  placeholder="12.00"
                                  className={
                                    costError && touchedRequiredFields.manualCosts
                                      ? 'w-full border border-red-400 bg-white px-3 py-2 font-body text-sm text-black outline-none focus:border-red-500'
                                      : 'w-full border border-black/15 bg-white px-3 py-2 font-body text-sm text-black outline-none focus:border-ocean'
                                  }
                                />
                                {costError && touchedRequiredFields.manualCosts && (
                                  <span className="mt-1 block text-xs text-red-700">
                                    {costError}
                                  </span>
                                )}
                              </label>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="border border-ocean/20 bg-sky-50 p-4">
                  <p className="font-body text-sm font-semibold text-black">
                    {selectedColors.length} colors x {selectedSizes.length} sizes ={' '}
                    {selectedVariantCount} manual variants
                  </p>
                  <p className="mt-2 font-body text-sm text-black/55">
                    Manual variants are treated as US-available and active when saved. There is no
                    provider API to re-check stock automatically yet.
                  </p>
                </div>
              </div>
            )}

            {!isManualProvider && isLoadingVariants && (
              <p className="border border-black/10 bg-white p-4 font-body text-sm uppercase tracking-[0.18em] text-black/45">
                Loading Printful colors and sizes...
              </p>
            )}

            {!isManualProvider && !isLoadingVariants && variantErrorMessage && (
              <p className="border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
                {variantErrorMessage}
              </p>
            )}

            {!isManualProvider && !isLoadingVariants && podProduct && (
              <div className="space-y-7">
                <div>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <h3 className="font-body text-sm font-semibold uppercase tracking-[0.16em] text-black/55">
                      Colors
                    </h3>
                    <p className="font-body text-xs text-black/45">
                      {podProduct.colors.length} colors from {podProduct.name}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {podProduct.colors.map((color) => {
                      const isSelected = selectedColors.includes(color.name);

                      return (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => toggleColor(color.name)}
                          aria-pressed={isSelected}
                          className={
                            isSelected
                              ? 'flex items-center gap-3 border border-ocean bg-sky-50 p-3 text-left'
                              : 'flex items-center gap-3 border border-black/10 bg-white p-3 text-left transition-colors hover:border-ocean/35 hover:bg-sky-50'
                          }
                        >
                          <span
                            aria-hidden="true"
                            className="h-7 w-7 shrink-0 rounded-full border border-black/20"
                            style={{ backgroundColor: color.code || '#ffffff' }}
                          />
                          <span className="font-body text-sm text-black">{color.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {colorsError && (
                    <p
                      className={`mt-3 font-body text-sm ${
                        touchedRequiredFields.colors ? 'text-red-700' : 'text-black/50'
                      }`}
                    >
                      {colorsError}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.16em] text-black/55">
                    Sizes
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {podProductSizes.map((size) => (
                      <label
                        key={size}
                        className="flex items-center gap-2 border border-black/10 bg-white px-4 py-3 font-body text-sm text-black"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSizes.includes(size)}
                          onChange={() => toggleSize(size)}
                          className="h-4 w-4 accent-ocean"
                        />
                        {size}
                      </label>
                    ))}
                  </div>
                  {sizesError && (
                    <p
                      className={`mt-3 font-body text-sm ${
                        touchedRequiredFields.sizes ? 'text-red-700' : 'text-black/50'
                      }`}
                    >
                      {sizesError}
                    </p>
                  )}
                </div>

                <div className="border border-ocean/20 bg-sky-50 p-4">
                  <p className="font-body text-sm font-semibold text-black">
                    {selectedColors.length} colors x {selectedSizes.length} sizes ={' '}
                    {selectedVariantCount} US-available variants
                  </p>
                  {unavailableSelectedCombinationCount > 0 && (
                    <p className="mt-2 font-body text-sm text-amber-800">
                      {unavailableSelectedCombinationCount} selected combination
                      {unavailableSelectedCombinationCount === 1 ? '' : 's'} are not available for
                      US and will stay disabled in the next step.
                    </p>
                  )}
                  {selectedCombinationCount === 0 && (
                    <p className="mt-2 font-body text-sm text-black/55">
                      Select at least one color and one size to preview combinations.
                    </p>
                  )}
                </div>

                {selectedCombinationCount > 0 && (
                  <div className="overflow-hidden border border-black/10">
                    <div className="grid grid-cols-[1fr_0.7fr_0.8fr] bg-white px-4 py-3 font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                      <span>Color</span>
                      <span>Size</span>
                      <span>Status</span>
                    </div>
                    <div className="max-h-72 divide-y divide-black/10 overflow-y-auto bg-white">
                      {selectedColors.flatMap((color) =>
                        selectedSizes.map((size) => {
                          const variant = getSelectedCombination(color, size);
                          const isAvailable = Boolean(variant?.availableUS);

                          return (
                            <div
                              key={`${color}-${size}`}
                              className={
                                isAvailable
                                  ? 'grid grid-cols-[1fr_0.7fr_0.8fr] px-4 py-3 font-body text-sm text-black'
                                  : 'grid grid-cols-[1fr_0.7fr_0.8fr] bg-amber-50 px-4 py-3 font-body text-sm text-amber-900'
                              }
                            >
                              <span>{color}</span>
                              <span>{size}</span>
                              <span>{isAvailable ? 'Available US' : 'Unavailable US'}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="border border-black/10 bg-gray-50 p-6">
            <h2 className="mb-3 font-display text-3xl text-black">Example photos</h2>
            <p className="mb-5 font-body text-sm leading-relaxed text-black/60">
              These are web preview photos. They use the existing optimized media flow: WebP,
              resized, cached, and left without a watermark so product photos stay clean. Add as
              many as needed. For each color, the first photo assigned to that color is the main
              product photo and the second becomes the hover photo on desktop. Photos marked
              general/lifestyle stay available at the end of the gallery for every color.
            </p>

            <p className="mb-4 border border-ocean/15 bg-white p-4 font-body text-sm leading-relaxed text-black/60">
              Upload the photo first. Then choose whether the card is a photo for a selected color
              or a general/lifestyle photo, and add alt text on that same card. Alt text is required
              before saving.
            </p>
            {exampleImagesAltError && (
              <p className="mb-4 border border-amber-200 bg-amber-50 p-3 font-body text-sm text-amber-900">
                {exampleImagesAltError}
              </p>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={isUploadingExample || isDeletingFile}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void handleExampleImageUpload(file);
              }}
              className="block w-full font-body text-sm text-black file:mr-4 file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-body file:text-sm file:font-semibold file:text-white"
            />

            {exampleImages.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 font-body text-sm font-semibold text-black">
                  Example photos · drag-free ordering controls
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {exampleImages.map((image, index) => {
                    const isDeleting = deletingFileUrls.includes(image.url);

                    return (
                      <div key={image.url} className="border border-black/10 bg-white p-3">
                        <a
                          href={image.url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative block aspect-square overflow-hidden bg-gray-100"
                        >
                          <Image
                            src={image.url}
                            alt={image.altText || `Example product photo ${index + 1}`}
                            fill
                            sizes="(min-width: 1024px) 220px, (min-width: 640px) 40vw, 90vw"
                            className="object-cover"
                          />
                          {index === 0 && (
                            <span className="absolute left-2 top-2 bg-ocean px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                              List primary
                            </span>
                          )}
                          <span className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                            {image.color ? `${image.color} photo` : 'General/lifestyle'}
                          </span>
                        </a>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="font-body text-xs text-black/55">
                            Photo {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleDeleteExampleImage(image.url)}
                            disabled={isDeletingFile}
                            className="font-body text-xs font-semibold text-red-700 transition-colors hover:text-red-900 disabled:cursor-wait disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>

                        <label className="mt-3 block">
                          <span className="mb-1 block font-body text-xs text-black/45">
                            Photo type
                          </span>
                          <select
                            value={image.color}
                            onChange={(event) =>
                              updateExampleImage(index, 'color', event.target.value)
                            }
                            className="w-full border border-black/10 bg-white px-3 py-2 font-body text-sm text-black outline-none focus:border-ocean"
                          >
                            <option value="">General/lifestyle photo</option>
                            {selectedColors.map((color) => (
                              <option key={color} value={color}>
                                Photo for {color}
                              </option>
                            ))}
                          </select>
                          <span className="mt-1 block font-body text-[11px] leading-relaxed text-black/45">
                            Color photos drive the main/hover swap. General photos stay in the
                            gallery for every color.
                          </span>
                        </label>

                        <label className="mt-3 block">
                          <span className="mb-1 block font-body text-xs text-black/45">
                            Alt text · required
                          </span>
                          <input
                            type="text"
                            value={image.altText}
                            onChange={(event) =>
                              updateExampleImage(index, 'altText', event.target.value)
                            }
                            className="w-full border border-black/10 bg-white px-3 py-2 font-body text-sm text-black outline-none focus:border-ocean"
                          />
                          {!image.altText.trim() && (
                            <span className="mt-1 block font-body text-[11px] text-amber-800">
                              Describe the image for SEO and screen readers before saving.
                            </span>
                          )}
                        </label>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => moveExampleImage(index, -1)}
                            disabled={index === 0 || isDeletingFile}
                            className="border border-black/10 px-2 py-2 font-body text-xs text-black/65 transition-colors hover:border-ocean hover:text-ocean disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Move example photo ${index + 1} earlier`}
                          >
                            ← Earlier
                          </button>
                          <button
                            type="button"
                            onClick={() => moveExampleImage(index, 1)}
                            disabled={index === exampleImages.length - 1 || isDeletingFile}
                            className="border border-black/10 px-2 py-2 font-body text-xs text-black/65 transition-colors hover:border-ocean hover:text-ocean disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Move example photo ${index + 1} later`}
                          >
                            Later →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="border border-black/10 bg-gray-50 p-6">
            <h2 className="mb-3 font-display text-3xl text-black">Design file</h2>
            <p className="mb-4 border border-ocean/20 bg-sky-50 p-4 font-body text-sm leading-relaxed text-black/70">
              {PRINT_FILE_UPLOAD_GUIDANCE} Front and back use the same Gildan 64000 spec:
              1800x2400px, 150 DPI.
            </p>
            <p className="mb-5 font-body text-sm leading-relaxed text-black/60">
              This upload keeps the PNG original for Printful. It does not resize, recompress,
              convert, or watermark the file.
            </p>

            <label className="mb-4 block">
              <span className="mb-2 block font-body text-sm font-semibold text-black">
                Placement
              </span>
              <select
                value={designPlacement}
                onChange={(event) => setDesignPlacement(event.target.value)}
                className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-ocean"
              >
                {PRINT_PLACEMENTS.map((placement) => (
                  <option key={placement.value} value={placement.value}>
                    {placement.label}
                  </option>
                ))}
              </select>
            </label>

            <input
              type="file"
              accept="image/png"
              disabled={isUploadingDesign || isDeletingFile}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void handleDesignFileUpload(file);
              }}
              className="block w-full font-body text-sm text-black file:mr-4 file:border-0 file:bg-black file:px-4 file:py-2 file:font-body file:text-sm file:font-semibold file:text-white"
            />
            {designFilesError && (
              <p
                className={`mt-3 font-body text-sm ${
                  touchedRequiredFields.designFiles ? 'text-red-700' : 'text-black/50'
                }`}
              >
                {designFilesError}
              </p>
            )}

            {designWarnings.length > 0 && (
              <div className="mt-5 border border-amber-300 bg-amber-50 p-4">
                <p className="mb-2 font-body text-sm font-semibold text-amber-900">
                  Print quality warning
                </p>
                {designWarnings.map((warning) => (
                  <p key={warning} className="font-body text-sm leading-relaxed text-amber-900">
                    {warning}
                  </p>
                ))}
              </div>
            )}

            {designFiles.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 font-body text-sm font-semibold text-black">
                  Uploaded design files
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {designFiles.map((file, index) => {
                    const isDeleting = deletingFileUrls.includes(file.url);
                    const placementLabel =
                      PRINT_PLACEMENTS.find((placement) => placement.value === file.placement)
                        ?.label ?? file.placement;

                    return (
                      <div
                        key={`${file.placement}-${file.url}`}
                        className="border border-black/10 bg-white p-3"
                      >
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative block aspect-square overflow-hidden bg-gray-100"
                        >
                          <Image
                            src={file.url}
                            alt={`Print design ${index + 1} for ${placementLabel}`}
                            fill
                            sizes="(min-width: 1024px) 220px, (min-width: 640px) 40vw, 90vw"
                            className="object-contain p-3"
                          />
                        </a>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="font-body text-xs text-black/50">Design {index + 1}</p>
                            <p className="font-body text-sm font-semibold text-black">
                              {placementLabel}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteDesignFile(file.url)}
                            disabled={isDeletingFile}
                            className="font-body text-xs font-semibold text-red-700 transition-colors hover:text-red-900 disabled:cursor-wait disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {(errorMessage || successMessage || uploadMessage) && (
            <div className="space-y-3">
              {errorMessage && (
                <p className="border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
                  {errorMessage}
                </p>
              )}
              {uploadMessage && (
                <p className="border border-sky-200 bg-sky-50 p-4 font-body text-sm text-sky-800">
                  {uploadMessage}
                </p>
              )}
              {successMessage && (
                <p className="border border-green-200 bg-green-50 p-4 font-body text-sm text-green-800">
                  {successMessage}
                </p>
              )}
            </div>
          )}

          {!isFormValid && (
            <p className="border border-amber-200 bg-amber-50 p-4 font-body text-sm text-amber-900">
              To enable {isEditing ? 'Update' : 'Create'} product, complete:{' '}
              {missingRequirements.join(', ')}.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={
                !isFormValid ||
                isSaving ||
                isUploadingExample ||
                isUploadingDesign ||
                isDeletingFile
              }
              className="btn-ocean justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                  ? 'Update product'
                  : 'Create product'}
            </button>
            <Link href="/admin/products" className="btn-secondary justify-center">
              Cancel
            </Link>
          </div>

          {isEditing && savedProductDetail && (
            <section className="mt-8 border border-red-200 bg-red-50 p-6">
              <h2 className="font-display text-3xl text-black">Danger zone</h2>
              <p className="mt-3 font-body text-sm leading-relaxed text-red-900/80">
                Permanent deletion removes this product, its variants, size guides, photos,
                print-ready files, countries, and shipping overrides. It is only allowed when the
                product is inactive and has never appeared in an order.
              </p>
              {form.isActive && (
                <p className="mt-4 border border-red-200 bg-white p-3 font-body text-sm font-semibold text-red-800">
                  Deactivate and save the product before permanent deletion becomes available.
                </p>
              )}
              <label className="mt-5 block max-w-xl">
                <span className="mb-2 block font-body text-sm font-semibold text-black">
                  Type {savedProductDetail.product.name} to confirm
                </span>
                <input
                  value={deleteProductConfirmation}
                  onChange={(event) => setDeleteProductConfirmation(event.target.value)}
                  disabled={form.isActive || isDeletingProduct}
                  className="w-full border border-red-200 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-red-500 disabled:bg-black/[0.04] disabled:text-black/40"
                />
              </label>
              {deleteProductError && (
                <p className="mt-3 font-body text-sm font-semibold text-red-800">
                  {deleteProductError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handlePermanentProductDelete()}
                disabled={
                  form.isActive ||
                  isDeletingProduct ||
                  deleteProductConfirmation !== savedProductDetail.product.name
                }
                className="mt-4 border border-red-700 bg-red-700 px-5 py-3 font-body text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingProduct ? 'Deleting permanently...' : 'Delete product permanently'}
              </button>
            </section>
          )}
        </form>
      </section>
    </div>
  );
}
