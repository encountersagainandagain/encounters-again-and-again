import {Fragment,type ReactNode} from 'react';
import {safeHref} from '@/features/encounters/presentation';

// Small inline marks shared by the CMS preview and the public templates.
// **bold**, *italic*, ++underline++ and [linked words](/page-or-url).
export function InlineText({text}:{text:string}){
  const parts=text.split(/(\[[^\]\n]+\]\([^)\s]+\)|\*\*[^*\n]+\*\*|\+\+[^+\n]+\+\+|\*[^*\n]+\*)/);
  return <>{parts.map((part,i)=>{const link=part.match(/^\[([^\]\n]+)\]\(([^)\s]+)\)$/);const href=link&&safeHref(link[2]);let value:ReactNode=part;
    if(link&&href)value=<a href={href} {...(href.startsWith('http')?{target:'_blank',rel:'noopener'}:{})}><InlineText text={link[1]}/></a>;
    else if(part.length>4&&part.startsWith('**')&&part.endsWith('**'))value=<strong><InlineText text={part.slice(2,-2)}/></strong>;
    else if(part.length>4&&part.startsWith('++')&&part.endsWith('++'))value=<u><InlineText text={part.slice(2,-2)}/></u>;
    else if(part.length>2&&part.startsWith('*')&&part.endsWith('*'))value=<em><InlineText text={part.slice(1,-1)}/></em>;
    return <Fragment key={i}>{value}</Fragment>;})}</>;
}
