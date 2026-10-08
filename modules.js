import * as THREE from 'three';
export const NAMES = {wall:'Armor wall', window:'Observation window', door:'Airlock door', corner:'Corner junction', solar:'Solar roof', solarCorner:'Solar corner', utility:'Utility roof', antenna:'Comms spire', hatch:'Service hatch', sign:'Info terminal', balcony:'Entry gantry', garden:'Bio planter', reactor:'Reactor dome', pillar:'Support pillar', vent:'Vent tower', brace:'Wall bracket', floor:'Deck tile'};
export const CATEGORIES = {wall:'Structure',window:'Structure',door:'Structure',corner:'Structure',hatch:'Structure',floor:'Structure',solar:'Roof',solarCorner:'Roof',utility:'Roof',antenna:'Roof',pillar:'Support',brace:'Support',balcony:'Support',garden:'Systems',reactor:'Systems',sign:'Systems',vent:'Systems'};
const geometryCache = new Map();
const cached = (key, make) => {if(!geometryCache.has(key)) geometryCache.set(key, make()); return geometryCache.get(key);};
const standard = (color, metalness = .32, roughness = .74) => new THREE.MeshStandardMaterial({color, metalness, roughness});
export function createMaterials(finish = 'olive', accent = '#69e8c3') {
  const m = {body:standard('#888677'),plate:standard('#a3a08e'),frame:standard('#454b48'),edge:standard('#c3bda2'),dark:standard('#272f31'),solar:standard('#35628b',.65,.28),wire:standard('#b28d58'),warning:standard('#d6ae5d'),plant:standard('#608e55',0),glass:standard('#3c737a',.6,.21),light:standard(accent,.1,.3),soil:standard('#313028',0),outline:new THREE.LineBasicMaterial({color:'#222a2b',transparent:true,opacity:.65})};
  updateMaterials(m, finish, accent);
  return m;
}
export function updateMaterials(m, finish, accent, surface = 'artwork') {
  const colors = {olive:['#888677','#a3a08e'],slate:['#718395','#99a9b4'],sand:['#b7a382','#cbbb97']}[finish] || ['#888677','#a3a08e'];
  m.surface = surface;
  m.body.color.set(colors[0]);m.plate.color.set(colors[1]);m.light.color.set(accent);m.light.emissive.set(accent);m.light.emissiveIntensity=.8;
  for(const name of ['body','plate','frame','edge','dark']){
    const material=m[name], maps=surface==='artwork'?m.wearMaps:null;
    material.map=maps?.map||null;material.bumpMap=maps?.bumpMap||null;material.bumpScale=.018;
    material.roughnessMap=maps?.roughnessMap||null;material.needsUpdate=true;
  }
  if(m.artwork){
    const tint={olive:'#ffffff',slate:'#dfebff',sand:'#ffe9c8'}[finish]||'#ffffff';
    for(const material of Object.values(m.artwork)){material.color.set(tint);material.emissive.set(accent);}
  }
}
export function makeModule(p, materials, {edges = true} = {}) {
  const g = new THREE.Group();
  function mesh(geometry, material, x=0,y=0,z=0, parent=g, outline=false) {
    const o = new THREE.Mesh(geometry, materials[material]);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);
    if(edges && outline){const key=`edges:${geometry.uuid}`;o.add(new THREE.LineSegments(cached(key,()=>new THREE.EdgesGeometry(geometry,35)),materials.outline));}
    return o;
  }
  function box(w,h,d,x,y,z,m='body',parent=g,outline=false) {return mesh(cached(`b:${w}:${h}:${d}`,()=>new THREE.BoxGeometry(w,h,d)),m,x,y,z,parent,outline);}
  function cylinder(r,h,x,y,z,m='frame',r2=r,parent=g) {return mesh(cached(`c:${r}:${r2}:${h}`,()=>new THREE.CylinderGeometry(r2,r,h,8)),m,x,y,z,parent,true);}
  function beam(a,b,thickness=.06,m='edge',parent=g){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const o=box(thickness,av.distanceTo(bv),thickness,...av.clone().add(bv).multiplyScalar(.5).toArray(),m,parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return o;}
  function plate(points,depth,x,y,z,m='body',parent=g) {
    const key=`p:${JSON.stringify(points)}:${depth}`;
    const geom=cached(key,()=>{const s=new THREE.Shape();s.moveTo(...points[0]);for(const point of points.slice(1))s.lineTo(...point);s.closePath();return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});});
    return mesh(geom,m,x,y,z,parent,true);
  }
  function bolt(x,y,z,parent=g){const o=cylinder(.037,.036,x,y,z,'edge',.037,parent);o.rotation.x=Math.PI/2;}
  function vents(x,y,z,w=.7,rows=5,parent=g){box(w,.13*rows+.08,.05,x,y,z,'frame',parent);for(let i=0;i<rows;i++)box(w-.08,.055,.06,x,y+(i-(rows-1)/2)*.13,z-.04,'dark',parent);}
  function panelFrame(){
    // The backing reaches the entire 3 m bay and closes the horizontal/vertical seams.
    box(3.02,3,.2,0,1.5,-1.5,'dark');
    for(const x of [-1.36,1.36]){box(.27,3,.38,x,1.5,-1.56,'frame',g,true);for(const y of [.17,2.83])box(.38,.3,.48,x,y,-1.59,'edge',g,true);}
    for(const y of [.18,2.82])box(2.65,.16,.32,0,y,-1.57,'edge',g,true);
    for(const x of [-1.35,1.35])for(const y of [.36,2.64])bolt(x,y,-1.81);
  }
  const chamfer=[[-1.17,-1.05],[.98,-1.05],[1.18,-.85],[1.18,.85],[.98,1.05],[-1.17,1.05]];
  if(['wall','window','door','hatch'].includes(p.type)) {
    panelFrame();
    if(p.type==='wall'){
      plate(chamfer,.13,0,1.5,-1.75,'body');
      box(1.18,.68,.08,-.34,1.7,-1.85,'plate',g,true);
      box(.08,2.12,.1,.77,1.5,-1.85,'frame');
      vents(.7,.82,-1.87,.5,4);
      box(.7,.28,.1,-.45,.63,-1.84,'frame',g,true);
      beam([-.97,2.47,-1.9],[-.97,2.18,-1.9],.06,'wire');beam([-.97,2.47,-1.9],[.61,2.47,-1.9],.06,'wire');
      if(p.detail===1){vents(-.33,1.73,-1.94,.88,3);box(.26,.06,.06,-.9,.83,-1.95,'warning');}
      if(p.detail===2){box(.18,1.55,.08,-.7,1.6,-1.95,'frame');box(.45,.45,.1,.18,1.7,-1.95,'warning',g,true);}
    }else if(p.type==='window'){
      box(2.38,.53,.15,0,.55,-1.73,'plate',g,true);box(2.38,.39,.15,0,2.48,-1.73,'body');
      plate([[-1.06,-.66],[.88,-.66],[1.08,-.45],[1.08,.48],[.88,.66],[-1.06,.66]],.1,0,1.6,-1.82,'frame');
      box(1.84,1.05,.055,0,1.61,-1.87,'glass');box(.055,1.07,.055,.44,1.61,-1.91,'edge');
      for(let i=0;i<3;i++)box(.57,.026,.025,-.5,1.89-i*.09,-1.93,'light');
      vents(.7,.54,-1.86,.65,2);box(.37,.06,.04,-.8,.6,-1.84,'warning');
    }else if(p.type==='door'){
      plate([[-1.11,0],[1.11,0],[1.11,2.17],[.76,2.6],[-.76,2.6],[-1.11,2.17]],.15,0,.1,-1.85,'edge');
      plate([[-.86,0],[.86,0],[.86,2.07],[.6,2.35],[-.6,2.35],[-.86,2.07]],.08,0,.1,-1.94,'frame');
      for(const x of [-.4,.4]){box(.75,2.1,.06,x,1.22,-2,'body',g,true);box(.07,1.62,.045,x*1.5,1.2,-2.05,'plate');}
      box(.032,2.13,.035,0,1.22,-2.045,'dark');box(.48,.06,.05,0,2.59,-2,'light');
      for(const x of [-1.15,1.15]){box(.18,.58,.16,x,1.21,-1.85,'frame',g,true);box(.09,.29,.03,x,1.32,-1.95,'light');}
      box(1.8,.12,.55,0,.16,-1.8,'frame',g,true);
    }else{
      box(2.35,2.39,.12,0,1.5,-1.73,'body',g,true);
      plate([[-.8,-1.07],[.8,-1.07],[.96,-.89],[.96,.91],[.8,1.07],[-.8,1.07],[-.96,.9],[-.96,-.89]],.08,0,1.43,-1.84,'frame');
      box(1.55,1.97,.06,0,1.43,-1.91,'plate',g,true);box(.04,1.87,.06,.43,1.43,-1.96,'frame');
      const ring=mesh(cached('hatch:ring',()=>new THREE.TorusGeometry(.32,.063,6,16)),'frame',-.18,1.35,-2.02,g,true);
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam([-.18,1.35,-2.04],[-.18+Math.cos(a)*.29,1.35+Math.sin(a)*.29,-2.04],.04,'edge');}
      box(.55,.06,.06,0,2.57,-1.92,'light');for(const x of [-1.08,1.08])box(.07,.14,.04,x,.6,-1.84,'light');
    }
  }else if(p.type==='corner'){
    for(const flip of [false,true]){const arm=new THREE.Group();g.add(arm);if(flip){arm.rotation.y=Math.PI/2;arm.scale.x=-1;}
      box(.68,3,.2,.25,1.5,-.16,'frame',arm,true);box(.43,2.42,.1,.29,1.5,-.31,'body',arm,true);
      for(const y of [.13,2.86])box(.77,.25,.36,.28,y,-.18,'edge',arm,true);
      beam([.05,.43,-.36],[.55,2.5,-.36],.07,'wire',arm);
    }
    box(.29,3,.29,0,1.5,0,'edge',g,true);for(const y of [.45,1.5,2.55])bolt(-.03,y,-.19);
  }else if(p.type==='floor'){
    box(3.02,.22,3.02,0,.06,0,'frame',g,true);box(2.79,.045,2.79,0,.193,0,p.role==='roof'?'body':'plate');
    for(const x of [-1.05,0,1.05])box(.035,.013,2.72,x,.225,0,'frame');
    if(p.role==='roof')for(const z of [-1.31,1.31])box(2.73,.025,.06,0,.24,z,'edge');
  }else if(['solar','solarCorner','utility'].includes(p.type)){
    box(2.84,.16,2.84,0,.27,0,'frame',g,true);
    // Wedge side cheeks seal the spaces beneath the sloped roof plate.
    const wedge=[[-1.36,.35],[1.36,.35],[1.36,1.33],[-1.36,.46]];
    for(const x of [-1.33,1.23]){const cheek=plate(wedge,.1,0,0,0,'body');cheek.rotation.y=-Math.PI/2;cheek.position.x=x;}
    box(2.61,.98,.11,0,.84,1.3,'body',g,true);
    const ramp=new THREE.Group();ramp.position.set(0,.93,0);ramp.rotation.x=-.31;g.add(ramp);
    box(2.76,.14,2.87,0,0,0,'plate',ramp,true);
    for(const x of [-1.32,1.32])box(.12,.19,2.92,x,.03,0,'edge',ramp,true);
    for(const z of [-1.37,1.37])box(2.87,.2,.16,0,.04,z,'frame',ramp,true);
    if(p.type==='solar'){
      for(const x of [-.63,.63]){box(1.16,.075,1.77,x,.15,-.13,'frame',ramp,true);box(1.03,.02,1.64,x,.205,-.13,'solar',ramp);
        for(let i=0;i<6;i++)box(1.01,.006,.015,x,.219,-.81+i*.275,'edge',ramp);
        for(const dx of [-.25,0,.25])box(.012,.006,1.62,x+dx,.219,-.13,'edge',ramp);}
      beam([-1.12,.14,1.12],[.1,.14,1.12],.07,'wire',ramp);beam([.1,.14,1.12],[.3,.14,.9],.07,'wire',ramp);box(.54,.21,.3,.6,.2,1.04,'frame',ramp,true);
    }else if(p.type==='solarCorner'){
      // Two perpendicular roof wings rather than another repeated rectangle.
      box(1.15,.075,1.4,-.62,.15,-.38,'frame',ramp,true);box(1.02,.025,1.26,-.62,.212,-.38,'solar',ramp);
      const wing=new THREE.Group();wing.rotation.z=-.36;wing.position.set(.64,.32,.38);ramp.add(wing);
      box(1.14,.075,1.66,0,0,0,'frame',wing,true);box(1.01,.024,1.52,0,.055,0,'solar',wing);
      for(let i=0;i<5;i++){box(1.01,.008,.02,-.62,.231,-.89+i*.25,'edge',ramp);box(1,.008,.02,0,.072,-.66+i*.32,'edge',wing);}
      beam([-1.05,.18,.61],[0,.26,1.06],.055,'wire',ramp);box(.17,.18,2.55,.05,.17,0,'edge',ramp,true);
    }else{
      box(1.05,.66,1.37,.15,.45,0,'frame',ramp,true);box(.92,.46,1.16,.15,.56,0,'body',ramp,true);
      for(const x of [-.14,.44]){const o=cylinder(.17,.16,x,.68,-.69,'edge',.17,ramp);o.rotation.x=Math.PI/2;}
      box(.5,.07,.26,.15,.83,-.21,'light',ramp);box(.38,.13,.4,-.91,.19,-.91,'warning',ramp,true);
      beam([-.75,.13,.89],[-.75,.13,-.4],.09,'wire',ramp);beam([-.75,.13,-.4],[-.36,.13,-.4],.09,'wire',ramp);
    }
  }else if(p.type==='antenna'){
    box(2.45,.18,2.45,0,.28,0,'frame',g,true);
    const pyramid=mesh(cached('spire',()=>new THREE.CylinderGeometry(.22,1.57,1.93,4)),'body',0,1.33,0,g,true);pyramid.rotation.y=Math.PI/4;
    for(const [x,z]of [[-.95,-.95],[.95,-.95],[.95,.95],[-.95,.95]])beam([x,.4,z],[Math.sign(x)*.13,2.25,Math.sign(z)*.13],.065,'edge');
    box(.42,.22,.42,0,2.34,0,'edge',g,true);cylinder(.065,1.12,0,2.96,0);cylinder(.035,.88,.3,2.86,.15,'edge');box(.08,.1,.08,0,3.56,0,'light');
  }else if(p.type==='balcony'){
    box(2.95,.22,2.96,0,.12,0,'frame',g,true);
    for(let x=-1.2;x<1.3;x+=.3)box(.11,.025,2.77,x,.25,0,'plate');
    for(const x of [-1.35,1.35]){for(const z of [-1.26,0,1.26])cylinder(.055,1.05,x,.82,z,'edge');for(const y of [.63,1.35])beam([x,y,-1.26],[x,y,1.3],.065,'edge');}
    for(const x of [-1.05,1.05])beam([x,1.35,-1.26],[x/1.05*1.35,1.35,-1.26],.065,'edge');
    for(let i=0;i<3;i++)box(1.8,.08,.24,0,.19-i*.045,-1.61-i*.22,'edge',g,true);
    box(.55,.02,.08,-.82,.256,-1.15,'warning');
  }else if(p.type==='pillar'){
    box(.65,.19,.65,0,.16,0,'frame',g,true);box(.4,2.35,.4,0,1.4,0,'body',g,true);
    box(.52,.29,.52,0,.72,0,'plate',g,true);box(.72,.46,.72,0,2.69,0,'frame',g,true);box(.82,.15,.82,0,2.98,0,'edge',g,true);
    box(.29,1.36,.04,0,1.56,-.23,'dark');for(const y of [1.06,1.57,2.07])box(.3,.09,.05,0,y,-.27,'edge');
  }else if(p.type==='brace'){
    box(.32,2.69,.48,0,1.45,0,'frame',g,true);box(.26,2.42,.07,0,1.44,-.27,'body',g,true);
    box(.96,.24,.51,0,2.85,-.35,'plate',g,true);
    for(const x of [-.13,.13]){beam([x,1.75,-.12],[x,2.78,-.78],.13,'frame');beam([x,2.6,-.02],[x,2.6,-.57],.08,'edge');}
    for(const y of [.4,1.2,2.38])bolt(0,y,-.31);
  }else if(p.type==='vent'){
    box(1.2,.2,1.04,0,.25,0,'frame',g,true);box(.94,1.77,.85,0,1.22,0,'body',g,true);
    for(const z of [-.46,.46]){vents(0,1.04,z,.68,8);}
    box(1.09,.22,.99,0,2.2,0,'edge',g,true);box(.83,.025,.73,0,2.33,0,'dark');
    for(let x=-.32;x<=.33;x+=.16)box(.055,.035,.64,x,2.355,0,'frame');box(.16,.31,.1,.48,1.83,0,'warning');
  }else if(p.type==='sign'){
    box(.55,.2,.68,0,.18,0,'frame',g,true);box(.15,2.72,.17,0,1.54,0,'edge',g,true);
    box(.32,.3,.36,0,2.86,0,'body',g,true);box(1.2,.91,.14,.39,1.98,-.12,'frame',g,true);
    box(1.02,.71,.04,.39,1.98,-.22,'glass');box(.73,.075,.025,.39,2.17,-.25,'light');
    for(let i=0;i<3;i++)box(.65-i*.13,.033,.025,.32,1.99-i*.1,-.25,'light');beam([.05,2.6,-.01],[.84,2.6,-.01],.06,'wire');
  }else if(p.type==='garden'){
    box(1.66,.26,.84,0,.3,0,'frame',g,true);box(1.45,.04,.66,0,.46,0,'soil');
    for(const x of [-.53,-.15,.29,.55]){beam([x,.5,0],[x-.07,1.27,.03],.04,'plant');for(const y of [.65,.92,1.16]){
      const leaf=mesh(cached('leaf',()=>new THREE.SphereGeometry(.13,5,3)),'plant',x+.1,y,0);leaf.scale.set(1.5,.45,.8);leaf.rotation.z=.4;
    }}
    box(1.77,1.63,.15,0,1.34,.38,'frame',g,true);box(1.52,1.39,.04,0,1.33,.29,'glass');
    for(const x of [-.44,.44])box(.035,1.36,.045,x,1.34,.24,'edge');box(.98,.07,.06,0,.52,-.4,'light');
  }else if(p.type==='reactor'){
    box(2.22,.32,1.91,0,.4,0,'frame',g,true);box(2.07,.1,1.78,0,.61,0,'edge');
    cylinder(.73,.18,0,.76,0,'frame');const dome=mesh(cached('dome',()=>new THREE.SphereGeometry(.77,12,7,0,Math.PI*2,0,Math.PI/2)),'glass',0,.83,0,g,true);
    const cage=mesh(cached('dome:cage',()=>new THREE.TorusGeometry(.78,.026,5,24,Math.PI)),'light',0,.85,0);cage.rotation.y=Math.PI/2;
    cylinder(.34,.1,0,.88,0,'light');for(const x of [-.78,.78]){box(.18,.25,.26,x,.84,-.52,'light');box(.33,.15,.19,x,.86,.66,'warning');}
    cylinder(.045,.86,.93,1.1,.6,'frame');box(.075,.09,.075,.93,1.58,.6,'light');
  }
  // Variants follow the module's shape instead of adding floating wall-sized bars to every piece.
  if(p.variant==='reinforced'){
    if(['wall','window','door','hatch'].includes(p.type))for(const x of [-1.02,1.02])box(.13,2.55,.11,x,1.5,-1.91,'edge',g,true);
    else box(.85,.1,.85,0,.31,0,'edge',g,true);
  }
  if(p.variant==='powered'){
    const bounds=new THREE.Box3().setFromObject(g);const top=bounds.max.y;
    box(.19,.07,.19,0,top+.065,0,'light');
  }
  if(materials.artworkReady && materials.surface !== 'clean') projectArtwork(g, p.type, materials);
  g.position.set(p.x*3,p.floor*3,p.z*3);g.rotation.y=p.rotation*Math.PI/2;g.userData.id=p.id;
  return g;
}


