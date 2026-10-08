export const TYPES = ['wall','window','door','corner','solar','utility','antenna','hatch','sign','balcony','garden','reactor','pillar','vent','brace','floor'];
export function generateLayout({width,depth,levels,roof,preset}) {
 const parts=[];const add=(type,x,z,floor=0,rotation=0)=>parts.push({id:`p${parts.length}`,type,x,z,floor,rotation,variant:'standard'});
 if(preset==='blank')return parts;
 for(let y=0;y<levels;y++)for(let x=0;x<width;x++)for(let z=0;z<depth;z++){
 add('floor',x,z,y);
 if(z===0)add(x===Math.floor(width/2)&&y===0?'door':x%2?'window':'wall',x,z,y,0);
 if(z===depth-1)add(x%2?'window':'wall',x,z,y,2);
 if(x===0)add('wall',x,z,y,1);
 if(x===width-1)add(z%2?'window':'wall',x,z,y,3);
 if(y===levels-1&&roof!=='open'){add('floor',x,z,y+1);if(roof==='solar'&&(x+z)%2===0)add('solar',x,z,y+1);if(roof==='utility'&&(x+z)%3===0)add('utility',x,z,y+1);}
 }
 if(roof!=='open')add('antenna',width-1,depth-1,levels);
 add('sign',Math.floor(width/2)+1,-1);add('garden',0,-1);add(preset==='station'?'reactor':'vent',width+1,1);add('balcony',width,depth-1,0,3);return parts;
}
export function validProject(v){return v&&Array.isArray(v.parts)&&v.parts.length<=2000&&v.parts.every(p=>TYPES.includes(p.type)&&['x','z','floor','rotation'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=100)&&['standard','reinforced','powered'].includes(p.variant));}
