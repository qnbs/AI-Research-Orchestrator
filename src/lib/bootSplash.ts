/** Fade out and remove the static boot splash from index.html after React mounts. */
export function dismissBootSplash(): void {
  const splash = document.getElementById('boot-splash');
  if (!splash) return;
  splash.classList.add('boot-splash--hide');
  const remove = () => splash.remove();
  splash.addEventListener('transitionend', remove, { once: true });
  // Fallback if transition is disabled (prefers-reduced-motion)
  window.setTimeout(remove, 500);
}
