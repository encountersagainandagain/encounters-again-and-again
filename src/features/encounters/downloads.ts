// No imports: scripts/check-downloads.mjs runs this file on its own.
// Files offered for download (a book as PDF or EPUB): they live in the Media library with the images.
type Row=Record<string,unknown>;
export const documentTypes:Record<string,string>={'application/pdf':'PDF','application/epub+zip':'EPUB'};
export const isDocument=(mime:unknown)=>typeof mime==='string'&&mime in documentTypes;
export const isImage=(mime:unknown)=>typeof mime!=='string'||!mime||mime.startsWith('image/');
export function sizeLabel(bytes:unknown){const b=Number(bytes)||0;if(!b)return '';return b>=1048576?`${(b/1048576).toFixed(b>=10485760?0:1)} MB`:`${Math.max(1,Math.round(b/1024))} KB`;}
// The file kind from its name when the browser gives no type (EPUB often arrives without one).
export function documentMime(name:string,type:string){if(type in documentTypes)return type;const ext=name.toLowerCase().split('.').pop();return ext==='pdf'?'application/pdf':ext==='epub'?'application/epub+zip':'';}
// The files of a block or a book, in order, as the page shows them: those that exist and are documents.
export function downloadsOf(list:unknown,media:Row[]){
  return (Array.isArray(list)?list:[]).flatMap(x=>{const item=(x||{}) as Row;const m=media.find(r=>r.id===item.media_id);
    if(!m||!isDocument(m.mime_type))return [];const kind=documentTypes[String(m.mime_type)];
    return [{id:String(m.id),label:String(item.label||'').trim()||`Download ${kind}`,kind,size:sizeLabel(m.bytes),href:`/api/media/${String(m.id)}?download=1`}];});
}
