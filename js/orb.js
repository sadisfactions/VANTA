/* Главный объект: многогранный кристалл.
   Рендер — один фрагментный шейдер (raymarching) без внешних библиотек.
   Плоские грани отражают студийные софтбоксы, внутри — упрощённое двойное
   преломление с внутренним отражением и поглощением по толщине.
   Это художественная модель, а не физически точный трассировщик. */
(function () {
  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FRAG = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 uRes;uniform float uT;uniform vec2 uM;uniform vec3 uC1;uniform vec3 uC2;uniform float uV;",
    "mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}",
    /* шестигранный кристалл (ось Y): боковые грани, скошенные грани крыши, площадка сверху, острие снизу */
    "float crystal(vec3 q){",
    "  float s=1.0472;float a=atan(q.z,q.x);a=mod(a+.5*s,s)-.5*s;",
    "  float rx=length(q.xz)*cos(a);",
    "  float side=rx-.55;",
    "  float top=rx*.53+q.y*.85-.80;",
    "  float bot=rx*.62-q.y*.78-.72;",
    "  return max(max(side,top),max(bot,q.y-.78));",
    "}",
    /* композиция: скошенный главный кристалл, срезанный крупными плоскостями, и два сросшихся кристалла меньшего размера */
    "float map(vec3 p){",
    "  p.xz*=rot(uT*.13+uM.x*.5);",
    "  p.xy*=rot(.38);",
    "  p.yz*=rot(.25+uM.y*.3);",
    "  vec3 q=p;q.xz+=q.y*vec2(.10,-.07);",
    "  float el=mix(.72,.54,uV);",
    "  float d=crystal(vec3(q.x,q.y*el,q.z));",
    "  d=max(d,dot(q,normalize(vec3(.8,.55,.25)))-.80);",
    "  d=max(d,dot(q,normalize(vec3(-.55,.6,-.55)))-.84);",
    "  d=max(d,dot(q,normalize(vec3(-.2,-.7,.7)))-.74);",
    "  vec3 s1=q-vec3(.72,-.62,.3);s1.xy*=rot(.7);s1.xz*=rot(.5);",
    "  d=min(d,crystal(s1/.5)*.5);",
    "  vec3 s2=q-vec3(-.66,.55,-.32);s2.yz*=rot(-.6);s2.xz*=rot(1.1);",
    "  d=min(d,crystal(s2/.4)*.4);",
    "  return d;",
    "}",
    "vec3 nrm(vec3 p,float h){vec2 k=vec2(1.,-1.);",
    "  return normalize(k.xyy*map(p+k.xyy*h)+k.yyx*map(p+k.yyx*h)+k.yxy*map(p+k.yxy*h)+k.xxx*map(p+k.xxx*h));}",
    /* студийное окружение: чёткие софтбоксы, отражающиеся в плоских гранях */
    "vec3 env(vec3 d){",
    "  vec3 c=mix(vec3(.006,.01,.035),uC2*.22,d.y*.5+.5);",
    "  c+=uC1*smoothstep(.55,.72,dot(d,normalize(vec3(-.6,.6,.5))))*1.5;",
    "  c+=uC2*smoothstep(.62,.78,dot(d,normalize(vec3(.8,-.2,.4))))*1.5;",
    "  c+=vec3(.3,.9,1.)*smoothstep(.74,.86,dot(d,normalize(vec3(.1,-.9,-.3))))*1.3;",
    "  c+=mix(uC1,vec3(1.),.6)*smoothstep(.9,.96,dot(d,normalize(vec3(-.3,.85,.4))))*2.4;",
    "  return c;",
    "}",
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;",
    "  vec3 ro=vec3(0.,0.,4.2);vec3 rd=normalize(vec3(uv,-.95));",
    "  float b=dot(ro,rd);float cc=dot(ro,ro)-2.9;float h=b*b-cc;",
    "  float t=0.;bool hit=false;",
    "  if(h>0.){t=-b-sqrt(h);",
    "    for(int i=0;i<72;i++){vec3 p=ro+rd*t;float d=map(p);if(d<.002){hit=true;break;}t+=d;if(t>7.)break;}",
    "  }",
    "  if(!hit){float dc=length(ro+rd*(-b));float g=.2*exp(-max(dc-.9,0.)*2.8)*(1.-smoothstep(1.,1.72,dc));gl_FragColor=vec4(mix(uC2,uC1,.25)*g,g);return;}",
    "  vec3 p=ro+rd*t;vec3 n=nrm(p,.002);vec3 nb=nrm(p,.045);",
    "  float ndv=max(dot(n,-rd),0.);",
    "  float F=.05+.95*pow(1.-ndv,4.);",
    "  vec3 refl=env(reflect(rd,n));",
    /* внутренний путь луча: вход, выход через вторую грань, внутреннее отражение */
    "  vec3 rr=refract(rd,n,.68);",
    "  float tt=0.;vec3 q=p;",
    "  for(int i=0;i<22;i++){q=p+rr*(tt+.01);float d=-map(q);if(d<.003)break;tt+=max(d,.02);}",
    "  vec3 ne=nrm(q,.002);",
    "  vec3 r2=refract(rr,-ne,1.45);if(dot(r2,r2)<.01)r2=reflect(rr,ne);",
    "  vec3 inner=env(r2)*.55+env(reflect(rr,ne))*.45;",
    "  vec3 absorb=exp(-tt*vec3(1.1,.7,.2));",
    "  vec3 mid=p+rr*tt*.5;",
    "  vec3 core=mix(uC1,uC2,.55)*exp(-dot(mid,mid)*2.4)*.9*(1.-exp(-tt*2.));",
    "  vec3 col=(inner*absorb*.85+core)*(1.-F*.7)+refl*(.12+F*1.3);",
    /* холодные блики по отдельным рёбрам */
    "  float edge=smoothstep(.0,.35,1.-dot(n,nb));edge*=edge;",
    "  col+=vec3(.45,.8,1.)*edge*(.15+.7*smoothstep(-.2,.6,dot(n,normalize(vec3(-.5,.7,.5)))));",
    "  col=1.-exp(-col*1.5);",
    "  float al=smoothstep(0.,.05,ndv);",
    "  gl_FragColor=vec4(col*al,al);",
    "}"
  ].join("\n");

  function hex(h) {
    h = String(h || "").replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    var n = parseInt(h, 16);
    if (isNaN(n)) return [.5, .5, 1];
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  /* Возвращает true, если WebGL-объект запущен. Иначе остаётся статичный запасной вариант. */
  window.initOrb = function (opts) {
    var wrap = opts.wrap, canvas = opts.canvas;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var small = window.matchMedia("(max-width: 960px)").matches;
    var gl;
    try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" }); } catch (e) {}
    if (!gl) return false;

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var u = {};
    ["uRes", "uT", "uM", "uC1", "uC2", "uV"].forEach(function (n) { u[n] = gl.getUniformLocation(pr, n); });
    gl.uniform3fv(u.uC1, hex(opts.c1));
    gl.uniform3fv(u.uC2, hex(opts.c2));
    gl.uniform1f(u.uV, opts.variant === "spire" ? 1 : 0);

    var tx = 0, ty = 0, mx = 0, my = 0;
    var q = small ? 1.5 : 1.75, slow = 0;
    var visible = true, running = false, last = 0, start = performance.now(), ready = false;

    function resize() {
      /* рендерим с запасом (суперсэмплинг): браузер уменьшает кадр и сглаживает рёбра */
      var css = (canvas.clientWidth || 400) * (small ? 1 : 1.22);
      var px = Math.max(160, Math.min(Math.round(css * Math.max(window.devicePixelRatio || 1, q)), small ? 760 : 1280));
      if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
      gl.viewport(0, 0, px, px);
    }
    function draw(t) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uT, t);
      gl.uniform2f(u.uM, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!ready) { ready = true; wrap.classList.add("ready"); }
    }
    function loop(now) {
      if (!running) return;
      requestAnimationFrame(loop);
      var dt = now - last;
      if (dt < 33) return;
      last = now;
      /* если кадры идут медленно, снижаем внутреннее разрешение */
      slow = dt > 60 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 10 && q > 1) { q = Math.max(1, q - .25); slow = 0; resize(); }
      mx += (tx - mx) * .05; my += (ty - my) * .05;
      draw((now - start) / 1000 + 2.0);
    }
    function play() {
      if (reduce || running || !visible || document.hidden) return;
      running = true; requestAnimationFrame(loop);
    }
    function stop() { running = false; }

    resize();
    draw(3.0);
    if (!reduce) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? play() : stop(); }).observe(wrap);
      document.addEventListener("visibilitychange", function () { document.hidden ? stop() : play(); });
      if (!small) {
        document.addEventListener("pointermove", function (e) {
          if (e.pointerType === "touch") return;
          tx = (e.clientX / window.innerWidth - .5) * 2;
          ty = (e.clientY / window.innerHeight - .5) * 2;
        }, { passive: true });
      }
      play();
    }
    if (window.ResizeObserver) {
      new ResizeObserver(function () { resize(); draw(running ? (performance.now() - start) / 1000 + 2.0 : 3.0); }).observe(canvas);
    }
    return true;
  };
})();






