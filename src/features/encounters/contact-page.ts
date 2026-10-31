import {lines} from './activities';
import {string,type Row} from './presentation';
// The Contact page: its search engine texts, shared by the public page and the admin.

// Written from the page's own content (who writes to the collective and what about). The editor rewrites them in
// Contact page → Search engines; an empty field falls back to the Contact page's SEO, then to these.
export const contactSeo={
  title:'Contact Encounters: Expeditions, Workshops and Art',
  description:'Write to the Encounters crew about joining an expedition, booking a workshop, an art collaboration or supporting the project. We write back ourselves.',
  topics:['Contact','Join an expedition','Book a workshop','Art collaboration','Support ocean conservation'],
};
export function contactSeoOf(settings:Row,page?:Row|null){
  const topics=lines(settings.seo_topics);
  return {title:string(settings.seo_title)||string(page?.seo_title)||contactSeo.title,description:string(settings.meta_description)||string(page?.meta_description)||contactSeo.description,topics:topics.length?topics:contactSeo.topics};
}
