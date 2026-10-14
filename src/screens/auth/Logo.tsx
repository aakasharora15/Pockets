/** The Spendr mark: the glass pocket icon and wordmark (Welcome, PIN unlock). The icon follows the theme. */
export function Logo() {
  return (
    <div className="logo-row">
      <img className="logo-icon logo-dark" src="/icons/spendr-icon-dark.svg" width={32} height={32} alt="" />
      <img className="logo-icon logo-light" src="/icons/spendr-icon-light.svg" width={32} height={32} alt="" />
      <span className="logo-word">Spendr</span>
    </div>
  );
}
