import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fades } from '../../components/Chrome';
import { Group, SettingsRow } from '../../components/Rows';
import { ActionSheet, Sheet, SheetHeader } from '../../components/Sheet';
import { createBackup, restoreBackup } from '../../data/backup';
import { allExpenses, expensesBetween } from '../../data/expenses';
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

export function Settings() {
  const pocket = useCurrentPocket();
  const { categories, pockets } = usePockets();
  const { user, profile } = useMe();
  const { glass, setGlass, showToast, month, combinedFor, setCombined } = useUi();
  const { lockNow } = useLock();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<'install' | 'about' | 'export' | 'export-tag' | 'export-month' | 'backup' | 'combined' | null>(null);
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
            <SettingsRow first icon="users-three" tint="#5E5CE6" label="People" value={pocket.members.length} onClick={() => navigate('/settings/people')} />
          )}
          <SettingsRow
            first={pocket.type !== 'shared'}
            icon="currency-circle-dollar" tint="#0A84FF"
            label="Currencies"
            value={pocket.currencies.map((c) => currency(c).symbol).join(' ')}
            onClick={() => navigate('/settings/currencies')}
          />
          <SettingsRow icon="target" tint="#30D158" label="Monthly budgets" onClick={() => navigate('/settings/budgets')} />
          {pocket.currencies.length > 1 && (
            <SettingsRow
              icon="arrows-left-right" tint="#FF9F0A"
              label="Combined total"
              value={combined ? `In ${currency(combined).symbol}` : 'Off'}
              onClick={() => setSheet('combined')}
            />
          )}
        </Group>
        <Group>
          <SettingsRow first icon="squares-four" tint="#BF5AF2" label="Manage categories" onClick={() => navigate('/settings/categories')} />
          <SettingsRow icon="tag" tint="#FF375F" label="Tags" value={tags.length || undefined} onClick={() => navigate('/settings/tags')} />
          <SettingsRow icon="repeat" tint="#64D2FF" label="Repeating expenses" value={repeats.length || undefined} onClick={() => navigate('/settings/recurring')} />
        </Group>
        <Group>
          <SettingsRow first icon="download-simple" tint="#30B0C7" label="Export data (CSV)" onClick={() => setSheet('export')} />
          <SettingsRow icon="clock-counter-clockwise" tint="#AC8E68" label="Back up and restore" onClick={() => setSheet('backup')} />
        </Group>
        <Group title="Account">
          <SettingsRow
            first
            icon="user-circle" tint="#8E8E93"
            label={profile.name}
            value={providerLabel(user.providerData.map((p) => p.providerId))}
            onClick={() => navigate('/settings/account')}
          />
          <SettingsRow icon="lock-simple" tint="#8E8E93" label="Lock app now" chevron={false} onClick={lockNow} />
        </Group>
        <Group title="Appearance">
          <SettingsRow first icon="drop-half" tint="#0A84FF" label="Glass" chevron={false}>
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
          {!standalone && <SettingsRow first icon="device-mobile" tint="#8E8E93" label="Add to Home Screen" onClick={install} />}
          <SettingsRow first={!!standalone} icon="info" tint="#8E8E93" label="About Spendr" onClick={() => setSheet('about')} />
        </Group>
        <div className="settings-footer">Spendr · Version 1.0</div>
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
        <ActionSheet
          title="Export a tag"
          actions={tags.map((t) => ({ label: t, onClick: () => exportCsv({ tag: t }) }))}
          onCancel={() => setSheet(null)}
        />
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

function todayKeyOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? todayKey() : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function restoreMessage(b: Backup, skipped: number): string {
  const n = b.pockets.reduce((s, p) => s + p.expenses.length, 0);
  const photos = b.pockets.reduce((s, p) => s + (p.receipts?.length ?? 0), 0);
  const pockets = `${b.pockets.length} ${b.pockets.length === 1 ? 'Pocket' : 'Pockets'}`;
  const parts = [`${pockets}, ${n} ${n === 1 ? 'expense' : 'expenses'}${photos ? `, ${photos} receipt photos` : ''}.`];
  parts.push("Anything already in Spendr stays as it is; missing items are added back.");
  if (skipped) parts.push(`${skipped} damaged ${skipped === 1 ? 'entry' : 'entries'} will be left out.`);
  return parts.join(' ');
}
