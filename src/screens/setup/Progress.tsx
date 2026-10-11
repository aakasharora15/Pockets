/** Setup progress: four bars beside the back button, filled up to the current step. */
export function Progress({ step }: { step: number }) {
  return (
    <div className="setup-progress" aria-label={`Step ${step} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`setup-bar${i <= step ? ' on' : ''}`} />
      ))}
    </div>
  );
}
