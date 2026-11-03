import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4173';
const out=resolve(import.meta.dirname,'../.agents/design-history/review');await mkdir(out,{recursive:true});
const capture=!process.argv.includes('--no-captures');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
const report={viewports:[],interactions:[]},failures=[];
const scroll=async(page,selector)=>{await page.locator(selector).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));await page.waitForTimeout(100);};
const ready=async page=>{await page.locator('.project-map').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.project-map').dataset.mapState==='ready');};
try{
 const context=await browser.newContext();const page=await context.newPage();
 page.on('pageerror',e=>failures.push(e.message));
 const cdn=[];page.on('request',r=>{if(r.url().includes('cdnjs'))cdn.push(r.url());});
 for(const width of [1440,1280,1024,768,390,320]){
  await page.setViewportSize({width,height:width>760?1000:844});const requestStart=cdn.length;
  assert.equal((await page.goto(base)).status(),200);await page.evaluate(()=>document.fonts.ready);
  if(width>760){await ready(page);await page.locator('.map-motion').click();}
  else {assert.equal(cdn.length,requestStart,'Small screens must not load Three.js');assert.equal(await page.locator('.map-project-link:visible').count(),8);}
  const measurements=await page.evaluate(()=>({width:innerWidth,contentWidth:document.documentElement.scrollWidth,fonts:document.fonts.check('400 100px "Instrument Serif"')&&document.fonts.check('400 16px Inter'),brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash),nameVisible:!!document.querySelector('#name').getBoundingClientRect().height}));
  assert.ok(measurements.contentWidth<=width,`Overflow at ${width}`);assert.ok(measurements.fonts);assert.deepEqual(measurements.brokenAnchors,[]);
  assert.equal(await page.locator('.map-project-link').count(),8);assert.equal(await page.locator('.project-reader:visible').count(),1);assert.equal(await page.locator('.map-info').isVisible(),false);
  assert.equal(await page.locator('#particle-scene').count(),1,'Original knot hero is restored');
  if(capture&&(width===1440||width===390)){
   const name=width===1440?'desktop':'mobile';await page.screenshot({path:resolve(out,`cloud-${name}.png`),fullPage:true});await page.screenshot({path:resolve(out,`cloud-${name}-hero.png`)});
  }
  report.viewports.push(measurements);
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(base);await ready(page);
 await scroll(page,'.map-stage');
 const hero=page.locator('.project-map'),canvas=page.locator('#project-map-canvas'),info=page.locator('.map-info');
 const selectProject=async id=>{
  await page.mouse.move(5,5);await canvas.focus();await canvas.press('Escape');
  const ids=await page.locator('.map-project-link').evaluateAll(links=>links.map(a=>a.dataset.mapId));
  for(let i=0;i<=ids.indexOf(id);i++)await canvas.press('ArrowRight');
 };
 assert.equal(await page.getByText('Browse projects',{exact:true}).count(),0);
 assert.equal(await page.getByText('Models, data, and the systems around them.',{exact:true}).count(),0);
 await page.waitForFunction(()=>document.querySelector('.project-map').dataset.motion==='running');
 const timeA=await hero.getAttribute('data-time');const frameA=await canvas.screenshot();await page.waitForTimeout(180);
 assert.notEqual(await hero.getAttribute('data-time'),timeA);assert.ok(!frameA.equals(await canvas.screenshot()),'GPU frames must change');
 await page.locator('.map-motion').click();await page.mouse.move(5,5);const frozen=await hero.getAttribute('data-time');await page.waitForTimeout(150);assert.equal(await hero.getAttribute('data-time'),frozen);
 const stage=await canvas.boundingBox();
 // Hit the initial Billboard point using the visible source composition.
 let hit=false;
 for(const x of [.12,.15,.18,.21,.24]){
  await page.mouse.move(stage.x+stage.width*x,stage.y+stage.height*.41);await page.waitForTimeout(30);
  if(await info.isVisible()&&await info.locator('h3').textContent()==='Billboard Longevity Prediction'){hit=true;break;}
 }
 assert.ok(hit,'Billboard point must respond to actual canvas hover');
 assert.equal(await info.isVisible(),true,'Actual canvas hover must open a preview');assert.equal(await info.locator('h3').textContent(),'Billboard Longevity Prediction');
 assert.equal(await info.locator('.map-nearest button').count(),2);
 await page.mouse.move(stage.x+stage.width*.02,stage.y+stage.height*.85);await page.waitForTimeout(250);assert.equal(await info.isVisible(),false,'Hover card dismisses after leaving point');
 const rotationBefore=Number(await hero.getAttribute('data-rotation'));
 await page.mouse.move(stage.x+100,stage.y+stage.height*.85);await page.mouse.down();await page.mouse.move(stage.x+280,stage.y+stage.height*.85,{steps:12});await page.mouse.up();
 assert.ok(Math.abs(Number(await hero.getAttribute('data-rotation'))-rotationBefore)>.8,'Drag must spin the real group');
 await selectProject('retex');
 assert.equal(await info.locator('h3').textContent(),'Retex');
 assert.equal(await info.locator('.preview-stack li').count(),4);assert.equal(await info.locator('.map-github').getAttribute('href'),'https://github.com/amahaj02/Retex-AI');
 if(capture)await page.locator('.map-stage').screenshot({path:resolve(out,'cloud-desktop-orbited-preview.png')});
 await page.keyboard.press('Escape');assert.equal(await info.isVisible(),false);assert.ok(await canvas.evaluate(el=>el===document.activeElement));
 for(const [id,repo] of [['bootstrap','https://github.com/amahaj02/tf-bootstrap'],['lambda','https://github.com/amahaj02/lambda-infra-pipeline'],['pinn',null]]){
  await selectProject(id);
  assert.equal(await info.isVisible(),true,`${id} preview should remain pinned`);
  assert.equal(await info.locator('.map-github').isVisible(),!!repo);if(repo)assert.equal(await info.locator('.map-github').getAttribute('href'),repo);
  assert.equal(await info.locator('.map-more').getAttribute('href'),id==='pinn'?'#project-pinn':'#project-aws');
  await info.locator('.map-close').click();
 }
 await selectProject('billboard');
 assert.equal(await info.locator('h3').textContent(),'Billboard Longevity Prediction','Keyboard focus opens the same preview');
 await canvas.press('Enter');await info.locator('.map-more').click();await page.waitForTimeout(800);
 assert.equal(new URL(page.url()).hash,'#project-billboard');assert.equal(await page.locator('#project-billboard').isVisible(),true);assert.ok(await page.locator('#project-billboard').evaluate(el=>el===document.activeElement));
 assert.equal(await page.locator('#project-billboard .overview-points li').count(),2);
 await page.locator('[data-open-project="aws"]').last().click();await scroll(page,'.workflow');assert.equal(await page.locator('.workflow-steps li').count(),3);
 await scroll(page,'#contact');await page.waitForFunction(()=>document.querySelector('.project-map').dataset.motion==='offscreen');const off=await hero.getAttribute('data-time');await page.waitForTimeout(120);assert.equal(await hero.getAttribute('data-time'),off);
 await scroll(page,'.map-stage');await page.locator('.map-motion').click();await page.waitForFunction(()=>document.querySelector('.project-map').dataset.motion==='running');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.project-map').dataset.motion==='reduced');
 const reducedTime=await hero.getAttribute('data-time'),reducedSpin=await hero.getAttribute('data-rotation');await page.mouse.move(500,300);await page.waitForTimeout(150);assert.equal(await hero.getAttribute('data-time'),reducedTime);assert.equal(await hero.getAttribute('data-rotation'),reducedSpin);assert.equal(await page.locator('.map-motion').isDisabled(),true);
 report.interactions.push('Real GPU motion, explicit pause/resume, canvas hover, nearest neighbors, drag spin, pinned/keyboard previews, public GitHub routes, editorial detail links, offscreen suspension and reduced motion');
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const phone=await touch.newPage();await phone.goto(base);
 assert.equal(await phone.locator('script[src*="cdnjs"]').count(),0);await phone.locator('[data-map-id="retex"]').tap();await phone.waitForTimeout(800);assert.equal(await phone.locator('#project-retex').isVisible(),true);
 await phone.setViewportSize({width:320,height:844});assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await touch.close();
 const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const fallback=await noJs.newPage();await fallback.goto(base);assert.equal(await fallback.locator('.project-reader:visible').count(),7);assert.equal(await fallback.locator('.map-project-link:visible').count(),8);await noJs.close();
 for(const mode of ['noGL','noCDN']){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
  if(mode==='noGL')await ctx.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl|experimental-webgl/.test(type)?null:get.call(this,type,...args);};});
  else await ctx.route('**/cdnjs.cloudflare.com/**',r=>r.abort());
  const p=await ctx.newPage();await p.goto(base);await p.locator('.project-map').scrollIntoViewIfNeeded();await p.waitForTimeout(1000);
  assert.equal(await p.locator('.project-map').getAttribute('data-map-state'),'fallback');assert.equal(await p.locator('.map-project-link:visible').count(),8);
  await p.locator('[data-map-id="airbnb"]').click();await p.waitForTimeout(600);assert.equal(await p.locator('#project-airbnb').isVisible(),true);await ctx.close();
 }
 report.interactions.push('Small-screen touch fallback without Three.js, no-JavaScript full content, no-WebGL and failed-CDN readable fallback');
 for(const file of ['content/projects.json','PRODUCT.md','portfolio-map-v2.html'])assert.equal((await context.request.get(`${base}/${file}`)).status(),404);
 assert.equal(await page.locator('#experience .experience-label p').count(),0);
 assert.equal(await page.locator('#experience .experience-meta').count(),3);
 assert.equal(await page.locator('#experience .experience-points li').count(),7);
 assert.deepEqual(failures,[]);report.interactions.push('Private source files excluded, experience content present, no page errors');
 await writeFile(resolve(out,'cloud-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
