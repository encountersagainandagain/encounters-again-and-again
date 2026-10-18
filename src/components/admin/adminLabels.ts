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

// Entries for creating content: each opens the editor with its type fixed.
export const newKinds:[string,string][]=[['artwork','New artwork'],['expedition','New expedition'],['workshop','New workshop'],['message','New message'],['news','New news post'],['expedition_report','New expedition report'],['workshop_report','New workshop report']];
export const kindListLabels:Record<string,string>={artwork:'Art works',expedition:'Expeditions',expedition_report:'Expedition results',workshop:'Workshops',workshop_report:'Workshop results',message:'Meaningful Messages',news:'News',crew_member:'Crew pages',page:'Pages'};
export const tableLabels:Record<string,string>={posts:'All content',crew_members:'Crew · People',art_categories:'Art · Categories',upcoming_items:'Announcements',expedition_cards:'Expedition cards',media:'Media library'};
export const tableLabel=(table:string)=>tableLabels[table]||table;

// How people credited on a content are named, and where that credit shows.
export const creditLabels:Record<string,{title:string;lead:string;role:string}>={
  artwork:{title:'Authors',lead:'Shown on the work page with links to their pages. The work also appears on the personal page of each author once both are published.',role:'Contribution, e.g. Illustration'},
  workshop:{title:'Facilitators',lead:'Shown with the workshop. It also appears on each facilitator’s personal page.',role:'e.g. Facilitator'},
  expedition:{title:'Participants',lead:'Crew who took part. The expedition appears on each participant’s personal page.',role:'e.g. Captain, Photography'},
  message:{title:'Credits',lead:'People who made this message. It appears on their personal pages.',role:'e.g. Illustration'},
};
export const defaultCredit={title:'Credited crew',lead:'People credited for this content. It appears on their personal pages.',role:'Role (optional)'};

// Help that changes with the type of content.
export const kindHelp:Record<string,Record<string,string>>={
  artwork:{title:'Name of the work.',slug:'Last part of the address: /art/category/this-part.',kicker:'Small line above the title. If empty, the category name is used.',excerpt:'One or two sentences shown beside the authors and when the work is shared.',cover_id:'Optional large image for the top of the work page. If empty, the main image of the work is used.',meta_line:'Optional line under the title, e.g. year or technique.',show_index:'Lists the headings of the text at the top. Rarely needed for a work.'},
  expedition:{title:'Name of the expedition.',excerpt:'Short summary used in the Expeditions list and when shared.'},
  workshop:{title:'Name of the workshop.',excerpt:'Short summary used in the Workshops list and when shared.'},
  message:{title:'Title of the message.'},
  news:{title:'Headline of the news post.',excerpt:'Short summary used in lists and when shared.'},
  page:{slug:'Address of this permanent page. Changing it can break existing links.'},
  crew_member:{title:'Internal title of the personal page. The page shows the person’s artistic name or name.',slug:'Internal address of the page content. The public address uses the person’s slug: /crew/…'},
};
help.featured='Publishing makes it visible on its own page. It does not put it first on Home; tick this to feature it there.';
help.home_rank='Order among the featured items on Home. Lower numbers appear first. Empty: after the numbered ones.';
help.post_id='Content this notice points to, such as an expedition or workshop. Its title and dates are used, so nothing is duplicated.';
