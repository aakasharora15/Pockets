import { onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { BackButton } from '../../components/Chrome';
import { ActionSheet } from '../../components/Sheet';
import { cancelInvite } from '../../data/invites';
import { deletePocket, leavePocket, removeMember } from '../../data/pockets';
import { invitesCol, personalPocketId } from '../../data/refs';
import type { Invite, Member } from '../../data/types';
import { longDate, toDayKey } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { formatCode } from '../../lib/inviteCode';
import { useCurrentPocket, usePockets } from '../../state/pockets';
import { useMe } from '../../state/session';
import { useUi } from '../../state/ui';

type Confirm = { kind: 'remove'; member: Member } | { kind: 'delete' } | { kind: 'leave' } | null;

/** 28 · People (Settings › People) */
export function People() {
  const pocket = useCurrentPocket();
  const { setCurrent } = usePockets();
  const { user } = useMe();
  const { showToast, setInvitePocketId } = useUi();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const isOwner = pocket.ownerUid === user.uid;

  useEffect(() => {
    if (pocket.type !== 'shared') return;
    return onSnapshot(
      query(invitesCol(), where('pocketId', '==', pocket.id)),
      (snap) =>
        setInvites(
          snap.docs
            .map((d) => ({ ...(d.data() as Invite), code: d.id }))
            .filter((i) => !i.usedByUid && i.expiresAt.toMillis() > Date.now())
            .sort((a, b) => a.expiresAt.toMillis() - b.expiresAt.toMillis()),
        ),
      () => setInvites([]),
    );
  }, [pocket.id, pocket.type]);

  if (pocket.type !== 'shared') return <Navigate to="/settings" replace />;

  const run = async (fn: () => Promise<void>, done?: string) => {
    setConfirm(null);
    setBusy(true);
    try {
      await fn();
      if (done) showToast(done);
    } catch {
      showToast("Couldn't do that. Check your connection and try again");
    } finally {
      setBusy(false);
    }
  };

  const goPersonal = () => {
    setCurrent(personalPocketId(user.uid));
    navigate('/', { replace: true });
  };

  return (
    <div className="screen">
      <div className="scroll sub-scroll">
        <div className="page-head">
          <span className="page-title">People</span>
          <span className="page-sub">{pocket.name} · shared Pocket</span>
        </div>
        <div className="group-card">
          <button className="cur-row press-row invite-row" onClick={() => setInvitePocketId(pocket.id)}>
            <div className="invite-icon">
              <Icon name="user-plus" />
            </div>
            <span className="add-label">Invite someone</span>
          </button>
        </div>
        <div className="group-card">
          {pocket.members.map((m, i) => {
            const me = m.uid === user.uid;
            const canRemove = isOwner && !me;
            const inner = (
              <>
                <Avatar initials={m.initials} size={36} />
                <div className={`member-body${i ? ' sep' : ''}`}>
                  <div className="member-text">
                    <span className="member-name">{m.name}</span>
                    <span className="member-sub">{me ? 'You' : m.joinedAt ? `Joined ${longDate(toDayKey(m.joinedAt.toDate()))}` : 'Joined'}</span>
                  </div>
                  {m.role === 'owner' && <span className="owner-badge">Owner</span>}
                  {canRemove && <Icon name="caret-right" weight="bold" size={13} color="#5A5A5E" />}
                </div>
              </>
            );
            return canRemove ? (
              <button key={m.uid} className="member-row press-row" onClick={() => setConfirm({ kind: 'remove', member: m })}>
                {inner}
              </button>
            ) : (
              <div key={m.uid} className="member-row">
                {inner}
              </div>
            );
          })}
          {invites.map((inv) => (
            <div key={inv.code} className="member-row">
              <div className="pending-icon">
                <Icon name="hourglass-simple" />
              </div>
              <div className="member-body sep">
                <div className="member-text">
                  <span className="member-name">Invite pending</span>
                  <span className="member-sub">
                    {formatCode(inv.code)} · expires in {Math.max(1, Math.round((inv.expiresAt.toMillis() - Date.now()) / 3600000))} h
                  </span>
                </div>
                <button className="cancel-invite press" onClick={() => run(() => cancelInvite(inv.code))}>
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="footnote">
          Only the owner can remove people or delete this Pocket. When someone leaves, their expenses stay here with their initials.
        </div>
        <div className="group-card">
          <button className="row-center destructive press" disabled={busy} onClick={() => setConfirm({ kind: isOwner ? 'delete' : 'leave' })}>
            {isOwner ? 'Delete Pocket' : 'Leave Pocket'}
          </button>
        </div>
      </div>
      <div className="fade-top" />
      <BackButton to="/settings" />
      {confirm?.kind === 'remove' && (
        <ActionSheet
          title={`Remove ${confirm.member.name}?`}
          message={`They'll lose access to ${pocket.name}. Their expenses stay here with their initials.`}
          actions={[
            {
              label: 'Remove from Pocket',
              destructive: true,
              onClick: () => run(() => removeMember(pocket.id, confirm.member.uid), `${confirm.member.name} removed`),
            },
          ]}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === 'delete' && (
        <ActionSheet
          title={`Delete ${pocket.name}?`}
          message="All its expenses will be deleted for everyone. This can't be undone."
          actions={[{ label: 'Delete Pocket', destructive: true, onClick: () => run(async () => (goPersonal(), deletePocket(pocket.id, user.uid))) }]}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === 'leave' && (
        <ActionSheet
          title={`Leave ${pocket.name}?`}
          message="Your expenses stay here with your initials. You'll need a new invite to come back."
          actions={[{ label: 'Leave Pocket', destructive: true, onClick: () => run(async () => (goPersonal(), leavePocket(pocket.id, user.uid))) }]}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
