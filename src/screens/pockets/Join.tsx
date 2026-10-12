import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { BackButton } from '../../components/Chrome';
import { lookupInvite, redeemInvite, type InviteProblem } from '../../data/invites';
import type { Invite } from '../../data/types';
import { currency } from '../../lib/currencies';
import { firstName, initialsFor, uniqueInitials } from '../../lib/initials';
import { CODE_ALPHABET, normaliseCode } from '../../lib/inviteCode';
import { usePockets } from '../../state/pockets';
import { useMe } from '../../state/session';
import { useUi } from '../../state/ui';

const PROBLEMS: Record<InviteProblem | 'offline', string> = {
  'not-found': "That code doesn't match an invite. Check it and try again.",
  expired: 'This invite has expired. Ask for a new one.',
  used: 'This invite has already been used. Ask for a new one.',
  'already-member': "You're already in this Pocket.",
  'wrong-email': 'This invite was sent to a different email. Log in with that email to join.',
  offline: 'You need to be online to join a Pocket.',
};

export function Join() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, profile } = useMe();
  const { pockets, setCurrent } = usePockets();
  const { showToast } = useUi();
  const [code, setCode] = useState(() => (params.code ? (normaliseCode(params.code) ?? '') : ''));
  const [invite, setInvite] = useState<Invite | null>(null);
  const [problem, setProblem] = useState<InviteProblem | 'offline' | null>(null);
  const [name, setName] = useState(profile.name);
  const [move, setMove] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInvite(null);
    setProblem(null);
    if (code.length !== 6) return;
    let live = true;
    lookupInvite(code, user.uid, user.email)
      .then((r) => {
        if (!live) return;
        if (typeof r === 'string') setProblem(r);
        else if (pockets.some((p) => p.id === r.pocketId)) setProblem('already-member');
        else setInvite(r);
      })
      .catch(() => live && setProblem('offline'));
    return () => {
      live = false;
    };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const initials = invite ? uniqueInitials(initialsFor(name) || profile.initials, invite.members.map((m) => m.initials)) : '';

  const join = async () => {
    if (!invite || busy || !name.trim()) return;
    setBusy(true);
    try {
      await redeemInvite({ invite, uid: user.uid, name: name.trim(), initials, moveExpenses: move });
      setCurrent(invite.pocketId);
      showToast(`You joined ${invite.pocketName}`);
      navigate('/', { replace: true });
    } catch (e) {
      console.error('Join failed', e);
      setProblem('used');
      setBusy(false);
    }
  };

  const chars = code.padEnd(6, ' ').split('');
  const owner = invite ? firstName(invite.createdByName) : null;

  return (
    <div className="screen">
      <BackButton to="/" />
      <div className="flow-head join-head">
        <span className="flow-title">Join a Pocket</span>
        <span className="flow-sub">{owner ? `Enter the code ${owner} shared, or open the invite link.` : 'Enter the code you were sent, or open the invite link.'}</span>
      </div>
      <div className="join-body">
        <label className="code-boxes" onClick={() => input.current?.focus()}>
          {chars.map((ch, i) => (
            <span key={i} className="code-box-wrap">
              {i === 3 && <span className="code-dash" />}
              <span className="code-box">{ch.trim()}</span>
            </span>
          ))}
          <input
            ref={input}
            className="code-input"
            aria-label="Invite code"
            autoFocus={!params.code}
            autoCapitalize="characters"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .split('')
                  .filter((c) => CODE_ALPHABET.includes(c))
                  .join('')
                  .slice(0, 6),
              )
            }
          />
        </label>

        {problem && <span className="helper error join-problem">{PROBLEMS[problem]}</span>}

        {invite && (
          <>
            <div className="join-card">
              <div className="join-card-top">
                <span className="code-label">{owner} invited you to</span>
                <span className="join-pocket">{invite.pocketName}</span>
              </div>
              <div className="join-members">
                <AvatarStack initials={invite.members.slice(0, 3).map((m) => m.initials)} size={28} ring="#1C2230" />
                <span>
                  {invite.members.map((m) => firstName(m.name)).join(', ')} · {invite.currencies.map((c) => currency(c).symbol).join(' ')}
                </span>
              </div>
              <div className="join-hair" />
              <label className="join-name">
                <div className="join-name-text">
                  <span className="code-label">Your name in {invite.pocketName}</span>
                  <input aria-label={`Your name in ${invite.pocketName}`} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <Avatar initials={initials} size={36} />
              </label>
            </div>
            <div className="join-choice">
              <span className="field-label">Your existing expenses</span>
              <div className="segmented" role="radiogroup" aria-label="Your existing expenses">
                <button role="radio" aria-checked={!move} className={`seg${!move ? ' on' : ''}`} onClick={() => setMove(false)}>
                  Keep in Personal
                </button>
                <button role="radio" aria-checked={move} className={`seg${move ? ' on' : ''}`} onClick={() => setMove(true)}>
                  Move to {invite.pocketName}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {invite && (
        <button className="primary-btn bottom-primary raised press" disabled={busy || !name.trim()} onClick={join}>
          Join {invite.pocketName}
        </button>
      )}
      <button className="bottom-link press" onClick={() => navigate('/', { replace: true })}>
        <b>Not now</b>
      </button>
    </div>
  );
}
