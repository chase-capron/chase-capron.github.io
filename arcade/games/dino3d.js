(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const STORAGE_KEY = 'cc_arcade_dino3d_best';

  const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const mixColor = (base, shade) => {
    const s = clamp(shade, 0, 1);
    const r = Math.round(base[0] * s);
    const g = Math.round(base[1] * s);
    const b = Math.round(base[2] * s);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const makeMesh = (raw, {
    scale = 1,
    anchor = 'bottom',
  } = {}) => {
    if (!raw || !Array.isArray(raw.vertices) || !Array.isArray(raw.triangles)) return null;

    const vertexCount = Math.floor(raw.vertices.length / 3);
    const triCount = Math.floor(raw.triangles.length / 3);

    if (!vertexCount || !triCount) return null;

    const vertices = new Float32Array(vertexCount * 3);
    const triangles = new Uint32Array(triCount * 3);

    const center = raw.center || [0, 0, 0];
    const minY = raw.bounds?.min?.[1] || 0;

    for (let i = 0; i < vertexCount; i += 1) {
      const src = i * 3;
      const x = raw.vertices[src] - center[0];
      const y = raw.vertices[src + 1] - (anchor === 'bottom' ? minY : center[1]);
      const z = raw.vertices[src + 2] - center[2];

      vertices[src] = x * scale;
      vertices[src + 1] = y * scale;
      vertices[src + 2] = z * scale;
    }

    const triNormal = new Float32Array(triCount * 3);
    const triCenter = new Float32Array(triCount * 3);

    for (let i = 0; i < triCount; i += 1) {
      const triSrc = i * 3;
      const ia = raw.triangles[triSrc];
      const ib = raw.triangles[triSrc + 1];
      const ic = raw.triangles[triSrc + 2];

      triangles[triSrc] = ia;
      triangles[triSrc + 1] = ib;
      triangles[triSrc + 2] = ic;

      const a = ia * 3;
      const b = ib * 3;
      const c = ic * 3;

      const ax = vertices[a];
      const ay = vertices[a + 1];
      const az = vertices[a + 2];
      const bx = vertices[b];
      const by = vertices[b + 1];
      const bz = vertices[b + 2];
      const cx = vertices[c];
      const cy = vertices[c + 1];
      const cz = vertices[c + 2];

      const abx = bx - ax;
      const aby = by - ay;
      const abz = bz - az;
      const acx = cx - ax;
      const acy = cy - ay;
      const acz = cz - az;

      let nx = aby * acz - abz * acy;
      let ny = abz * acx - abx * acz;
      let nz = abx * acy - aby * acx;

      const nLen = Math.hypot(nx, ny, nz) || 1;
      nx /= nLen;
      ny /= nLen;
      nz /= nLen;

      triNormal[triSrc] = nx;
      triNormal[triSrc + 1] = ny;
      triNormal[triSrc + 2] = nz;

      triCenter[triSrc] = (ax + bx + cx) / 3;
      triCenter[triSrc + 1] = (ay + by + cy) / 3;
      triCenter[triSrc + 2] = (az + bz + cz) / 3;
    }

    return {
      vertices,
      triangles,
      vertexCount,
      triCount,
      triNormal,
      triCenter,
      world: new Float32Array(vertexCount * 3),
      screenX: new Float32Array(vertexCount),
      screenY: new Float32Array(vertexCount),
      depth: new Float32Array(vertexCount),
      triDepth: new Float32Array(triCount),
      triShade: new Float32Array(triCount),
      triVisible: new Uint8Array(triCount),
      triOrder: Array.from({ length: triCount }, (_, idx) => idx),
    };
  };

  ns.createDino3DGame = ({
    canvas,
    controlsRoot,
    scoreNode,
    bestNode,
    statusNode,
  } = {}) => {
    if (!(canvas instanceof HTMLCanvasElement)) {
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    const assets = ns.dino3dAssets || null;
    const trexMesh = makeMesh(assets?.trex, { scale: 0.275, anchor: 'bottom' });
    const cactusMesh = makeMesh(assets?.cactus, { scale: 0.44, anchor: 'bottom' });

    if (!trexMesh || !cactusMesh) {
      if (statusNode instanceof HTMLElement) {
        statusNode.textContent = 'Dino 3D assets unavailable.';
      }
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    const controls = controlsRoot instanceof HTMLElement
      ? Array.from(controlsRoot.querySelectorAll('[data-dino3d-control]'))
      : [];

    const W = canvas.width;
    const H = canvas.height;

    const reducedMotionQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    const compactMotionQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 760px), (pointer: coarse)') : null;

    let prefersReducedMotion = Boolean(reducedMotionQuery?.matches);
    let prefersCompactMotion = Boolean(compactMotionQuery?.matches);

    const perfTierFloor = () => (prefersReducedMotion ? 2 : prefersCompactMotion ? 1 : 0);
    const perfTierLabel = (tier) => (tier >= 2 ? 'performance' : tier === 1 ? 'balanced' : 'quality');

    let perfTier = perfTierFloor();
    let frameBudgetEma = 16.7;
    let perfTierCooldown = 0;

    const syncPerfTierFloor = () => {
      const floor = perfTierFloor();
      if (perfTier < floor) {
        perfTier = floor;
      }
    };

    const camera = { x: 0, y: 6.8, z: 25.5, focal: 530, near: 0.6 };
    const lightDir = (() => {
      const x = -0.35;
      const y = 0.9;
      const z = 0.45;
      const m = Math.hypot(x, y, z) || 1;
      return { x: x / m, y: y / m, z: z / m };
    })();

    const player = {
      x: -8.4,
      y: 0,
      vy: 0,
      width: 1.7,
      height: 3.4,
      jumpVelocity: 17.2,
      gravity: 31,
    };

    const groundY = 0;

    const obstaclePool = Array.from({ length: 9 }, () => ({
      active: false,
      x: 0,
      z: 0,
      scale: 1,
      width: 1,
      height: 1,
      spin: 0,
    }));

    const getInactiveObstacle = () => obstaclePool.find((item) => !item.active) || null;

    const activeObstacles = [];

    let spawnTimer = 0;
    let speed = 11;
    let score = 0;
    let best = 0;
    let alive = true;
    let running = false;
    let rafId = null;
    let lastTs = 0;
    let elapsed = 0;
    let jumpBuffer = 0;

    const JUMP_BUFFER_SEC = 0.14;

    const hintText = () =>
      prefersReducedMotion
        ? 'Reduced motion mode. Jump with Space / ↑ / Tap.'
        : 'Jump with Space / ↑ / Tap. Dodge the cacti.';

    const cactusTriStride = () => {
      if (perfTier >= 2) return 3;
      if (perfTier === 1) return 2;
      return 1;
    };

    const dinoTriStride = () => (perfTier >= 2 ? 2 : 1);
    const shouldDrawWire = () => perfTier < 2;
    const wireAlpha = () => (perfTier === 1 ? 0.62 : 1);

    const updateHud = () => {
      if (scoreNode instanceof HTMLElement) {
        scoreNode.textContent = String(Math.floor(score));
      }
      if (bestNode instanceof HTMLElement) {
        bestNode.textContent = String(Math.floor(best));
      }
    };

    const setStatus = (text) => {
      if (statusNode instanceof HTMLElement) {
        statusNode.textContent = text;
      }
    };

    const syncMotionStatus = () => {
      if (alive) {
        setStatus(hintText());
      }
    };

    const loadBest = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = Number(raw);
        best = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      } catch (e) {
        best = 0;
      }
    };

    const saveBest = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(Math.floor(best)));
      } catch (e) {
        // noop
      }
    };

    const resetRound = () => {
      alive = true;
      score = 0;
      speed = 11;
      spawnTimer = 0.65;
      elapsed = 0;
      jumpBuffer = 0;
      player.y = 0;
      player.vy = 0;
      obstaclePool.forEach((item) => {
        item.active = false;
      });
      setStatus(hintText());
      updateHud();
    };

    const queueJump = () => {
      if (alive) {
        jumpBuffer = JUMP_BUFFER_SEC;
      } else {
        resetRound();
      }
    };

    const spawnObstacle = () => {
      const obstacle = getInactiveObstacle();
      if (!obstacle) return;

      obstacle.active = true;
      obstacle.x = 27 + Math.random() * 8;
      obstacle.z = prefersReducedMotion ? 0 : -1.15 + Math.random() * 2.3;
      obstacle.scale = 0.8 + Math.random() * 0.55;
      obstacle.width = 1.2 * obstacle.scale;
      obstacle.height = 2.75 * obstacle.scale;
      obstacle.spin = Math.random() * Math.PI * 2;
    };

    const updatePhysics = (dt) => {
      elapsed += dt;

      if (!alive) return;

      jumpBuffer = Math.max(0, jumpBuffer - dt);
      if (jumpBuffer > 0 && player.y <= groundY + 0.001) {
        player.vy = player.jumpVelocity;
        jumpBuffer = 0;
      }

      player.vy -= player.gravity * dt;
      player.y += player.vy * dt;
      if (player.y < groundY) {
        player.y = groundY;
        player.vy = 0;
      }

      speed += dt * 0.58;
      score += dt * speed * 8.5;

      if (score > best) {
        best = score;
        saveBest();
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnObstacle();
        const base = clamp(1.45 - speed * 0.055, 0.5, 1.45);
        spawnTimer = base + Math.random() * 0.55;
      }

      obstaclePool.forEach((obstacle) => {
        if (!obstacle.active) return;
        obstacle.x -= speed * dt;
        obstacle.spin += dt * (prefersReducedMotion ? 0.16 : 0.7);

        if (obstacle.x < -20) {
          obstacle.active = false;
          return;
        }

        const dinoFront = player.x + player.width;
        const dinoBack = player.x - player.width * 0.48;
        const cactusFront = obstacle.x + obstacle.width * 0.45;
        const cactusBack = obstacle.x - obstacle.width * 0.45;
        const overlapX = dinoFront > cactusBack && dinoBack < cactusFront;
        const overlapY = player.y < obstacle.height * 0.72;

        if (overlapX && overlapY) {
          alive = false;
          setStatus('Cactus hit. Press Jump to retry.');
        }
      });

      updateHud();
    };

    const transformMesh = (mesh, {
      x = 0,
      y = 0,
      z = 0,
      ry = 0,
      rx = 0,
      sx = 1,
      sy = 1,
      sz = 1,
    }) => {
      const sinY = Math.sin(ry);
      const cosY = Math.cos(ry);
      const sinX = Math.sin(rx);
      const cosX = Math.cos(rx);

      for (let i = 0; i < mesh.vertexCount; i += 1) {
        const src = i * 3;
        let lx = mesh.vertices[src] * sx;
        let ly = mesh.vertices[src + 1] * sy;
        let lz = mesh.vertices[src + 2] * sz;

        const xzX = lx * cosY + lz * sinY;
        const xzZ = -lx * sinY + lz * cosY;
        lx = xzX;
        lz = xzZ;

        const yzY = ly * cosX - lz * sinX;
        const yzZ = ly * sinX + lz * cosX;
        ly = yzY;
        lz = yzZ;

        const wx = lx + x;
        const wy = ly + y;
        const wz = lz + z;

        mesh.world[src] = wx;
        mesh.world[src + 1] = wy;
        mesh.world[src + 2] = wz;

        const vx = wx - camera.x;
        const vy = wy - camera.y;
        const vz = camera.z - wz;

        mesh.depth[i] = vz;

        if (vz <= camera.near) {
          mesh.screenX[i] = Number.NaN;
          mesh.screenY[i] = Number.NaN;
          continue;
        }

        mesh.screenX[i] = W * 0.5 + (vx * camera.focal) / vz;
        mesh.screenY[i] = H * 0.56 - (vy * camera.focal) / vz;
      }

      return {
        x,
        y,
        z,
        sx,
        sy,
        sz,
        sinY,
        cosY,
        sinX,
        cosX,
      };
    };

    const renderMesh = (mesh, {
      baseColor,
      wireColor,
      alpha = 1,
      triStride = 1,
      transform,
      drawWire = true,
      wireOpacity = 1,
    }) => {
      if (!transform) return;

      const tri = mesh.triangles;
      const triNormal = mesh.triNormal;
      const triCenter = mesh.triCenter;

      for (let i = 0; i < mesh.triCount; i += 1) {
        const src = i * 3;

        let cx = triCenter[src] * transform.sx;
        let cy = triCenter[src + 1] * transform.sy;
        let cz = triCenter[src + 2] * transform.sz;

        const cxzX = cx * transform.cosY + cz * transform.sinY;
        const cxzZ = -cx * transform.sinY + cz * transform.cosY;
        cx = cxzX;
        cz = cxzZ;

        const cyzY = cy * transform.cosX - cz * transform.sinX;
        const cyzZ = cy * transform.sinX + cz * transform.cosX;
        cy = cyzY;
        cz = cyzZ;

        const centerWorldX = cx + transform.x;
        const centerWorldY = cy + transform.y;
        const centerWorldZ = cz + transform.z;

        let nx = triNormal[src];
        let ny = triNormal[src + 1];
        let nz = triNormal[src + 2];

        const nxzX = nx * transform.cosY + nz * transform.sinY;
        const nxzZ = -nx * transform.sinY + nz * transform.cosY;
        nx = nxzX;
        nz = nxzZ;

        const nyzY = ny * transform.cosX - nz * transform.sinX;
        const nyzZ = ny * transform.sinX + nz * transform.cosX;
        ny = nyzY;
        nz = nyzZ;

        const viewX = camera.x - centerWorldX;
        const viewY = camera.y - centerWorldY;
        const viewZ = camera.z - centerWorldZ;
        const facing = nx * viewX + ny * viewY + nz * viewZ;

        if (facing <= 0) {
          mesh.triVisible[i] = 0;
          mesh.triDepth[i] = Number.NEGATIVE_INFINITY;
          continue;
        }

        mesh.triVisible[i] = 1;
        mesh.triDepth[i] = viewZ;

        const diffuse = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
        mesh.triShade[i] = clamp(0.26 + Math.max(0, diffuse) * 0.78, 0.22, 1);
      }

      mesh.triOrder.sort((a, b) => mesh.triDepth[b] - mesh.triDepth[a]);

      const stride = Math.max(1, Math.floor(triStride) || 1);

      for (let orderIndex = 0; orderIndex < mesh.triOrder.length; orderIndex += stride) {
        const triIndex = mesh.triOrder[orderIndex];
        if (!mesh.triVisible[triIndex]) continue;

        const src = triIndex * 3;

        const ia = tri[src];
        const ib = tri[src + 1];
        const ic = tri[src + 2];

        const ax = mesh.screenX[ia];
        const ay = mesh.screenY[ia];
        const bx = mesh.screenX[ib];
        const by = mesh.screenY[ib];
        const cx = mesh.screenX[ic];
        const cy = mesh.screenY[ic];

        if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(bx) || !Number.isFinite(by) || !Number.isFinite(cx) || !Number.isFinite(cy)) {
          continue;
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = mixColor(baseColor, mesh.triShade[triIndex]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();

        if (drawWire) {
          ctx.globalAlpha = alpha * wireOpacity;
          ctx.strokeStyle = wireColor;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    };

    const drawGround = () => {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#1a2449');
      skyGrad.addColorStop(0.6, '#5f4b3f');
      skyGrad.addColorStop(1, '#a37342');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      const sunX = W * 0.81;
      const sunY = H * 0.2;
      const sun = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 80);
      sun.addColorStop(0, 'rgba(255, 223, 133, 0.95)');
      sun.addColorStop(1, 'rgba(255, 223, 133, 0)');
      ctx.fillStyle = sun;
      ctx.fillRect(sunX - 90, sunY - 90, 180, 180);

      const horizonY = H * 0.63;
      const sandGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      sandGrad.addColorStop(0, '#d69f65');
      sandGrad.addColorStop(1, '#8a5c31');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      ctx.strokeStyle = 'rgba(72, 40, 21, 0.2)';
      ctx.lineWidth = 1;
      const lineCount = prefersCompactMotion ? 12 : 18;
      for (let i = 0; i < lineCount; i += 1) {
        const y = horizonY + ((H - horizonY) / lineCount) * i;
        const wave = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.65 + i * 0.85) * 4;
        ctx.beginPath();
        ctx.moveTo(0, y + wave);
        ctx.lineTo(W, y - wave * 0.2);
        ctx.stroke();
      }
    };

    const drawScene = () => {
      drawGround();

      const stride = alive && !prefersReducedMotion ? Math.sin(elapsed * 10.5) : 0;
      const bob = alive && !prefersReducedMotion ? Math.abs(stride) * 0.18 : 0;
      const dinoPitch = alive
        ? clamp(player.vy * -0.045, -0.36, 0.34)
        : -0.22;

      const dinoTransform = transformMesh(trexMesh, {
        x: player.x,
        y: player.y + bob,
        z: -0.5,
        ry: -Math.PI * 0.5,
        rx: dinoPitch,
        sx: 1,
        sy: 1 + Math.abs(stride) * 0.015,
        sz: 1,
      });

      activeObstacles.length = 0;
      obstaclePool.forEach((item) => {
        if (item.active) activeObstacles.push(item);
      });
      activeObstacles.sort((a, b) => b.x - a.x);

      activeObstacles.forEach((obstacle) => {
        const cactusTransform = transformMesh(cactusMesh, {
          x: obstacle.x,
          y: 0,
          z: obstacle.z,
          ry: obstacle.spin,
          sx: obstacle.scale,
          sy: obstacle.scale,
          sz: obstacle.scale,
        });
        renderMesh(cactusMesh, {
          baseColor: [62, 181, 101],
          wireColor: 'rgba(13, 52, 22, 0.32)',
          alpha: 0.98,
          triStride: cactusTriStride(),
          transform: cactusTransform,
          drawWire: shouldDrawWire(),
          wireOpacity: wireAlpha(),
        });
      });

      renderMesh(trexMesh, {
        baseColor: alive ? [118, 220, 178] : [204, 140, 126],
        wireColor: 'rgba(6, 30, 26, 0.22)',
        alpha: 1,
        triStride: dinoTriStride(),
        transform: dinoTransform,
        drawWire: shouldDrawWire(),
        wireOpacity: wireAlpha(),
      });

      if (!alive) {
        ctx.fillStyle = 'rgba(8, 14, 24, 0.45)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff2d6';
        ctx.font = '700 24px "JetBrains Mono", "SFMono-Regular", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H * 0.42);
        ctx.font = '600 14px "JetBrains Mono", "SFMono-Regular", monospace';
        ctx.fillText('Press Space / ↑ / Tap Jump to retry', W / 2, H * 0.5);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.font = '600 12px "JetBrains Mono", "SFMono-Regular", monospace';
      ctx.textAlign = 'right';
      const perfLabel = perfTierLabel(perfTier);
      ctx.fillText(`speed ${speed.toFixed(1)} · ${perfLabel} · ${Math.round(frameBudgetEma)}ms`, W - 16, 18);
    };

    const frame = (ts) => {
      if (!running) return;
      if (!lastTs) lastTs = ts;

      const dt = Math.min(0.032, (ts - lastTs) / 1000);
      lastTs = ts;

      frameBudgetEma = frameBudgetEma * 0.92 + dt * 1000 * 0.08;
      perfTierCooldown = Math.max(0, perfTierCooldown - dt);

      if (!prefersReducedMotion && perfTierCooldown <= 0) {
        const floor = perfTierFloor();
        if (frameBudgetEma > 22 && perfTier < 2) {
          perfTier += 1;
          perfTierCooldown = 1.25;
        } else if (frameBudgetEma < 15.5 && perfTier > floor) {
          perfTier -= 1;
          perfTierCooldown = 1.75;
        }
      }

      updatePhysics(dt);
      drawScene();

      rafId = window.requestAnimationFrame(frame);
    };

    const onKeyDown = (event) => {
      if (!running) return;
      if (isEditableTarget(event.target)) return;

      const key = String(event.key || '').toLowerCase();
      if (key === ' ' || key === 'arrowup' || key === 'w') {
        event.preventDefault();
        queueJump();
      }
    };

    const onPointerDown = (event) => {
      if (!running) return;
      event.preventDefault();
      queueJump();
    };

    const onControlDown = (event) => {
      if (!running) return;
      event.preventDefault();
      queueJump();
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      }
    };

    const onReducedMotionChange = (event) => {
      prefersReducedMotion = Boolean(event?.matches);
      syncPerfTierFloor();
      syncMotionStatus();
    };

    const onCompactMotionChange = (event) => {
      prefersCompactMotion = Boolean(event?.matches);
      syncPerfTierFloor();
    };

    const stop = () => {
      running = false;
      lastTs = 0;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    controls.forEach((button) => {
      button.addEventListener('pointerdown', onControlDown);
      button.addEventListener('click', onControlDown);
    });

    if (reducedMotionQuery) {
      if (typeof reducedMotionQuery.addEventListener === 'function') {
        reducedMotionQuery.addEventListener('change', onReducedMotionChange);
      } else if (typeof reducedMotionQuery.addListener === 'function') {
        reducedMotionQuery.addListener(onReducedMotionChange);
      }
    }

    if (compactMotionQuery) {
      if (typeof compactMotionQuery.addEventListener === 'function') {
        compactMotionQuery.addEventListener('change', onCompactMotionChange);
      } else if (typeof compactMotionQuery.addListener === 'function') {
        compactMotionQuery.addListener(onCompactMotionChange);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('visibilitychange', onVisibility);

    loadBest();
    resetRound();
    drawScene();

    return {
      start: () => {
        if (running) return;
        running = true;
        lastTs = 0;
        rafId = window.requestAnimationFrame(frame);
      },
      stop,
      destroy: () => {
        stop();
        controls.forEach((button) => {
          button.removeEventListener('pointerdown', onControlDown);
          button.removeEventListener('click', onControlDown);
        });

        if (reducedMotionQuery) {
          if (typeof reducedMotionQuery.removeEventListener === 'function') {
            reducedMotionQuery.removeEventListener('change', onReducedMotionChange);
          } else if (typeof reducedMotionQuery.removeListener === 'function') {
            reducedMotionQuery.removeListener(onReducedMotionChange);
          }
        }

        if (compactMotionQuery) {
          if (typeof compactMotionQuery.removeEventListener === 'function') {
            compactMotionQuery.removeEventListener('change', onCompactMotionChange);
          } else if (typeof compactMotionQuery.removeListener === 'function') {
            compactMotionQuery.removeListener(onCompactMotionChange);
          }
        }

        window.removeEventListener('keydown', onKeyDown);
        canvas.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('visibilitychange', onVisibility);
      },
    };
  };
})();
