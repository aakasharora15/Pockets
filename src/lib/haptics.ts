/**
 * Haptic feedback. Android has the Vibration API. Safari on iPhone doesn't: keypad keys get their
 * tick from the real switch inside each key (see Keypads.tsx). For a wrong PIN there's no tap to
 * hang it on, so a hidden switch is flipped from code, which some iOS versions ignore.
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

/** One light tick for a key press on Android. iPhone ticks from the key's own switch. */
export function tap() {
  safely(() => {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(12);
  });
}

/** Two ticks, for a wrong PIN. */
export function buzz() {
  safely(() => {
    if (typeof navigator.vibrate === 'function') return void navigator.vibrate([40, 60, 40]);
    iosTick();
    window.setTimeout(() => safely(iosTick), 110);
  });
}
