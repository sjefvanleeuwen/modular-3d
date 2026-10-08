import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourcePoint,sampleBilinear} from './texture-math.js';

test('unwrapping maps the corners without mirroring the artwork',()=>{
  const quad=[[20,50],[100,20],[110,120],[30,150]];
  assert.deepEqual(sourcePoint(quad,0,0),quad[0]);assert.deepEqual(sourcePoint(quad,1,0),quad[1]);
  assert.deepEqual(sourcePoint(quad,1,1),quad[2]);assert.deepEqual(sourcePoint(quad,0,1),quad[3]);
  assert.deepEqual(sourcePoint(quad,.5,.5),[65,85]);
});
test('source resampling interpolates and clamps to valid pixels',()=>{
  const data=new Uint8Array([0,0,0,255,100,0,0,255,0,100,0,255,100,100,0,255]);
  assert.deepEqual(sampleBilinear(data,2,2,.5,.5),[50,50,0]);
  assert.deepEqual(sampleBilinear(data,2,2,100,-3),[100,0,0]);
});
