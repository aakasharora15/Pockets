import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Fades } from '../../components/Chrome';
import { Group, SettingsMenuRow, SettingsRow } from '../../components/Rows';
import { Switch } from '../../components/Switch';
import { ActionSheet, Sheet, SheetHeader } from '../../components/Sheet';
import { createBackup, restoreBackup } from '../../data/backup';
import { allExpenses, expensesBetween } from '../../data/expenses';
import { replayOutbox, useOutbox } from '../../data/outbox';
import { lastServerSync } from '../../data/syncStatus';
import { useRecurring } from '../../data/recurring';
import { taggedExpenses } from '../../data/tags';
import type { Expense } from '../../data/types';
import { BackupError, parseBackup, type Backup } from '../../lib/backup';
import { currency } from '../../lib/currencies';
import { expensesToCsv, shareOrDownload, slug } from '../../lib/csv';
import { longDate, monthEnd, monthStart, monthYear, todayKey } from '../../lib/dates';
import { MonthHeader } from '../Home';
import { useLock } from '../../state/lock';
import { useCurrentPocket, usePockets } from '../../state/pockets';
import { useMe } from '../../state/session';
import type { ThemeSetting } from '../../lib/theme';
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

/**
 * Row icon colours, taken from Spendr's own palette (the accent and the category colours used in
 * the charts) so Settings reads as part of the same app. Neighbouring rows never share a colour.
 */
const TINT = {
  people: '#4F8BFF',
  currencies: '#4FC48A',
  budgets: '#E8B83E',
  combined: '#F09A55',
  categories: '#A884F0',
  tags: '#EE86B4',
  repeating: '#5AA0F0',
  export: '#73A6A0',
  backup: '#7C8CF8',
  theme: '#7C8CF8',
  glass: '#5AA0F0',
  neutral: '#8FA0B8',
};

const THEMES: [ThemeSetting, string][] = [
  ['dark', 'Dark'],
  ['light', 'Light'],
  ['auto', 'Automatic'],
];

const GLASSES: [GlassStyle, string][] = [
  ['tinted', 'Tinted'],
  ['classic', 'Classic'],
  ['clear', 'Clear'],
];

