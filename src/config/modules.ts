/** Product scope, not authorization. Auth and RLS remain mandatory. */
export const modules = {
  cms: true,
  media: true,
  newsletter: true,
  contact: true,
  crew: true,
  art: true,
  expeditions: true,
  workshops: true,
  messages: true,
  stories: true,
  upcoming: true,
  commerce: false,
  donations: false,
  providers: false,
  campaigns: false,
  reviews: false,
  affiliates: false,
  destinations: false,
  engagement: false,
  gallery: false,
  analytics: false,
  contactForm: false,
} as const;

export type ModuleName = keyof typeof modules;

export function assertModuleEnabled(module: ModuleName): void {
  if (!modules[module]) throw new Error(`Module ${module} is disabled for Encounters.`);
}
