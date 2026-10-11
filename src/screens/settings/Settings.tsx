import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fades } from '../../components/Chrome';
import { Group, SettingsRow } from '../../components/Rows';
import { ActionSheet } from '../../components/Sheet';
import { allExpenses } from '../../data/expenses';
import { currency } from '../../lib/currencies';
import { expensesToCsv, shareOrDownload } from '../../lib/csv';
import { todayKey } from '../../lib/dates';
import { useLock } from '../../state/lock';
import { useCurrentPocket, usePockets } from '../../state/pockets';
import { useMe } from '../../state/session';
import { useUi, type GlassStyle } from '../../state/ui';

export const REPO_URL = 'https://github.com/aakasharora15/Spendr';

export function providerLabel(providerIds: string[]): string {
  if (providerIds.includes('google.com')) return 'Google';
  if (providerIds.includes('apple.com')) return 'Apple';
  return 'Email';
}

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

/** 19 · Settings */
export function Settings() {
  const pocket = useCurrentPocket();
  const { categories } = usePockets();
  const { user, profile } = useMe();
  const { glass, setGlass, showToast } = useUi();
  const { lockNow } = useLock();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<'install' | 'about' | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const list = await allExpenses(pocket.id);
      const csv = expensesToCsv(list, categories, pocket.members);
      const slug = pocket.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pocket';
      await shareOrDownload(`spendr-${slug}-${todayKey()}.csv`, csv);
    } catch {
      showToast("Couldn't export. Try again");
    } finally {
      setExporting(false);
    }
  };

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
    } else {
      setSheet('install');
    }
  };

  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;

  return (
    <div className="screen">
      <div className="scroll settings-scroll">
        <span className="page-title settings-title">Settings</span>
        <Group title={`This Pocket · ${pocket.name}`}>
          {pocket.type === 'shared' && (
            <SettingsRow first icon="users-three" label="People" value={pocket.members.length} onClick={() => navigate('/settings/people')} />
          )}
          <SettingsRow
            first={pocket.type !== 'shared'}
            icon="currency-circle-dollar"
            label="Currencies"
            value={pocket.currencies.map((c) => currency(c).symbol).join(' ')}
            onClick={() => navigate('/settings/currencies')}
          />
          <SettingsRow icon="target" label="Monthly budgets" onClick={() => navigate('/settings/budgets')} />
        </Group>
        <Group>
          <SettingsRow first icon="squares-four" label="Manage categories" onClick={() => navigate('/settings/categories')} />
        </Group>
        <Group>
          <SettingsRow first icon="download-simple" label="Export data (CSV)" onClick={exportCsv} />
        </Group>
        <Group title="Account">
          <SettingsRow
            first
            icon="user-circle"
            label={profile.name}
            value={providerLabel(user.providerData.map((p) => p.providerId))}
            onClick={() => navigate('/settings/account')}
          />
          <SettingsRow icon="lock-simple" label="Lock app now" chevron={false} onClick={lockNow} />
        </Group>
        <Group title="Appearance">
          <SettingsRow first icon="drop-half" label="Glass" chevron={false}>
            <div className="glass-seg" role="radiogroup" aria-label="Glass">
              {(['tinted', 'classic', 'clear'] as GlassStyle[]).map((g) => (
                <button key={g} role="radio" aria-checked={glass === g} className={`glass-seg-item${glass === g ? ' on' : ''}`} onClick={() => setGlass(g)}>
                  {g[0].toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </SettingsRow>
        </Group>
        <Group>
          {!standalone && <SettingsRow first icon="device-mobile" label="Add to Home Screen" onClick={install} />}
          <SettingsRow first={!!standalone} icon="info" label="About Spendr" onClick={() => setSheet('about')} />
        </Group>
        <div className="settings-footer">Spendr · Version 1.0</div>
      </div>
      <Fades topHeight={70} />
      {sheet === 'install' && (
        <ActionSheet
          title="Add to Home Screen"
          message="In Safari, tap the Share button, then Add to Home Screen. Spendr opens full screen and works offline."
          actions={[]}
          onCancel={() => setSheet(null)}
        />
      )}
      {sheet === 'about' && (
        <ActionSheet
          title="Spendr · Version 1.0"
          message="Open-source expense tracker for you and the people you share costs with. MIT licence."
          actions={[{ label: 'View source on GitHub', onClick: () => window.open(REPO_URL, '_blank', 'noopener') }]}
          onCancel={() => setSheet(null)}
        />
      )}
    </div>
  );
}
