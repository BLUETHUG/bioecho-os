// BioEcho 3D Scene v3 — High-Quality Realistic Forest
// Detailed trees, dense vegetation, atmospheric depth

class BioEchoScene {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.composer = null;
    this.sun = null;
    this.ambient = null;
    this.hemi = null;
    this.terrain = null;
    this.water = null;
    this.trees = [];
    this.flowers = [];
    this.rocks = [];
    this.ferns = [];
    this.grassMesh = null;
    this.rain = null;
    this.dustMotes = null;
    this.fireflies = null;
    this.birdFlocks = [];
    this.wind = { strength: 0.5, target: 0.5, gust: 0, gustTimer: 0 };
    this.keys = {};
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.yaw = 0;
    this.pitch = 0.25;
    this.targetYaw = 0;
    this.targetPitch = 0.25;
    this.velocity = new THREE.Vector3();
    this.moveSpeed = 10;
    this.friction = 0.88;
    this.headBob = 0;
    this.headBobPhase = 0;
    this.isMoving = false;
    this.cameraHeight = 3;
    this.smoothing = 0.06;
    this.tod = 'noon';
    this.time = 0;
    this.noise = null;
    this.worldSize = 500;
    this.chunks = {};
    this.chunkSize = 50;
    this.renderDist = 3;
    this.treeWorldX = 0;
    this.treeWorldZ = 0;
    this.livingTree = null;
    this.orbs = [];
    this.entrancePhase = 0;
    this.entranceActive = true;
    this.loaded = false;
    this.onProgress = null;
    this.onLoaded = null;
  }

  init(canvas) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x88AA88, 0.006);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 800);
    this.camera.position.set(0, 60, 80);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this._initNoise();
    this._setupLighting();
    this._setupSky();
    this._setupTerrain();
    this._setupWater();
    this._generateChunks(0, 0);
    this._setupGrass();
    this._setupLivingTree();
    this._setupDustMotes();
    this._setupFireflies();
    this._setupBirdFlocks();
    this._setupRain();
    this._setupGodRays();
    this._setupGroundFog();
    this._bindEvents();
    this._startEntrance();

    window.addEventListener('resize', () => this._onResize());

    this.loaded = true;
    if (this.onLoaded) this.onLoaded();
  }

  _initNoise() {
    const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    this.perm = new Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];

    this._noise2D = (x, y) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const aa = this.perm[this.perm[X] + Y], ab = this.perm[this.perm[X] + Y + 1];
      const ba = this.perm[this.perm[X + 1] + Y], bb = this.perm[this.perm[X + 1] + Y + 1];
      const grad = (h, x, y) => { const g = h & 3; return (g === 0 ? x + y : g === 1 ? -x + y : g === 2 ? x - y : -x - y); };
      const x1 = grad(aa, xf, yf) * (1 - u) + grad(ba, xf - 1, yf) * u;
      const x2 = grad(ab, xf, yf - 1) * (1 - u) + grad(bb, xf - 1, yf - 1) * u;
      return x1 * (1 - v) + x2 * v;
    };

    this.fbm = (x, y, octaves = 6) => {
      let val = 0, amp = 1, freq = 1, max = 0;
      for (let i = 0; i < octaves; i++) {
        val += this._noise2D(x * freq, y * freq) * amp;
        max += amp;
        amp *= 0.5;
        freq *= 2;
      }
      return val / max;
    };
  }

  _terrainHeight(x, z) {
    let h = 0;
    h += this.fbm(x * 0.005, z * 0.005, 4) * 18;
    h += this.fbm(x * 0.02, z * 0.02, 3) * 4;
    h += this.fbm(x * 0.06, z * 0.06, 2) * 1;
    const riverDist = Math.abs(z - Math.sin(x * 0.01) * 30);
    if (riverDist < 8) h -= (1 - riverDist / 8) * 5;
    return h;
  }

  _setupLighting() {
    this.ambient = new THREE.AmbientLight(0x6688AA, 0.35);
    this.scene.add(this.ambient);

    this.hemi = new THREE.HemisphereLight(0x88BBCC, 0x445533, 0.4);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xFFF0D0, 1.5);
    this.sun.position.set(60, 100, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 4096;
    this.sun.shadow.mapSize.height = 4096;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 250;
    const d = 100;
    this.sun.shadow.camera.left = -d;
    this.sun.shadow.camera.right = d;
    this.sun.shadow.camera.top = d;
    this.sun.shadow.camera.bottom = -d;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    const backLight = new THREE.DirectionalLight(0xFFAA66, 0.3);
    backLight.position.set(-40, 60, -30);
    this.scene.add(backLight);
  }

  _setupSky() {
    const geo = new THREE.SphereGeometry(380, 32, 20);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x3A6B8C) },
        midColor: { value: new THREE.Color(0x88AACC) },
        bottomColor: { value: new THREE.Color(0xCCDDEE) },
        sunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3).normalize() },
        sunColor: { value: new THREE.Color(0xFFF5E0) }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position,1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor, midColor, bottomColor, sunDir, sunColor;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = dir.y;
          vec3 col;
          if(h > 0.0) {
            col = mix(midColor, topColor, pow(max(h,0.0),0.4));
            float sun = pow(max(dot(dir, sunDir),0.0), 64.0);
            col += sunColor * sun * 0.3;
            float haze = pow(max(h,0.0), 0.15);
            col = mix(col, midColor, (1.0-haze)*0.3);
          } else {
            col = mix(midColor, bottomColor, pow(max(-h,0.0),0.3));
          }
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    this.skyMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.skyMesh);
  }

  _setupTerrain() {
    const size = this.worldSize;
    const seg = 128;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this._terrainHeight(x, z);
      pos.setY(i, h);

      const slope = i > seg && i < pos.count - seg ?
        Math.abs(h - pos.getY(i - seg - 1)) : 0;
      const c = this._terrainColor(x, z, h, slope);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.92, metalness: 0.0, flatShading: false
    });
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  _terrainColor(x, z, h, slope) {
    const c = new THREE.Color();
    const n1 = (this._noise2D(x * 0.05, z * 0.05) + 1) * 0.5;
    const n2 = (this._noise2D(x * 0.15, z * 0.15) + 1) * 0.5;

    if (h < -3) {
      c.setRGB(0.25, 0.35, 0.35);
    } else if (h < -1) {
      c.setRGB(0.3, 0.4, 0.35);
      c.lerp(new THREE.Color(0.55, 0.5, 0.35), Math.max(0, (h + 3) / 2));
    } else if (h < 2) {
      const grassBase = new THREE.Color(0.15 + n1 * 0.05, 0.28 + n2 * 0.08, 0.12 + n1 * 0.04);
      const grassDark = new THREE.Color(0.1, 0.2, 0.08);
      c.copy(grassBase).lerp(grassDark, n2 * 0.3);
    } else if (h < 6) {
      c.setRGB(0.18 + n1 * 0.04, 0.25 + n2 * 0.06, 0.12);
      if (slope > 1.5) c.lerp(new THREE.Color(0.35, 0.3, 0.22), 0.4);
    } else {
      c.setRGB(0.25 + n1 * 0.05, 0.28 + n2 * 0.04, 0.2);
      c.lerp(new THREE.Color(0.45, 0.42, 0.38), Math.min(1, (h - 6) / 5));
    }

    const riverDist = Math.abs(z - Math.sin(x * 0.01) * 30);
    if (riverDist < 6) {
      const t = Math.max(0, 1 - riverDist / 6);
      c.lerp(new THREE.Color(0.4, 0.35, 0.25), t * 0.6);
    }

    return c;
  }

  _setupWater() {
    const geo = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0x1A4A5A) },
        waterDeep: { value: new THREE.Color(0x0D2A35) },
        foamColor: { value: new THREE.Color(0xCCDDEE) },
        fogColor: { value: new THREE.Color(0x88AA88) },
        fogDensity: { value: 0.006 },
        sunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3).normalize() }
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vDist;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave1 = sin(pos.x * 0.8 + time * 1.2) * cos(pos.z * 0.6 + time * 0.9) * 0.3;
          float wave2 = sin(pos.x * 1.5 + pos.z * 1.2 + time * 2.0) * 0.15;
          float wave3 = cos(pos.x * 0.3 - time * 0.5) * sin(pos.z * 0.4 + time * 0.7) * 0.2;
          pos.y += wave1 + wave2 + wave3;
          vec4 wp = modelMatrix * vec4(pos, 1.0);
          vWorldPos = wp.xyz;
          vDist = length(wp.xz);
          float dx = cos(pos.x * 0.8 + time * 1.2) * 0.8 * 0.3 + cos(pos.x * 1.5 + pos.z * 1.2 + time * 2.0) * 1.5 * 0.15;
          float dz = -sin(pos.z * 0.6 + time * 0.9) * 0.6 * 0.3 + sin(pos.x * 0.3 - time * 0.5) * 0.4 * 0.2;
          vNormal = normalize(vec3(-dx, 1.0, -dz));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }`,
      fragmentShader: `
        uniform float time;
        uniform vec3 waterColor;
        uniform vec3 waterDeep;
        uniform vec3 foamColor;
        uniform vec3 fogColor;
        uniform float fogDensity;
        uniform vec3 sunDir;
        varying vec2 vUv;
        varying float vDist;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec2 uv = vUv * 40.0;
          float wave = sin(uv.x * 2.0 + time * 1.5) * cos(uv.y * 1.5 + time * 1.2) * 0.5 + 0.5;
          float ripple = sin(uv.x * 6.0 + time * 2.5) * sin(uv.y * 5.0 + time * 2.0) * 0.2;
          float caustic = sin(uv.x * 3.0 + time) * sin(uv.y * 3.0 - time * 0.7) * 0.15 + 0.15;
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 halfDir = normalize(sunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 128.0) * 0.8;
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0) * 0.4 + 0.3;
          float depth = smoothstep(-3.0, -1.0, vWorldPos.y);
          vec3 col = mix(waterDeep, waterColor, depth);
          col += vec3(caustic * 0.08, caustic * 0.12, caustic * 0.15);
          col += fresnel * vec3(0.15, 0.2, 0.25);
          col += spec * vec3(1.0, 0.95, 0.85);
          float foam = smoothstep(0.7, 1.0, wave + ripple) * 0.3;
          col = mix(col, foamColor, foam);
          float fog = 1.0 - exp(-fogDensity * vDist * vDist);
          col = mix(col, fogColor, fog * 0.5);
          gl_FragColor = vec4(col, 0.75 + wave * 0.1 + fresnel * 0.1);
        }`
    });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.y = -2.5;
    this.scene.add(this.water);
  }

  _generateChunks(cx, cz) {
    for (let dz = -this.renderDist; dz <= this.renderDist; dz++) {
      for (let dx = -this.renderDist; dx <= this.renderDist; dx++) {
        const key = `${cx + dx},${cz + dz}`;
        if (this.chunks[key]) continue;
        this.chunks[key] = true;
        const sx = (cx + dx) * this.chunkSize;
        const sz = (cz + dz) * this.chunkSize;
        this._populateChunk(sx, sz);
      }
    }
  }

  _populateChunk(sx, sz) {
    const seed = sx * 7919 + sz * 104729;
    const hash = (n) => { n = ((n >> 13) ^ n) * 1274126177; return ((n >> 16) ^ n) / 2147483648; };

    const treeCount = 5 + Math.floor(hash(seed) * 5);
    for (let i = 0; i < treeCount; i++) {
      const x = sx + hash(seed + i * 31) * this.chunkSize;
      const z = sz + hash(seed + i * 47 + 100) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -1 || h > 14) continue;
      const riverDist = Math.abs(z - Math.sin(x * 0.01) * 30);
      if (riverDist < 6) continue;
      const scale = 0.5 + hash(seed + i * 67) * 1.0;
      const type = hash(seed + i * 113);
      const species = type > 0.6 ? 'oak' : type > 0.3 ? 'pine' : 'birch';
      this._addTree(x, h, z, scale, species);
    }

    const grassCount = 20 + Math.floor(hash(seed + 500) * 20);
    for (let i = 0; i < grassCount; i++) {
      const x = sx + hash(seed + i * 131) * this.chunkSize;
      const z = sz + hash(seed + i * 139) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -1) continue;
      this._addGrassInstance(x, h, z);
    }

    const flowerCount = 6 + Math.floor(hash(seed + 700) * 8);
    for (let i = 0; i < flowerCount; i++) {
      const x = sx + hash(seed + i * 157) * this.chunkSize;
      const z = sz + hash(seed + i * 163) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -0.5 || h > 8) continue;
      this._addFlower(x, h, z, i);
    }

    const rockCount = 3 + Math.floor(hash(seed + 900) * 4);
    for (let i = 0; i < rockCount; i++) {
      const x = sx + hash(seed + i * 191) * this.chunkSize;
      const z = sz + hash(seed + i * 193) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -2) continue;
      this._addRock(x, h, z, hash(seed + i * 197));
    }

    const fernCount = 4 + Math.floor(hash(seed + 950) * 5);
    for (let i = 0; i < fernCount; i++) {
      const x = sx + hash(seed + i * 211) * this.chunkSize;
      const z = sz + hash(seed + i * 223) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -0.5 || h > 6) continue;
      this._addFern(x, h, z, i);
    }

    const mossCount = 8 + Math.floor(hash(seed + 1000) * 6);
    for (let i = 0; i < mossCount; i++) {
      const x = sx + hash(seed + i * 239) * this.chunkSize;
      const z = sz + hash(seed + i * 251) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -1 || h > 5) continue;
      this._addMoss(x, h, z, hash(seed + i * 263));
    }
  }

  _addTree(x, y, z, scale, species) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const trunkH = (5 + scale * 5) * (species === 'pine' ? 1.3 : 1);
    const trunkR = 0.12 + scale * 0.08;

    const segments = 12;
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.5, trunkR, trunkH, segments, 4);
    const trunkPos = trunkGeo.attributes.position;
    for (let i = 0; i < trunkPos.count; i++) {
      const ny = trunkPos.getY(i) / trunkH;
      const bend = Math.sin(ny * Math.PI) * 0.15 * scale;
      trunkPos.setX(i, trunkPos.getX(i) + bend);
      const barkR = 1 + (Math.sin(ny * 12 + x) * 0.03 + Math.sin(ny * 7 + z) * 0.02);
      trunkPos.setX(i, trunkPos.getX(i) * barkR);
      trunkPos.setZ(i, trunkPos.getZ(i) * barkR);
    }
    trunkGeo.computeVertexNormals();
    const trunkColors = {
      oak: 0x4A3520, pine: 0x3A2A18, birch: 0xC8B8A0
    };
    const trunkMat = new THREE.MeshStandardMaterial({
      color: trunkColors[species], roughness: 0.95, metalness: 0
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    if (species === 'oak') {
      const branchCount = 4 + Math.floor(Math.random() * 3);
      for (let b = 0; b < branchCount; b++) {
        const bLen = (1.5 + scale * 1.5) * (0.7 + Math.random() * 0.6);
        const bGeo = new THREE.CylinderGeometry(0.03, 0.09, bLen, 5, 2);
        const bPos = bGeo.attributes.position;
        for (let i = 0; i < bPos.count; i++) {
          const t = (bPos.getY(i) + bLen / 2) / bLen;
          bPos.setX(i, bPos.getX(i) * (1 + t * 0.3));
        }
        bGeo.computeVertexNormals();
        const branch = new THREE.Mesh(bGeo, trunkMat);
        const angle = (b / branchCount) * Math.PI * 2 + Math.random() * 0.5;
        const heightFrac = 0.45 + (b / branchCount) * 0.3;
        branch.position.set(Math.sin(angle) * 1.4, trunkH * heightFrac, Math.cos(angle) * 1.4);
        branch.rotation.z = Math.sin(angle) * 0.6;
        branch.rotation.x = Math.cos(angle) * 0.5;
        branch.castShadow = true;
        group.add(branch);
      }
      const canopyClusters = 7 + Math.floor(Math.random() * 4);
      for (let l = 0; l < canopyClusters; l++) {
        const r = (1.5 + scale * 1.8) * (0.5 + Math.random() * 0.5);
        const leafGeo = new THREE.IcosahedronGeometry(r, 1);
        const leafPos = leafGeo.attributes.position;
        for (let i = 0; i < leafPos.count; i++) {
          leafPos.setY(i, leafPos.getY(i) * (0.6 + Math.random() * 0.2));
        }
        leafGeo.computeVertexNormals();
        const leafMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.26 + Math.random() * 0.06, 0.45 + Math.random() * 0.2, 0.18 + Math.random() * 0.1),
          roughness: 0.82
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        const spread = 2 + scale * 2;
        leaf.position.set(
          (Math.random() - 0.5) * spread,
          trunkH + r * 0.2 + Math.random() * 2,
          (Math.random() - 0.5) * spread
        );
        leaf.castShadow = true;
        group.add(leaf);
      }
    } else if (species === 'pine') {
      const layerCount = 6 + Math.floor(Math.random() * 2);
      for (let l = 0; l < layerCount; l++) {
        const r = (1.8 + scale * 1.5) * (1 - l / layerCount * 0.8);
        const h = (2.5 + scale) * (1 - l / layerCount * 0.3);
        const coneGeo = new THREE.ConeGeometry(r, h, 10);
        const coneMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.29 + Math.random() * 0.03, 0.4 + Math.random() * 0.12, 0.14 + l * 0.015),
          roughness: 0.85
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = trunkH * 0.3 + l * h * 0.5;
        cone.rotation.y = Math.random() * Math.PI;
        cone.castShadow = true;
        group.add(cone);
      }
    } else {
      const branchCount = 5 + Math.floor(Math.random() * 2);
      for (let b = 0; b < branchCount; b++) {
        const bLen = (1 + scale * 1.2) * (0.7 + Math.random() * 0.5);
        const bGeo = new THREE.CylinderGeometry(0.02, 0.06, bLen, 5, 2);
        const branch = new THREE.Mesh(bGeo, trunkMat);
        const angle = (b / branchCount) * Math.PI * 2 + Math.random() * 0.3;
        branch.position.set(Math.sin(angle) * 0.9, trunkH * (0.35 + b * 0.1), Math.cos(angle) * 0.9);
        branch.rotation.z = Math.sin(angle) * 0.7;
        branch.rotation.x = Math.cos(angle) * 0.6;
        branch.castShadow = true;
        group.add(branch);
      }
      const canopyClusters = 6 + Math.floor(Math.random() * 3);
      for (let l = 0; l < canopyClusters; l++) {
        const r = (1.2 + scale * 1.3) * (0.5 + Math.random() * 0.5);
        const leafGeo = new THREE.IcosahedronGeometry(r, 1);
        const leafPos = leafGeo.attributes.position;
        for (let i = 0; i < leafPos.count; i++) {
          leafPos.setY(i, leafPos.getY(i) * (0.55 + Math.random() * 0.25));
        }
        leafGeo.computeVertexNormals();
        const leafMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.22 + Math.random() * 0.05, 0.35 + Math.random() * 0.15, 0.22 + Math.random() * 0.08),
          roughness: 0.82
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        const spread = 1.5 + scale * 1.5;
        leaf.position.set(
          (Math.random() - 0.5) * spread,
          trunkH + r * 0.3 + Math.random() * 1.5,
          (Math.random() - 0.5) * spread
        );
        leaf.castShadow = true;
        group.add(leaf);
      }
    }

    this.scene.add(group);
    this.trees.push(group);
  }

  _setupGrass() {
    const count = 5000;
    const geo = new THREE.PlaneGeometry(0.12, 0.5, 1, 4);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y + 0.25) / 0.5;
      pos.setX(i, pos.getX(i) * (1 - t * 0.5));
      pos.setZ(i, Math.sin(t * 3.14) * 0.02);
    }
    geo.translate(0, 0.25, 0);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3A6B3A, side: THREE.DoubleSide, roughness: 0.9
    });
    this.grassMesh = new THREE.InstancedMesh(geo, mat, count);
    this.grassMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.grassMesh.receiveShadow = true;
    this.scene.add(this.grassMesh);
    this.grassCount = 0;
  }

  _addGrassInstance(x, y, z) {
    if (this.grassCount >= 5000) return;
    const m = new THREE.Matrix4();
    const s = 0.5 + Math.random() * 1.0;
    const lean = (Math.random() - 0.5) * 0.3;
    m.makeRotationY(Math.random() * Math.PI);
    m.multiply(new THREE.Matrix4().makeRotationZ(lean));
    m.scale(new THREE.Vector3(s, s * (0.7 + Math.random() * 0.6), s));
    m.setPosition(x, y + 0.02, z);
    this.grassMesh.setMatrixAt(this.grassCount, m);
    const c = new THREE.Color().setHSL(0.26 + Math.random() * 0.06, 0.35 + Math.random() * 0.2, 0.18 + Math.random() * 0.12);
    this.grassMesh.setColorAt(this.grassCount, c);
    this.grassCount++;
    this.grassMesh.count = this.grassCount;
    this.grassMesh.instanceMatrix.needsUpdate = true;
    if (this.grassMesh.instanceColor) this.grassMesh.instanceColor.needsUpdate = true;
  }

  _addFlower(x, y, z, i) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const stemH = 0.3 + Math.random() * 0.5;
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, stemH, 4);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x3A6B3A, roughness: 0.9 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = stemH / 2;
    group.add(stem);

    const petalColors = [0xD4A0D4, 0xE7A95A, 0xBFDFF6, 0xF5F0E8, 0xE88B8B, 0xFFE4B5];
    const pColor = petalColors[i % petalColors.length];
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2;
      const petalGeo = new THREE.SphereGeometry(0.06, 5, 4);
      petalGeo.scale(1, 0.4, 0.6);
      const petalMat = new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.5 });
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.sin(angle) * 0.08, stemH + 0.02, Math.cos(angle) * 0.08);
      petal.rotation.y = angle;
      group.add(petal);
    }

    const centerGeo = new THREE.SphereGeometry(0.04, 5, 4);
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xE7A95A, emissive: 0xE7A95A, emissiveIntensity: 0.2 });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.position.y = stemH + 0.04;
    group.add(center);

    this.scene.add(group);
    this.flowers.push(group);
  }

  _addMoss(x, y, z, rand) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const patchCount = 3 + Math.floor(rand * 4);
    for (let i = 0; i < patchCount; i++) {
      const r = 0.2 + rand * 0.5;
      const geo = new THREE.CircleGeometry(r, 6);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.28 + rand * 0.04, 0.35 + rand * 0.15, 0.15 + rand * 0.08),
        roughness: 0.95
      });
      const patch = new THREE.Mesh(geo, mat);
      patch.position.set((Math.random() - 0.5) * 0.8, 0.01 + i * 0.005, (Math.random() - 0.5) * 0.8);
      patch.rotation.y = Math.random() * Math.PI;
      patch.receiveShadow = true;
      group.add(patch);
    }
    this.scene.add(group);
  }

  _addRock(x, y, z, rand) {
    const s = 0.2 + rand * 0.7;
    const geo = new THREE.DodecahedronGeometry(s, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) * (0.5 + rand * 0.3));
      pos.setX(i, pos.getX(i) * (0.8 + Math.random() * 0.4));
    }
    geo.computeVertexNormals();
    const c = new THREE.Color().setHSL(0.07, 0.12, 0.22 + rand * 0.08);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: false });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, y + s * 0.2, z);
    rock.rotation.set(rand * 2, rand * 3, rand * 0.5);
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.scene.add(rock);
    this.rocks.push(rock);
  }

  _addFern(x, y, z, seed) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const hash = (n) => { n = ((n >> 13) ^ n) * 1274126177; return ((n >> 16) ^ n) / 2147483648; };
    const frondCount = 5 + Math.floor(hash(seed) * 4);
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2 + hash(seed + f) * 0.4;
      const frondLen = 0.5 + hash(seed + f * 7) * 0.7;
      const frondGeo = new THREE.PlaneGeometry(0.12, frondLen, 1, 4);
      const pos = frondGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const t = (pos.getY(i) + frondLen / 2) / frondLen;
        pos.setX(i, pos.getX(i) * (1 - t * 0.6));
        pos.setY(i, pos.getY(i) - t * t * 0.15);
      }
      frondGeo.computeVertexNormals();
      const frondMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.29 + hash(seed + f * 13) * 0.04, 0.5, 0.16 + hash(seed + f * 17) * 0.06),
        side: THREE.DoubleSide, roughness: 0.85
      });
      const frond = new THREE.Mesh(frondGeo, frondMat);
      frond.position.set(Math.sin(angle) * 0.25, frondLen * 0.15, Math.cos(angle) * 0.25);
      frond.rotation.z = Math.sin(angle) * 0.5;
      frond.rotation.x = Math.cos(angle) * 0.4;
      frond.rotation.y = angle;
      frond.castShadow = true;
      group.add(frond);
    }
    this.scene.add(group);
    this.ferns.push(group);
  }

  _setupLivingTree() {
    const group = new THREE.Group();

    const trunkH = 12;
    const trunkR = 0.6;
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.4, trunkR, trunkH, 10);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3A2210, roughness: 0.95 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    for (let b = 0; b < 5; b++) {
      const bLen = 2 + Math.random() * 2;
      const bGeo = new THREE.CylinderGeometry(0.06, 0.12, bLen, 5);
      const branch = new THREE.Mesh(bGeo, trunkMat);
      const angle = (b / 5) * Math.PI * 2;
      branch.position.set(Math.sin(angle) * 1.8, trunkH * (0.5 + b * 0.08), Math.cos(angle) * 1.8);
      branch.rotation.z = Math.sin(angle) * 0.5;
      branch.rotation.x = Math.cos(angle) * 0.5;
      branch.castShadow = true;
      group.add(branch);
    }

    for (let l = 0; l < 6; l++) {
      const r = 4.5 - l * 0.3;
      const leafGeo = new THREE.SphereGeometry(r, 10, 8);
      const leafMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.28, 0.5, 0.2 + l * 0.02),
        roughness: 0.85
      });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(Math.sin(l * 1.1) * 1, trunkH + 1 + l * 0.6, Math.cos(l * 0.9) * 1);
      leaf.castShadow = true;
      group.add(leaf);
    }

    const orbAngles = [-0.65, -0.35, -0.1, 0.1, 0.35, 0.65];
    const orbColors = [0x6FA36F, 0x5FA8D3, 0xE7A95A, 0x6E5843, 0xD9E3EC, 0x8BC48B];
    this.orbs = [];
    for (let i = 0; i < 6; i++) {
      const dist = 3.5;
      const angle = orbAngles[i];
      const orbGeo = new THREE.SphereGeometry(0.25, 8, 8);
      const orbMat = new THREE.MeshStandardMaterial({
        color: orbColors[i], emissive: orbColors[i], emissiveIntensity: 0.5, roughness: 0.3
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(Math.sin(angle) * dist, trunkH * 0.55, Math.cos(angle) * dist);
      group.add(orb);
      this.orbs.push(orb);

      const glowGeo = new THREE.SphereGeometry(0.5, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({ color: orbColors[i], transparent: true, opacity: 0.12 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(orb.position);
      group.add(glow);
    }

    this.scene.add(group);
    this.livingTree = group;
  }

  _setupDustMotes() {
    const count = 100;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = 1 + Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      sizes[i] = 0.05 + Math.random() * 0.1;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xFFF5E0, size: 0.12, transparent: true, opacity: 0.35,
      sizeAttenuation: true, depthWrite: false
    });
    this.dustMotes = new THREE.Points(geo, mat);
    this.scene.add(this.dustMotes);
  }

  _setupFireflies() {
    const count = 30;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = 0.5 + Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xE7A95A, size: 0.18, transparent: true, opacity: 0.6,
      sizeAttenuation: true, depthWrite: false
    });
    this.fireflies = new THREE.Points(geo, mat);
    this.scene.add(this.fireflies);
  }

  _setupBirdFlocks() {
    for (let f = 0; f < 3; f++) {
      const group = new THREE.Group();
      const birdCount = 4 + Math.floor(Math.random() * 5);
      for (let b = 0; b < birdCount; b++) {
        const birdGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
        birdGeo.rotateZ(Math.PI / 2);
        const birdMat = new THREE.MeshStandardMaterial({ color: 0x1A1A2E, roughness: 0.8 });
        const bird = new THREE.Mesh(birdGeo, birdMat);
        bird.position.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 8
        );
        group.add(bird);
      }
      group.position.set(
        (Math.random() - 0.5) * 100,
        15 + Math.random() * 20,
        (Math.random() - 0.5) * 100
      );
      group.userData = {
        speed: 3 + Math.random() * 4,
        radius: 30 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
        wingPhase: Math.random() * Math.PI * 2
      };
      this.scene.add(group);
      this.birdFlocks.push(group);
    }
  }

  _setupRain() {
    const count = 2000;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.rainVelocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      this.rainVelocities[i] = 0.4 + Math.random() * 0.3;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xAABBCC, size: 0.06, transparent: true, opacity: 0.3,
      depthWrite: false
    });
    this.rain = new THREE.Points(geo, mat);
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  _setupGodRays() {
    const geo = new THREE.CylinderGeometry(0.3, 15, 60, 6, 1, true);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.08 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vY;
        void main() {
          vUv = uv;
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        varying vec2 vUv;
        varying float vY;
        void main() {
          float fade = smoothstep(-30.0, 30.0, vY);
          float flicker = 0.7 + sin(time * 0.5 + vUv.x * 6.28) * 0.3;
          float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
          float alpha = fade * flicker * edge * opacity;
          gl_FragColor = vec4(1.0, 0.98, 0.9, alpha);
        }`
    });
    this.godRays = [];
    for (let i = 0; i < 5; i++) {
      const ray = new THREE.Mesh(geo, mat.clone());
      ray.position.set((Math.random() - 0.5) * 60, 30, (Math.random() - 0.5) * 60);
      ray.rotation.y = Math.random() * Math.PI;
      ray.rotation.z = (Math.random() - 0.5) * 0.15;
      this.scene.add(ray);
      this.godRays.push(ray);
    }
  }

  _setupGroundFog() {
    const geo = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        fogColor: { value: new THREE.Color(0x88AA88) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vDist;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vDist = length(wp.xz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float time;
        uniform vec3 fogColor;
        varying vec2 vUv;
        varying float vDist;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          vec2 uv = vUv * 15.0;
          float n = noise(uv + time * 0.05) * 0.5 + noise(uv * 2.0 - time * 0.03) * 0.25;
          float distFade = smoothstep(200.0, 50.0, vDist);
          float alpha = n * 0.18 * distFade;
          gl_FragColor = vec4(fogColor, alpha);
        }`
    });
    this.groundFog = new THREE.Mesh(geo, mat);
    this.groundFog.position.y = -1.5;
    this.scene.add(this.groundFog);
  }

  _startEntrance() {
    this.entranceActive = true;
    this.entrancePhase = 0;
    this.camera.position.set(0, 50, 100);
  }

  _updateEntrance(dt) {
    if (!this.entranceActive) return;
    this.entrancePhase += dt * 0.15;
    const t = Math.min(1, this.entrancePhase);

    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    this.camera.position.y = 50 + (this.cameraHeight - 50) * ease;
    this.camera.position.z = 100 + (5 - 100) * ease;
    this.camera.position.x = Math.sin(ease * 0.5) * 20;

    this.targetPitch = 0.25 - ease * 0.25 + Math.sin(ease * 3) * 0.1 * (1 - ease);
    this.targetYaw = ease * 0.3;

    if (t >= 1) this.entranceActive = false;
  }

  _bindEvents() {
    const c = this.renderer.domElement;

    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    c.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.targetYaw -= dx * 0.003;
      this.targetPitch -= dy * 0.003;
      this.targetPitch = Math.max(-0.4, Math.min(1.0, this.targetPitch));
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;
    });
    window.addEventListener('mouseup', () => { this.isDragging = false; });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.fov = Math.max(35, Math.min(90, this.camera.fov + e.deltaY * 0.03));
      this.camera.updateProjectionMatrix();
    }, { passive: false });

    let lastTouch = null;
    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });
    c.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - lastTouch.x;
        const dy = e.touches[0].clientY - lastTouch.y;
        this.targetYaw -= dx * 0.004;
        this.targetPitch -= dy * 0.004;
        this.targetPitch = Math.max(-0.4, Math.min(1.0, this.targetPitch));
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });
    c.addEventListener('touchend', () => { this.isDragging = false; lastTouch = null; });

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null && e.beta !== null) {
          this.gyroEnabled = true;
          this.targetYaw = -e.alpha * 0.01;
          this.targetPitch = e.beta * 0.005;
        }
      });
    }
  }

  setTimeOfDay(tod) {
    this.tod = tod;
    const t = LDL.timeOfDay[tod] || LDL.timeOfDay.noon;
    const skyTop = new THREE.Color(t.skyTop);
    const skyMid = new THREE.Color(t.skyMid);
    const skyBot = new THREE.Color(t.skyBottom);

    this.ambient.color.copy(skyMid).multiplyScalar(0.8);
    this.ambient.intensity = 0.2 + t.ambient * 0.5;

    this.hemi.color.copy(skyTop);
    this.hemi.groundColor.copy(new THREE.Color(0x3A5A3A));
    this.hemi.intensity = 0.2 + t.ambient * 0.4;

    this.sun.intensity = 0.2 + t.ambient * 1.8;
    this.sun.color.set(t.ambient > 0.5 ? 0xFFF0D0 : 0xFFAA60);

    this.scene.fog.color.copy(skyMid);
    this.scene.fog.density = 0.004 + (1 - t.ambient) * 0.004;

    this.renderer.setClearColor(skyMid);
    this.renderer.toneMappingExposure = 0.6 + t.ambient * 0.7;

    if (this.skyMesh) {
      this.skyMesh.material.uniforms.topColor.value.copy(skyTop);
      this.skyMesh.material.uniforms.midColor.value.copy(skyMid);
      this.skyMesh.material.uniforms.bottomColor.value.copy(skyBot);
    }
    if (this.water) {
      this.water.material.uniforms.fogColor.value.copy(skyMid);
    }
  }

  update(dt) {
    this.time += dt;

    if (this.entranceActive) {
      this._updateEntrance(dt);
      return;
    }

    this.wind.gustTimer += dt;
    if (this.wind.gustTimer > 3 + Math.random() * 6) {
      this.wind.target = 0.3 + Math.random() * 0.7;
      this.wind.gustTimer = 0;
    }
    this.wind.strength += (this.wind.target - this.wind.strength) * 0.02;

    if (!this.isDragging) {
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const moveDir = new THREE.Vector3();

      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
      if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);

      this.isMoving = moveDir.lengthSq() > 0;
      if (this.isMoving) {
        moveDir.normalize();
        this.velocity.add(moveDir.multiplyScalar(this.moveSpeed * dt));
        this.headBobPhase += dt * 9;
        this.headBob = Math.sin(this.headBobPhase) * 0.06;
      } else {
        this.headBob *= 0.92;
      }
    } else {
      this.isMoving = false;
      this.headBob *= 0.92;
    }

    this.velocity.multiplyScalar(this.friction);
    this.camera.position.add(this.velocity.clone().multiplyScalar(dt * 60));

    const terrainY = this._terrainHeight(this.camera.position.x, this.camera.position.z);
    const targetY = Math.max(terrainY + this.cameraHeight, terrainY + 1.5);
    this.camera.position.y += (targetY + this.headBob - this.camera.position.y) * 0.1;

    this.yaw += (this.targetYaw - this.yaw) * this.smoothing;
    this.pitch += (this.targetPitch - this.pitch) * this.smoothing;

    const lookDir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(this.camera.position.clone().add(lookDir));

    this.sun.position.copy(this.camera.position).add(new THREE.Vector3(60, 100, 40));
    this.sun.target.position.copy(this.camera.position);
    this.sun.target.updateMatrixWorld();

    if (this.skyMesh) this.skyMesh.position.copy(this.camera.position);

    if (this.water) this.water.material.uniforms.time.value = this.time;

    for (const tree of this.trees) {
      const sway = Math.sin(this.time * 0.7 + tree.position.x * 0.1 + tree.position.z * 0.05) * 0.02 * this.wind.strength;
      tree.rotation.z = sway;
      tree.rotation.x = Math.sin(this.time * 0.5 + tree.position.z * 0.08) * 0.01 * this.wind.strength;
    }

    if (this.grassMesh) {
      const grassMat = this.grassMesh.material;
      grassMat.color.setHSL(0.28, 0.5, 0.2 + Math.sin(this.time * 0.3) * 0.02);
    }

    for (const flower of this.flowers) {
      const sway = Math.sin(this.time * 1.0 + flower.position.x * 0.3) * 0.1 * this.wind.strength;
      flower.rotation.z = sway;
    }

    for (const fern of this.ferns) {
      const sway = Math.sin(this.time * 0.7 + fern.position.x * 0.2 + fern.position.z * 0.15) * 0.04 * this.wind.strength;
      fern.rotation.z = sway;
    }

    if (this.orbs) {
      for (let i = 0; i < this.orbs.length; i++) {
        const pulse = Math.sin(this.time * 1.5 + i * 1.1) * 0.25 + 0.5;
        this.orbs[i].material.emissiveIntensity = pulse;
      }
    }

    if (this.dustMotes) {
      const pos = this.dustMotes.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) + Math.sin(this.time * 0.3 + i * 0.1) * 0.01 + this.wind.strength * 0.015;
        let y = pos.getY(i) + Math.sin(this.time * 0.2 + i * 0.3) * 0.005;
        let z = pos.getZ(i) + Math.cos(this.time * 0.25 + i * 0.15) * 0.01;
        if (x > 30) x = -30; if (x < -30) x = 30;
        if (z > 30) z = -30; if (z < -30) z = 30;
        pos.setX(i, x); pos.setY(i, y); pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }

    if (this.fireflies) {
      const pos = this.fireflies.geometry.attributes.position;
      const t = this.time;
      for (let i = 0; i < pos.count; i++) {
        const phase = i * 0.7;
        let x = pos.getX(i) + Math.sin(t * 0.4 + phase) * 0.02;
        let y = pos.getY(i) + Math.sin(t * 0.3 + phase * 1.3) * 0.01;
        let z = pos.getZ(i) + Math.cos(t * 0.35 + phase * 0.8) * 0.02;
        pos.setX(i, x); pos.setY(i, y); pos.setZ(i, z);
      }
      pos.needsUpdate = true;
      this.fireflies.material.opacity = 0.3 + Math.sin(this.time * 2) * 0.3;
    }

    for (const flock of this.birdFlocks) {
      const ud = flock.userData;
      ud.phase += dt * 0.3;
      ud.wingPhase += dt * 8;
      flock.position.x += Math.cos(ud.phase) * ud.speed * dt;
      flock.position.z += Math.sin(ud.phase) * ud.speed * dt;
      flock.position.y += Math.sin(ud.wingPhase * 0.3) * 0.02;
      flock.rotation.y = ud.phase + Math.PI / 2;
      flock.children.forEach((bird, i) => {
        bird.position.y += Math.sin(ud.wingPhase + i * 0.5) * 0.005;
      });
    }

    if (this.rain && this.rain.visible) {
      const pos = this.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - this.rainVelocities[i];
        if (y < 0) {
          y = 40 + Math.random() * 10;
          pos.setX(i, this.camera.position.x + (Math.random() - 0.5) * 80);
          pos.setZ(i, this.camera.position.z + (Math.random() - 0.5) * 80);
        }
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + this.wind.strength * 0.1);
      }
      pos.needsUpdate = true;
    }

    if (this.godRays) {
      for (const ray of this.godRays) {
        ray.material.uniforms.time.value = this.time;
        ray.position.x += Math.sin(this.time * 0.1 + ray.position.z) * 0.003;
      }
    }
    if (this.groundFog) {
      this.groundFog.material.uniforms.time.value = this.time;
    }

    const cx = Math.floor(this.camera.position.x / this.chunkSize);
    const cz = Math.floor(this.camera.position.z / this.chunkSize);
    this._generateChunks(cx, cz);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
