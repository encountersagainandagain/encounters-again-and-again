// Meaningful Messages stage (Meaningful Messages.dc.html, 02-animations § 8): one message per screen, the
// illustration at full height beside its text, sides alternating, crossing as the next one rises.
// Pin of 120vh + 60vh per message; windows [inFrom, inTo, outFrom, outTo] over the pin progress.
// The prototype's table for three messages (inFrom, inTo, outFrom, outTo), by the element that comes first
// on screen (left column) and the one that follows it 0.03 later.
const PROTOTYPE_WINDOWS=[[[-.2,-.08,.22,.4],[-.17,-.04,.26,.44]],[[.28,.36,.56,.74],[.31,.39,.59,.77]],[[.62,.7,.86,1],[.65,.73,.89,1]]];
export function stageWindows(n:number){
  if(n===3)return PROTOTYPE_WINDOWS.map(([lead,follow])=>({lead,follow}));
  // Same rhythm for other counts: outs spread from 0.22 to 0.86, each next one enters 0.06 after the
  // previous one starts leaving, the first enters before the pin (negative progress), the last leaves at 1.
  // With many messages the spacing shrinks: the gap (0.06) and the entry (0.08) shrink with it so every
  // message is fully in before it starts to leave.
  const space=n<2?.64:.64/(n-1),gap=Math.min(.06,space*.35),enter=Math.min(.08,space*.45);
  const outFrom=(i:number)=>n<2?.86:.22+i*space;
  return Array.from({length:n},(_,i)=>{const a=i?outFrom(i-1)+gap:-.2,b=i?a+enter:-.08,c=outFrom(i),d=i===n-1?1:Math.min(1,c+.18);
    return {lead:[a,b,c,d],follow:[a+.03,b+(i?.03:.04),Math.min(1,c+.03),Math.min(1,d+.03)]};});
}
