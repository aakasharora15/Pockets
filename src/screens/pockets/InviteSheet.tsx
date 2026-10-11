import QRCode from 'qrcode';
import { getDocs, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { createInvite, expiryOf } from '../../data/invites';
import { invitesCol } from '../../data/refs';
import type { Invite, PocketWithMembers } from '../../data/types';
import { Icon } from '../../lib/icons';
import { formatCode, inviteLink } from '../../lib/inviteCode';
import { usePockets } from '../../state/pockets';
import { useMe } from '../../state/session';
import { useUi } from '../../state/ui';

/** Reuses your latest open invite for this Pocket, or makes a new one. */
async function openInvite(pocketId: string, uid: string): Promise<Invite | null> {
  try {
    const snap = await getDocs(query(invitesCol(), where('pocketId', '==', pocketId)));
    const open = snap.docs
      .map((d) => ({ ...(d.data() as Invite), code: d.id }))
      .filter((i) => !i.usedByUid && i.createdByUid === uid && expiryOf(i) > Date.now() + 60 * 60 * 1000)
      .sort((a, b) => expiryOf(b) - expiryOf(a));
    return open[0] ?? null;
  } catch {
    return null;
  }
}

// One request per Pocket at a time, so opening the sheet twice quickly doesn't make two invites.
const inflight = new Map<string, Promise<Invite>>();

function getOrCreateInvite(pocket: PocketWithMembers, me: { uid: string; name: string }): Promise<Invite> {
  let p = inflight.get(pocket.id);
  if (!p) {
    p = (async () => (await openInvite(pocket.id, me.uid)) ?? (await createInvite(pocket, me)))();
    inflight.set(pocket.id, p);
    p.finally(() => setTimeout(() => inflight.delete(pocket.id), 2000));
  }
  return p;
}

/** 26 · Invite to a Pocket (QR, code, link) */
export function InviteSheet({ pocketId, onClose }: { pocketId: string; onClose: () => void }) {
  const { pockets } = usePockets();
  const { user, profile } = useMe();
  const { showToast } = useUi();
  const pocket = pockets.find((p) => p.id === pocketId);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pocket) return;
    let live = true;
    (async () => {
      try {
        const inv = await getOrCreateInvite(pocket, { uid: user.uid, name: profile.name });
        if (live) setInvite(inv);
      } catch {
        if (live) setError("Couldn't make an invite. You need to be online to invite someone.");
      }
    })();
    return () => {
      live = false;
    };
  }, [pocket?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const link = invite ? inviteLink(invite.code) : '';
  const qr = useMemo(() => (link ? qrPath(link) : null), [link]);

  if (!pocket) return null;

  const copyCode = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(formatCode(invite.code));
      showToast('Code copied');
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = async () => {
    if (!invite) return;
    const text = `Join ${pocket.name} on Spendr. Code ${formatCode(invite.code)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${pocket.name} on Spendr`, text, url: link });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      showToast('Invite link copied');
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Sheet onClose={onClose} label={`Invite to ${pocket.name}`}>
      <div className="invite-head">
        <span className="invite-title">Invite to {pocket.name}</span>
        <button className="sheet-close press" aria-label="Close" onClick={onClose}>
          <Icon name="x" weight="bold" />
        </button>
      </div>
      <span className="invite-sub">They'll see your {pocket.name} expenses, not your Personal Pocket.</span>
      <div className="qr-box">
        {qr ? (
          <svg viewBox={`0 0 ${qr.size} ${qr.size}`} width="196" height="196" shapeRendering="crispEdges" role="img" aria-label="Invite QR code">
            <path d={qr.d} fill="#05080F" />
          </svg>
        ) : (
          <div className="qr-placeholder skel" />
        )}
      </div>
      <span className="invite-hint">Scan with the phone camera</span>
      <div className="code-card">
        <div className="code-text">
          <span className="code-label">Or enter this code</span>
          <span className="code-value">{invite ? formatCode(invite.code) : '···-···'}</span>
        </div>
        <button className="code-copy press" aria-label="Copy code" onClick={copyCode} disabled={!invite}>
          <Icon name="copy" />
        </button>
      </div>
      {error && <span className="helper error">{error}</span>}
      <button className="primary-btn sheet-bottom press" onClick={share} disabled={!invite}>
        <Icon name="export" weight="bold" size={18} />
        Share invite link
      </button>
      <span className="invite-expiry">Expires in 48 hours · works for one person</span>
    </Sheet>
  );
}

function qrPath(text: string): { d: string; size: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const { size, data } = qr.modules;
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return { d, size };
}
