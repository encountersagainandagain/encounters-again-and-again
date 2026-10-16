import React from 'react';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {ArtworkCards,Responsible,CategorySection} from '../src/components/public/ArtViews';
import {ArtIndex} from '../src/components/public/ArtIndex';
import {EditorialBlocks} from '../src/components/public/EditorialBlocks';
import type {EditorialData} from '../src/features/encounters/editorial-data';
// In-memory fixtures only: these never enter Supabase or public routes.
const data={posts:[{id:'work',kind:'artwork',slug:'fixture',title:'Test work',status:'published',sort:0,featured:false},{id:'profile-a',kind:'crew_member',status:'published'},{id:'profile-b',kind:'crew_member',status:'published'}],categories:[{id:'category',name:'Test collection',slug:'fixture-category',status:'published',layout:'gallery'}],artworks:[{id:'work',category_id:'category',span:3}],crew:[{id:'a',name:'Test person A',slug:'person-a',status:'published',has_page:true,page_post_id:'profile-a'},{id:'b',name:'Test person B',slug:'person-b',status:'published',has_page:true,page_post_id:'profile-b'}],contributors:[{post_id:'work',crew_member_id:'a',position:0},{post_id:'work',crew_member_id:'b',position:1}],relations:[],media:[],settings:{}} as unknown as EditorialData;
const html=renderToStaticMarkup(<ArtworkCards posts={[data.posts[0]]} data={data}/>);
// Cards follow Art.dc.html: image and caption open the work; authors are credited on the work page.
assert.ok(html.includes('href="/art/fixture-category/fixture"'));
const credits=renderToStaticMarkup(<Responsible postId="work" data={data}/>);for(const url of ['/crew/person-a','/crew/person-b'])assert.ok(credits.includes(`href="${url}"`));
data.crew[1].has_page=false;
const by=renderToStaticMarkup(<Responsible postId="work" data={data}/>);assert.ok(by.includes('Test person B'));assert.ok(!by.includes('href="/crew/person-b"'));
const empty=renderToStaticMarkup(<CategorySection category={data.categories[0]} posts={[]} data={data}/>);assert.ok(empty.includes('No published works'));
const cats=Array.from({length:5},(_,i)=>({id:String(i),slug:`category-${i}`,name:`Fixture ${i}`}));
const carousel=renderToStaticMarkup(<ArtIndex categories={cats} cards={cats.map(c=><span key={c.id}>{c.name}</span>)} sections={cats.map(c=><div key={c.id} id={`category-${c.slug}`}>{c.name}</div>)}/>);assert.ok(carousel.includes('More categories'));assert.ok(carousel.includes('category-rail'));assert.ok(carousel.includes('Filter art'));
const blocks=renderToStaticMarkup(<EditorialBlocks media={[]} blocks={[{id:'poem',type:'paragraph',position:0,content:{text:'Line one\n\nLine two'}},{id:'video',type:'youtube',position:1,content:{video_id:'abcdefghijk'}}]}/>);assert.ok(blocks.includes('Line one\n\nLine two'));assert.ok(!blocks.includes('<iframe'));assert.ok(blocks.includes('Play video'));
console.log('PASS: SSR category → work → two profiles, disabled-profile links, empty categories, 5-category carousel, original line breaks and click-to-load video.');
