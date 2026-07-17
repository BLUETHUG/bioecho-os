// BioEcho Camera — 360° Immersive World Camera
// Mouse drag, touch swipe, gyroscope, WASD movement

class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.fov = 80;
    this.near = 0.1;
    this.far = 2000;
    this.sensitivity = 0.003;
    this.smoothing = 0.08;
    this.maxPitch = 1.2;
    this.minPitch = -0.4;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.moveSpeed = 3.5;
    this.friction = 0.88;
    this.keys = {};
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.touchStart = null;
    this.touchLast = null;
    this.gyroEnabled = false;
    this.gyroAlpha = 0;
    this.gyroBeta = 0;
    this.gyroGamma = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.time = 0;
    this.headBob = 0;
    this.headBobPhase = 0;
    this.isMoving = false;

    this._bindEvents();
    this._initGyro();
  }

  _bindEvents() {
    const c = this.canvas;

    c.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;
      c.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.targetYaw -= dx * this.sensitivity;
      this.targetPitch -= dy * this.sensitivity;
      this.targetPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.targetPitch));
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.touchLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    c.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.touchLast.x;
      const dy = e.touches[0].clientY - this.touchLast.y;
      this.targetYaw -= dx * this.sensitivity * 1.5;
      this.targetPitch -= dy * this.sensitivity * 1.5;
      this.targetPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.targetPitch));
      this.touchLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    c.addEventListener('touchend', () => {
      this.isDragging = false;
      this.touchStart = null;
      this.touchLast = null;
    });

    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    c.style.cursor = 'grab';
  }

  _initGyro() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      this._gyroPending = true;
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      this._startGyro();
    }
  }

  async requestGyro() {
    if (!this._gyroPending) return;
    try {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm === 'granted') this._startGyro();
    } catch (e) { console.log('Gyro denied'); }
    this._gyroPending = false;
  }

  _startGyro() {
    window.addEventListener('deviceorientation', (e) => {
      this.gyroEnabled = true;
      this.gyroAlpha = e.alpha || 0;
      this.gyroBeta = (e.beta || 0) * Math.PI / 180;
      this.gyroGamma = (e.gamma || 0) * Math.PI / 180;
    });
  }

  update(dt) {
    this.time += dt;

    if (this.gyroEnabled) {
      this.targetYaw = -this.gyroAlpha * 0.02;
      this.targetPitch = this.gyroBeta * 0.5;
    }

    const forward = { x: Math.sin(this.yaw), z: -Math.cos(this.yaw) };
    const right = { x: Math.cos(this.yaw), z: Math.sin(this.yaw) };

    let moveX = 0, moveZ = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) { moveX += forward.x; moveZ += forward.z; }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) { moveX -= forward.x; moveZ -= forward.z; }
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) { moveX -= right.x; moveZ -= right.z; }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) { moveX += right.x; moveZ += right.z; }

    this.isMoving = (moveX !== 0 || moveZ !== 0);

    if (this.isMoving) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (len > 0) { moveX /= len; moveZ /= len; }
      this.velocity.x += moveX * this.moveSpeed * dt;
      this.velocity.z += moveZ * this.moveSpeed * dt;

      this.headBobPhase += dt * 8;
      this.headBob = Math.sin(this.headBobPhase) * 0.03;
    }

    this.velocity.x *= this.friction;
    this.velocity.z *= this.friction;

    this.x += this.velocity.x;
    this.z += this.velocity.z;

    this.yaw += (this.targetYaw - this.yaw) * this.smoothing;
    this.pitch += (this.targetPitch - this.pitch) * this.smoothing;

    this.offsetX = Math.sin(this.yaw) * 100;
    this.offsetY = this.pitch * 50;
  }

  getParallax(depth) {
    return {
      x: this.offsetX * depth,
      y: this.offsetY * depth,
      scale: 1 - depth * 0.15
    };
  }

  project(x, y, z, W, H) {
    const cosY = Math.cos(this.yaw), sinY = Math.sin(this.yaw);
    const cosP = Math.cos(this.pitch), sinP = Math.sin(this.pitch);

    let rx = x - this.x;
    let ry = y;
    let rz = z - this.z;

    const tx = rx * cosY - rz * sinY;
    const tz = rx * sinY + rz * cosY;
    const ty = ry * cosP - tz * sinP;
    const tz2 = ry * sinP + tz * cosP;

    if (tz2 <= 0.1) return null;

    const scale = this.fov / tz2;
    return {
      x: W / 2 + tx * scale,
      y: H / 2 + ty * scale,
      z: tz2,
      scale: scale * 0.5
    };
  }
}
