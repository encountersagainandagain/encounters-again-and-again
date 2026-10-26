// Labels and help texts for the administration. Field keys and data stay as defined in cms-fields.
export const kindLabels:Record<string,string>={page:'Page',crew_member:'Personal page',expedition:'Expedition',workshop:'Workshop',artwork:'Artwork',message:'Meaningful message',news:'News',expedition_report:'Expedition report',workshop_report:'Workshop report'};
export const kindLabel=(kind:unknown)=>kindLabels[String(kind)]||String(kind||'—');
// Singular names for create buttons and new-record titles.
export const singular:Record<string,string>={posts:'content',crew_members:'crew member',art_categories:'art category',upcoming_items:'announcement',expedition_cards:'expedition card',media:'image'};
export const optionText=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1).replace(/_/g,' ');
export const blockLabels:Record<string,string>={paragraph:'Paragraph',heading:'Heading',image:'Image','image-pair':'Two images',quote:'Quote',divider:'Divider',link:'Simple link',youtube:'YouTube video',toc:'Post index',carousel:'Carousel',source:'Source links',list:'Title + list',quick_facts:'Quick facts',costs:'Cost breakdown',faq:'FAQs',accordion:'Accordion'};
export const blockLabel=(type:unknown)=>blockLabels[String(type)]||String(type);

export const postGroups={
  general:['title','slug','subtitle','kicker','excerpt','meta_line'],
  cover:['cover_id','cover_alt'],
  publication:['status','published_at','sort','featured','home_rank','show_index'],
  seo:['seo_title','meta_description'],
};
// Entity fields shown beside the form, in the publication card.
export const entitySide=['status','sort','featured','has_page','listed','page_post_id'];

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
  name:'The person’s name, as on The Crew page. On the personal page it makes the small line of the banner, “meet <first name>”, unless that page sets its own.',
  alias:'Large title of the personal page banner, e.g. Wild Wonders. Empty: the Name.',
  role:'Short role, for example “Co-founder”.',
  bio:'Short biography on the card of The Crew page (/crew). Not shown on the personal page.',
  highlight:'One line in italics under the biography on The Crew page, e.g. “Above all, a curious soul always drawn to the sea.”',
  favourite_animal:'Shown at the bottom of the card on The Crew page as “Favourite animal”, e.g. Orca.',
  quote:'Not shown on The Crew page. Kept for other uses.',
  portrait_id:'Portrait on The Crew page. Also the banner photo of the personal page when that page has none of its own.',
  has_page:'Gives this person a profile page. It becomes public once its profile content is published.',listed:'Untick to take the person off The Crew page and the Home strip without deleting anything: their personal page keeps working at its address, and their credits stay.',
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
  social_links:'Optional links shown on the profile.',
  activity_status:'Upcoming and running activities show their date, place and contact button; finished ones link to their result.',
  outcome:'Two or three lines on how it went. Shown on the card once the activity is finished, before the link to its result.',
  note_title:'Title of the note in the left column, e.g. “Who it is for” or “A note about the stall”.',
  audience_note:'Short text under the note title.',
  materials:'One item per line. Shown in the workshop page under “What to bring”.',
  date_label:'Date as it should read, e.g. “October 2026”. If empty, the dates are used.',
  availability_label:'Short state, e.g. “Two spots left” or “Free · drop in”. Shown on Home.',
  underwater_id:'Second image of the Expeditions banner, revealed in strips while scrolling.',
  bullets:'One item per line. Shown as a numbered list instead of the text.',
  media_side:'Side of the card where the image goes. Empty: it alternates, starting on the left.',
  theme:'Dark is the closing card of the Expeditions banner (the fundraiser in the prototype).',
  registration_status:'Open shows the registration button when there is a registration email.',
  signup_email:'Address that receives registrations. The button opens the visitor’s email app.',
  place:'Where it happens.',
};

// Entries for creating content: each opens the editor with its type fixed.
export const newKinds:[string,string][]=[['artwork','New artwork'],['expedition','New expedition'],['workshop','New workshop'],['message','New message'],['news','New news post'],['expedition_report','New expedition report'],['workshop_report','New workshop report']];
export const kindListLabels:Record<string,string>={artwork:'Art works',expedition:'Expeditions',expedition_report:'Expedition results',workshop:'Workshops',workshop_report:'Workshop results',message:'Meaningful Messages',news:'News',crew_member:'Personal pages',page:'Pages'};
export const tableLabels:Record<string,string>={posts:'All content',crew_members:'Crew',art_categories:'Art · Categories',upcoming_items:'Announcements',expedition_cards:'Expedition cards',media:'Media library'};
export const tableLabel=(table:string)=>tableLabels[table]||table;

