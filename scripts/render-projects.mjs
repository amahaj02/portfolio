import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(import.meta.dirname,'..');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const arrow='<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 19 19 5M5 5h14v14"/></svg>';
export async function renderProjects(){
 const {projects,defaultProject}=JSON.parse(await readFile(resolve(root,'content/projects.json'),'utf8'));
 const project=id=>projects.find(p=>p.id===id);
 const nodes=[
  {id:'billboard',group:'ml',u:-1,v:.6},
  {id:'airbnb',group:'ml',u:.2,v:-.7},
  {id:'pinn',group:'ml',u:1,v:.5},
  {id:'telehealth',group:'ml',u:-.4,v:.05},
  {id:'shortener',group:'infra',u:-.9,v:-.5},
  {id:'bootstrap',project:'aws',name:'Terraform Bootstrap',summary:'Scoped AWS project roles, deployed with Terraform and GitHub OIDC.',group:'infra',u:.9,v:-.15,repo:0},
  {id:'lambda',project:'aws',name:'Lambda Pipeline',summary:'Reproducible Lambda builds and scheduled deployments with Docker and Terraform.',group:'infra',u:-.1,v:.6,repo:1},
  {id:'retex',group:'both',by:1.2,bz:.5}
 ];
 const mapLinks=nodes.map(n=>{
  const p=project(n.project||n.id);
  const name=n.name||p.name,summary=n.summary||p.summary;
  const target=`project-${p.id}`;
  const github=p?.links[n.repo||0]?.url||'';
  return `<li><a class="map-project-link" href="#${target}" data-open-project="${p?.id||''}" data-map-id="${n.id}" data-map-group="${n.group}" data-u="${n.u||0}" data-v="${n.v||0}" data-by="${n.by||0}" data-bz="${n.bz||0}" data-github="${escape(github)}" data-stack="${escape((n.stack||p.technologies).join('|'))}"><strong>${escape(name)}</strong><span>${escape(summary)}</span></a></li>`;
 }).join('');
 const map=`    <!-- map:start -->
    <div class="project-map" aria-label="Interactive project map" data-map-state="fallback">
      <div class="map-stage">
        <canvas id="project-map-canvas" aria-label="Two connected 3D particle clouds: ML and Data, Cloud and Infrastructure. Use arrow keys to select a project and Enter to reach its preview links." role="group" hidden></canvas>
        <div class="map-stage-tools wrap"><p class="map-hint" hidden>Drag to spin. Hover a point.</p><button class="map-motion" type="button" hidden>Pause motion</button></div>
        <section id="map-info" class="map-info" aria-labelledby="map-info-title" tabindex="-1" hidden>
          <button class="map-close" aria-label="Close project preview" type="button"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
          <h3 id="map-info-title"></h3><p class="map-info-summary"></p><ul class="preview-stack" aria-label="Project stack"></ul>
          <div class="map-nearest"><span>Nearest on this map</span><div></div></div>
          <div class="preview-links"><a class="map-more text-link">More detail ${arrow}</a><a class="map-github text-link" target="_blank" rel="noreferrer" hidden>GitHub ${arrow}<span class="sr-only"> (opens in a new tab)</span></a></div>
        </section>
      </div>
      <div class="map-access wrap"><div class="map-directory"><ul aria-label="Projects">${mapLinks}</ul></div></div>
    </div>
    <!-- map:end -->`;
 const workflowSource=await readFile(resolve(root,'content/terraform-workflow.html'),'utf8');
 const workflow=workflowSource.slice(0,workflowSource.indexOf('</figure>')+9);
 const links=p=>p.links.map(l=>`<a class="text-link" href="${escape(l.url)}" target="_blank" rel="noreferrer">${escape(l.label)} ${arrow}<span class="sr-only"> (opens in a new tab)</span></a>`).join('');
 const stackLogos={'Terraform':'terraform','GitHub Actions':'githubactions','Lambda':'awslambda','Docker':'docker','PyTorch':'pytorch','Kubernetes':'kubernetes','Flask':'flask','Prometheus':'prometheus','Grafana':'grafana','FastAPI':'fastapi','PostgreSQL':'postgresql','React':'react','R':'r','Quarto':'quarto','Python':'python','Oracle Database':'oracle'};
 const brandColors=JSON.parse(await readFile(resolve(root,'assets/stack/colors.json'),'utf8'));
 const logoCache={};
 for(const slug of new Set(Object.values(stackLogos))){
  const svg=(await readFile(resolve(root,`assets/stack/${slug}.svg`),'utf8')).replace(/<svg\b[^>]*>/,tag=>/\bfill=/.test(tag)?tag:tag.replace('<svg ',`<svg fill="${brandColors[slug]}" `));
  logoCache[slug]=`<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="24" height="24" alt="">`;
 }
 const stackRow=p=>`<ul class="project-stack-icons" aria-label="Project stack">${p.technologies.filter(t=>stackLogos[t]).map(t=>`<li>${logoCache[stackLogos[t]]}<span>${escape(t)}</span></li>`).join('')}</ul>`;
 const readers=[project(defaultProject),...projects.filter(p=>p.id!==defaultProject)].map(p=>`
        <article class="project-reader" id="project-${escape(p.id)}" data-reader="${escape(p.id)}" data-project-tone="${p.id==='retex'?'hybrid':['aws','shortener'].includes(p.id)?'infra':'ml'}" aria-labelledby="title-${escape(p.id)}" tabindex="-1">
          <div class="featured-intro"><h3 id="title-${escape(p.id)}">${escape(p.title)}</h3><p class="project-summary">${escape(p.summary)}</p><ul class="tech-list" aria-label="Technologies">${p.technologies.map(t=>`<li>${escape(t)}</li>`).join('')}</ul><div class="project-links">${links(p)}</div></div>
          <div class="project-overview"><ul class="overview-points">${p.overview.map(b=>`<li>${escape(b)}</li>`).join('')}</ul>${stackRow(p)}${p.id==='aws'?workflow:''}</div>
        </article>`).join('');
 const work=`    <!-- projects:start -->
    <section class="work section-space" id="work" aria-labelledby="work-heading" data-default-project="${defaultProject}">
      <div class="section-heading wrap"><h2 id="work-heading">Selected projects</h2></div>
      ${map}
      <ul class="work-project-index wrap" aria-label="Choose a project overview">${projects.map(p=>`<li><a href="#project-${p.id}" data-open-project="${p.id}">${escape(p.name)}</a></li>`).join('')}</ul>
      <div class="project-readers wrap">${readers}</div>
      <a class="all-work text-link wrap" href="https://github.com/amahaj02?tab=repositories&amp;type=public" target="_blank" rel="noreferrer">More work on GitHub ${arrow}<span class="sr-only"> (opens in a new tab)</span></a>
    </section>
    <!-- projects:end -->`;
 const path=resolve(root,'index.html');let html=await readFile(path,'utf8');
 html=html.replace(/    <!-- projects:start -->[\s\S]*?    <!-- projects:end -->/,work);
 await writeFile(path,html);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) await renderProjects();
