// BioEcho 3D Scene — Three.js Realistic Living World
// Terrain, procedural trees, lighting, shadows, fog, rain, sky

class BioEchoScene {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.sun = null;
    this.ambient = null;
    this.terrain = null;
    this.trees = [];
    this.flowers = [];
    this.rocks = [];
    this.grass = [];
    this.rain = null;
    this.particles = null;
    this.skyMesh = null;
    this.wind = { strength: 0.5, target: 0.5, gust: 0 };
    this.mouse = { x: 0, y: 0 };
    this.keys = {};
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.yaw = 0;
    this.pitch = 0.3;
    this.targetYaw = 0;
    this.targetPitch = 0.3;
    this.velocity = new THREE.Vector3();
    this.moveSpeed = 12;
    this.friction = 0.85;
    this.headBob = 0;
    this.headBobPhase = 0;
    this.isMoving = false;
    this.cameraHeight = 2.5;
    this.gyroEnabled = false;
    this.tod = 'noon';
    this.time = 0;
    this.chunkSize = 60;
    this.renderDist = 4;
    this.chunks = {};
    this.treeWorldX = 0;
    this.treeWorldZ = 0;
    this.livingTree = null;
    this.onReady = null;
  }

  init(canvas) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, this.cameraHeight, 5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this._setupLighting();
    this._setupSky();
    this._setupTerrain();
    this._generateChunks(0, 0);
    this._setupLivingTree();
    this._setupRain();
    this._setupParticles();
    this._bindEvents();

    window.addEventListener('resize', () => this._onResize());
  }

  _setupLighting() {
    this.ambient = new THREE.AmbientLight(0x87CEEB, 0.4);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xFFF5E0, 1.2);
    this.sun.position.set(50, 80, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 300;
    this.sun.shadow.camera.left = -80;
    this.sun.shadow.camera.right = 80;
    this.sun.shadow.camera.top = 80;
    this.sun.shadow.camera.bottom = -80;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun);

    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3E6B48, 0.3);
    this.scene.add(hemi);
  }

  _setupSky() {
    const skyGeo = new THREE.SphereGeometry(400, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x5FA8D3) },
        midColor: { value: new THREE.Color(0x87CEEB) },
        bottomColor: { value: new THREE.Color(0xBFDFF6) },
        offset: { value: 20 },
        exponent: { value: 0.5 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          if (h > 0.0) {
            gl_FragColor = vec4(mix(midColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
          } else {
            gl_FragColor = vec4(mix(midColor, bottomColor, pow(max(-h, 0.0), 0.5)), 1.0);
          }
        }
      `
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  _setupTerrain() {
    const size = 400;
    const segments = 128;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this._terrainHeight(x, z);
      pos.setY(i, h);

      const c = this._terrainColor(x, z, h);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    });

    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  _terrainHeight(x, z) {
    let h = 0;
    h += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 4;
    h += Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.04 + 0.7) * 2;
    h += Math.sin(x * 0.1 + 2.1) * Math.cos(z * 0.08 + 1.9) * 0.8;
    h += Math.sin(x * 0.2) * Math.cos(z * 0.15) * 0.3;
    return h;
  }

  _terrainColor(x, z, h) {
    const c = new THREE.Color();
    if (h < -1) {
      c.setRGB(0.35, 0.45, 0.4);
    } else if (h < 1) {
      c.setRGB(0.18, 0.32, 0.18);
    } else if (h < 3) {
      c.setRGB(0.22, 0.38, 0.2);
    } else {
      c.setRGB(0.28, 0.35, 0.22);
    }
    const n = (Math.sin(x * 0.3) * Math.cos(z * 0.3) + 1) * 0.5;
    c.r += n * 0.03;
    c.g += n * 0.04;
    c.b += n * 0.02;
    return c;
  }

  _generateChunks(cx, cz) {
    for (let dz = -this.renderDist; dz <= this.renderDist; dz++) {
      for (let dx = -this.renderDist; dx <= this.renderDist; dx++) {
        const key = `${cx + dx},${cz + dz}`;
        if (this.chunks[key]) continue;

        const sx = (cx + dx) * this.chunkSize;
        const sz = (cz + dz) * this.chunkSize;
        this.chunks[key] = true;

        this._generateChunkContent(sx, sz);
      }
    }
  }

  _generateChunkContent(sx, sz) {
    const seed = sx * 7919 + sz * 104729;
    const hash = (n) => { n = ((n >> 13) ^ n) * 1274126177; return ((n >> 16) ^ n) / 2147483648; };

    for (let i = 0; i < 8; i++) {
      const x = sx + hash(seed + i * 31) * this.chunkSize;
      const z = sz + hash(seed + i * 47 + 100) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -0.5) continue;
      const scale = 0.6 + hash(seed + i * 67) * 0.8;
      const type = hash(seed + i * 113) > 0.3 ? 'deciduous' : 'conifer';
      this._addTree(x, h, z, scale, type);
    }

    for (let i = 0; i < 60; i++) {
      const x = sx + hash(seed + i * 131) * this.chunkSize;
      const z = sz + hash(seed + i * 139) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -0.5) continue;
      this._addGrassBlade(x, h, z);
    }

    for (let i = 0; i < 12; i++) {
      const x = sx + hash(seed + i * 157) * this.chunkSize;
      const z = sz + hash(seed + i * 163) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -0.5) continue;
      this._addFlower(x, h, z, i);
    }

    for (let i = 0; i < 5; i++) {
      const x = sx + hash(seed + i * 191) * this.chunkSize;
      const z = sz + hash(seed + i * 193) * this.chunkSize;
      const h = this._terrainHeight(x, z);
      if (h < -0.5) continue;
      this._addRock(x, h, z, hash(seed + i * 197));
    }
  }

  _addTree(x, y, z, scale, type) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const trunkH = (6 + scale * 6);
    const trunkR = 0.15 + scale * 0.1;
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4A3520, roughness: 0.95 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    if (type === 'deciduous') {
      const canopyR = 2 + scale * 2;
      const canopyGeo = new THREE.SphereGeometry(canopyR, 8, 6);
      const c = new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.5, 0.25 + Math.random() * 0.1);
      const canopyMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = trunkH + canopyR * 0.5;
      canopy.castShadow = true;
      group.add(canopy);
    } else {
      const coneH = 4 + scale * 3;
      const coneR = 1.5 + scale * 1.2;
      for (let l = 0; l < 3; l++) {
        const lr = coneR * (1 - l * 0.25);
        const lh = coneH * 0.35;
        const coneGeo = new THREE.ConeGeometry(lr, lh, 6);
        const c = new THREE.Color().setHSL(0.3, 0.5, 0.18 + l * 0.03);
        const coneMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = trunkH * 0.5 + l * coneH * 0.5 + coneH * 0.3;
        cone.castShadow = true;
        group.add(cone);
      }
    }

    this.scene.add(group);
    this.trees.push(group);
  }

  _addGrassBlade(x, y, z) {
    const h = 0.2 + Math.random() * 0.5;
    const geo = new THREE.PlaneGeometry(0.08, h);
    const c = new THREE.Color().setHSL(0.28 + Math.random() * 0.05, 0.45, 0.25 + Math.random() * 0.1);
    const mat = new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9 });
    const blade = new THREE.Mesh(geo, mat);
    blade.position.set(x, y + h / 2, z);
    blade.rotation.y = Math.random() * Math.PI;
    this.scene.add(blade);
    this.grass.push(blade);
  }

  _addFlower(x, y, z, i) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const stemH = 0.3 + Math.random() * 0.4;
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, stemH, 4);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x3E6B48 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = stemH / 2;
    group.add(stem);

    const colors = [0xD4A0D4, 0xE7A95A, 0xBFDFF6, 0x6FA36F, 0xF5F0E8, 0xE88B8B];
    const petalColor = colors[i % colors.length];
    const petalGeo = new THREE.SphereGeometry(0.08, 6, 4);
    const petalMat = new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.6 });
    const petals = new THREE.Mesh(petalGeo, petalMat);
    petals.position.y = stemH + 0.05;
    group.add(petals);

    this.scene.add(group);
    this.flowers.push(group);
  }

  _addRock(x, y, z, rand) {
    const s = 0.3 + rand * 0.8;
    const geo = new THREE.DodecahedronGeometry(s, 0);
    const c = new THREE.Color().setHSL(0.08, 0.15, 0.25 + rand * 0.1);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, y + s * 0.3, z);
    rock.rotation.set(rand * 2, rand * 3, rand);
    rock.castShadow = true;
    this.scene.add(rock);
    this.rocks.push(rock);
  }

  _setupLivingTree() {
    const group = new THREE.Group();
    group.position.set(0, 0, 0);

    const trunkH = 10;
    const trunkR = 0.5;
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.5, trunkR, trunkH, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3A2210, roughness: 0.95 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const canopyR = 5;
    const canopyGeo = new THREE.SphereGeometry(canopyR, 12, 8);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2A5A3A, roughness: 0.85 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = trunkH + canopyR * 0.3;
    canopy.castShadow = true;
    group.add(canopy);

    const orbAngles = [-0.65, -0.35, -0.1, 0.1, 0.35, 0.65];
    const orbColors = [0x6FA36F, 0x5FA8D3, 0xE7A95A, 0x6E5843, 0xD9E3EC, 0x8BC48B];
    this.orbs = [];
    for (let i = 0; i < 6; i++) {
      const orbGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const orbMat = new THREE.MeshStandardMaterial({
        color: orbColors[i], emissive: orbColors[i], emissiveIntensity: 0.4, roughness: 0.3
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      const dist = 3;
      const angle = orbAngles[i];
      orb.position.set(Math.sin(angle) * dist, trunkH * 0.6, Math.cos(angle) * dist);
      group.add(orb);
      this.orbs.push(orb);

      const glowGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({ color: orbColors[i], transparent: true, opacity: 0.15 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(orb.position);
      group.add(glow);
    }

    this.scene.add(group);
    this.livingTree = group;
  }

  _setupRain() {
    const count = 3000;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      velocities[i] = 0.3 + Math.random() * 0.3;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xBFDFF6, size: 0.08, transparent: true, opacity: 0.4 });
    this.rain = new THREE.Points(geo, mat);
    this.rainVelocities = velocities;
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  _setupParticles() {
    const count = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = 1 + Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xE7A95A, size: 0.12, transparent: true, opacity: 0.5 });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
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
      this.targetPitch = Math.max(-0.5, Math.min(1.2, this.targetPitch));
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;
    });
    window.addEventListener('mouseup', () => { this.isDragging = false; });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.fov = Math.max(30, Math.min(100, this.camera.fov + e.deltaY * 0.05));
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
        this.targetPitch = Math.max(-0.5, Math.min(1.2, this.targetPitch));
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
    const ambientColor = new THREE.Color(t.skyTop);
    this.ambient.color.copy(ambientColor);
    this.ambient.intensity = 0.3 + t.ambient * 0.5;
    this.sun.intensity = 0.3 + t.ambient * 1.2;
    this.sun.color.set(t.ambient > 0.5 ? 0xFFF5E0 : 0xFFAA60);
    this.scene.fog.color.set(t.skyMid);
    this.renderer.setClearColor(t.skyMid);
    if (this.skyMesh) {
      this.skyMesh.material.uniforms.topColor.value.set(t.skyTop);
      this.skyMesh.material.uniforms.midColor.value.set(t.skyMid);
      this.skyMesh.material.uniforms.bottomColor.value.set(t.skyBottom);
    }
    this.renderer.toneMappingExposure = 0.5 + t.ambient * 0.8;
  }

  update(dt) {
    this.time += dt;

    this.wind.gust += dt;
    if (this.wind.gust > 3 + Math.random() * 5) {
      this.wind.target = 0.3 + Math.random() * 0.7;
      this.wind.gust = 0;
    }
    this.wind.strength += (this.wind.target - this.wind.strength) * 0.02;

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
      this.headBobPhase += dt * 8;
      this.headBob = Math.sin(this.headBobPhase) * 0.08;
    } else {
      this.headBob *= 0.9;
    }

    this.velocity.multiplyScalar(this.friction);
    this.camera.position.add(this.velocity.clone().multiplyScalar(dt));

    const terrainY = this._terrainHeight(this.camera.position.x, this.camera.position.z);
    this.camera.position.y = terrainY + this.cameraHeight + this.headBob;

    this.yaw += (this.targetYaw - this.yaw) * 0.08;
    this.pitch += (this.targetPitch - this.pitch) * 0.08;

    const lookTarget = this.camera.position.clone().add(
      new THREE.Vector3(-Math.sin(this.yaw) * 10, Math.sin(this.pitch) * 10, -Math.cos(this.yaw) * 10)
    );
    this.camera.lookAt(lookTarget);

    this.sun.position.copy(this.camera.position).add(new THREE.Vector3(50, 80, 30));
    this.sun.target.position.copy(this.camera.position);
    this.sun.target.updateMatrixWorld();

    for (const tree of this.trees) {
      const sway = Math.sin(this.time * 0.8 + tree.position.x * 0.1) * 0.03 * this.wind.strength;
      tree.rotation.z = sway;
    }

    for (const blade of this.grass) {
      const wind = Math.sin(this.time * 1.2 + blade.position.x * 0.5 + blade.position.z * 0.3) * 0.15 * this.wind.strength;
      blade.rotation.x = wind;
    }

    for (const flower of this.flowers) {
      const sway = Math.sin(this.time * 1.1 + flower.position.x * 0.3) * 0.08 * this.wind.strength;
      flower.rotation.z = sway;
    }

    if (this.orbs) {
      for (let i = 0; i < this.orbs.length; i++) {
        const pulse = Math.sin(this.time * 1.5 + i * 1.1) * 0.2 + 0.6;
        this.orbs[i].material.emissiveIntensity = pulse;
      }
    }

    if (this.rain.visible) {
      const pos = this.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - this.rainVelocities[i];
        if (y < 0) {
          y = 30 + Math.random() * 10;
          pos.setX(i, this.camera.position.x + (Math.random() - 0.5) * 60);
          pos.setZ(i, this.camera.position.z + (Math.random() - 0.5) * 60);
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    if (this.particles) {
      const pos = this.particles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) + Math.sin(this.time + i) * 0.01 + this.wind.strength * 0.02;
        let y = pos.getY(i) + Math.sin(this.time * 0.5 + i * 0.3) * 0.005;
        let z = pos.getZ(i) + Math.cos(this.time + i) * 0.01;
        pos.setX(i, x);
        pos.setY(i, y);
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }

    const cx = Math.floor(this.camera.position.x / this.chunkSize);
    const cz = Math.floor(this.camera.position.z / this.chunkSize);
    this._generateChunks(cx, cz);

    if (this.skyMesh) {
      this.skyMesh.position.copy(this.camera.position);
    }
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
