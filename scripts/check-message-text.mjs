// A Meaningful Message saved before its text had parts must read as the site showed it (phrase as the title, the
// additional text as texts, the credit in italics); a saved message-text block wins; the old columns follow the parts.
import assert from 'node:assert/strict';
import {isMessageText,legacyPieces,messageBlock,messageColumns,messagePieces,plainText} from '../src/features/encounters/message-text.ts';
const post={title:'The tide comes back'};
const detail={message:'The tide always comes back. So do we.',body:'Some days the shore looks empty.\n\nWait a few hours.',credit:'Words by Nerida'};
assert.deepEqual(legacyPieces(post,detail),[{kind:'title',text:'The tide always comes back. So do we.'},{kind:'text',text:'Some days the shore looks empty.'},{kind:'text',text:'Wait a few hours.'},{kind:'text',text:'*Words by Nerida*'}]);
assert.deepEqual(legacyPieces(post,{message:'',body:'',credit:null}),[{kind:'title',text:'The tide comes back'}]);
// Blocks from before (imported paragraphs) do not replace the phrase.
assert.deepEqual(messagePieces(post,detail,[{type:'paragraph',content:{text:'Old paragraph'}}]),legacyPieces(post,detail));
const pieces=[{kind:'title',text:'Even the **smallest** ripple'},{kind:'text',text:'Can change [tides](/art).'},{kind:'link',text:'Read the book',href:'/workshops'},{kind:'text',text:'  '}];
const block=messageBlock(pieces,'b1');
assert.equal(block.id,'b1');assert.ok(isMessageText(block));assert.equal(block.content.text,'Even the **smallest** ripple\n\nCan change [tides](/art).');
assert.deepEqual(messagePieces(post,detail,[{type:'paragraph',content:{text:'x'}},block]),[{kind:'title',text:'Even the **smallest** ripple',href:undefined},{kind:'text',text:'Can change [tides](/art).',href:undefined},{kind:'link',text:'Read the book',href:'/workshops'}]);
assert.equal(plainText('Can change [tides](/art), ++really++ *now*.'),'Can change tides, really now.');
assert.deepEqual(messageColumns(pieces),{message:'Even the smallest ripple',body:'Can change tides.',credit:null});
assert.deepEqual(messageColumns([{kind:'text',text:'Only text'}]),{message:'Only text',body:'',credit:null});
console.log('message text: ok');
