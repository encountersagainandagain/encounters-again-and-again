// Water of Abismo Home v2: the prototype's fragment shader, drawn on one full-screen triangle with premultiplied
// alpha. Same image; it only skips the terms that its own mix() or a zero factor discards. Parameters are the prototype defaults (10-home.md "Parámetros del agua").
export const WATER={palette:{shallow:[0.17,0.52,0.66],deep:[0.015,0.09,0.19]},caustics:0.85,godRays:0.75,sunPosition:0.66,waves:1} as const;
const FRAG=`
precision highp float;
uniform vec2 uRes;
uniform float uTime, uDive, uCaustic, uRays, uSun, uWaves;
uniform vec3 uDeep, uShallow;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float dive = uDive;
  float sunX = uSun * asp;

  // ---- shoreline: water level rises with the dive, wave edge breathes
  float wl = mix(0.12, 1.22, dive);
  float swell = 0.020 * sin(p.x * 4.1 + uTime * 0.85)
              + 0.011 * sin(p.x * 9.3 - uTime * 1.35)
              + 0.006 * sin(p.x * 16.5 + uTime * 2.1);
  float surge = 0.018 * sin(uTime * 0.55) * (1.0 - smoothstep(0.0, 0.5, dive));
  float edge = wl + (swell * uWaves + surge) * (1.0 - 0.55 * dive);
  float above = uv.y - edge;
  float depth = clamp((edge - uv.y) * 1.05, 0.0, 1.0);

  // Each pixel is water, sand or the thin band between. The final mix() takes exactly one side where inWater is
  // 0 or 1, so that side alone is computed: the same image for half the work in the hero, a third less below.
  float inWater = smoothstep(0.003, -0.003, above);
  vec3 water = vec3(0.0), sand = vec3(0.0);
  float aWater = 0.0, aSand = 0.0;
  if (inWater > 0.0) {
    // ---- water body
    water = mix(uShallow, uDeep, pow(depth, 0.72));

    vec2 cp = p * vec2(3.2, 6.4) + vec2(uTime * 0.055, -uTime * 0.028);
    float n1 = fbm(cp);
    float n2 = fbm(cp * 1.65 + n1 * 0.85 + uTime * 0.04);
    float c = pow(max(0.0, 1.0 - abs(n1 - n2) * 5.5), 2.2);
    float cFall = 0.16 + 0.84 * smoothstep(0.0, 0.42, uv.y / max(edge, 0.001));
    water += vec3(0.58, 0.87, 0.96) * c * uCaustic * cFall * (0.18 + 0.82 * (1.0 - smoothstep(0.0, 0.75, depth)));

    vec2 dp = p * 1.6 + vec2(uTime * 0.02, -uTime * 0.012);
    if (dive > 0.0) water += vec3(0.40, 0.70, 0.82) * pow(fbm(dp * 2.4) * fbm(dp * 5.1 + 3.0), 2.0) * 0.35 * dive;

    if (dive > 0.04) {
      vec2 rp = p - vec2(sunX, edge);
      float ang = atan(rp.x, -rp.y + 0.002);
      float rays = fbm(vec2(ang * 5.5, uTime * 0.06)) * fbm(vec2(ang * 12.0, uTime * 0.04 + 5.0));
      rays = pow(max(rays, 0.0), 1.5) * smoothstep(0.0, 0.22, depth) * (0.28 + 0.72 * (1.0 - smoothstep(0.1, 1.1, depth)));
      water += vec3(0.52, 0.82, 0.92) * rays * uRays * smoothstep(0.04, 0.45, dive);
    }

    // ---- breaking foam along the edge (more than 0.35 below it, foam is under 0.0005: no colour level changes)
    float d0 = max(-above, 0.0);
    float foam = 0.0;
    if (d0 < 0.35) {
      float foamBase = exp(-d0 * 64.0) * (0.5 + 0.5 * fbm(p * vec2(7.0, 15.0) + vec2(uTime * 0.22, uTime * 0.08)));
      float lace = smoothstep(0.42, 0.95, fbm(p * vec2(13.0, 26.0) + vec2(uTime * 0.3, uTime * 0.05))) * exp(-d0 * 18.0);
      foam = clamp(foamBase * 1.05 + lace * 0.5, 0.0, 1.0) * (1.0 - 0.6 * smoothstep(0.25, 0.75, dive)) * uWaves;
    }
    water = mix(water, vec3(0.94, 0.975, 0.99), foam);

    aWater = clamp(0.40 + depth * 1.05 + dive * 0.85, 0.0, 1.0);
    aWater = max(aWater, foam * 0.95);
  }
  if (inWater < 1.0) {
    // ---- wet sand sheen just above the wave line, gone once submerged
    sand = vec3(0.80, 0.74, 0.64);
    float grain = noise(p * 180.0);
    sand += (grain - 0.5) * 0.08;
    aSand = 0.30 * (1.0 - smoothstep(0.0, 0.42, dive)) * exp(-max(above, 0.0) * 7.5);
    float spray = exp(-max(above, 0.0) * 26.0) * smoothstep(0.5, 0.95, fbm(p * vec2(11.0, 20.0) + vec2(uTime * 0.35, uTime * 0.6)));
    sand = mix(sand, vec3(0.97, 0.99, 1.0), clamp(spray * 1.4, 0.0, 1.0));
    aSand = max(aSand, spray * 0.55 * (1.0 - smoothstep(0.1, 0.6, dive)) * uWaves);
  }

  vec3 col = mix(sand, water, inWater);
  float a = mix(aSand, aWater, inWater);

  col *= 1.0 - 0.35 * pow(length(uv - 0.5) * 1.25, 2.2) * (0.3 + 0.7 * dive);
  a = max(a, smoothstep(0.5, 0.98, dive));
  gl_FragColor = vec4(col * a, a);
}`;
const VERT=`attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
export type Water={draw:(time:number,dive:number)=>void;resize:()=>void;dispose:()=>void;setScale:(scale:number)=>void;maxScale:()=>number;scale:()=>number};
// Prototype resolution: up to 1.75 device pixels per CSS pixel (1.25 on phones).
export const waterMaxScale=()=>Math.min(devicePixelRatio||1,innerWidth<760?1.25:1.75);
// Returns null when WebGL is not available or the shader does not compile: the page then keeps its gradient.
export function createWater(canvas:HTMLCanvasElement):Water|null{
  let gl:WebGLRenderingContext|null=null;
  try{gl=canvas.getContext('webgl',{antialias:false,alpha:true,premultipliedAlpha:true});}catch{return null;}
  if(!gl)return null;const g=gl;
  const mk=(type:number,src:string)=>{const s=g.createShader(type);if(!s)return null;g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS)){console.warn(g.getShaderInfoLog(s));g.deleteShader(s);return null;}return s;};
  const vs=mk(g.VERTEX_SHADER,VERT),fs=mk(g.FRAGMENT_SHADER,FRAG);const prog=g.createProgram();
  if(!vs||!fs||!prog)return null;
  g.attachShader(prog,vs);g.attachShader(prog,fs);g.linkProgram(prog);
  if(!g.getProgramParameter(prog,g.LINK_STATUS)){console.warn(g.getProgramInfoLog(prog));return null;}
  g.useProgram(prog);
  const buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);
  const loc=g.getAttribLocation(prog,'a');g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,2,g.FLOAT,false,0,0);
  const u=Object.fromEntries(['uRes','uTime','uDive','uCaustic','uRays','uSun','uWaves','uDeep','uShallow'].map(n=>[n,g.getUniformLocation(prog,n)]));
  // The shader is expensive: phones render it at a lower resolution.
  let scale=waterMaxScale();
  const resize=()=>{const dpr=Math.min(scale,waterMaxScale());const w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(w===canvas.width&&h===canvas.height)return;canvas.width=w;canvas.height=h;g.viewport(0,0,w,h);};
  resize();
  return {
    resize,
    setScale(next){scale=next;resize();},maxScale:waterMaxScale,scale:()=>Math.min(scale,waterMaxScale()),
    draw(time,dive){resize();g.uniform2f(u.uRes,canvas.width,canvas.height);g.uniform1f(u.uTime,time);g.uniform1f(u.uDive,dive);g.uniform1f(u.uCaustic,WATER.caustics);g.uniform1f(u.uRays,WATER.godRays);g.uniform1f(u.uSun,WATER.sunPosition);g.uniform1f(u.uWaves,WATER.waves);g.uniform3fv(u.uShallow,WATER.palette.shallow);g.uniform3fv(u.uDeep,WATER.palette.deep);g.drawArrays(g.TRIANGLES,0,3);},
    dispose(){g.deleteBuffer(buf);g.deleteProgram(prog);g.deleteShader(vs);g.deleteShader(fs);g.getExtension('WEBGL_lose_context')?.loseContext();},
  };
}
