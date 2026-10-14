// Labels and help texts for the administration. Field keys and data stay as defined in cms-fields.
export const kindLabels:Record<string,string>={page:'Page',crew_member:'Crew profile',expedition:'Expedition',workshop:'Workshop',artwork:'Artwork',message:'Meaningful message',news:'News',expedition_report:'Expedition report',workshop_report:'Workshop report'};
export const kindLabel=(kind:unknown)=>kindLabels[String(kind)]||String(kind||'—');
// Singular names for create buttons and new-record titles.
export const singular:Record<string,string>={posts:'content',crew_members:'crew member',art_categories:'art category',upcoming_items:'announcement',expedition_cards:'expedition card',media:'image'};
export const optionText=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1).replace(/_/g,' ');
export const blockLabels:Record<string,string>={paragraph:'Paragraph',heading:'Heading',image:'Image','image-pair':'Image pair',quote:'Quote',divider:'Divider',link:'Link',youtube:'YouTube video',toc:'Table of contents',carousel:'Carousel',source:'Source links'};
export const blockLabel=(type:unknown)=>blockLabels[String(type)]||String(type);

export const postGroups={
  general:['title','slug','subtitle','kicker','excerpt','meta_line'],
  cover:['cover_id','cover_alt'],
  publication:['status','published_at','sort','featured','home_rank','show_index'],
  seo:['seo_title','meta_description'],
};
// Entity fields shown beside the form, in the publication card.
export const entitySide=['status','sort','featured','has_page','page_post_id'];

export const help:Record<string,string>={
  title:'Main title shown on the page and in lists.',
  slug:'Part of the web address. Use lowercase words joined with hyphens.',
  status:'Drafts are private. Published content is visible to everyone.',
  subtitle:'Optional line shown under the title.',
  kicker:'Small line above the title on the cover.',
  excerpt:'Short summary used in cards and when the page is shared.',
  meta_line:'Short information line, such as dates or a place.',
  seo_title:'Title for search engines and shared links. Leave empty to use the main title.',
  meta_description:'One or two sentences for search results and shared links.',
  cover_id:'Large image at the top of the page.',
  cover_alt:'Describe the cover for people who cannot see it.',
  sort:'Lower numbers appear first.',
  featured:'Highlight it in the featured places of the site.',
  home_rank:'Order among featured content on Home. Lower numbers appear first.',
  published_at:'Date shown with the content.',
  show_index:'Shows an “In this post” list built from the headings.',
  name:'Name as it should appear on the site.',
  alias:'Project or artist name used as the profile title, if any.',
  role:'Short role, for example “Co-founder”.',
  bio:'Biography for the Crew page. A sentence starting with “Above all” is shown in italics.',
  quote:'A “Label: value” line, for example “Favourite animal: Orca”. The value is highlighted.',
  portrait_id:'Portrait used on the Crew page.',
  has_page:'Gives this person a profile page. It becomes public once its profile content is published.',
  page_post_id:'Content that holds the blocks of the profile page.',
  number_label:'Small label such as “01”.',
  credit:'Author or photographer credit.',
  lead:'Introduction shown at the top.',
  body:'Main text.',
  cta_label:'Text of the button or link.',
  cta_url:'Where the button or link goes.',
  layout:'How the works are arranged: gallery, feature, video or audio.',
  alt:'Describe the image for people who cannot see it.',
  focal_x:'Point that stays visible when the image is cropped: 0 is the left edge, 1 the right edge.',
  focal_y:'0 is the top edge, 1 the bottom edge.',
  fit:'Cover fills the frame and may crop; contain always shows the whole image.',
  post_id:'Existing content this item links to.',
  starts_on:'Start date.',
  ends_on:'End date.',
  media_id:'Image shown with this item.',
  category_id:'Collection where the work appears.',
  caption:'Short text shown with the work.',
  external_url:'Optional link to see the work elsewhere.',
  embed_kind:'Choose YouTube or Spotify to embed a player.',
  embed_id:'Only the identifier of the video or episode, not the full address.',
  span:'How many of the six grid columns the work takes.',
  full_height:'Shows the image at full screen height.',
  signature:'Short signature line.',
  media_side:'Side of the card where the image goes.',
  theme:'Light or dark card.',
  social_links:'Optional links shown on the profile.',
};
