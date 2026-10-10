/** The Pockets mark: two grey pockets on a light tile (design 01 / 02). */
export function Logo() {
  return (
    <div className="logo-row">
      <div className="logo-tile">
        <div className="logo-pocket" />
        <div className="logo-pocket second" />
      </div>
      <span className="logo-word">Pockets</span>
    </div>
  );
}
