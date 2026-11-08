// No imports: scripts/check-seo.mjs runs this file on its own.
// A description for search results: about 155 characters at most, cut at a word, never mid-word.
export function clipDescription(text:string,max=155){
  const t=text.replace(/\s+/g,' ').trim();if(t.length<=max)return t;
  const cut=t.slice(0,max-1);return `${cut.slice(0,Math.max(cut.lastIndexOf(' '),max-30)).replace(/[\s,;:–—-]+$/,'')}…`;
}
