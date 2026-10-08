import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TYPES, REVISION, DEFAULT_CONFIG, generateLayout, validProject, normalizeConfig, auditShell} from './model.js';
import {NAMES, CATEGORIES, makeModule, createMaterials, updateMaterials} from './modules.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a252b');
scene.fog = new THREE.Fog('#1a252b', 55, 140);
const camera = new THREE.PerspectiveCamera(38, 1, .1, 240);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
viewport.prepend(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * .48;
controls.minDistance = 3;
scene.add(new THREE.HemisphereLight(0xc6e1e9, 0x565244, 2.5));
const sun = new THREE.DirectionalLight(0xffe9bd, 3.6);
sun.position.set(-12, 24, -16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left: -35, right: 35, top: 35, bottom: -35, near: .1, far: 100});
sun.shadow.normalBias = .025;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x93c5e0, 1.2);
rim.position.set(10, 8, 12);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({color: '#27333a', roughness: 1}));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -.065;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(120, 40, 0x52636a, 0x36464e);
grid.position.y = -.035;
scene.add(grid);
const assembly = new THREE.Group();
scene.add(assembly);
const materials = createMaterials();
let parts = [], selected = null, placing = null, nextId = 1, outline = null;
const groups = new Map();
const catalogButtons = new Map();
let saveTimer;

function config() {return normalizeConfig(Object.fromEntries(Object.keys(DEFAULT_CONFIG).map(k => [k, $(k).value])));}
function setConfig(value) {for (const [key, val] of Object.entries(normalizeConfig(value))) $(key).value = val;}
function project() {return {version: REVISION, config: config(), parts};}
function saveLocal() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {localStorage.setItem('module-lab', JSON.stringify(project()));}
    catch {$('status').textContent = 'Autosave unavailable. Use Export JSON to keep your assembly.';}
  }, 160);
}
function highlight() {
  if (outline) {scene.remove(outline); outline.geometry.dispose(); outline.material.dispose(); outline = null;}
  const p = parts.find(item => item.id === selected);
  $('edit').hidden = !p;
  $('selectionHelp').hidden = !!p;
  $('selectedName').textContent = p ? NAMES[p.type] : 'Nothing selected';
  if (p) {
    outline = new THREE.BoxHelper(groups.get(p.id), 0x8df0cf);
    scene.add(outline);
    for (const [id, value] of [['floor', p.floor], ['angle', p.rotation], ['variant', p.variant], ['partX', p.x], ['partZ', p.z]]) $(id).value = value;
  }
}
function rebuild({thumbnails = false} = {}) {
  updateMaterials(materials, $('finish').value, $('accent').value);
  assembly.clear(); groups.clear();
  for (const p of parts) {const g = makeModule(p, materials); assembly.add(g); groups.set(p.id, g);}
  highlight();
  $('parts').textContent = parts.length;
  $('count').textContent = `${parts.length} PARTS`;
  $('area').textContent = config().width * config().depth * 9;
  for (const k of ['width', 'depth', 'levels']) $(k + 'Value').textContent = $(k).value;
  const used = new Set(parts.map(p => p.type));
  $('kitCoverage').textContent = `${used.size} / ${TYPES.length} kit pieces used`;
  const audit = auditShell(parts, config());
  $('sealState').textContent = config().preset === 'blank' ? 'FREE ASSEMBLY' : audit.gaps.length ? `${audit.gaps.length} EXPOSED BAYS` : audit.cutaway ? 'CUTAWAY VIEW' : 'SEALED SHELL';
  $('sealState').classList.toggle('warning', !!audit.gaps.length);
  $('repair').hidden = !audit.gaps.length;
  for (const [type, btn] of catalogButtons) {
    const count = parts.filter(p => p.type === type).length;
    btn.querySelector('.usage').textContent = count ? `×${count}` : '—';
    btn.classList.toggle('unused', !count);
  }
  if (thumbnails) renderThumbnails();
  saveLocal();
}
function frame() {
  const bounds = new THREE.Box3().setFromObject(assembly);
  if (bounds.isEmpty()) {controls.target.set(0, 0, 0); camera.position.set(16, 12, -18); controls.update(); return;}
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = size.length() / 2;
  const angle = Math.min(THREE.MathUtils.degToRad(camera.fov) / 2, Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (camera.aspect || 1)));
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(1.05, .86, -1.4).normalize().multiplyScalar(radius / Math.sin(angle) * 1.1));
  controls.update();
}
function generate({refit = true} = {}) {
  parts = generateLayout(config()); selected = null; nextId = parts.length + 1;
  rebuild(); if (refit) frame(); $('status').textContent = 'Assembly regenerated';
}
function selectMode() {
  placing = null;
  for (const btn of catalogButtons.values()) btn.classList.remove('active');
  $('orbit').classList.add('active');
  $('hint').textContent = 'Drag to orbit · Scroll to zoom · Click a module to select';
}

