/** Target contracts for PASO 3; these are not assertions about installed SQL. */
export type ContentStatus = 'draft' | 'published';
export type ContentKind = 'artwork' | 'expedition' | 'workshop' | 'message' | 'story' | 'crew_member';
export type ActivityState = 'upcoming' | 'running' | 'finished' | 'postponed' | 'cancelled';
export type SignupState = 'open' | 'closed' | 'full' | 'not_applicable';
export type MediaReference = {
  id: string; storagePath: string; alt: string; width: number | null; height: number | null;
  focalX: number; focalY: number; fit: 'cover' | 'contain'; credit: string | null;
};
export type Contributor = { crewMemberId: string; role: string; position: number };
export type CrewMember = {
  id: string; slug: string; name: string; alias: string | null; role: string;
  bio: string; portraitId: string | null; status: ContentStatus; position: number;
  hasPage: boolean; pagePostId: string | null; quote: string | null;
  links: { label: string; url: string }[];
};
export type ArtCategory = {
  id: string; slug: string; name: string; position: number; status: ContentStatus;
  layout: 'gallery' | 'feature' | 'video' | 'audio'; coverId: string | null;
  title: string; lead: string; body: string; credit: string;
};
export type ExpeditionNeed = {
  id: string; title: string; description: string; state: 'open' | 'fulfilled' | 'closed';
  kind: 'person' | 'equipment' | 'funding' | 'other'; contactUrl: string | null;
};
export type WorkshopSession = {
  id: string; title: string; body: string; position: number;
  heldOn: string | null; place: string | null; mediaId: string | null;
};
export type ActivityDetails = {
  lifecycle: ActivityState; startsOn: string | null; endsOn: string | null;
  place: string | null; dateLabel: string | null; availabilityLabel: string | null;
  ctaLabel: string | null; homeRank: number | null;
};
export type WorkshopDetails = ActivityDetails & {
  signupState: SignupState; signupUrl: string | null; audienceNote: string | null;
  materials: string[]; sessions: WorkshopSession[];
};
export type UpcomingItem = {
  id: string; status: ContentStatus; position: number; date: string | null;
} & ({ postId: string; announcement: null } | {
  postId: null; announcement: { title: string; body: string; mediaId: string | null };
});
export type PostRelation = {
  sourcePostId: string; targetPostId: string; kind: 'report' | 'related'; position: number;
};
export type HomeSection = {
  id: 'projects' | 'upcoming' | 'stories' | 'art' | 'crew' | 'about' | 'newsletter';
  enabled: boolean; position: number; featuredIds: string[];
};
