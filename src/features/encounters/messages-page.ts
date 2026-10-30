import {lines} from './activities';
import {string,type Row} from './presentation';
// The Meaningful Messages page: its search engine texts, shared by the public page and the admin.

// Written from the page's own content (illustrated phrases, poems and short stories about the ocean, free to read).
// The editor rewrites them in Meaningful Messages page → Search engines; an empty field falls back to these.
export const messagesSeo={
  title:'Meaningful Messages: Illustrated Words About the Ocean',
  description:'Illustrated messages, poems and short stories from the Encounters crew about the ocean, its animals and the encounters that change us. Free to read.',
  topics:['Illustrated messages','Ocean poetry','Illustrated stories','Ocean animals','Marine conservation','Art and nature'],
};
export function messagesSeoOf(settings:Row){
  const topics=lines(settings.seo_topics);
  return {title:string(settings.seo_title)||messagesSeo.title,description:string(settings.meta_description)||messagesSeo.description,topics:topics.length?topics:messagesSeo.topics};
}
