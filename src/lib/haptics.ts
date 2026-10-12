/**
 * Haptic feedback for key presses. Android has the Vibration API. Safari on iPhone doesn't, but
 * from iOS 18 toggling a switch-style checkbox plays the system haptic, so a hidden one is toggled
 * through its label. Older iPhones and desktops get nothing.
 */

let toggle: HTMLLabelElement | null = null;

function iosTick() {
  if (!toggle) {
    toggle = document.createElement('label');
    toggle.setAttribute('aria-hidden', 'true');
    toggle.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.tabIndex = -1;
    input.setAttribute('switch', '');
    toggle.appendChild(input);
    document.body.appendChild(toggle);
  }
  toggle.click();
}

function safely(fn: () => void) {
  try {
    fn();
  } catch {
    // Feedback must never get in the way of typing.
  }
}

/** One light tick, for a key press. Call from a click handler. */
export function tap() {
  safely(() => (typeof navigator.vibrate === 'function' ? navigator.vibrate(8) : iosTick()));
}

/** Two ticks, for a wrong PIN. */
export function buzz() {
  safely(() => {
    if (typeof navigator.vibrate === 'function') return void navigator.vibrate([40, 60, 40]);
    iosTick();
    window.setTimeout(() => safely(iosTick), 110);
  });
}
