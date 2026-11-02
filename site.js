// Native details remain usable without JavaScript. Pointer activation adds a short,
// interruptible transition; keyboard activation and reduced motion stay immediate.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.documentElement.classList.add('js');

// Native smooth-scroll timing is browser-controlled; give nav links a gentler pace.
let navScrollFrame;
const cancelNavScroll = () => cancelAnimationFrame(navScrollFrame);
for (const type of ['wheel', 'touchstart', 'keydown']) {
  window.addEventListener(type, cancelNavScroll, { passive: true });
}
document.addEventListener('click', cancelNavScroll, true);
reducedMotion.addEventListener('change', cancelNavScroll);

for (const link of document.querySelectorAll('.site-header nav a[href^="#"]')) {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    cancelNavScroll();
    const from = window.scrollY;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const to = Math.max(0, Math.min(from + target.getBoundingClientRect().top - padding, document.documentElement.scrollHeight - innerHeight));
    history.pushState(null, '', link.hash);
    if (reducedMotion.matches || event.detail === 0) {
      window.scrollTo({ top: to, behavior: 'instant' });
      return;
    }
    const start = performance.now();
    function scroll(now) {
      const progress = Math.min((now - start) / 900, 1);
      const eased = (1 - Math.cos(Math.PI * progress)) / 2;
      window.scrollTo({ top: from + (to - from) * eased, behavior: 'instant' });
      if (progress < 1) navScrollFrame = requestAnimationFrame(scroll);
    }
    navScrollFrame = requestAnimationFrame(scroll);
  });
}

for (const details of document.querySelectorAll('.project-details')) {
  const summary = details.querySelector('summary');
  const content = details.querySelector('.details-content');
  const closeButton = details.querySelector('.close-details');
  closeButton.hidden = false;
  let animation;
  let expanded = details.open;

  function setExpanded(next, animate) {
    const from = details.open ? content.getBoundingClientRect().height : 0;
    animation?.cancel();
    expanded = next;

    if (!animate || reducedMotion.matches) {
      details.open = next;
      return;
    }

    details.open = true;
    animation = content.animate(
      [{ height: `${from}px` }, { height: `${next ? content.scrollHeight : 0}px` }],
      { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
    animation.onfinish = () => {
      details.open = expanded;
      animation = undefined;
    };
  }

  summary.addEventListener('click', (event) => {
    event.preventDefault();
    setExpanded(!expanded, event.detail > 0);
  });

  closeButton.addEventListener('click', (event) => {
    summary.focus({ preventScroll: true });
    setExpanded(false, event.detail > 0);
  });

  details.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && details.open) {
      event.preventDefault();
      setExpanded(false, false);
      summary.focus({ preventScroll: true });
    }
  });
}

// A short, one-time visual explanation, separate from the ambient hero motion.
const workflow = document.querySelector('.workflow');
if (workflow) {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!reducedMotion.matches) workflow.classList.add('play-sequence');
      observer.disconnect();
    }
  }, { threshold: .4 });
  observer.observe(workflow);
}