// How people credited on a content are named, and where that credit shows.
export const creditLabels:Record<string,{title:string;lead:string;role:string}>={
  artwork:{title:'Authors',lead:'Shown on the work page with links to their pages. The work also appears on the personal page of each author once both are published.',role:'Contribution, e.g. Illustration'},
  workshop:{title:'Facilitators',lead:'Shown with the workshop. It also appears on each facilitator’s personal page.',role:'e.g. Facilitator'},
  expedition:{title:'Participants',lead:'Crew who took part. The expedition appears on each participant’s personal page.',role:'e.g. Captain, Photography'},
  message:{title:'Credits',lead:'People who made this message. It appears on their personal pages.',role:'e.g. Illustration'},
};
// Credited crew of a personal page: the people this person works with, at the end of the page.
export const crewPageCredit={title:'Credited crew',lead:'Other crew members this person works with. They are shown at the end of the personal page, each with the text you write as a comment.',role:'Comment, e.g. Co-author of the Encounters book'};
export const defaultCredit={title:'Credited crew',lead:'People credited for this content. It appears on their personal pages.',role:'Role (optional)'};

// Sections of The Crew page (The Crew.dc.html). Blocks of the Team page say where they go.
export const crewSections:[string,string,string][]=[
  ['opening','Opening title','The large title under the cover, e.g. “Following our nature”. Use one heading.'],
  ['story','Story','A heading becomes the small line above the text; paragraphs follow with their style.'],
  ['pair','Photo pair','Two images shown side by side while the page scrolls.'],
  ['project','Project','A heading on the left and its text on the right.'],
  ['extra','Extra content','Any other block, shown after the project section.'],
  ['','Not shown','Kept in the page but not displayed.'],
];
export const crewStyles:[string,string][]=[['lead','Lead (larger serif)'],['body','Body text'],['aside','Continues the previous line, in italics'],['closing','Closing line in italics']];
// Help that changes with the type of content.
export const kindHelp:Record<string,Record<string,string>>={
  artwork:{title:'Name of the work.',slug:'Last part of the address: /art/category/this-part.',kicker:'Small line above the title. If empty, the category name is used.',excerpt:'One or two sentences shown beside the authors and when the work is shared.',cover_id:'Optional large image for the top of the work page. If empty, the main image of the work is used.',meta_line:'Optional line under the title, e.g. year or technique.',show_index:'Lists the headings of the text at the top. Rarely needed for a work.'},
  expedition:{title:'Name of the expedition.',excerpt:'Short summary used in the Expeditions list and when shared.'},
  workshop:{title:'Name of the workshop.',excerpt:'Short summary used in the Workshops list and when shared.',subtitle:'Large grey line under the title on the Workshops page, e.g. “two afternoons”. Empty: the number of sessions.',
    activity_status:'Where the workshop stands. Independent from registration: an upcoming workshop can already be full.',
    registration_status:'Open shows the join button (the registration email, or Contact). Full and Closed show that state and no button. Not applicable hides it.',
    cta_label:'Text of the button on Home, e.g. “Join this workshop”.',availability_label:'Short chip on Home, e.g. “Free · drop in” or “Full”.',
    language:'Optional. Shown on the workshop page.',modality:'Optional, e.g. In person. Shown on the workshop page.',includes:'Optional. Shown on the workshop page under “What is included”.',
    price:'Optional. 0 shows “Free”. Shown with the currency on the workshop page.',currency:'e.g. AUD. Used with the price.',capacity:'Optional number of places. Shown on the workshop page.',
    signup_subject:'Subject of the registration email. Empty: the workshop title.',signup_label:'Text of the join button on the workshop page. Empty: “Join the workshop”.',
    outcome:'Two or three lines on how it went. Shown on the finished card on Workshops, before “See the result”.'},
  message:{title:'Internal title and page title of the message. The Messages page shows the message itself.',slug:'Address of its own page: /meaningful-messages/this-part.',excerpt:'Optional. Used when the message page is shared.',
    sort:'Order on the Messages page. Lower numbers come first; sides alternate (illustration left, then right).',cover_id:'Optional image for the top of its own page. If empty, the illustration is used where an image is needed.',
    message:'The phrase shown large, e.g. “Even the smallest ripple can change tides.” Empty: the title.',body:'Optional. Two or three lines under the phrase.',
    illustration_id:'Vertical illustration shown at full screen height beside the message. Empty: the cover image.',credit:'Optional line in italics under the text, e.g. who drew it. Empty: nothing is shown.'},
  news:{title:'Headline of the news post.',excerpt:'Short summary used in lists and when shared.'},
  page:{slug:'Address of this permanent page. Changing it can break existing links.'},
  crew_member:{title:'Name of this page in the admin. The banner title comes from Crew → “Alias / project”.',excerpt:'Summary used in lists and when the link is shared. Not shown on the page.',slug:'Internal address of the page content. The public address uses the person’s slug: /crew/…'},
};
help.featured='Publishing makes it visible on its own page. It does not put it first on Home; tick this to feature it there.';
help.home_rank='Order among the featured items on Home. Lower numbers appear first. Empty: after the numbered ones.';
help.post_id='Content this notice points to, such as an expedition or workshop. Its title and dates are used, so nothing is duplicated.';