export function Settings() {
  const pocket = useCurrentPocket();
  const { categories, allPockets: pockets, personalHidden, setHidePersonal } = usePockets();
  const inShared = pockets.some((p) => p.type === 'shared');
  const { user, profile } = useMe();
  const { glass, setGlass, theme, setTheme, showToast, month, combinedFor, setCombined, online } = useUi();
  const waiting = useOutbox().filter((e) => e.uid === user.uid);
  const { lockNow } = useLock();
  const navigate = useNavigate();
  // Home's Export pill opens straight onto the export choices.
  const opened = (useLocation().state as { sheet?: 'export' } | null)?.sheet ?? null;
  const [sheet, setSheet] = useState<'install' | 'about' | 'sync' | 'export' | 'export-tag' | 'export-month' | 'backup' | 'combined' | null>(opened);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMonth, setExportMonth] = useState(month);
  const [restore, setRestore] = useState<{ backup: Backup; skipped: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { list: repeats } = useRecurring(pocket.id);
  const tags = pocket.tags ?? [];
  const combined = pocket.currencies.length > 1 ? combinedFor(pocket.id) : null;

  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);

  /** Export a CSV of the whole Pocket, one month or one tag. */
  const exportCsv = async (what: { month?: string; tag?: string } = {}) => {
    if (exporting) return;
    setSheet(null);
    setExporting(true);
    try {
      let list: Expense[];
      let name = slug(pocket.name);
      if (what.month) {
        list = await expensesBetween(pocket.id, monthStart(what.month), monthEnd(what.month));
        name += `-${what.month}`;
      } else if (what.tag) {
        list = await taggedExpenses(pocket.id, what.tag);
        name += `-${slug(what.tag, 'tag')}`;
      } else {
        list = await allExpenses(pocket.id);
        name += `-${todayKey()}`;
      }
      if (list.length === 0) {
        showToast('Nothing to export');
        return;
      }
      await shareOrDownload(`spendr-${name}.csv`, expensesToCsv(list, categories, pocket.members));
    } catch {
      showToast("Couldn't export. Try again");
    } finally {
      setExporting(false);
    }
  };

  const backUp = async (withPhotos: boolean) => {
    setSheet(null);
    if (!navigator.onLine) return showToast('Backing up needs a connection');
    if (exporting) return;
    setExporting(true);
    showToast('Creating backup');
    try {
      const backup = await createBackup(pockets, { uid: user.uid, name: profile.name, email: profile.email }, withPhotos);
      await shareOrDownload(`spendr-backup-${todayKey()}.json`, JSON.stringify(backup), 'application/json');
    } catch {
      showToast("Couldn't create the backup. Try again");
    } finally {
      setExporting(false);
    }
  };

  const pickBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      setRestore(parseBackup(await file.text()));
    } catch (e) {
      showToast(e instanceof BackupError ? e.message : "Couldn't read that file");
    }
  };

  const doRestore = async () => {
    const r = restore;
    setRestore(null);
    if (!r) return;
    if (!navigator.onLine) return showToast('Restoring needs a connection');
    showToast('Restoring');
    try {
      const done = await restoreBackup(r.backup, { uid: user.uid, name: profile.name, initials: profile.initials }, pockets);
      const parts = [`${done.expenses} ${done.expenses === 1 ? 'expense' : 'expenses'}`];
      if (done.newPockets) parts.push(`${done.newPockets} ${done.newPockets === 1 ? 'Pocket' : 'Pockets'}`);
      showToast(done.expenses || done.newPockets ? `Restored ${parts.join(' and ')}` : 'Everything in the backup is already here');
    } catch {
      showToast("Couldn't finish restoring. Try again: nothing is added twice");
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
            <SettingsRow
              first
              icon="users-three"
              tint={TINT.people}
              label="People"
              value={pocket.members.length}
              onClick={() => navigate('/settings/people')}
            />
          )}
          <SettingsRow
            first={pocket.type !== 'shared'}
            icon="currency-circle-dollar"
            tint={TINT.currencies}
            label="Currencies"
            value={pocket.currencies.map((c) => currency(c).symbol).join(' ')}
            onClick={() => navigate('/settings/currencies')}
          />
          <SettingsRow icon="target" tint={TINT.budgets} label="Monthly budgets" onClick={() => navigate('/settings/budgets')} />
          {pocket.currencies.length > 1 && (
            <SettingsRow
              icon="arrows-left-right"
              tint={TINT.combined}
              label="Combined total"
              value={combined ? `In ${currency(combined).symbol}` : 'Off'}
              onClick={() => setSheet('combined')}
            />
          )}
        </Group>
        <Group>
          <SettingsRow first icon="squares-four" tint={TINT.categories} label="Manage categories" onClick={() => navigate('/settings/categories')} />
          <SettingsRow icon="tag" tint={TINT.tags} label="Tags" value={tags.length || undefined} onClick={() => navigate('/settings/tags')} />
          <SettingsRow
            icon="repeat"
            tint={TINT.repeating}
            label="Repeating expenses"
            value={repeats.length || undefined}
            onClick={() => navigate('/settings/recurring')}
          />
        </Group>
        <Group>
          <SettingsRow first icon="tray-arrow-down" tint={TINT.export} label="Export data (CSV)" onClick={() => setSheet('export')} />
          <SettingsRow icon="archive" tint={TINT.backup} label="Back up and restore" onClick={() => setSheet('backup')} />
        </Group>
        <Group title="Account">
          <SettingsRow
            first
            icon="user-circle"
            tint={TINT.neutral}
            label={profile.name}
            value={providerLabel(user.providerData.map((p) => p.providerId))}
            onClick={() => navigate('/settings/account')}
          />
          {inShared && (
            <SettingsRow icon="user" tint={TINT.neutral} label="Personal Pocket" chevron={false}>
              <Switch
                on={!personalHidden}
                label="Show Personal Pocket"
                onChange={(show) => {
                  setHidePersonal(!show);
                  showToast(show ? 'Personal Pocket shown' : 'Personal Pocket hidden. Its expenses are kept');
                }}
              />
            </SettingsRow>
          )}
          <SettingsRow
            icon="cloud-arrow-up"
            tint={TINT.neutral}
            label="Sync status"
            value={!online ? 'Offline' : waiting.length ? `${waiting.length} waiting` : 'Up to date'}
            onClick={() => setSheet('sync')}
          />
          <SettingsRow icon="lock-simple" tint={TINT.neutral} label="Lock app now" chevron={false} onClick={lockNow} />
        </Group>
        <Group title="Appearance">
          <SettingsMenuRow first icon="moon" tint={TINT.theme} label="Theme" value={theme} options={THEMES} onChange={setTheme} />
          <SettingsMenuRow icon="drop-half" tint={TINT.glass} label="Glass" value={glass} options={GLASSES} onChange={setGlass} />
        </Group>
        <Group>
          {!standalone && <SettingsRow first icon="device-mobile" tint={TINT.neutral} label="Add to Home Screen" onClick={install} />}
          <SettingsRow first={!!standalone} icon="info" tint={TINT.neutral} label="About Spendr" onClick={() => setSheet('about')} />
        </Group>
        <div className="settings-footer">Spendr · Version {__APP_VERSION__}</div>
      </div>
      <Fades />
      {sheet === 'install' && (
        <ActionSheet
          title="Add to Home Screen"
          message="In Safari, tap the Share button, then Add to Home Screen. Spendr opens full screen and works offline."
          actions={[]}
          onCancel={() => setSheet(null)}
        />
      )}
      {sheet === 'combined' && (
        <ActionSheet
          title="Combined total"
          message="Adds a card on Home with everything converted into one currency, each expense at its own day's exchange rate. Your separate totals don't change. Set on this phone only."
          actions={[
            ...pocket.currencies.map((c) => ({
              label: `${combined === c ? '✓ ' : ''}Show all in ${currency(c).plural.toLowerCase()} (${currency(c).symbol})`,
              onClick: () => {
                setCombined(pocket.id, c);
                setSheet(null);
              },
            })),
            ...(combined
              ? [
                  {
                    label: 'Turn off',
                    onClick: () => {
                      setCombined(pocket.id, null);
                      setSheet(null);
                    },
                  },
                ]
              : []),
          ]}
          onCancel={() => setSheet(null)}
        />
      )}
      {sheet === 'export' && (
        <ActionSheet
          title={`Export ${pocket.name}`}
          message="A CSV file you can open in Excel, Numbers or Google Sheets."
          actions={[
            { label: `Everything in ${pocket.name}`, onClick: () => exportCsv() },
            {
              label: 'One month',
              onClick: () => {
                setExportMonth(month);
                setSheet('export-month');
              },
            },
            ...(tags.length ? [{ label: 'One tag', onClick: () => setSheet('export-tag') }] : []),
          ]}
          onCancel={() => setSheet(null)}
        />
      )}
      {sheet === 'export-tag' && (
        <ActionSheet title="Export a tag" actions={tags.map((t) => ({ label: t, onClick: () => exportCsv({ tag: t }) }))} onCancel={() => setSheet(null)} />
      )}
      {sheet === 'export-month' && (
        <Sheet onClose={() => setSheet(null)} label="Export a month" top="max(calc(var(--top) + 4px), calc(100% - 330px))">
          <SheetHeader title="Export a month" onCancel={() => setSheet(null)} />
          <MonthHeader month={exportMonth} onChange={setExportMonth} />
          <span className="page-sub export-month-year">{monthYear(exportMonth)}</span>
          <button className="primary-btn sheet-bottom press" onClick={() => exportCsv({ month: exportMonth })}>
            Export {monthYear(exportMonth)}
          </button>
        </Sheet>
      )}
      {sheet === 'backup' && (
        <ActionSheet
          title="Back up and restore"
          message="A backup file has every Pocket you're in. Restoring adds back anything that's missing and never changes or deletes what's here."
          actions={[
            { label: 'Create backup', onClick: () => backUp(false) },
            { label: 'Create backup with receipt photos', onClick: () => backUp(true) },
            {
              label: 'Restore from a backup file',
              onClick: () => {
                setSheet(null);
                fileInput.current?.click();
              },
            },
          ]}
          onCancel={() => setSheet(null)}
        />
      )}
      {restore && (
        <ActionSheet
          title={`Restore the backup${restore.backup.createdAt ? ` from ${longDate(todayKeyOf(restore.backup.createdAt))}` : ''}?`}
          message={restoreMessage(restore.backup, restore.skipped)}
          actions={[{ label: 'Restore', onClick: doRestore }]}
          onCancel={() => setRestore(null)}
        />
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void pickBackup(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {sheet === 'sync' && (
        <ActionSheet
          title="Sync status"
          message={syncSummary({
            email: user.email ?? profile.name,
            provider: providerLabel(user.providerData.map((p) => p.providerId)),
            uid: user.uid,
            pocket: pocket.name,
            online,
            waiting: waiting.filter((e) => e.kind === 'expense').length,
            error: waiting.find((e) => e.error)?.error,
          })}
          actions={[
            {
              label: 'Sync now',
              onClick: async () => {
                setSheet(null);
                await replayOutbox(user.uid);
                showToast(navigator.onLine ? 'Synced' : "You're offline. Spendr will sync when you're back");
              },
            },
          ]}
          onCancel={() => setSheet(null)}
        />
      )}
      {sheet === 'about' && (
        <ActionSheet
          title={`Spendr · Version ${__APP_VERSION__} (${__APP_BUILD__})`}
          message={`Open-source expense tracker for you and the people you share costs with. MIT licence.`}
          actions={[{ label: 'View source on GitHub', onClick: () => window.open(REPO_URL, '_blank', 'noopener') }]}
          onCancel={() => setSheet(null)}
        />
      )}
    </div>
  );
}

/** What Sync status shows. Compare it between phones: the account ID must be the same. */
function syncSummary(s: { email: string; provider: string; uid: string; pocket: string; online: boolean; waiting: number; error?: string }): string {
  const last = lastServerSync();
  const lines = [
    `Signed in as ${s.email} (${s.provider}). Account ID ${s.uid.slice(0, 6).toUpperCase()}.`,
    `Showing ${s.pocket}.`,
    !s.online
      ? 'Offline. New expenses are kept on this phone until you reconnect.'
      : last
        ? `Last synced at ${new Date(last).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`
        : 'Not synced with the server yet in this session.',
    s.waiting
      ? `${s.waiting} ${s.waiting === 1 ? 'expense' : 'expenses'} waiting to upload${s.error ? ` (last error: ${s.error})` : ''}.`
      : 'Nothing waiting to upload.',
  ];
  return lines.join(' ');
}

function todayKeyOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? todayKey() : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function restoreMessage(b: Backup, skipped: number): string {
  const n = b.pockets.reduce((s, p) => s + p.expenses.length, 0);
  const photos = b.pockets.reduce((s, p) => s + (p.receipts?.length ?? 0), 0);
  const pockets = `${b.pockets.length} ${b.pockets.length === 1 ? 'Pocket' : 'Pockets'}`;
  const parts = [`${pockets}, ${n} ${n === 1 ? 'expense' : 'expenses'}${photos ? `, ${photos} receipt photos` : ''}.`];
  parts.push('Anything already in Spendr stays as it is; missing items are added back.');
  if (skipped) parts.push(`${skipped} damaged ${skipped === 1 ? 'entry' : 'entries'} will be left out.`);
  return parts.join(' ');
}
