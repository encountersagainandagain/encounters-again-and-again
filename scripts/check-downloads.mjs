// Downloads: a file's kind from its type or name, its size in words, and the files a block or book offers.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-dl-'));fs.copyFileSync('src/features/encounters/downloads.ts',path.join(tmp,'downloads.ts'));
const {documentMime,sizeLabel,downloadsOf,isDocument,isImage}=await import(pathToFileURL(path.join(tmp,'downloads.ts')).href);
assert.equal(documentMime('Book.EPUB',''),'application/epub+zip');assert.equal(documentMime('a.pdf','application/pdf'),'application/pdf');assert.equal(documentMime('a.docx',''),'');
assert.equal(sizeLabel(2400000),'2.3 MB');assert.equal(sizeLabel(15*1048576),'15 MB');assert.equal(sizeLabel(900),'1 KB');assert.equal(sizeLabel(0),'');
assert.ok(isDocument('application/pdf')&&!isDocument('image/png'));assert.ok(isImage('image/webp')&&!isImage('application/pdf'));
const media=[{id:'p',mime_type:'application/pdf',bytes:2400000},{id:'e',mime_type:'application/epub+zip',bytes:1048576},{id:'i',mime_type:'image/png',bytes:10}];
const d=downloadsOf([{media_id:'p'},{media_id:'e',label:' Get the EPUB '},{media_id:'i'},{media_id:'gone'}],media);
assert.deepEqual(d.map(x=>[x.label,x.kind,x.size,x.href]),[['Download PDF','PDF','2.3 MB','/api/media/p?download=1'],['Get the EPUB','EPUB','1.0 MB','/api/media/e?download=1']]);
fs.rmSync(tmp,{recursive:true,force:true});console.log('downloads: ok');
