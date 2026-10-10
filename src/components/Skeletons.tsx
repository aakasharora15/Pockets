/** Loading states use the shapes of the cards they stand in for. No spinners. */
export function HomeSkeleton() {
  return (
    <div className="screen" aria-busy="true" aria-label="Loading">
      <div className="scroll" style={{ gap: 16 }}>
        <div className="skel skel-month" />
        <div className="skel skel-hero" />
        <div className="skel skel-card" />
        <div className="skel skel-card short" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="list-card skel-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ex-row">
          <div className="cat-tile skel" />
          <div className={`ex-body${i ? ' sep' : ''}`}>
            <div className="ex-text">
              <div className="skel-line" style={{ width: '55%' }} />
              <div className="skel-line" style={{ width: '30%', height: 10 }} />
            </div>
            <div className="skel-line" style={{ width: 56 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
