export type AboutPageImageDefinition = {
  id: string;
  label: string;
  src: string | null;
  defaultAlt: string;
  defaultCaption: string;
  recommendedSize: string;
  previewAspectClass: string;
  supportsCaption: boolean;
};

export const aboutPageImages: AboutPageImageDefinition[] = [];

export function getAboutPageImageDefinition(id: string) {
  return aboutPageImages.find((image) => image.id === id);
}
