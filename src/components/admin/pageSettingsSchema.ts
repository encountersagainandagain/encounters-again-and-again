// What each page lets the editor change, in the order of the page (prototypes in handoff-current).
// Values live in site_settings: Home in `home`, the other pages in `pages.<key>`. Lists of content
// (activities, works, crew, posts) are never typed here: they come from published content.
export type PageField={key:string;label:string;type?:'text'|'textarea'|'media'|'gallery'|'lines'|'number'|'group'|'list'|'sections';help?:string;fields?:PageField[];max?:number;placeholder?:string};
const t=(key:string,label:string,help?:string,placeholder?:string):PageField=>({key,label,help,placeholder});
const area=(key:string,label:string,help?:string):PageField=>({key,label,type:'textarea',help});
const media=(key:string,label:string,help?:string):PageField=>({key,label,type:'media',help});
const group=(key:string,label:string,fields:PageField[],help?:string):PageField=>({key,label,type:'group',fields,help});
const list=(key:string,label:string,fields:PageField[],max:number,help?:string):PageField=>({key,label,type:'list',fields,max,help});
export type PageSchema={key:string;label:string;path:string;store:'home'|'pages';lead:string;fields:PageField[]};
export const pageSchemas:PageSchema[]=[
  {key:'home',label:'Home',path:'/',store:'home',lead:'The descent, the order of the sections and their texts. The lists (what is coming, stories, art, crew) fill themselves with published content; tick “Featured on Home” in a content to put it first.',fields:[
    {key:'sections',label:'Sections, order and visibility',type:'sections',help:'Sections without content are hidden automatically.'},
    group('hero','Banner',[t('kicker','Small line above the title','Default: Welcome to'),t('title','Title','Default: Encounters'),t('subtitle','Line under the title','Default: again and again'),t('tagline','Tagline in capitals','Hidden when empty.'),t('lead','Line under the tagline','Hidden when empty.'),t('cue','Scroll invitation','Default: follow the current …where will it lead you..')]),
    group('descent','The descent',[area('title','Title','Shown in capitals, aligned to the right. The section is hidden when title and text are empty.'),area('body','Text')]),
    group('reef','Reef',[media('media_id','Reef image','Default: the reef of the design.'),t('caption','Caption in italics'),t('place','Place')]),
    t('projects_title','Ongoing projects title','Default: Ongoing projects'),
    group('projects','Ongoing projects cards',[
      group('expeditions','Encounters Expeditions',[media('media_id','Image'),t('status_label','State','Use | to separate two parts, e.g. Sail boat | In refit'),area('body','Text','One or two sentences.')]),
      group('workshops','Artsy Animals',[media('media_id','Image'),t('status_label','State'),area('body','Text')]),
      group('messages','Meaningful Messages',[media('media_id','Image'),t('status_label','State'),area('body','Text')]),
    ],'Titles and links are fixed: each card leads to its page.'),
    t('upcoming_title','What is coming: title'),t('upcoming_note','What is coming: note'),{key:'upcoming_limit',label:'What is coming: how many',type:'number',help:'From 2 to 6. Default 4. Upcoming and running expeditions and workshops, then the announcements.'},
    t('happened_title','What already happened: title'),t('happened_note','What already happened: note'),
    t('art_title','New art: title'),{key:'art_limit',label:'New art: how many works',type:'number',help:'From 3 to 10. Default 5.'},
    t('crew_title','Crew: title'),
    group('about','About block',[t('kicker','Small line'),area('line','Phrase in italics','The block is hidden when the phrase is empty.'),area('body','Text'),t('cta_label','Button','Default: Read our story')]),
    group('newsletter','Newsletter',[t('title','Title','Default: Stay in touch'),area('body','Text')],'Subscriptions are only recorded. No email is sent from the site.'),
  ]},
  {key:'expeditions',label:'Expeditions page',path:'/expeditions',store:'pages',lead:'Banner of the Expeditions page. The cards inside the banner are edited in Expeditions → Presentation cards.',fields:[
    media('cover_id','Surface image','Default: the cover of the program page, or the design image.'),media('underwater_id','Underwater image','Revealed in six strips while scrolling.'),t('kicker','Small line above the title','Default: following our nature'),
    t('list_title','Title of the list of expeditions','Default: On the water'),t('list_note','Note of the list'),t('closing','Closing phrase','Default: May the ocean be with you')]},
  {key:'workshops',label:'Workshops page',path:'/workshops',store:'pages',lead:'Banner and closing of the Workshops page. Each workshop is edited in Workshops.',fields:[
    media('cover_id','Banner image','Default: the design image.'),t('kicker','Small line above the title','Default: artsy animals'),t('closing','Closing question','Default: Want one of these in your room?'),t('closing_cta','Closing button','It leads to Contact. Default: Write to us')]},
  {key:'messages',label:'Meaningful Messages page',path:'/meaningful-messages',store:'pages',lead:'Banner, introduction and closing. Each message is edited in Meaningful Messages → Messages.',fields:[
    media('cover_id','Banner image'),t('title','Title','Default: Meaningful messages'),t('kicker','Small line above the title','Default: a few words'),area('intro','Introduction phrase'),t('credit_line','Credit line','e.g. Illustrated by …'),t('closing','Closing phrase','Default: More to come')]},
  {key:'about',label:'About page',path:'/about',store:'pages',lead:'The About page appears once the banner title is filled in; until then the imported About text is shown.',fields:[
    t('hero_kicker','Small line above the title'),t('hero_title','Banner title'),{key:'gallery',label:'Banner photos',type:'gallery',max:6,help:'Three to six photos. They change while the page is read.'},t('credit','Photo credit','Shown vertically on the banner.'),
    list('columns','Three columns under the banner',[t('label','Label'),area('text','Text')],3),
    group('manifesto','Manifesto',[area('first','First phrase'),area('second','Second phrase, in italics on the right'),t('label','Small label'),t('big','Large words')]),
    group('how','How',[t('kicker','Small line'),area('title','Title')]),
    list('rows','Rows with list and image',[t('title','Title'),t('intro','Introduction'),{key:'items',label:'List',type:'lines',help:'One item per line.'},media('media_id','Image'),t('link_label','Link text'),t('link_url','Link','A page such as /expeditions, or a full address.')],2),
    area('belief','Belief phrase'),t('belief_emphasis','Words in italics','Part of the phrase shown in italics.'),
    t('talk_title','Contact title','Default: Talk to us'),area('talk_body','Contact text','Email, phone and social links come from General and contact.'),
  ]},
  {key:'contact',label:'Contact page',path:'/contact',store:'pages',lead:'The form appears once there is at least one topic. Messages are not sent by the site: the visitor’s email app opens addressed to the public contact email.',fields:[
    media('cover_id','Banner image','Default: the design image.'),t('title','Title','Default: Get in touch'),area('lead','Line under the title'),
    t('topics_title','Topics question','Default: What are you writing about?'),list('topics','Topics',[t('title','Topic'),t('hint','Hint'),area('reply','Thank-you text for this topic')],6),
    t('note','Note beside the button','Default: No newsletters, no lists. Just us writing back.'),
    list('links','Other ways to reach us',[t('title','Label','e.g. Read the book'),t('label','Link text'),t('url','Link','Full address. Empty links are not shown.')],4),
  ]},
];
export const homeSectionLabels:[string,string][]=[['descent','The descent'],['reef','Reef'],['projects','Ongoing projects'],['upcoming','What is coming'],['happened','What already happened'],['art','New art'],['crew','Who is on board'],['about','About'],['newsletter','Newsletter']];
