// Две зоны. Каждая: <video> + список стопов (сек). Клик → play до следующего стопа → pause. После последнего → 0.
function makeZone(btn, cfg) {
  const video = btn.querySelector('.zone-video');
  const poster = btn.querySelector('.zone-poster');
  let idx = 0, playing = false;
  if (!cfg.video) { video.hidden = true; return { advance() {} }; }
  video.src = cfg.video;
  if (poster) poster.hidden = true;
  const stops = cfg.stops.slice().sort((a, b) => a - b);
  function advance() {
    if (playing) return;
    const next = idx + 1;
    if (next >= stops.length) { video.currentTime = 0; idx = 0; return; }
    playing = true;
    const target = stops[next];
    const tick = () => {
      if (video.currentTime >= target - 0.04 || video.ended) { video.pause(); video.currentTime = Math.min(target, video.duration || target); idx = next; playing = false; }
      else if (playing) requestAnimationFrame(tick);
    };
    video.play().then(() => requestAnimationFrame(tick)).catch(() => { playing = false; });
  }
  return { advance };
}

export function initHero({ zones }) {
  const crate = makeZone(document.getElementById('zone-crate'), zones.crate);
  const podium = makeZone(document.getElementById('zone-podium'), zones.podium);
  document.getElementById('zone-crate').addEventListener('click', () => crate.advance());
  document.getElementById('zone-podium').addEventListener('click', () => podium.advance());
}
