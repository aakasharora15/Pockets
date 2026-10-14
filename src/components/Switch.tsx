import { useState } from 'react';

/** iOS-style switch, 51 × 31 (design rows with a toggle). While pressed, the knob lifts into glass. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${on ? ' on' : ''}${pressed ? ' pressed' : ''}`}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={() => onChange(!on)}
    >
      <span className="switch-knob" />
    </button>
  );
}
