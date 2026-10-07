import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/caveat/500.css';
import './style.css';

// Keep the track frozen while the selected card lifts independently.
const carousel = document.querySelector<HTMLElement>('.coverflow')!;
const cards = [...carousel.querySelectorAll<HTMLElement>('[data-kind]')];
const toggle = document.querySelector<HTMLButtonElement>('#carousel-toggle')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const phoneLayout = matchMedia('(max-width: 600px)');
const hoverCapable = matchMedia('(hover: hover) and (pointer: fine)');
let motionOverride = false;
const dots = [...carousel.querySelectorAll<HTMLButtonElement>('[data-slide]')];
let phoneIndex = 0;
function updateDots() {
  phoneIndex = ((Math.round(elapsed / 6000) % 4) + 4) % 4;
  dots.forEach((dot, i) => { if (i === phoneIndex) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current'); });
}
dots.forEach(dot => dot.addEventListener('click', () => {
  selectCard(null); manuallyPaused = true; elapsed = Number(dot.dataset.slide) * 6000; draw(); updatePause();
}));
phoneLayout.addEventListener('change', () => { selectCard(null); draw(); });
let elapsed = 0, previous = performance.now(), manuallyPaused = false, hovering = false, focused = false, lastPointerTouch = false;
let selected: HTMLElement | null = null, mediaGeneration = 0, inView = true;
let keyboardFocus = false;
let touchStart: { x: number; y: number } | null = null;
let touchCard: HTMLElement | null = null;
function isPaused() { return manuallyPaused || hovering || focused || (reducedMotion.matches && !motionOverride) || !inView; }
function updatePause() {
  carousel.dataset.paused = String(isPaused());
  const motionPaused = manuallyPaused || (reducedMotion.matches && !motionOverride);
  toggle.setAttribute('aria-pressed', String(motionPaused));
  toggle.setAttribute('aria-label', motionPaused ? '[COPY NEEDED: resume testimonial carousel]' : '[COPY NEEDED: pause testimonial carousel]');
  toggle.textContent = motionPaused ? '▷' : 'Ⅱ';
}
function stopMedia() {
  mediaGeneration++;
  cards.forEach(card => {
    const media = card.querySelector<HTMLMediaElement>('audio, video');
    if (media) { media.pause(); media.currentTime = 0; }
    card.querySelector<HTMLElement>('.media-status')?.setAttribute('hidden', '');
  });
}
async function playMedia(card: HTMLElement) {
  const media = card.querySelector<HTMLMediaElement>('audio, video');
  if (!media) return;
  const generation = mediaGeneration;
  try {
    await media.play();
    if (generation !== mediaGeneration || selected !== card || document.hidden || !inView) { media.pause(); return; }
    const status = card.querySelector<HTMLElement>('.media-status');
    if (media instanceof HTMLVideoElement && media.muted && status) { status.textContent = 'Tap for sound'; status.removeAttribute('hidden'); }
    else status?.setAttribute('hidden', '');
  } catch {
    if (generation !== mediaGeneration || selected !== card) return;
    const status = card.querySelector<HTMLElement>('.media-status');
    if (media instanceof HTMLVideoElement) {
      media.muted = true;
      try {
        await media.play();
        if (generation !== mediaGeneration || selected !== card) { media.pause(); return; }
        if (status) { status.textContent = 'Tap for sound'; status.removeAttribute('hidden'); }
        return;
      } catch { /* The actual play button remains available. */ }
    }
    if (status) { status.textContent = 'Tap to play'; status.removeAttribute('hidden'); }
  }
}
function selectCard(card: HTMLElement | null) {
  if (selected === card) return;
  stopMedia(); selected = card;
  cards.forEach(item => item.classList.toggle('is-selected', item === card));
  draw();
  if (card) void playMedia(card);
}
function draw() {
  const phone = phoneLayout.matches;
  const gap = phone ? cards[0].offsetWidth + 38 : 350;
  cards.forEach(card => {
    const offset = ((Number(card.dataset.position) - elapsed / 6000 + 2) % 4 + 4) % 4 - 2;
    const distance = Math.abs(offset), active = selected === card;
    const scale = active ? (phone ? 1.04 : 1.06) : 1 - Math.min(distance, 1) * .15;
    const maxX = Math.max(0, (carousel.clientWidth - card.offsetWidth * scale) / 2 - 12);
    const x = active ? (phone ? 0 : Math.max(-maxX, Math.min(maxX, offset * gap))) : offset * gap;
    const angle = active ? 0 : -Math.max(-1, Math.min(1, offset)) * 25;
    const y = active ? (phone ? -6 : -12) : distance * distance * (phone ? 22 : 30);
    const tilt = active ? 0 : offset * 7;
    card.style.transform = `translateX(-50%) translateX(${x}px) translateY(${y}px) rotateZ(${tilt}deg) ${phone ? '' : `rotateY(${angle}deg) `}scale(${scale})`;
    card.style.opacity = String(active ? 1 : Math.min(1, (2 - distance) * 2.5));
    card.style.zIndex = String(active ? 400 : Math.round(100 - distance * 25));
  });
  updateDots();
}
function animate(now: number) {
  const delta = Math.min(now - previous, 100); previous = now;
  if (!isPaused() && !document.hidden) elapsed += delta;
  draw(); requestAnimationFrame(animate);
}
carousel.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch' && hoverCapable.matches) { hovering = true; updatePause(); } });
carousel.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch' && hoverCapable.matches) { hovering = false; selectCard(null); updatePause(); } });
cards.forEach(card => {
  card.tabIndex = 0; card.setAttribute('role', 'group'); card.setAttribute('aria-label', card.dataset.kind!);
  card.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch' && hoverCapable.matches) selectCard(card); });
  card.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch' && hoverCapable.matches && selected === card) selectCard(null); });
  card.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || (event.target as Element).closest('button')) return;
    lastPointerTouch = true;
    if (phoneLayout.matches) return;
    manuallyPaused = selected !== card;
    selectCard(selected === card ? null : card); updatePause();
  });
  card.addEventListener('focusin', () => { if (keyboardFocus) selectCard(card); });
  const media = card.querySelector<HTMLMediaElement>('audio, video');
  const play = card.querySelector<HTMLButtonElement>('.media-play');
  if (media && play) {
    const sync = () => {
      play.textContent = media.muted || media.paused ? '▷' : 'Ⅱ';
      play.setAttribute('aria-label', media.muted ? 'Play demo with sound' : media.paused ? 'Play demo' : 'Pause demo');
    };
    media.addEventListener('play', sync); media.addEventListener('pause', sync); media.addEventListener('ended', sync); media.addEventListener('volumechange', sync);
    media.addEventListener('timeupdate', () => {
      const duration = card.querySelector<HTMLElement>('.duration');
      if (duration) duration.textContent = `0:${String(Math.floor(media.currentTime)).padStart(2, '0')}`;
      card.classList.toggle('is-playing', !media.paused);
    });
    play.addEventListener('click', event => {
      event.stopPropagation(); manuallyPaused = lastPointerTouch;
      if (media.muted) { media.muted = false; void playMedia(card); }
      else if (selected !== card) { selectCard(card); void playMedia(card); }
      else if (media.paused) void playMedia(card); else media.pause();
      updatePause();
    });
  }
});
carousel.addEventListener('pointerdown', event => {
  lastPointerTouch = event.pointerType === 'touch'; if (lastPointerTouch) hovering = false; keyboardFocus = false; focused = false;
  if (lastPointerTouch && !(event.target as Element).closest('button')) {
    touchStart = { x: event.clientX, y: event.clientY };
    touchCard = (event.target as Element).closest<HTMLElement>('[data-kind]');
    if (event.isTrusted) carousel.setPointerCapture(event.pointerId);
  }
});
carousel.addEventListener('pointerup', event => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    selectCard(null); manuallyPaused = false;
    elapsed += dx < 0 ? 6000 : -6000;
    draw(); updatePause();
  } else if (phoneLayout.matches && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
    manuallyPaused = touchCard !== null && selected !== touchCard;
    if (!manuallyPaused && touchCard) motionOverride = true;
    selectCard(selected === touchCard ? null : touchCard); updatePause();
  }
  touchCard = null;
});
carousel.addEventListener('pointercancel', () => { touchStart = null; touchCard = null; });
document.addEventListener('keydown', () => { lastPointerTouch = false; keyboardFocus = true; });
carousel.addEventListener('focusin', () => { focused = keyboardFocus; updatePause(); });
carousel.addEventListener('focusout', event => { if (!carousel.contains(event.relatedTarget as Node | null)) { focused = false; selectCard(null); updatePause(); } });
toggle.addEventListener('click', () => {
  const wantsPlay = manuallyPaused || (reducedMotion.matches && !motionOverride);
  manuallyPaused = !wantsPlay;
  if (wantsPlay) { motionOverride = true; selectCard(null); if (!hoverCapable.matches) hovering = false; }
  updatePause();
});
reducedMotion.addEventListener('change', () => { motionOverride = false; updatePause(); });
hoverCapable.addEventListener('change', () => { hovering = false; selectCard(null); updatePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) selectCard(null); });
window.addEventListener('blur', () => selectCard(null));
new IntersectionObserver(entries => {
  inView = entries[0].isIntersecting;
  if (!inView) selectCard(null);
  updatePause();
}, { threshold: .05 }).observe(carousel);
carousel.classList.add('has-arch');
updatePause(); draw(); requestAnimationFrame(animate);

// The link goes straight to WhatsApp. No click recording, redirects or client data.
const link = document.querySelector<HTMLAnchorElement>('#chat-link')!;
try {
  const response = await fetch('/landing-config', { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Chat configuration unavailable');
  const { chatUrl } = await response.json();
  if (typeof chatUrl !== 'string' || !/^https:\/\/wa\.me\/[1-9]\d{7,14}\?text=Hi$/.test(chatUrl)) {
    throw new Error('Invalid chat link');
  }
  link.href = chatUrl;
  link.removeAttribute('aria-disabled');
} catch {
  document.querySelector<HTMLParagraphElement>('#link-error')!.hidden = false;
}
