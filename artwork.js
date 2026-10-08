import * as THREE from 'three';
import {sourcePoint, sampleBilinear} from './texture-math.js';

// Coordinates stay in the untouched 512 x 512 reference. Each quad follows
// a single front/roof face rather than including the full isometric sprite.
export const ART_FACES = {
  wall: [[38,89],[107,59],[107,135],[38,159]],
  window: [[168,80],[233,51],[233,128],[168,151]],
  door: [[292,82],[358,54],[358,128],[292,153]],
  hatch: [[42,374],[78,360],[78,431],[42,444]],
  solar: [[51,232],[116,208],[141,276],[75,304]],
  solarCorner: [[178,237],[220,214],[244,267],[213,289]],
  utility: [[315,220],[370,195],[394,263],[338,287]],
  sign: [[128,391],[151,382],[151,405],[128,414]],
  vent: [[346,444],[363,437],[363,474],[346,481]],
};
function canvasFromPixels(size, draw) {
  const canvas = document.createElement('canvas');canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext('2d');const out=ctx.createImageData(size,size);
  draw(out.data,size);ctx.putImageData(out,0,0);return canvas;
}
function texture(canvas, renderer, {color=true, repeat=false}={}) {
  const t=new THREE.CanvasTexture(canvas);
  t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;
  if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.7,1.7);}
  return t;
}
function flattenFace(source, quad, size=384) {
  return canvasFromPixels(size,(out,n)=>{
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const [sx,sy]=sourcePoint(quad,x/(n-1),y/(n-1));
      const rgb=sampleBilinear(source.data,source.width,source.height,sx,sy);
      const i=(y*n+x)*4;
      for(let c=0;c<3;c++)out[i+c]=rgb[c];out[i+3]=255;
    }
  });
}
function mapsFromArtwork(canvas, renderer) {
  const ctx=canvas.getContext('2d'),src=ctx.getImageData(0,0,canvas.width,canvas.height);
  const bump=canvasFromPixels(canvas.width,(out,n)=>{
    for(let i=0;i<out.length;i+=4){const l=src.data[i]*.2126+src.data[i+1]*.7152+src.data[i+2]*.0722;
      out[i]=out[i+1]=out[i+2]=l;out[i+3]=255;}
  });
  const emission=canvasFromPixels(canvas.width,(out,n)=>{
    for(let i=0;i<out.length;i+=4){const r=src.data[i],g=src.data[i+1],b=src.data[i+2];
      const strength=Math.max(0,Math.min(1,(Math.min(g,b)-r-8)/65))*Math.max(0,(Math.max(g,b)-85)/170);
      out[i]=out[i+1]=out[i+2]=strength*255;out[i+3]=255;}
  });
  return {albedo:texture(canvas,renderer),bump:texture(bump,renderer,{color:false}),emission:texture(emission,renderer,{color:false})};
}
export async function loadArtwork(materials, renderer) {
  const img=new Image();img.src=`${import.meta.env.BASE_URL}reference.png`;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
  const source=ctx.getImageData(0,0,canvas.width,canvas.height);
  materials.artwork={};
  for(const [name,quad]of Object.entries(ART_FACES)){
    const maps=mapsFromArtwork(flattenFace(source,quad),renderer);
    const m=new THREE.MeshStandardMaterial({color:'#ffffff',map:maps.albedo,bumpMap:maps.bump,bumpScale:.013,roughness:.88,metalness:.08,emissive:'#69e8c3',emissiveMap:maps.emission,emissiveIntensity:.65});
    materials.artwork[name]=m;
  }
  // Source-derived wear on unpainted 3D sides, frames, supports and equipment.
  // Normalize this small metal patch so it modulates the chosen finish instead
  // of multiplying the metal's baked shading twice.
  const wear=canvasFromPixels(128,(out,n)=>{
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const sx=54+(x/(n-1))*13,sy=94+(y/(n-1))*23;
      const rgb=sampleBilinear(source.data,source.width,source.height,sx,sy);
      const lum=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
      const grain=((x*31+y*17+x*y*3)%13)-6;
      const i=(y*n+x)*4;out[i]=out[i+1]=out[i+2]=Math.max(145,Math.min(255,195+lum*.55+grain));out[i+3]=255;
    }
  });
  const roughness=canvasFromPixels(128,(out,n)=>{
    const a=wear.getContext('2d').getImageData(0,0,n,n).data;
    for(let i=0;i<out.length;i+=4){out[i]=out[i+1]=out[i+2]=255-(a[i]-145)*.42;out[i+3]=255;}
  });
  materials.wearMaps={map:texture(wear,renderer,{repeat:true}),bumpMap:texture(wear,renderer,{color:false,repeat:true}),roughnessMap:texture(roughness,renderer,{color:false,repeat:true})};
  materials.artworkReady=true;
}
