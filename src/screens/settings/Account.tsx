import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { BackButton } from '../../components/Chrome';
import { SettingsRow } from '../../components/Rows';
import { ActionSheet, Sheet, SheetHeader } from '../../components/Sheet';
import { deleteAccount, updateName } from '../../data/account';
import { authMessage } from '../../lib/authErrors';
import { Icon } from '../../lib/icons';
import { initialsFor } from '../../lib/initials';
import { setPin } from '../../lib/pin';
import { usePockets } from '../../state/pockets';
import { useMe, useSession } from '../../state/session';
import { useUi } from '../../state/ui';
import { memberInitials, pocketSummary } from '../pockets/PocketSwitcher';
import { SetPinScreen } from '../setup/PinScreen';
import { providerLabel } from './Settings';

const RECENT_LOGIN_MS = 5 * 60 * 1000;

/** 29 · Account (Settings › Account) */
export function Account() {
  const { user, profile } = useMe();
  const { logOut } = useSession();
  const { pockets, setCurrent } = usePockets();
  const { showToast } = useUi();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'relogin' | null>(null);
  const [busy, setBusy] = useState(false);
  const provider = providerLabel(user.providerData.map((p) => p.providerId));

  if (changingPin) {
    return (
      <div className="screen">
        <SetPinScreen
          onBack={() => setChangingPin(false)}
          onDone={async (pin) => {
            await setPin(user.uid, pin);
            setChangingPin(false);
          }}
        />
      </div>
    );
  }

  const startDelete = () => {
    const last = Date.parse(user.metadata.lastSignInTime ?? '');
    setConfirm(Number.isFinite(last) && Date.now() - last < RECENT_LOGIN_MS ? 'delete' : 'relogin');
  };

  const doDelete = async () => {
    setConfirm(null);
    setBusy(true);
    try {
      await deleteAccount(user, pockets);
    } catch (e) {
      setBusy(false);
      showToast(authMessage(e) || "Couldn't delete your account. Try again");
    }
  };

  return (
    <div className="screen">
      <div className="scroll sub-scroll">
        <span className="page-title settings-title">Account</span>
        <div className="account-hero">
          <Avatar initials={profile.initials} size={72} />
          <span className="account-name">{profile.name}</span>
          <span className="account-email">{user.email}</span>
        </div>
        <div className="group-card">
          <SettingsRow first icon="user" label="Name" value={profile.name} onClick={() => setEditing(true)} />
          <SettingsRow icon={provider === 'Google' ? 'google-logo' : provider === 'Apple' ? 'apple-logo' : 'envelope-simple'} label="Signed in with" value={provider} chevron={false} />
          <SettingsRow icon="lock-key" label="App PIN" value="Change" onClick={() => setChangingPin(true)} />
        </div>
        <div className="group">
          <span className="section-label">Your Pockets</span>
          <div className="group-card">
            {pockets.map((p, i) => {
              const shared = p.type === 'shared';
              const owner = shared && p.ownerUid === user.uid;
              const inner = (
                <>
                  <AvatarStack initials={memberInitials(p)} size={36} ring="#1C2230" />
                  <div className={`member-body${i ? ' sep' : ''}`}>
                    <div className="member-text">
                      <span className="member-name">{p.name}</span>
                      <span className="member-sub">
                        {pocketSummary(p)}
                        {owner ? ' · Owner' : ''}
                      </span>
                    </div>
                    {shared && <Icon name="caret-right" weight="bold" size={13} color="#5A5A5E" />}
                  </div>
                </>
              );
              return shared ? (
                <button
                  key={p.id}
                  className="member-row press-row"
                  onClick={() => {
                    setCurrent(p.id);
                    navigate('/settings/people');
                  }}
                >
                  {inner}
                </button>
              ) : (
                <div key={p.id} className="member-row">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
        <div className="group-card">
          <button className="row-center destructive press" onClick={() => void logOut()}>
            Log out
          </button>
        </div>
        <button className="delete-account press" disabled={busy} onClick={startDelete}>
          Delete account
        </button>
      </div>
      <div className="fade-top" />
      <BackButton to="/settings" />
      {editing && <NameSheet onClose={() => setEditing(false)} />}
      {confirm === 'delete' && (
        <ActionSheet
          title="Delete your account?"
          message="Your Personal Pocket and its expenses are deleted. Shared Pockets stay with the other people in them. This can't be undone."
          actions={[{ label: 'Delete account', destructive: true, onClick: doDelete }]}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'relogin' && (
        <ActionSheet
          title="Log in again first"
          message="For your security, log in again, then delete your account from Settings › Account."
          actions={[{ label: 'Log in again', onClick: () => void logOut() }]}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function NameSheet({ onClose }: { onClose: () => void }) {
  const { user, profile } = useMe();
  const { pockets } = usePockets();
  const { showToast } = useUi();
  const [name, setName] = useState(profile.name);
  const [initials, setInitials] = useState(profile.initials);
  const [touched, setTouched] = useState(false);
  const valid = name.trim().length > 0 && initials.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    try {
      await updateName(user.uid, name.trim(), initials.trim().toUpperCase(), pockets);
      onClose();
    } catch {
      showToast("Couldn't save. Try again");
    }
  };

  return (
    <Sheet onClose={onClose} label="Name">
      <SheetHeader title="Name" onCancel={onClose} action={{ label: 'Save', onClick: save, disabled: !valid }} />
      <label className="field">
        <input
          autoFocus
          aria-label="Name"
          maxLength={60}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!touched) setInitials(initialsFor(e.target.value));
          }}
        />
      </label>
      <span className="field-label sheet-label">Initials</span>
      <label className="field">
        <input
          aria-label="Initials"
          maxLength={3}
          autoCapitalize="characters"
          value={initials}
          onChange={(e) => {
            setTouched(true);
            setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
          }}
        />
      </label>
      <span className="helper">Shown on expenses you add. Spendr adds a number if someone else has the same initials.</span>
      <button className="primary-btn sheet-bottom press" disabled={!valid} onClick={save}>
        Save
      </button>
    </Sheet>
  );
}
