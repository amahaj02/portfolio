// The map and project index share the existing editorial overview, not a modal.
(() => {
 const work=document.querySelector('#work');if(!work)return;
 const readers=[...work.querySelectorAll('[data-reader]')];
 const fromHash=()=>readers.find(r=>`#${r.id}`===location.hash)?.dataset.reader;
 function show(id){
  const reader=readers.find(r=>r.dataset.reader===id);if(!reader)return;
  readers.forEach(r=>r.hidden=r!==reader);
  work.querySelectorAll('[data-open-project]').forEach(a=>{
   if(a.dataset.openProject===id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');
  });
  return reader;
 }
 show(fromHash()||work.dataset.defaultProject);
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[data-open-project]');
  if(event.defaultPrevented||!link||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;
  const reader=show(link.dataset.openProject);if(!reader)return;
  event.preventDefault();history.pushState(null,'',`#${reader.id}`);
  reader.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches||event.detail===0?'instant':'smooth',block:'start'});
  reader.focus({preventScroll:true});
 });
 addEventListener('hashchange',()=>{if(fromHash())show(fromHash());});
 addEventListener('popstate',()=>show(fromHash()||work.dataset.defaultProject));
})();
