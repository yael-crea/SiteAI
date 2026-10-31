/* Landing immersive de lumio.business : interface et scène 3D (Three.js r128). */
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // L'apparition des textes (.reveal) est gérée dans la page, sans attendre la 3D.
  var sections = [0,1,2,3,4].map(function(i){ return document.getElementById('s'+i); });
  var railBtns = document.querySelectorAll('.rail button');
  railBtns.forEach(function(b){ b.addEventListener('click', function(){ sections[+b.dataset.go].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }); });

  var I = { pX:0, pY:0, gyro:false, ndc:{x:9,y:9}, lastMove:-9999, clicks:[] };
  function setP(cx,cy){ I.ndc.x=cx/window.innerWidth*2-1; I.ndc.y=-(cy/window.innerHeight)*2+1; I.lastMove=performance.now(); }
  window.addEventListener('pointermove', function(e){ if(!I.gyro){ I.pX=(e.clientX/window.innerWidth-0.5)*2; I.pY=(e.clientY/window.innerHeight-0.5)*2; } setP(e.clientX,e.clientY); }, {passive:true});
  window.addEventListener('pointerdown', function(e){ setP(e.clientX,e.clientY); I.down={x:e.clientX,y:e.clientY,t:performance.now()}; }, {passive:true});
  window.addEventListener('pointerup', function(e){ if(I.down && Math.abs(e.clientX-I.down.x)<8 && Math.abs(e.clientY-I.down.y)<8 && performance.now()-I.down.t<400){
    if (e.target.closest && e.target.closest('a,button,.site-view,.pick,.plan')) return; I.clicks.push({x:e.clientX/window.innerWidth*2-1, y:-(e.clientY/window.innerHeight)*2+1}); } }, {passive:true});
  window.addEventListener('touchmove', function(e){ var t=e.touches[0]; if(t) setP(t.clientX,t.clientY); }, {passive:true});

  var gyroBtn = document.getElementById('gyro');
  function onOri(e){ if (e.gamma == null) return; I.gyro = true; I.pX = Math.max(-1,Math.min(1,e.gamma/22)); I.pY = Math.max(-1,Math.min(1,((e.beta==null?45:e.beta)-45)/22)); }
  if (window.DeviceOrientationEvent && window.matchMedia('(pointer: coarse)').matches) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      gyroBtn.hidden = false;
      gyroBtn.addEventListener('click', function(){
        DeviceOrientationEvent.requestPermission().then(function(s){
          if (s === 'granted') { window.addEventListener('deviceorientation', onOri); gyroBtn.textContent='Inclinaison activée'; gyroBtn.disabled=true; }
          else gyroBtn.textContent='Inclinaison refusée';
        }).catch(function(){ gyroBtn.textContent='Inclinaison indisponible ici'; });
      });
    } else window.addEventListener('deviceorientation', onOri);
  }

  if (typeof THREE === 'undefined') { document.documentElement.classList.add('fallback'); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene'), antialias: true, powerPreference: 'high-performance' }); }
  catch { document.documentElement.classList.add('fallback'); return; }
  // Sans vraie carte graphique (rendu WebGL logiciel), la 3D sature le
  // processeur : on garde la version sans 3D.
  try {
    var gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
    var gpu = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    if (/swiftshader|llvmpipe|softpipe|software/i.test(gpu)) { renderer.dispose(); document.documentElement.classList.add('fallback'); return; }
  } catch { /* information indisponible : on garde la 3D */ }
  var mobile = window.innerWidth < 820;
  var PR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(PR); renderer.setClearColor(0x0A0614, 1);
  var scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0A0614, 0.02);
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

  /* Outils partagés */
  function rnd(a,b){ return a+Math.random()*(b-a); }
  function gauss(){ var u=0,v=0; while(!u)u=Math.random(); while(!v)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
  function bump(m,c){ return Math.max(0,1-Math.abs(m-c)); }
  function ss(a,b,x){ var t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
  var SITES = [
    ["Atelier du Robinet", "Plombier", "#F8FAFC", "#0F172A", "#1d4ed8", "plombier", "Montpellier", "Votre maison mérite un travail net, fiable et durable."],
    ["Maison Sève", "Restaurant", "#FBF5EE", "#2A1A12", "#7c2d12", "restaurant", "Nîmes", "Une cuisine sincère, guidée par le marché et l’envie."],
    ["Studio Nacre", "Beauté des ongles", "#FDF2F8", "#3B0A24", "#9d174d", "beaute", "Montpellier", "Des ongles soignés, pensés jusque dans les détails."],
    ["Les Jardins Clairs", "Paysagiste", "#F7FAF0", "#1A2E05", "#3f6212", "paysagiste", "Montpellier", "Un jardin à vivre, au rythme des saisons."],
    ["Volt & Fils", "Électricien", "#111827", "#F9FAFB", "#c2410c", "electricien", "Toulouse", "Une installation sûre, claire et faite pour durer."],
    ["Le Fournil des Halles", "Boulangerie", "#FFF7ED", "#2B1A0E", "#b45309", "boulangerie", "Lyon", "Le pain du matin, pétri et cuit sur place."],
    ["Élan Coaching", "Coach sportif", "#FAF5FF", "#1E1B4B", "#7c3aed", "coach", "Bordeaux", "Un programme qui part de vous, pas d’une routine toute faite."],
    ["Cabinet Ardent", "Cabinet d’avocat", "#0C0A09", "#F5F5F4", "#a16207", "avocat", "Paris", "Un accompagnement juridique clair, à chaque étape."]
  ];
  var SITE_IMGS = [
    "/images/landing/ecran-1.jpg",
    "/images/landing/ecran-2.jpg",
    "/images/landing/ecran-3.jpg",
    "/images/landing/ecran-4.jpg",
    "/images/landing/ecran-5.jpg",
    "/images/landing/ecran-6.jpg",
    "/images/landing/ecran-7.jpg",
    "/images/landing/ecran-8.jpg"
  ];
  var IMG_CACHE = SITE_IMGS.map(function(src){ var im=new Image(); im.src=src; return im; });
  function siteTexture(i, w, h){
    var n=SITES.length, s=SITES[i % n], im=IMG_CACHE[i % n], lay=Math.floor(i/n)%3; w=w||512; h=h||320;
    var c=document.createElement('canvas'); c.width=w; c.height=h; var g=c.getContext('2d'), k=w/512;
    var t=new THREE.CanvasTexture(c); t.anisotropy=4; if (THREE.sRGBEncoding) t.encoding=THREE.sRGBEncoding;
    function R(x,y,ww,hh,col,al){ g.globalAlpha=al==null?1:al; g.fillStyle=col; g.fillRect(x*k,y*k,ww*k,hh*k); g.globalAlpha=1; }
    function T(txt,x,y,sz,wt,col,al){ g.globalAlpha=al==null?1:al; g.fillStyle=col; g.font=wt+' '+(sz*k)+'px sans-serif'; g.fillText(txt,x*k,y*k); g.globalAlpha=1; }
    function wrap(txt,x,y,maxW,sz,wt,col,lh,maxL){ g.font=wt+' '+(sz*k)+'px sans-serif'; g.fillStyle=col; var words=txt.split(' '), line='', l=0;
      for (var q=0;q<words.length;q++){ var test=line?line+' '+words[q]:words[q]; if (g.measureText(test).width>maxW*k && line){ g.fillText(line,x*k,(y+l*lh)*k); line=words[q]; l++; if (l>=maxL) return; } else line=test; }
      g.fillText(line,x*k,(y+l*lh)*k); }
    function cover(x,y,ww,hh){ if (!im.complete || !im.naturalWidth) return; var r=Math.max(ww*k/im.naturalWidth, hh*k/im.naturalHeight), iw=im.naturalWidth*r, ih=im.naturalHeight*r;
      g.save(); g.beginPath(); g.rect(x*k,y*k,ww*k,hh*k); g.clip(); g.drawImage(im, x*k+(ww*k-iw)/2, y*k+(hh*k-ih)/2, iw, ih); g.restore(); }
    function draw(){
      g.clearRect(0,0,w,h); R(0,0,512,320,s[2]);
      if (lay===1){ cover(0,0,512,320); R(0,0,512,320,'#000',.5);
        T(s[0],20,24,13,'800','#fff'); T('Services   Contact',380,24,10,'500','#fff',.8);
        T(s[1]+' · '+s[6],28,120,12,'700',s[4]==='#a16207'?'#FCD34D':'#fff',.9);
        wrap(s[7],28,152,400,26,'800','#fff',30,3); R(28,252,130,32,s[4]); T('Demander un devis',38,272,11,'700','#fff');
      } else if (lay===2){ R(0,0,512,30,s[2]); T(s[0],16,20,12,'800',s[3]); T('Services   Contact',380,20,10,'500',s[3],.7);
        cover(0,30,512,140); R(0,30,512,140,'#000',.15);
        T(s[1]+' · '+s[6],24,198,11,'700',s[4]); wrap(s[7],24,226,460,21,'800',s[3],25,2); R(24,278,120,28,s[4]); T('Me contacter',36,296,11,'700','#fff');
      } else { R(0,0,512,30,s[2]); T(s[0],16,20,12,'800',s[3]); T('Services   Contact',380,20,10,'500',s[3],.7);
        T(s[1]+' · '+s[6],24,74,11,'700',s[4]); wrap(s[7],24,104,240,21,'800',s[3],25,4);
        R(24,236,120,30,s[4]); T('Demander un devis',32,255,10,'700','#fff'); cover(286,46,206,250);
      }
      t.needsUpdate=true;
    }
    draw(); if (!im.complete) im.addEventListener('load', draw);
    return t;
  }
  var C = { a:new THREE.Color(0xC084FC), b:new THREE.Color(0xF472B6), c:new THREE.Color(0x67E8F9), w:new THREE.Color(0xF5F0FF) };
  var ctx = { scene:scene, camera:camera, renderer:renderer, mobile:mobile, PR:PR, reduce:reduce, I:I, rnd:rnd, gauss:gauss, bump:bump, ss:ss, siteTexture:siteTexture, C:C, SITES:SITES };

  var S = (function(ctx){
  var scene=ctx.scene, cam=ctx.camera, mob=ctx.mobile, ss=ctx.ss, bump=ctx.bump, rnd=ctx.rnd;
  var N = mob ? 30 : 48, STEP_A=0.6, STEP_Y=1.1, R=6.6, TOP=8;
  var screens=[], hitList=[], cols=[ctx.C.a, ctx.C.b, ctx.C.c];
  for (var i=0;i<N;i++){
    var a=i*STEP_A, y=TOP-i*STEP_Y;
    var g=new THREE.Group(); g.position.set(Math.cos(a)*R, y, Math.sin(a)*R); g.lookAt(Math.cos(a)*R*2, y, Math.sin(a)*R*2);
    var mat=new THREE.MeshBasicMaterial({ map:ctx.siteTexture(i, mob?384:512, mob?240:320), side:THREE.DoubleSide, color:0xffffff });
    var pl=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2), mat); g.add(pl);
    var eMat=new THREE.LineBasicMaterial({ color:cols[i%3], transparent:true, opacity:0.7 });
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.32,2.12)), eMat));
    scene.add(g);
    var o={ g:g, mat:mat, eMat:eMat, base:g.position.clone(), baseQ:g.quaternion.clone(), sel:0, hov:0, k:i, site:ctx.SITES[i%ctx.SITES.length] };
    pl.userData.o=o; screens.push(o); hitList.push(pl);
  }
  var H = TOP-(N-1)*STEP_Y;

  /* particules : poussière colorée qui monte + gros bokeh */
  var ND=mob?3500:8000, dp=new Float32Array(ND*3), dc=new Float32Array(ND*3), dv=new Float32Array(ND);
  for (var n=0;n<ND;n++){ var aa=rnd(0,Math.PI*2), rr=1.5+Math.pow(Math.random(),0.7)*24; dp[n*3]=Math.cos(aa)*rr; dp[n*3+1]=rnd(H-14,TOP+14); dp[n*3+2]=Math.sin(aa)*rr;
    var cc=cols[n%3].clone().lerp(ctx.C.w, Math.random()*0.5); dc[n*3]=cc.r; dc[n*3+1]=cc.g; dc[n*3+2]=cc.b; dv[n]=rnd(0.2,1); }
  var dG=new THREE.BufferGeometry(); dG.setAttribute('position', new THREE.BufferAttribute(dp,3)); dG.setAttribute('color', new THREE.BufferAttribute(dc,3));
  var dust=new THREE.Points(dG, new THREE.PointsMaterial({ size:0.075, vertexColors:true, transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false }));
  dust.frustumCulled=false; scene.add(dust);
  var spr=document.createElement('canvas'); spr.width=spr.height=64; var sg=spr.getContext('2d'), gr=sg.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,.9)'); gr.addColorStop(.4,'rgba(255,255,255,.25)'); gr.addColorStop(1,'rgba(255,255,255,0)'); sg.fillStyle=gr; sg.fillRect(0,0,64,64);
  var NB=mob?60:140, bp=new Float32Array(NB*3), bc=new Float32Array(NB*3);
  for (var b=0;b<NB;b++){ var ab=rnd(0,Math.PI*2), rb=rnd(9,26); bp[b*3]=Math.cos(ab)*rb; bp[b*3+1]=rnd(H-10,TOP+10); bp[b*3+2]=Math.sin(ab)*rb; var cb=cols[b%3]; bc[b*3]=cb.r; bc[b*3+1]=cb.g; bc[b*3+2]=cb.b; }
  var bG=new THREE.BufferGeometry(); bG.setAttribute('position', new THREE.BufferAttribute(bp,3)); bG.setAttribute('color', new THREE.BufferAttribute(bc,3));
  var bokeh=new THREE.Points(bG, new THREE.PointsMaterial({ map:new THREE.CanvasTexture(spr), size:1.4, vertexColors:true, transparent:true, opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false }));
  bokeh.frustumCulled=false; scene.add(bokeh);

  var core=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,TOP-H+20,8,1,true), new THREE.MeshBasicMaterial({ color:0xC084FC, transparent:true, opacity:0.6, blending:THREE.AdditiveBlending }));
  core.position.y=(TOP+H)/2; scene.add(core);

  /* carte « Voir ce site » */
  var card=document.getElementById('pick'), cardName=document.getElementById('pick-name'), cardType=document.getElementById('pick-type'), cardLink=document.getElementById('pick-link');
  document.getElementById('pick-close').addEventListener('click', function(){ selected=null; });


  var ray=new THREE.Raycaster(), v2=new THREE.Vector2(), selected=null, selM=0, hovered=null, shown=null;
  var P=new THREE.Vector3(), L=new THREE.Vector3(), dir=new THREE.Vector3(), right=new THREE.Vector3(), up=new THREE.Vector3(0,1,0), tmp=new THREE.Vector3(), fP=new THREE.Vector3(), fL=new THREE.Vector3(), oP=new THREE.Vector3(), oL=new THREE.Vector3();
  var tilt=new THREE.Quaternion(), eul=new THREE.Euler(), camQ=new THREE.Quaternion();
  return { bloom:0.85, threshold:0.3, update:function(s){
    var m=s.m, k=1.5+(m/4)*(N-5), a=k*STEP_A, y=TOP-k*STEP_Y;
    var close=10+3.5*(1-bump(m,2));
    fP.set(Math.cos(a+0.12)*(R+close), y+0.6, Math.sin(a+0.12)*(R+close)); fL.set(Math.cos(a)*R, y, Math.sin(a)*R);
    var oa=s.t*0.06, od=mob?66:54;
    oP.set(Math.cos(oa)*od, (TOP+H)/2+4, Math.sin(oa)*od); oL.set(0,(TOP+H)/2,0);
    var w=ss(0,1,Math.max(0,1-m)+Math.max(0,m-3));
    P.copy(fP).lerp(oP,w); L.copy(fL).lerp(oL,w);
    P.y+=-s.sY*1.5*s.gain+(1-s.ie)*30; P.x+=s.sX*1.5*s.gain;
    dir.copy(L).sub(P).normalize(); right.crossVectors(dir,up).normalize();
    L.addScaledVector(right, -2.2*s.side*(1-w)); if (mob) L.y-=1.2*(1-w);
    cam.position.copy(P); cam.lookAt(L); camQ.copy(cam.quaternion);

    s.clicks.forEach(function(c){ v2.set(c.x,c.y); ray.setFromCamera(v2,cam); var h=ray.intersectObjects(hitList)[0];
      selected = (h && h.object.userData.o!==selected) ? h.object.userData.o : null; selM=m; });
    if (selected && Math.abs(m-selM)>0.35) selected=null;
    hovered=null;
    if (s.active && !selected){ v2.set(ctx.I.ndc.x, ctx.I.ndc.y); ray.setFromCamera(v2,cam); var hh=ray.intersectObjects(hitList)[0]; if (hh) hovered=hh.object.userData.o; }

    if (selected!==shown){ shown=selected;
      if (selected){ cardName.textContent=selected.site[0]; cardType.textContent=selected.site[1]+' · '+selected.site[6]+' · réalisé avec Lumio'; cardLink.href='/exemples?metier='+encodeURIComponent(selected.site[5]); card.hidden=false; }
      else card.hidden=true; }

    eul.set(-s.sY*0.22, s.sX*0.35, 0); tilt.setFromEuler(eul);
    var pulse=bump(m,3);
    screens.forEach(function(o){
      o.sel += ((o===selected?1:0)-o.sel)*0.1; o.hov += ((o===hovered?1:0)-o.hov)*0.12;
      tmp.copy(o.base).lerp(cam.position, 0.12*o.hov); tmp.lerp(cam.position, 0.68*o.sel); o.g.position.copy(tmp);
      o.g.quaternion.copy(o.baseQ).multiply(tilt);
      if (o.sel>0.01) o.g.quaternion.slerp(camQ, o.sel);
      o.g.scale.setScalar(1+0.08*o.hov+0.25*o.sel);
      o.mat.color.setScalar(selected && o!==selected ? 0.3 : 1);
      o.eMat.opacity = 0.45 + 0.55*Math.max(o.sel, o.hov, pulse*Math.abs(Math.sin(s.t*3+o.k*1.7)));
    });
    var pa=dG.attributes.position.array;
    if (s.t>0) for (var q=0;q<ND;q++){ pa[q*3+1]+=dv[q]*0.012; if (pa[q*3+1]>TOP+14) pa[q*3+1]=H-14; }
    dG.attributes.position.needsUpdate=true;
    dust.rotation.y=s.t*0.025; bokeh.rotation.y=-s.t*0.015;
  } };
}
)(ctx);

  var composer=null, glitchPass=null;
  var GlitchShader = {
    uniforms: { tDiffuse:{value:null}, uAmt:{value:0}, uTime:{value:0} },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float uAmt; uniform float uTime; varying vec2 vUv;',
      'float h(float n){ return fract(sin(n)*43758.5453); }',
      'void main(){ vec2 uv=vUv; float band=floor(uv.y*22.0)+floor(uTime*24.0)*7.0;',
      '  float jump=step(0.82,h(band))*uAmt; uv.x+=(h(band*1.7)-0.5)*0.0*jump;',
      '  float o=0.0018+0.016*uAmt;',
      '  vec4 c=texture2D(tDiffuse,uv); float r=texture2D(tDiffuse,uv+vec2(o,0.0)).r; float b=texture2D(tDiffuse,uv-vec2(o,0.0)).b;',
      '  vec3 col=vec3(r,c.g,b); col*=0.96+0.04*sin(vUv.y*1100.0); col*=smoothstep(1.2,0.3,length(vUv-0.5));',
      '  gl_FragColor=vec4(col,1.0); }'
    ].join('\n')
  };
  if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass && THREE.ShaderPass) {
    try {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), (S.bloom||0.9)*(mobile?0.8:1), 0.55, S.threshold||0.12));
      glitchPass = new THREE.ShaderPass(GlitchShader); composer.addPass(glitchPass);
    } catch { composer = null; }
  }
  function resize(){ var w=window.innerWidth, h=window.innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); if (composer){ composer.setPixelRatio(PR); composer.setSize(w,h); } }
  window.addEventListener('resize', resize); resize();

  var target=0, morph=0, lastStage=0, glitch=0;
  function onScroll(){
    var y = window.scrollY + window.innerHeight*0.5, m=0;
    for (var i=0;i<4;i++){
      var a=sections[i].offsetTop+sections[i].offsetHeight*0.5, b=sections[i+1].offsetTop+sections[i+1].offsetHeight*0.5;
      if (y>=b) m=i+1; else if (y>a){ m=i+(y-a)/(b-a); break; } else break;
    }
    target=Math.max(0,Math.min(4,m)); var act=Math.round(target);
    if (act!==lastStage){ lastStage=act; if(!reduce) glitch=0.3; }
    railBtns.forEach(function(b,i){ b.setAttribute('aria-current', i===act?'true':'false'); });
  }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  var t0=performance.now(), last=t0, sX=0, sY=0, prevT=0, vel=0;
  function frame(now){
    var t=(now-t0)/1000, dt=Math.min(0.05,(now-last)/1000); last=now;
    var intro = reduce ? 1 : Math.min(1, t/3); var ie = 1-Math.pow(1-intro,3);
    morph += (target-morph)*0.07;
    sX += (I.pX-sX)*0.06; sY += (I.pY-sY)*0.06;
    var dv=target-prevT; prevT=target; vel += (dv*14-vel)*0.12;
    var st = { m:morph, t: reduce?0:t, rt:t, dt:dt, ie:ie, sX:sX, sY:sY, gain: I.gyro?2.2:1, side: mobile?0:1,
      active: (now-I.lastMove)<1800 && !reduce, vel: reduce?0:Math.max(-1,Math.min(1,vel)), clicks: I.clicks.splice(0) };
    S.update(st);
    glitch *= 0.9;
    if (composer){ glitchPass.uniforms.uAmt.value = reduce?0:Math.min(0.5, glitch+Math.abs(st.vel)*0.12); glitchPass.uniforms.uTime.value=t; composer.render(); }
    else renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  document.documentElement.classList.add('three-on');
  requestAnimationFrame(frame);
})();
