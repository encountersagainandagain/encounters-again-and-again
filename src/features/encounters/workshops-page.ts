import {lines} from './activities';
import {string,type Row} from './presentation';
// The Workshops program page (Artsy Animals): its search engine texts, shared by the public page and the admin.

// Written from the page's own text (the book Encounters turned into workshops about animals, art and how to help them).
// The editor rewrites them in Workshops page → Search engines; an empty field falls back to the program page's SEO,
// then to these.
export const workshopsSeo={
  title:'Artsy Animals: Art Workshops About Ocean Animals',
  description:'Creative workshops grown from the little big book Encounters: drawing and learning about ocean animals, how to help them and what we feel when we meet them.',
  topics:['Art workshops','Drawing workshops for kids and families','Ocean animals','Marine conservation education','Environmental education','Workshops for schools and groups','Nature and art'],
};
export function workshopsSeoOf(settings:Row,page?:Row|null){
  const topics=lines(settings.seo_topics);
  return {title:string(settings.seo_title)||string(page?.seo_title)||workshopsSeo.title,description:string(settings.meta_description)||string(page?.meta_description)||workshopsSeo.description,topics:topics.length?topics:workshopsSeo.topics};
}
