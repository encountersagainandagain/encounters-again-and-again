// Cover gate, inlined in <head> by app/layout.tsx so it also works on a direct entry before hydration. When a banner
// (a .hero-image inside [data-nav-hero] / [data-photo-hero]) appears with its photo not ready yet, its entrance waits
// with the dark base, paused at its first frame, until the photo is downloaded and decoded:
//   wait  → animations paused (site.css), nothing but the dark base is shown
//   ready → the entrance plays from its start, over the photo
//   late  → the bound (1.5 s) passed first: the text enters over the dark base; the banner layer stays paused (hidden)
//           and makes its own entrance once the photo is ready
//   skip  → the visitor scrolled more than 40 px while waiting: no entrance replayed, the final state fades in
// A photo that fails releases the gate at once; a banner removed by a navigation is ignored. Without JavaScript nothing
// is gated. A photo already complete (cached or preloaded) is never gated.
export const coverGateScript=`(()=>{if(!window.MutationObserver)return;const seen=new WeakSet(),BOUND=1500,MOVED=40;
const gate=hero=>{const box=hero.closest('[data-nav-hero],[data-photo-hero]');if(!box||seen.has(box))return;
const img=[...hero.querySelectorAll('img')].find(i=>!i.closest('[aria-hidden=true]'));if(!img)return;seen.add(box);
if(img.complete&&img.naturalWidth>0)return;const y0=scrollY;let done=false;box.dataset.cover='wait';
const timer=setTimeout(()=>{if(!done&&box.isConnected)box.dataset.cover='late';},BOUND);
const show=()=>{if(done||!box.isConnected)return;done=true;clearTimeout(timer);box.dataset.cover=Math.abs(scrollY-y0)<=MOVED?'ready':'skip';};
img.addEventListener('load',()=>{(img.decode?img.decode():Promise.resolve()).catch(()=>{}).then(show);},{once:true});img.addEventListener('error',show,{once:true});};
const scan=()=>document.querySelectorAll('.hero-image').forEach(gate);
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});})();`;