const projectedGeometryCache = new Map();
const ART_PROJECTION = {
  wall:{axis:'front',minX:-1.5,maxX:1.5,minV:0,maxV:3},
  window:{axis:'front',minX:-1.5,maxX:1.5,minV:0,maxV:3},
  door:{axis:'front',minX:-1.5,maxX:1.5,minV:0,maxV:3},
  hatch:{axis:'front',minX:-1.5,maxX:1.5,minV:0,maxV:3},
  solar:{axis:'top',minX:-1.44,maxX:1.44,minV:-1.44,maxV:1.44},
  solarCorner:{axis:'top',minX:-1.44,maxX:1.44,minV:-1.44,maxV:1.44},
  utility:{axis:'top',minX:-1.44,maxX:1.44,minV:-1.44,maxV:1.44},
  sign:{axis:'front',minX:-.21,maxX:.99,minV:1.525,maxV:2.435},
  vent:{axis:'front',minX:-.5,maxX:.5,minV:.335,maxV:2.105},
};
// Project the painting over the whole module in its own coordinates. Each
// protruding mesh receives only its portion of the face, avoiding a complete
// door/window image being repeated on every small box or on its side faces.
function projectArtwork(group,type,materials){
  const spec=ART_PROJECTION[type], paint=materials.artwork[type];if(!spec||!paint)return;
  group.updateMatrixWorld(true);
  group.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material)||o.material===materials.light||o.material===materials.plant)return;
    const key=JSON.stringify([type,o.geometry.uuid,o.matrixWorld.elements]);
    let geometry=projectedGeometryCache.get(key);
    if(!geometry){
      geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.clearGroups();
      const positions=geometry.getAttribute('position');
      const uv=geometry.getAttribute('uv')||new THREE.BufferAttribute(new Float32Array(positions.count*2),2);
      const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),center=new THREE.Vector3();
      let runStart=0,runMaterial=null,paintedCount=0;
      for(let i=0;i<positions.count;i+=3){
        a.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);
        b.fromBufferAttribute(positions,i+1).applyMatrix4(o.matrixWorld);
        c.fromBufferAttribute(positions,i+2).applyMatrix4(o.matrixWorld);
        normal.subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();
        center.copy(a).add(b).add(c).divideScalar(3);
        const v=spec.axis==='front'?center.y:center.z;
        const outward=spec.axis==='front'?normal.z<-.6:normal.y>.55;
        const painted=outward&&center.x>=spec.minX-.01&&center.x<=spec.maxX+.01&&v>=spec.minV-.01&&v<=spec.maxV+.01;
        if(painted)for(const [offset,point]of [[0,a],[1,b],[2,c]]){
          const u=(point.x-spec.minX)/(spec.maxX-spec.minX);
          const v=(spec.axis==='front'?point.y:point.z)-spec.minV;
          uv.setXY(i+offset,spec.axis==='front'?1-u:u,v/(spec.maxV-spec.minV));
        }
        const materialIndex=painted?1:0;
        if(painted)paintedCount++;
        if(runMaterial===null)runMaterial=materialIndex;
        else if(runMaterial!==materialIndex){geometry.addGroup(runStart,i-runStart,runMaterial);runStart=i;runMaterial=materialIndex;}
      }
      geometry.addGroup(runStart,positions.count-runStart,runMaterial);
      geometry.userData.paintedCount=paintedCount;
      geometry.setAttribute('uv',uv);projectedGeometryCache.set(key,geometry);
    }
    if(!geometry.userData.paintedCount)return;
    o.geometry=geometry;o.material=[o.material,paint];
    o.userData.artworkFace=type;
  });
}
