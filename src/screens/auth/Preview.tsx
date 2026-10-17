import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/Chrome';
import { CardPager } from '../../components/CardPager';

const SLIDES = [
  { img: 'home', title: 'Your month at a glance', sub: 'A total for each currency, your budget, and where the money went.' },
  { img: 'calendar', title: 'Any day, one tap away', sub: 'See what was spent on a day, with the categories under each date.' },
  { img: 'shared', title: 'Share a Pocket', sub: 'Track a household together and see who paid for what.' },
];

/** A quick look at Spendr before signing up: real screens, made-up people. Swipe through, then start. */
export function Preview() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;
  return (
    <div className="screen flow preview">
      <BackButton to="/welcome" />
      <div className="preview-body">
        <CardPager
          label="Preview"
          labels={SLIDES.map((s) => s.title)}
          index={0}
          resetKey="preview"
          onChange={setPage}
          pages={SLIDES.map((s) => (
            <figure key={s.img} className="preview-slide">
              <div className="preview-shot">
                {/* The app's own screens, in the theme the phone is using. */}
                <img className="preview-dark" src={`/preview/${s.img}-dark.jpg`} alt="" loading="lazy" />
                <img className="preview-light" src={`/preview/${s.img}-light.jpg`} alt="" loading="lazy" />
              </div>
              <figcaption>
                <span className="preview-title">{s.title}</span>
                <span className="preview-sub">{s.sub}</span>
              </figcaption>
            </figure>
          ))}
        />
      </div>
      <div className="flow-foot">
        <button className="primary-btn bottom-primary press" onClick={() => navigate('/signup')}>
          {last ? 'Create account' : 'Get started'}
        </button>
        <button className="bottom-link welcome-login press" onClick={() => navigate('/login')}>
          Log in
        </button>
      </div>
    </div>
  );
}
