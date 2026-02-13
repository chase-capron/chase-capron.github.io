(() => {
  const car = document.getElementById('car');
  const modeLabel = document.getElementById('modeLabel');
  const pathLabel = document.getElementById('pathLabel');
  const speedLabel = document.getElementById('speedLabel');
  const root = document.documentElement;

  if (!car) return;

  const track = document.querySelector('.track');
  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Cardinal directions (straight paths) + a few diagonals for variety.
  const dirs = [
    { name: '→', vx: 1,  vy: 0 },
    { name: '←', vx: -1, vy: 0 },
    { name: '↓', vx: 0,  vy: 1 },
    { name: '↑', vx: 0,  vy: -1 },
    { name: '↘', vx: 1,  vy: 1 },
    { name: '↗', vx: 1,  vy: -1 },
    { name: '↙', vx: -1, vy: 1 },
    { name: '↖', vx: -1, vy: -1 },
  ];

  let x = 0;
  let y = 0;
  let vx = 1;
  let vy = 0;
  let speed = 220; // px/sec
  let last = performance.now();

  function setHUD() {
    if (modeLabel) modeLabel.textContent = root.dataset.reduceMotion === 'true' ? 'Static' : 'Animated';
    if (pathLabel) pathLabel.textContent = `${vx}, ${vy}`;
    if (speedLabel) speedLabel.textContent = `${Math.round(speed)} px/s`;
  }

  function trackRect() {
    return track ? track.getBoundingClientRect() : document.body.getBoundingClientRect();
  }

  function reset() {
    const r = trackRect();
    const d = pick(dirs);

    // Normalize diagonals so speed feels consistent.
    const m = Math.hypot(d.vx, d.vy) || 1;
    vx = d.vx / m;
    vy = d.vy / m;

    // Pick speed each run.
    speed = rand(170, 320);

    // Spawn just off-screen on the opposite side of travel.
    const margin = 70;

    // Choose a start edge based on direction.
    // If moving right, start left (x=-margin). If moving down, start top, etc.
    if (Math.abs(vx) > Math.abs(vy)) {
      // Horizontal-ish
      x = vx > 0 ? -margin : r.width + margin;
      y = rand(30, r.height - 30);
    } else if (Math.abs(vy) > Math.abs(vx)) {
      // Vertical-ish
      x = rand(30, r.width - 30);
      y = vy > 0 ? -margin : r.height + margin;
    } else {
      // Diagonal: pick one of the two opposite corners-ish
      x = vx > 0 ? -margin : r.width + margin;
      y = vy > 0 ? -margin : r.height + margin;
    }

    // Point the car in the direction of travel.
    const angle = Math.atan2(vy, vx) * (180 / Math.PI);
    car.dataset.angle = String(angle);

    setHUD();
  }

  function step(now) {
    const reduce = root.dataset.reduceMotion === 'true';
    if (reduce) {
      setHUD();
      // keep it centered and still
      car.style.transform = `translate(-50%, -50%) translate(${(trackRect().width / 2)}px, ${(trackRect().height / 2)}px)`;
      requestAnimationFrame(step);
      return;
    }

    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;

    x += vx * speed * dt;
    y += vy * speed * dt;

    const r = trackRect();
    const off = 90;
    if (x < -off || x > r.width + off || y < -off || y > r.height + off) {
      reset();
    }

    const angle = Number(car.dataset.angle || '0');
    car.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;

    requestAnimationFrame(step);
  }

  // Kickoff
  reset();
  setHUD();
  requestAnimationFrame((t) => {
    last = t;
    requestAnimationFrame(step);
  });
})();
