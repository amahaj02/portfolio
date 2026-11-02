// A single GPU point draw. Geometry is uploaded once; frames only update uniforms.
// The SVG underneath is the no-JS, unavailable-WebGL, and context-loss fallback.
(() => {
  const canvas = document.querySelector('#particle-scene');
  if (!canvas) return;
  const art = canvas.parentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) { art.dataset.renderer = 'static'; return; }

  const vertex = `
    precision highp float;
    attribute vec3 aPosition;
    attribute float aSeed;
    uniform float uTime, uAspect, uRatio, uInteraction;
    uniform vec2 uPointer;
    varying float vSeed, vDepth;
    vec3 rx(vec3 p, float a) { return vec3(p.x, cos(a)*p.y-sin(a)*p.z, sin(a)*p.y+cos(a)*p.z); }
    vec3 ry(vec3 p, float a) { return vec3(cos(a)*p.x+sin(a)*p.z, p.y, -sin(a)*p.x+cos(a)*p.z); }
    vec3 rz(vec3 p, float a) { return vec3(cos(a)*p.x-sin(a)*p.y, sin(a)*p.x+cos(a)*p.y, p.z); }
    void main() {
      vec3 p = aPosition;
      p *= 1.0 + .025*sin(p.x*3.0+uTime*.4)*cos(p.y*2.0-uTime*.3);
      p = rz(ry(rx(p, .85 + uPointer.y*.18*uInteraction), uTime*.055 + uPointer.x*.3*uInteraction), -.35);
      float perspective = 3.8/(3.8-p.z);
      vec2 projected = p.xy*perspective*.61/vec2(uAspect,1.0);
      vec2 delta = (projected-uPointer)*vec2(uAspect,1.0);
      float influence = exp(-dot(delta,delta)*24.0)*uInteraction;
      projected += normalize(delta+vec2(.001))*.055*influence/vec2(uAspect,1.0);
      gl_Position = vec4(projected, 0.0, 1.0);
      gl_PointSize = (1.15+aSeed*.9)*uRatio*perspective;
      vSeed = aSeed;
      vDepth = clamp((p.z+1.8)/3.6,.12,1.0);
    }
  `;
  const fragment = `
    precision mediump float;
    varying float vSeed, vDepth;
    void main() {
      float radius = length(gl_PointCoord-.5)*2.0;
      if (radius>1.0) discard;
      vec3 copper = vec3(.95,.63,.43);
      vec3 silver = vec3(.57,.65,.89);
      vec3 color = mix(copper,silver,smoothstep(.35,.8,vSeed)*.8);
      float alpha = (1.0-radius*radius)*(.24+vDepth*.65);
      gl_FragColor = vec4(color,alpha);
    }
  `;

  // Parallel rings around a (2,3) torus knot create a braided particle surface.
  const mobile = matchMedia('(max-width: 760px)').matches;
  const rings = mobile ? 24 : 36;
  const segments = mobile ? 420 : 560;
  const count = rings * segments;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let strand = 0; strand < rings; strand++) {
    const v = strand / rings * Math.PI * 2;
    for (let step = 0; step < segments; step++) {
      const index = strand * segments + step;
      const t = (step + strand / rings) / segments * Math.PI * 2;
      const radius = 1 + .35 * Math.cos(3*t) + .14 * Math.cos(v);
      positions[index*3] = radius * Math.cos(2*t);
      positions[index*3+1] = radius * Math.sin(2*t);
      positions[index*3+2] = .52 * Math.sin(3*t) + .14 * Math.sin(v);
      seeds[index] = (Math.sin(index * 127.1) * 43758.5453) % 1;
      if (seeds[index] < 0) seeds[index] += 1;
    }
  }

  let program, uniforms;
  let frame = 0, lastTime = 0, elapsed = 0;
  let visible = false, lost = false, paused = preference.matches;
  let aimX = 0, aimY = 0, pointerX = 0, pointerY = 0, active = 0, interaction = 0;

  function initialize() {
    const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, i) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, i ? fragment : vertex);
      gl.compileShader(shader);
      return shader;
    });
    program = gl.createProgram();
    shaders.forEach(shader => gl.attachShader(program, shader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Particle shader did not link');
    shaders.forEach(shader => gl.deleteShader(shader));
    gl.useProgram(program);
    for (const [name, data, size] of [['aPosition', positions, 3], ['aSeed', seeds, 1]]) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    }
    uniforms = Object.fromEntries(['uTime','uAspect','uRatio','uInteraction','uPointer'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    art.dataset.renderer = 'webgl';
  }

  function draw() {
    if (lost) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.uTime, elapsed);
    gl.uniform1f(uniforms.uAspect, canvas.clientWidth / canvas.clientHeight);
    gl.uniform1f(uniforms.uRatio, canvas.width / canvas.clientWidth);
    gl.uniform1f(uniforms.uInteraction, interaction);
    gl.uniform2f(uniforms.uPointer, pointerX, pointerY);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  function tick(now) {
    const dt = lastTime ? Math.min((now-lastTime)/1000, .05) : 0;
    lastTime = now;
    elapsed += dt;
    const ease = 1-Math.exp(-dt*6);
    pointerX += (aimX-pointerX)*ease;
    pointerY += (aimY-pointerY)*ease;
    interaction += (active-interaction)*ease;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    const running = !paused && visible && !document.hidden && !lost;
    canvas.dataset.motion = running ? 'running' : paused ? 'paused' : 'offscreen';
    if (running) frame = requestAnimationFrame(tick);
    else draw();
  }

  try { initialize(); } catch { art.dataset.renderer = 'static'; return; }
  const resize = new ResizeObserver(() => {
    const ratio = Math.min(devicePixelRatio || 1, mobile ? 1.4 : 1.75);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw();
  });
  resize.observe(art);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0 }).observe(art);
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', () => { paused = preference.matches; sync(); });
  art.parentElement.addEventListener('pointermove', event => {
    if (paused || event.pointerType !== 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    aimX = (event.clientX-rect.left)/rect.width*2-1;
    aimY = 1-(event.clientY-rect.top)/rect.height*2;
    active = 1;
  });
  art.parentElement.addEventListener('pointerleave', () => { active = 0; aimX = 0; aimY = 0; });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; art.dataset.renderer = 'static'; sync();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    try { initialize(); lost = false; gl.viewport(0, 0, canvas.width, canvas.height); sync(); }
    catch { art.dataset.renderer = 'static'; }
  });
})();
