// What each page lets the editor change, in the order of the page (prototypes in handoff-current).
// Values live in site_settings: Home in `home`, the other pages in `pages.<key>`. Lists of content
// (activities, works, crew, posts) are never typed here: they come from published content.
import {cardBackgrounds,expeditionsSeo} from '@/features/encounters/expeditions-page';
import {workshopsSeo} from '@/features/encounters/workshops-page';
import {messagesSeo} from '@/features/encounters/messages-page';
import {aboutSeo} from '@/features/encounters/about-page';
import {contactSeo} from '@/features/encounters/contact-page';
// `section` only titles a part of the editor (its fields stay on the page's own values); `marked` is a text with
// B / I / U and link; `seo` is the search result editor with its previews (seo_title and meta_description); `blocks` is
// an ordered list of parts, each of one of its `kinds` (saved with its `type`).
export type PageField={key:string;label:string;type?:'text'|'textarea'|'media'|'gallery'|'lines'|'number'|'group'|'list'|'sections'|'section'|'select'|'swatches'|'marked'|'seo'|'blocks';help?:string;fields?:PageField[];kinds?:{type:string;label:string;help:string;fields:PageField[]}[];max?:number;placeholder?:string;wide?:boolean;options?:{value:string;label:string;color?:string}[];hints?:{title:string;description:string;fallbackTitle:string;fallbackDescription:string}};
const t=(key:string,label:string,help?:string,placeholder?:string):PageField=>({key,label,help,placeholder});
const area=(key:string,label:string,help?:string):PageField=>({key,label,type:'textarea',help});
const media=(key:string,label:string,help?:string):PageField=>({key,label,type:'media',help});
const group=(key:string,label:string,fields:PageField[],help?:string):PageField=>({key,label,type:'group',fields,help});
const list=(key:string,label:string,fields:PageField[],max:number,help?:string):PageField=>({key,label,type:'list',fields,max,help});
const section=(key:string,label:string,help:string,fields:PageField[]):PageField=>({key,label,type:'section',fields,help});
export type PageSchema={key:string;label:string;path:string;store:'home'|'pages';lead:string;fields:PageField[]};
export const pageSchemas:PageSchema[]=[
  {key:'home',label:'Home',path:'/',store:'home',lead:'The descent, the order of the sections and their texts. The lists (what is coming, stories, art, crew) fill themselves with published content; tick “Featured on Home” in a content to put it first.',fields:[
    {key:'sections',label:'Sections, order and visibility',type:'sections',help:'Sections without content are hidden automatically.'},
    group('hero','Banner',[t('kicker','Small line above the title','Default: Welcome to'),t('title','Title','Default: Encounters'),t('subtitle','Line under the title','Default: again and again'),t('tagline','Tagline in capitals','Hidden when empty.'),t('lead','Line under the tagline','Hidden when empty.'),t('cue','Scroll invitation','Default: follow the current …where will it lead you..')]),
    group('descent','The descent',[area('title','Title','Shown in capitals, aligned to the right. The section is hidden when title and text are empty.'),area('body','Text'),t('emphasis','Words in italics','Part of the text shown in italics, e.g. Again and again.')]),
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
  {key:'expeditions',label:'Expeditions page',path:'/expeditions',store:'pages',lead:'Everything on the Expeditions page, in the order of the page: the banner, how it appears in search engines, the cards inside the banner, the list of expeditions and the closing. Each expedition is created and edited in Expeditions; its card in the list fills itself.',fields:[
    section('banner','1 · Banner','The first screen. While scrolling, the surface photo opens in six strips onto the underwater photo.',[
      media('cover_id','Surface image','Default: the cover of the program page, or the design image. Also the image shared on social networks.'),media('underwater_id','Underwater image','Revealed in six strips while scrolling.'),t('kicker','Small line above the title','Default: following our nature'),t('title','Title','Large capitals of the banner. Default: Expeditions')]),
    section('seo','2 · Search engines (SEO)','Not shown on the page. This is what Google and other search engines read to decide when to show this page, and what people see in the results before they click: the better it says what you do, the easier it is for someone searching for conservation, research or ocean art expeditions to find you. We wrote a first version from the page’s own text; rewrite it in your words whenever you like.',[
      {key:'seo',label:'Search result',type:'seo',hints:{
        title:'The blue link in Google. Put first the words someone would type to find you, e.g. ocean conservation expeditions. Around 50–60 characters; the site adds “| Encounters Again and Again” after it',
        description:'The grey lines under the link. One or two sentences that say what the expeditions are, where, and why to click. Around 120–160 characters; longer text is cut off. Empty: the suggested text is used.',
        fallbackTitle:expeditionsSeo.title,fallbackDescription:expeditionsSeo.description}},
      {key:'seo_topics',label:'What the expeditions are about',type:'lines',help:'One topic per line, e.g. Marine conservation. Not shown on the page: search engines read them as the subjects of this page. They help, but what matters most is the visible text, so use the same words in the cards below. Empty: the suggested topics are used.'}]),
    section('cards','3 · Cards inside the banner','While the visitor scrolls the banner, these cards appear one after another over the underwater photo. Add as many as you need: each card makes the banner a little longer. Leave an empty line between paragraphs.',[
      list('cards','Cards',[
        {key:'background',label:'Background colour',type:'swatches',options:cardBackgrounds.map(b=>({value:b.key,label:b.label,color:b.color})),help:'From the site palette. On the dark colours the text turns white.'},
        t('kicker','Small line above the title (optional)','Small capitals beside the card number, e.g. The boat.'),{key:'title',label:'Title',wide:true},{key:'text',label:'Text',type:'marked',help:'Leave an empty line between paragraphs. Select words and use B, I, U or the link button.'},
        {key:'list',label:'List (optional)',type:'lines',help:'One item per line. Shown numbered under the text, e.g. the ways to support the expedition.'},
        t('signature','Signature (optional)','A short line in italics after the text, e.g. a name.'),
        t('link_label','Link text (optional)','Shown at the end of the card with an arrow, e.g. Join the expedition.'),
        t('link_url','Link','Where it leads: a full address (https://…), a page of the site (/contact), or the list of expeditions on this page (#expeditions-list). Shown only with a link text.'),
        media('media_id','Photo (optional)','Without a photo the text takes the whole card.'),
        {key:'media_side',label:'Photo side',type:'select',options:[{value:'',label:'Alternate (left, right, left…)'},{value:'left',label:'Left'},{value:'right',label:'Right'}]},
      ],12)]),
    section('list','4 · List of expeditions','After the banner. The published expeditions are grouped by their state, each group on its own colour: Coming up (white), On the water now (lagoon) and Where we have been (white), with a filter above them. The state follows each expedition’s dates (its Status card): postponed ones show with the upcoming, cancelled ones with the past.',[
      t('list_title','Title of the list','Default: On the water'),t('list_note','Note beside the title','Default: where we are going, and where we have been')]),
    section('closing','5 · Closing','The dark band at the end of the page, above the footer.',[t('closing','Closing phrase','Default: May the ocean be with you')]),
  ]},
  {key:'workshops',label:'Workshops page',path:'/workshops',store:'pages',lead:'Everything on the Workshops page, in the order of the page: the banner, how it appears in search engines, the list of workshops and the closing. Each workshop, with its sessions, is created and edited in Workshops; its screen in the list fills itself.',fields:[
    section('banner','1 · Banner','The first screen: the photo sinks and darkens while the title rises away.',[
      media('cover_id','Banner image','Default: the design image. Also the image shared on social networks.'),t('kicker','Small line above the title','Default: artsy animals'),t('title','Title','Large title of the banner. Default: the title of the program page, or Artsy Animals')]),
    section('seo','2 · Search engines (SEO)','Not shown on the page. This is what Google and other search engines read to decide when to show this page, and what people see in the results before they click: the better it says what the workshops are, for whom and where, the easier it is for a school, a family or a group looking for art or ocean workshops to find you. We wrote a first version from the page’s own text; rewrite it in your words whenever you like.',[
      {key:'seo',label:'Search result',type:'seo',hints:{
        title:'The blue link in Google. Put first the words someone would type to find you, e.g. art workshops about ocean animals. Around 50–60 characters; the site adds “| Encounters Again and Again” after it',
        description:'The grey lines under the link. One or two sentences that say what the workshops are, for whom, and why to click. Around 120–160 characters; longer text is cut off. Empty: the suggested text is used.',
        fallbackTitle:workshopsSeo.title,fallbackDescription:workshopsSeo.description}},
      {key:'seo_topics',label:'What the workshops are about',type:'lines',help:'One topic per line, e.g. Drawing workshops for kids. Not shown on the page: search engines read them as the subjects of this page. They help, but what matters most is the visible text, so use the same words in each workshop. Empty: the suggested topics are used.'}]),
    section('list','3 · List of workshops','After the banner, one screen per workshop with its sessions. The published workshops are grouped by their state, with a filter above them: Coming up (white), Happening now (lagoon) and Past workshops (white). The state follows each workshop’s dates, or the dates of its sessions (its Status card): postponed ones show with the upcoming, cancelled ones with the past.',[
      t('list_title','Title of the list','Default: Workshops'),t('list_note','Note beside the title','Default: what is coming, and what we have already made together')]),
    section('closing','4 · Closing','The band at the end of the page, above the footer.',[t('closing','Closing question','Default: Want one of these in your room?'),t('closing_cta','Closing button','It leads to Contact. Default: Write to us')]),
  ]},
  {key:'messages',label:'Meaningful Messages page',path:'/meaningful-messages',store:'pages',lead:'Edited in the order of the page: banner, search engines, introduction, the list of messages and the closing. Each message is edited in Meaningful Messages → Messages.',fields:[
    section('banner','1 · Banner','The first screen: the image darkens while the title rises away.',[
      media('cover_id','Banner image','Full-screen image behind the title. Default: the design illustration. Also the image shared on social networks.'),t('kicker','Small line above the title','Default: a few words'),t('title','Title','Large title of the banner. Default: Meaningful messages')]),
    section('seo','2 · Search engines (SEO)','Not shown on the page. This is what Google and other search engines read to decide when to show this page, and what people see in the results before they click: the better it says what the messages are, the easier it is for someone looking for illustrated ocean stories or poems to find you. We wrote a first version from the page’s own content; rewrite it in your words whenever you like.',[
      {key:'seo',label:'Search result',type:'seo',hints:{
        title:'The blue link in Google. Put first the words someone would type to find you, e.g. illustrated messages about the ocean. Around 50–60 characters; the site adds “| Encounters Again and Again” after it',
        description:'The grey lines under the link. One or two sentences that say what the messages are and why to read them. Around 120–160 characters; longer text is cut off. Empty: the suggested text is used.',
        fallbackTitle:messagesSeo.title,fallbackDescription:messagesSeo.description}},
      {key:'seo_topics',label:'What the messages are about',type:'lines',help:'One topic per line, e.g. Ocean poetry. Not shown on the page: search engines read them as the subjects of this page. They help, but what matters most is the visible text. Empty: the suggested topics are used.'}]),
    section('intro','3 · Introduction','Right after the banner, before the messages.',[
      area('intro','Introduction phrase','Large phrase with a hand-drawn line under it. Empty: the introduction is hidden.'),t('credit_line','Credit line','Small capitals under the introduction, e.g. Illustrated by … Empty: hidden.')]),
    section('list','4 · Messages','One message per screen: its illustration on one half, its text on the other, sides alternating (illustration left, then right). They appear in the order chosen in each message (Order), and only the published ones. Nothing to fill in here: each message is edited in Meaningful Messages → Messages.',[]),
    section('closing','5 · Closing','The dark band at the end of the page, above the footer.',[t('closing','Closing phrase','Default: More to come')]),
  ]},
  {key:'about',label:'About page',path:'/about',store:'pages',lead:'Everything on the About page, in the order of the page: the banner, how it appears in search engines and the blocks under the banner. The About page appears once the banner title is filled in; until then the imported About text is shown.',fields:[
    section('banner','1 · Banner','The first screen: the photos change while you read, then the photo shrinks into a band and the three columns rise under it.',[
      {key:'gallery',label:'Banner photos',type:'gallery',max:6,help:'Three to six photos. They change while the page is read. The first one is also the image shared on social networks.'},
      t('hero_kicker','Small line above the title','In italics above the title, e.g. What is our mission? Empty: hidden.'),t('hero_title','Banner title','Large capitals over the photos. Required: until it is filled the imported About text is shown.'),t('credit','Photo credit','Shown vertically on the banner. Empty: hidden.'),
      list('columns','Three columns under the banner',[t('label','Label'),area('text','Text')],3,'They rise under the photo when it shrinks. Short label in small capitals and two or three lines each. Empty columns are not shown.')]),
    section('seo','2 · Search engines (SEO)','Not shown on the page. This is what Google and other search engines read to decide when to show this page, and what people see in the results before they click: the better it says who you are and what you do, the easier it is to find you. We wrote a first version from the page’s own text; rewrite it in your words whenever you like.',[
      {key:'seo',label:'Search result',type:'seo',hints:{
        title:'The blue link in Google. Put first the words someone would type to find you, e.g. art and ocean conservation collective. Around 50–60 characters; the site adds “| Encounters Again and Again” after it',
        description:'The grey lines under the link. One or two sentences that say who you are and what you do. Around 120–160 characters; longer text is cut off. Empty: the suggested text is used.',
        fallbackTitle:aboutSeo.title,fallbackDescription:aboutSeo.description}},
      {key:'seo_topics',label:'What the page is about',type:'lines',help:'One topic per line, e.g. Ocean conservation. Not shown on the page: search engines read them as the subjects of this page. Empty: the suggested topics are used.'}]),
    section('below','3 · Below the banner','The blocks of the page, in this order. Add, move or remove them; each kind can be used more than once.',[
      {key:'blocks',label:'Blocks',type:'blocks',kinds:[
        {type:'manifesto',label:'Manifesto',help:'Reads as one sentence: the first phrase, the second one in italics on the right, then the large words.',fields:[area('first','First phrase'),area('second','Second phrase, in italics on the right'),t('label','Small label','Above the large words, e.g. What is'),t('big','Large words','The biggest words of the page, e.g. Our nature')]},
        {type:'title',label:'Title',help:'A small line and a large title, e.g. How? and what follows it.',fields:[t('kicker','Small line','e.g. How?'),area('title','Title')]},
        {type:'row',label:'List and photo',help:'A title, an introduction and a numbered list beside a photo, with an optional link. Consecutive rows alternate sides; on phones the first shows its text first and the second its photo first.',fields:[t('title','Title'),t('intro','Introduction'),{key:'items',label:'List',type:'lines',help:'One item per line.'},media('media_id','Photo'),t('link_label','Link text'),t('link_url','Link','A page such as /expeditions, or a full address.')]},
        {type:'belief',label:'Large phrase',help:'A large centred phrase.',fields:[area('text','Phrase'),t('emphasis','Words in italics','Part of the phrase shown in italics, written exactly as in the phrase.')]},
        {type:'talk',label:'Talk to us',help:'A title and a text with the email, phone and social links of Settings → General and contact, and the Write to us button to Contact.',fields:[t('title','Title','Default: Talk to us'),area('body','Text')]},
      ]}]),
  ]},
  {key:'contact',label:'Contact page',path:'/contact',store:'pages',lead:'Everything on the Contact page, in the order of the page: the banner, how it appears in search engines, the form and the other ways to reach you. Messages are not sent by the site: “Open my email app” opens the visitor’s email app with the message written to the public contact email (Settings), and the page says it still has to be sent there. The form appears once it has at least one topic; until then the imported Contact text is shown.',fields:[
    section('banner','1 · Banner','The first screen: the photo sinks and darkens while the form rises over it.',[
      media('cover_id','Banner image','Default: the design image. Also the image shared on social networks.'),t('title','Title','Default: Get in touch'),area('lead','Line under the title','Empty: hidden.')]),
    section('seo','2 · Search engines (SEO)','Not shown on the page. This is what Google and other search engines read to decide when to show this page, and what people see in the results before they click: the better it says who can write to you and about what, the easier it is to find you. We wrote a first version from the page’s own content; rewrite it in your words whenever you like.',[
      {key:'seo',label:'Search result',type:'seo',hints:{
        title:'The blue link in Google. Put first the words someone would type to find you, e.g. contact ocean art collective. Around 50–60 characters; the site adds “| Encounters Again and Again” after it',
        description:'The grey lines under the link. One or two sentences that say who can write to you and about what. Around 120–160 characters; longer text is cut off. Empty: the suggested text is used.',
        fallbackTitle:contactSeo.title,fallbackDescription:contactSeo.description}},
      {key:'seo_topics',label:'What the page is about',type:'lines',help:'One topic per line, e.g. Book a workshop. Not shown on the page: search engines read them as the subjects of this page. Empty: the suggested topics are used.'}]),
    section('form','3 · The form','The panel over the banner: the visitor picks a topic, writes name, email, where from, when and a message, and the button opens their email app. Name and email are always asked.',[
      t('topics_title','Topics question','Default: What are you writing about?'),list('topics','Topics',[t('title','Topic','Also the subject of the email.'),t('hint','Hint','A short line under the topic.'),area('reply','Text for this topic after the email app opens','e.g. We will tell you what the next crossing needs. Shown under “Send it from your email app”.')],6,'Up to six. Without topics the form is not shown.'),
      t('note','Note beside the button','Default: No newsletters, no lists. Just us writing back.')]),
    section('others','4 · Other ways to reach us','Under the form. The email, WhatsApp, donation link and social networks come from Settings → General and contact and show only when filled in there. Add here other links, such as a book or a podcast.',[
      list('links','Other links',[t('title','Label','e.g. Read the book'),t('label','Link text','Default: the address without https://'),t('url','Link','Full address. Empty links are not shown.')],4)]),
  ]},
];
export const homeSectionLabels:[string,string][]=[['descent','The descent'],['reef','Reef'],['projects','Ongoing projects'],['upcoming','What is coming'],['happened','What already happened'],['art','New art'],['crew','Who is on board'],['about','About'],['newsletter','Newsletter']];
