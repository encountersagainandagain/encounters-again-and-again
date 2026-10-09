import type {ContentBlock} from '@/features/encounters/public-content';
import type {Row} from '@/features/encounters/presentation';
import {EditorialBlocks} from './EditorialBlocks';
import {Scribble} from './EditorialPieces';

// Presentation adapters for confirmed source blocks. Text and media stay in the CMS.
export function CrewIntroduction({blocks,media}:{blocks:ContentBlock[];media:Row[]}){
  const pick=(...ids:string[])=>blocks.filter(b=>ids.includes(b.source_block_id||''));
  if(!blocks.some(b=>b.source_block_id==='team_002'))return <EditorialBlocks blocks={blocks} media={media}/>;
  return <><div className="crew-story-title"><EditorialBlocks blocks={pick('team_002')} media={media}/><Scribble/></div><div className="crew-story-copy"><EditorialBlocks blocks={pick('team_004')} media={media}/></div><div className="imported-pair"><EditorialBlocks blocks={pick('team_003','team_005')} media={media}/></div><div className="crew-story-copy"><EditorialBlocks blocks={pick('team_006')} media={media}/></div><EditorialBlocks blocks={blocks.filter(b=>!b.source_block_id)} media={media}/></>;
}
export function WildWondersStory({blocks,media}:{blocks:ContentBlock[];media:Row[]}){
  const pick=(...positions:number[])=>blocks.filter(b=>positions.some(i=>b.source_block_id===`wild_wonders_${String(i).padStart(3,'0')}`));
  return <div className="wild-wonders-story"><div className="profile-opening"><EditorialBlocks blocks={pick(0)} media={media}/><EditorialBlocks blocks={pick(1,2,3)} media={media}/></div><section className="profile-book"><EditorialBlocks blocks={pick(4,5)} media={media}/><div className="profile-opening"><div className="imported-pair"><EditorialBlocks blocks={pick(6,8)} media={media}/></div><EditorialBlocks blocks={pick(7,9)} media={media}/></div></section><EditorialBlocks blocks={pick(10)} media={media}/><div className="imported-pair"><EditorialBlocks blocks={pick(11,12)} media={media}/></div><EditorialBlocks blocks={pick(13)} media={media}/><div className="imported-pair"><EditorialBlocks blocks={pick(14,15)} media={media}/></div><EditorialBlocks blocks={blocks.filter(b=>!/^wild_wonders_\d{3}$/.test(b.source_block_id||''))} media={media}/></div>;
}
