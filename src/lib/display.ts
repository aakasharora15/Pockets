/**
 * What the phone reports about the screen, shown in Settings › About. Installed iPhone web apps on
 * recent iOS don't always get the full screen, and the numbers here show which measurement is right.
 */
export function displayReport(): string {
  const probe = (css: string, prop: 'height' | 'paddingTop' | 'paddingBottom') => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;${css}`;
    document.body.appendChild(el);
    const v = prop === 'height' ? el.offsetHeight : parseFloat(getComputedStyle(el)[prop]) || 0;
    el.remove();
    return Math.round(v);
  };
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;
  const parts = [
    `Screen ${screen.width}×${screen.height}`,
    `window ${innerWidth}×${innerHeight}`,
    `visible ${Math.round(window.visualViewport?.height ?? innerHeight)}`,
    `lvh ${probe('height:100lvh', 'height')}`,
    `dvh ${probe('height:100dvh', 'height')}`,
    `svh ${probe('height:100svh', 'height')}`,
    `vh ${probe('height:100vh', 'height')}`,
    `safe top ${probe('padding-top:env(safe-area-inset-top)', 'paddingTop')}`,
    `bottom ${probe('padding-bottom:env(safe-area-inset-bottom)', 'paddingBottom')}`,
    standalone ? 'installed' : 'browser',
    `full-screen fix ${document.documentElement.classList.contains('fit-screen') ? 'on' : 'off'}${(() => {
      try {
        return ` (${localStorage.getItem('spendr.fit') ?? 'not set'})`;
      } catch {
        return '';
      }
    })()}`,
  ];
  return parts.join(' · ');
}
