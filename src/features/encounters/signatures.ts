// Signatures: hand-drawn strokes that close a page under its last phrase and draw themselves as you reach them.
// Each one is drawn in a 600×120 box, with one or two strokes (they are drawn with pathLength=1). Shared by the site
// and the admin, where the editor picks one by sight. Inspired by the references Juani chose (2026-11-04).
export const signatures={
  loop:{label:'Loop',hint:'The long loop the closing has always had.',paths:["M14 70 C 120 18, 300 14, 430 34 C 540 52, 520 86, 380 90 C 240 94, 120 78, 66 58 C 36 46, 70 34, 150 34"]},
  curls:{label:'Curling waves',hint:'Three waves rolling into spirals (the Expeditions closing).',paths:["M 50 98 C 80 66, 106 26, 154 24 C 200 22, 216 66, 186 82 C 162 94, 138 78, 148 60 C 156 46, 178 50, 178 66 C 178 90, 198 116, 220 98 C 250 66, 276 26, 324 24 C 370 22, 386 66, 356 82 C 332 94, 308 78, 318 60 C 326 46, 348 50, 348 66 C 348 90, 368 116, 390 98 C 420 66, 446 26, 494 24 C 540 22, 556 66, 526 82 C 502 94, 478 78, 488 60 C 496 46, 518 50, 518 66"]},
  wave:{label:'One wave',hint:'A long swell that ends in a curl.',paths:["M 30 88 C 90 50, 150 52, 210 76 C 270 100, 330 96, 390 66 C 440 40, 480 26, 520 34 C 566 44, 574 92, 540 98 C 510 104, 498 76, 516 64 C 530 56, 546 66, 540 78"]},
  drops:{label:'Hanging curls',hint:'A line with curls that drop below it.',paths:["M 40 34 C 60 50, 76 92, 110 92 C 144 92, 150 56, 126 52 C 104 48, 100 76, 126 78 C 160 80, 174 46, 200 40 C 230 50, 246 92, 280 92 C 314 92, 320 56, 296 52 C 274 48, 270 76, 296 78 C 330 80, 344 46, 370 40 C 400 50, 416 92, 450 92 C 484 92, 490 56, 466 52 C 444 48, 440 76, 466 78 C 500 80, 514 46, 540 40"]},
  loops:{label:'Little loops',hint:'Handwritten loops, like a row of e’s.',paths:["M 20 86 C 30 84, 34 82, 40 80 C 60 72, 114 72, 136 58 C 160 42, 156 26, 138 28 C 118 30, 116 64, 144 78 C 160 86, 180 84, 190 80 C 210 72, 264 72, 286 58 C 310 42, 306 26, 288 28 C 268 30, 266 64, 294 78 C 310 86, 330 84, 340 80 C 360 72, 414 72, 436 58 C 460 42, 456 26, 438 28 C 418 30, 416 64, 444 78 C 460 86, 480 84, 490 80 C 520 76, 548 70, 566 62"]},
  ribbon:{label:'Ribbon',hint:'Waves with small curls over a quieter line.',paths:["M 20 80 C 50 80, 64 40, 94 40 C 118 40, 122 62, 108 64 C 96 66, 94 52, 106 52 C 120 52, 128 80, 160 80 C 190 80, 204 40, 234 40 C 258 40, 262 62, 248 64 C 236 66, 234 52, 246 52 C 260 52, 268 80, 300 80 C 330 80, 344 40, 374 40 C 398 40, 402 62, 388 64 C 376 66, 374 52, 386 52 C 400 52, 408 80, 440 80 C 470 80, 484 40, 514 40 C 538 40, 542 62, 528 64 C 516 66, 514 52, 526 52 C 540 52, 548 80, 580 80", "M 40 104 C 70 104, 86 72, 116 72 C 146 72, 152 104, 180 104 C 210 104, 226 72, 256 72 C 286 72, 292 104, 320 104 C 350 104, 366 72, 396 72 C 426 72, 432 104, 460 104 C 490 104, 516 92, 540 84"]},
} as const;
export type SignatureKey=keyof typeof signatures;
export const signatureKeys=Object.keys(signatures) as SignatureKey[];
// The stroke chosen for a closing, 'none' when the page shows none, or the page's own default.
export type SignatureChoice=SignatureKey|'none';
export const signatureOf=(value:unknown,fallback:SignatureChoice='loop'):SignatureChoice=>value==='none'?'none':typeof value==='string'&&value in signatures?value as SignatureKey:fallback;
// What each closing has drawn until now: an empty choice keeps it.
export const closingSignature={home:'loop',art:'loop',messages:'loop',expeditions:'curls',workshops:'none'} as const satisfies Record<string,SignatureChoice>;
