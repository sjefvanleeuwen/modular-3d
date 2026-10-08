import {test,expect} from '@playwright/test';

test('full kit renders, seals, repairs, exports and survives reload',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#kitCoverage')).toHaveText('17 / 17 kit pieces used');
  await expect(page.locator('#sealState')).toHaveText('SEALED SHELL');
  await expect(page.locator('#catalog button img')).toHaveCount(17);
  await expect.poll(()=>page.evaluate(()=>[...document.querySelectorAll('#catalog img')].every(i=>i.complete&&i.naturalWidth===160))).toBeTruthy();
  await expect.poll(()=>page.evaluate(()=>window.moduleLab?.renderer.info.render.triangles||0)).toBeGreaterThan(1000);
  await page.screenshot({path:testInfo.outputPath('desktop.png'),fullPage:true});
  await testInfo.attach('desktop',{path:testInfo.outputPath('desktop.png'),contentType:'image/png'});
  await page.evaluate(()=>window.moduleLab.select(window.moduleLab.parts.find(p=>p.type==='hatch').id));
  await page.locator('#delete').click();
  await expect(page.locator('#sealState')).toHaveText('1 EXPOSED BAYS');
  await page.locator('#repair').click();
  await expect(page.locator('#sealState')).toHaveText('SEALED SHELL');
  await page.locator('#roof').selectOption('open');
  await expect(page.locator('#sealState')).toHaveText('CUTAWAY VIEW');
  await page.locator('#roof').selectOption('mixed');
  await page.locator('#levels').evaluate(el=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(page.locator('#levelsValue')).toHaveText('3');
  await expect(page.locator('#sealState')).toHaveText('SEALED SHELL');
  await page.locator('#reset').click();
  const downloadEvent=page.waitForEvent('download');await page.locator('#save').click();
  const download=await downloadEvent;await expect(download.suggestedFilename()).toBe('modular-outpost.json');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('module-lab')||'{}').version)).toBe(2);
  await page.reload();await expect(page.locator('#kitCoverage')).toHaveText('17 / 17 kit pieces used');
  expect(errors).toEqual([]);
});

test('small screen keeps the viewer and properties reachable',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await expect(page.locator('#sealState')).toHaveText('SEALED SHELL');
  await page.screenshot({path:testInfo.outputPath('mobile.png'),fullPage:true});
  await testInfo.attach('mobile',{path:testInfo.outputPath('mobile.png'),contentType:'image/png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