for (const category of ['Structure', 'Roof', 'Support', 'Systems']) {
  const label = document.createElement('div'); label.className = 'kit-category'; label.textContent = category;
  $('catalog').append(label);
  for (const type of TYPES.filter(t => CATEGORIES[t] === category)) {
    const btn = document.createElement('button'); btn.dataset.type = type;
    btn.innerHTML = `<img alt="${NAMES[type]} 3D preview"><span class="part-label">${NAMES[type]}</span><span class="usage"></span>`;
    btn.onclick = () => {
      placing = type;
      for (const b of catalogButtons.values()) b.classList.toggle('active', b === btn);
      $('orbit').classList.remove('active');
      $('hint').textContent = `Place ${NAMES[type]} on ground · Escape to cancel`;
    };
    catalogButtons.set(type, btn); $('catalog').append(btn);
  }
}
function renderThumbnails() {
  const size = 160;
  const target = new THREE.WebGLRenderTarget(size, size);
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const previous = renderer.getRenderTarget();
  const shadowAutoUpdate = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  const thumbScene = new THREE.Scene(); thumbScene.background = new THREE.Color('#26323a');
  thumbScene.add(new THREE.HemisphereLight(0xe1edf0, 0x686044, 3));
  const key = new THREE.DirectionalLight(0xffe6c0, 4); key.position.set(-5, 8, -5); thumbScene.add(key);
  const thumbCamera = new THREE.PerspectiveCamera(32, 1, .01, 100);
  const canvas = document.createElement('canvas');canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const pixels = new Uint8Array(size * size * 4);
  const flipped = new Uint8ClampedArray(pixels.length);
  for (const [type, btn] of catalogButtons) {
    const part = makeModule({id:'thumb',type,x:0,z:0,floor:0,rotation:0,variant:'standard'},materials);
    thumbScene.add(part);
    const bounds = new THREE.Box3().setFromObject(part);
    const center = bounds.getCenter(new THREE.Vector3());
    const distance = bounds.getSize(new THREE.Vector3()).length() / 2 / Math.sin(THREE.MathUtils.degToRad(16)) * 1.08;
    thumbCamera.position.copy(center).add(new THREE.Vector3(1.1,.85,-1.3).normalize().multiplyScalar(distance));thumbCamera.lookAt(center);
    renderer.setRenderTarget(target);renderer.render(thumbScene,thumbCamera);renderer.readRenderTargetPixels(target,0,0,size,size,pixels);
    for(let y=0;y<size;y++)flipped.set(pixels.subarray(y*size*4,(y+1)*size*4),(size-1-y)*size*4);
    ctx.putImageData(new ImageData(flipped,size,size),0,0);btn.querySelector('img').src = canvas.toDataURL('image/png');thumbScene.remove(part);
  }
  renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate = shadowAutoUpdate;renderer.shadowMap.needsUpdate=true;target.dispose();
}

