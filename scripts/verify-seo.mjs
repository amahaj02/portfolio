import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const head=html.slice(0,html.indexOf('</head>'));
assert.ok(head.includes('<title>Aarav Mahajan \u2014 ML &amp; Systems</title>'));
assert.equal((head.match(/rel="canonical"/g)||[]).length,1);
assert.ok(head.includes('rel="canonical" href="https://aaravmahajan.dev/"'));
assert.ok(!/localhost|127\.0\.0\.1|vercel\.app|www\.aaravmahajan\.dev/.test(head));
for(const key of ['description','og:type','og:title','og:description','og:url','og:image','og:image:alt','twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt'])assert.ok(new RegExp(`(?:name|property)="${key}" content="[^"]+"`).test(head),key);
const person=JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(person['@type'],'Person');assert.equal(person.url,'https://aaravmahajan.dev/');assert.deepEqual(person.sameAs,['https://www.linkedin.com/in/amahaj02/','https://github.com/amahaj02']);assert.ok(!person.email&&!person.telephone&&!person.worksFor);
assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(!/fourth.year|4th.year/i.test(html));assert.ok(html.includes('fifth-year'));
const robots=await readFile(new URL('robots.txt',root),'utf8');assert.ok(robots.includes('Sitemap: https://aaravmahajan.dev/sitemap.xml'));
const sitemap=await readFile(new URL('sitemap.xml',root),'utf8');assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]),['https://aaravmahajan.dev/']);
for(const [name,width,height]of [['assets/social-preview.png',1200,630],['assets/apple-touch-icon.png',180,180]]){const png=await readFile(new URL(name,root));assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);}
console.log('Production SEO metadata, Person data, crawler files, image dimensions, and fifth-year copy verified.');
