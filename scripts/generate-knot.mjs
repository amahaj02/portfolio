import { writeFile } from 'node:fs/promises';
// A static, code-authored projection of the same knot, used when WebGL/JS is absent.
const points = [];
for (let j = 0; j < 12; j++) {
  for (let i = 0; i < 240; i++) {
    const t = (i+j/12)/240*Math.PI*2, v = j/12*Math.PI*2;
    const r = 1+.35*Math.cos(3*t)+.14*Math.cos(v);
    const x = r*Math.cos(2*t), y = r*Math.sin(2*t), z = .52*Math.sin(3*t)+.14*Math.sin(v);
    const yy = Math.cos(.85)*y-Math.sin(.85)*z;
    const zz = Math.sin(.85)*y+Math.cos(.85)*z;
    const xx = Math.cos(-.35)*x-Math.sin(-.35)*yy;
    const yyy = Math.sin(-.35)*x+Math.cos(-.35)*yy;
    const p = 3.8/(3.8-zz), scale = 195;
    points.push({ x:320+xx*p*scale, y:320-yyy*p*scale, z:zz, opacity:.25+(zz+1.8)/3.6*.5, color:j%3 ? '#edb08e' : '#acbadb' });
  }
}
points.sort((a,b) => a.z-b.z);
const circles = points.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r=".8" fill="${p.color}" opacity="${p.opacity.toFixed(2)}"/>`).join('');
await writeFile(new URL('../assets/particle-knot.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">${circles}</svg>`);
console.log('Static particle-knot fallback generated.');
