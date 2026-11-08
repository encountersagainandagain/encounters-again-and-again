import {signatureDef,type SignatureKey} from '@/features/encounters/signatures';
// The strokes of a signature inside its <svg>: one path per stroke (drawn with pathLength=1), at the signature's own
// width or the given one; the charcoal one adds a grainy halo under a dense core, both with rough edges.
const charcoal=(id:string,freq:number,scale:number,grain:number,k:number,bias:number)=><filter id={id} x="-5%" y="-30%" width="110%" height="160%">
  <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={4} result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency={grain} numOctaves={1} seed={9} result="g"/><feColorMatrix in="g" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${k} 0 0 0 ${bias}`} result="m"/><feComposite in="d" in2="m" operator="in"/></filter>;
export const signatureViewBox=(key:SignatureKey)=>signatureDef(key).viewBox||'0 0 600 120';
export function SignatureStrokes({signature,width}:{signature:SignatureKey;width:number}){
  const s=signatureDef(signature);const w=s.width??width;
  const path=(d:string,i:number,sw:number,filter?:string)=><path key={`${i}-${sw}`} pathLength="1" d={d} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" filter={filter}/>;
  if(s.texture==='charcoal')return <><defs>{charcoal('sig-charcoal-halo',0.35,11,0.75,5,-2.3)}{charcoal('sig-charcoal-core',0.6,6,0.7,6,-1.9)}</defs>
    {s.paths.map((d,i)=>path(d,i,s.halo??w*1.6,'url(#sig-charcoal-halo)'))}{s.paths.map((d,i)=>path(d,i,w,'url(#sig-charcoal-core)'))}</>;
  return <>{s.paths.map((d,i)=>path(d,i,w))}</>;
}
