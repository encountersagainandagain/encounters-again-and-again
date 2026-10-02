export type PodProvider = 'printful' | 'printify';

export type PodColor = {
  name: string;
  code: string;
};

export type PodVariant = {
  provider: PodProvider;
  providerVariantId: number;
  color: string;
  colorCode: string;
  size: string;
  availableUS: boolean;
  baseCostCents: number;
};

export type PodBaseProduct = {
  provider: PodProvider;
  providerCatalogProductId: number;
  name: string;
  colors: PodColor[];
  sizes: string[];
  variants: PodVariant[];
};