$('orbit').onclick = selectMode;
const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
let down;
renderer.domElement.addEventListener('pointerdown', e => down = [e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup', e => {
  if(!down || Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
  if(placing){
    const hit=ray.intersectObject(ground)[0];if(!hit)return;
    const x=Math.round(hit.point.x/3),z=Math.round(hit.point.z/3),floor=0;
    if(parts.some(p=>p.type===placing&&p.x===x&&p.z===z&&p.floor===floor&&p.rotation===0)){$('status').textContent='That module already occupies this slot';return;}
    const p={id:`custom${nextId++}`,type:placing,x,z,floor,rotation:0,variant:'standard'};
    parts.push(p);selected=p.id;rebuild();$('status').textContent=`Placed ${NAMES[p.type]}`;
  }else{
    const hit=ray.intersectObjects(assembly.children,true).find(h=>h.object.isMesh);
    let g=hit?.object;while(g&&!g.userData.id)g=g.parent;selected=g?.userData.id||null;highlight();
  }
});
function edit(key,value){const p=parts.find(p=>p.id===selected);if(p){p[key]=value;rebuild();}}
$('floor').onchange=()=>edit('floor',Math.max(0,Math.min(5,Number($('floor').value)||0)));
for(const [id,key]of [['partX','x'],['partZ','z']])$(id).onchange=()=>edit(key,Math.max(-100,Math.min(100,Number($(id).value)||0)));
$('angle').onchange=()=>edit('rotation',Number($('angle').value));
$('variant').onchange=()=>edit('variant',$('variant').value);
$('rotate').onclick=()=>{const p=parts.find(p=>p.id===selected);if(p)edit('rotation',(p.rotation+1)%4);};
function remove(){if(!selected)return;parts=parts.filter(p=>p.id!==selected);selected=null;rebuild();}
$('delete').onclick=remove;$('frame').onclick=frame;
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON'].includes(e.target.tagName))return;if(e.key==='Escape')selectMode();if(e.key==='Delete')remove();if(e.key.toLowerCase()==='r')$('rotate').click();});
$('generate').onclick=()=>generate();
for(const k of ['width','depth','levels','roof'])$(k).oninput=()=>generate();
for(const k of ['finish','accent'])$(k).oninput=()=>rebuild({thumbnails:true});
$('grid').onchange=()=>grid.visible=$('grid').checked;
$('preset').onchange=()=>{if($('preset').value==='station')$('roof').value='utility';else if($('preset').value==='outpost')$('roof').value='mixed';generate();};
$('reset').onclick=()=>{setConfig(DEFAULT_CONFIG);selectMode();generate();};
$('repair').onclick=()=>{const audit=auditShell(parts,config());for(const p of audit.gaps)parts.push({...p,id:`repair${nextId++}`});rebuild();$('status').textContent='Missing shell bays restored';};
function download(v,name){const url=URL.createObjectURL(new Blob([JSON.stringify(v,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save').onclick=()=>download(project(),'modular-outpost.json');
$('load').onclick=()=>$('file').click();
function restore(v){if(!validProject(v))throw Error('Invalid project format');setConfig(v.config);parts=v.parts.map((p,i)=>({...p,id:`loaded${i}`}));nextId=parts.length+1;selected=null;selectMode();rebuild({thumbnails:true});frame();}
$('file').onchange=async()=>{try{restore(JSON.parse(await $('file').files[0].text()));$('status').textContent='Project imported';}catch{$('status').textContent='Could not import: invalid project JSON';}$('file').value='';};
try{
  const saved=JSON.parse(localStorage.getItem('module-lab'));
  if(saved && validProject(saved) && saved.version<REVISION){
    localStorage.setItem('module-lab-previous',JSON.stringify(saved));setConfig({...saved.config,roof:saved.config?.roof==='solar'?'mixed':saved.config?.roof});generate();
    $('status').textContent='Updated assembly loaded · Previous assembly is available above';
  }else if(saved)restore(saved);else{setConfig(DEFAULT_CONFIG);generate();}
  $('previous').hidden=!localStorage.getItem('module-lab-previous');
}catch{setConfig(DEFAULT_CONFIG);generate();}
$('previous').onclick=()=>{try{restore(JSON.parse(localStorage.getItem('module-lab-previous')));$('status').textContent='Previous assembly restored';}catch{$('status').textContent='Previous assembly could not be restored';}};
renderThumbnails();
let firstResize=true;
new ResizeObserver(()=>{
  const w=viewport.clientWidth,h=viewport.clientHeight;
  if(!w||!h)return;
  renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
  if(firstResize){frame();firstResize=false;}
}).observe(viewport);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
window.moduleLab={get parts(){return parts;},get audit(){return auditShell(parts,config());},generate,scene,renderer,select(id){selected=id;highlight();}};
