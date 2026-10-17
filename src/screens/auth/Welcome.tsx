import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../lib/icons';
import { Logo } from './Logo';

const CARDS = [
  { icon: 'lightning', title: 'Add an expense in seconds', sub: 'Amount, category, done.' },
  { icon: 'coins', title: 'Any currency', sub: 'Each expense keeps its own currency.' },
  { icon: 'users-three', title: 'Share a Pocket', sub: 'Invite someone by QR code, link or code.' },
];

export function Welcome() {
  const navigate = useNavigate();
  // Show as many feature cards as fit above the buttons; never a card cut in half.
  const body = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState(CARDS.length);
  useLayoutEffect(() => {
    const el = body.current;
    if (el && cards > 0 && el.scrollHeight > el.clientHeight + 1) setCards(cards - 1);
  }, [cards]);
  useLayoutEffect(() => {
    const reset = () => setCards(CARDS.length);
    window.addEventListener('resize', reset);
    return () => window.removeEventListener('resize', reset);
  }, []);
  return (
    <div className="screen flow">
      <div className="flow-body welcome" ref={body}>
        <Logo />
        <div className="welcome-hero">
          Spend
          <br />
          together.
          <br />
          See clearly.
        </div>
        <div className="welcome-sub">Track your own spending, and share a Pocket with the people you live with. In any currency.</div>
        <div className="welcome-cards">
          {CARDS.slice(0, cards).map((c) => (
            <div key={c.title} className="welcome-card">
              <div className="welcome-tile">
                <Icon name={c.icon} />
              </div>
              <div className="welcome-card-text">
                <span className="welcome-card-title">{c.title}</span>
                <span className="welcome-card-sub">{c.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flow-foot">
        <button className="primary-btn bottom-primary press" onClick={() => navigate('/signup')}>
          Create account
        </button>
        <button className="bottom-link welcome-login press" onClick={() => navigate('/login')}>
          Log in
        </button>
      </div>
    </div>
  );
}
