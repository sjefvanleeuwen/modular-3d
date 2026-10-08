import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TYPES, WALL_TYPES, DEFAULT_CONFIG, generateLayout, validProject, auditShell, normalizeConfig} from './model.js';
import {makeModule, createMaterials} from './modules.js';

const materials = createMaterials();
test('every kit piece is used in the default and minimum-sized generated habitat', () => {
  for (const config of [DEFAULT_CONFIG, {...DEFAULT_CONFIG,width:2,depth:2}, {...DEFAULT_CONFIG,width:8,depth:8,levels:3}, {...DEFAULT_CONFIG,preset:'station',roof:'utility'}]) {
    const p=generateLayout(config);
    assert.deepEqual([...new Set(p.map(x=>x.type))].sort(), [...TYPES].sort());
    assert.ok(validProject({parts:p}));
    assert.equal(p.filter(x=>x.type==='door').length,1);
    assert.equal(p.filter(x=>x.type==='hatch').length,1);
    assert.ok(auditShell(p,config).closed);
    const slots=p.map(x=>`${x.type}:${x.x}:${x.z}:${x.floor}:${x.rotation}`);
    assert.equal(new Set(slots).size,slots.length,'no duplicate modules in a slot');
  }
});
test('shell audit detects deletion or rotation and identifies a repair',()=>{
  const p=generateLayout(DEFAULT_CONFIG), removed=p.find(x=>x.type==='hatch');
  const audit=auditShell(p.filter(x=>x!==removed),DEFAULT_CONFIG);
  assert.equal(audit.gaps.length,1);assert.equal(audit.gaps[0].type,'hatch');
  removed.rotation=0;assert.equal(auditShell(p,DEFAULT_CONFIG).gaps.length,1);
  removed.rotation=3;assert.ok(auditShell(p,DEFAULT_CONFIG).closed);
});
test('cutaway is explicit and retains complete perimeter and deck coverage',()=>{
  const c={...DEFAULT_CONFIG,roof:'open'},p=generateLayout(c),audit=auditShell(p,c);
  assert.ok(audit.cutaway);assert.equal(audit.gaps.length,0);assert.equal(audit.closed,false);
  assert.ok(!p.some(x=>['solar','solarCorner','antenna','utility'].includes(x.type)));
  assert.equal(p.filter(x=>x.type==='floor'&&x.role==='structure').length,12);
  assert.deepEqual(generateLayout({...c,preset:'blank'}),[]);
});
test('geometry seals perimeter, corners, roof seams and floor seams across levels',()=>{
  for(const config of [{...DEFAULT_CONFIG,width:2,depth:2,levels:3},{...DEFAULT_CONFIG,width:4,depth:3,levels:1}]){
    const shell=new THREE.Group();
    for(const p of generateLayout(config).filter(p=>WALL_TYPES.includes(p.type)||p.type==='floor'&&p.role!=='apron'))shell.add(makeModule(p,materials,{edges:false}));
    shell.updateMatrixWorld(true);
    const ray=new THREE.Raycaster();
    function hit(origin,direction,maxDistance){ray.set(new THREE.Vector3(...origin),new THREE.Vector3(...direction));ray.far=maxDistance;return ray.intersectObject(shell,true).length>0;}
    for(let floor=0;floor<config.levels;floor++)for(const h of [.2,1.5,2.97]){
      const y=floor*3+h;
      for(let x=-1.48;x<config.width*3-1.5;x+=.49){
        assert.ok(hit([x,y,-.8],[0,0,-1],1.5),`front at ${x}, ${y}`);
        assert.ok(hit([x,y,(config.depth-1)*3+.8],[0,0,1],1.5),`rear at ${x}, ${y}`);
      }
      for(let z=-1.48;z<config.depth*3-1.5;z+=.49){
        assert.ok(hit([-.8,y,z],[-1,0,0],1.5),`west at ${z}, ${y}`);
        assert.ok(hit([(config.width-1)*3+.8,y,z],[1,0,0],1.5),`east at ${z}, ${y}`);
      }
    }
    for(let x=-1.48;x<config.width*3-1.5;x+=.55)for(let z=-1.48;z<config.depth*3-1.5;z+=.55){
      assert.ok(hit([x,config.levels*3-.4,z],[0,1,0],1),'roof including seams');
      assert.ok(hit([x,.5,z],[0,-1,0],1),'floor including seams');
    }
  }
});
test('imports reject non-finite coordinates and invalid rotation; config is bounded',()=>{
  assert.equal(validProject({parts:[{type:'wall',x:Infinity,z:0,floor:0,rotation:0,variant:'standard'}]}),false);
  assert.equal(validProject({parts:[{type:'wall',x:0,z:0,floor:0,rotation:99,variant:'standard'}]}),false);
  const c=normalizeConfig({width:1000,levels:-3,accent:'invalid',roof:'invalid'});
  assert.equal(c.width,8);assert.equal(c.levels,1);assert.equal(c.accent,DEFAULT_CONFIG.accent);assert.equal(c.roof,'mixed');
});
