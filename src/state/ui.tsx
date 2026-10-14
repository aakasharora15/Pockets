import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { subscribeOutbox } from '../data/outbox';
import { subscribePending } from '../data/pending';
import type { Expense } from '../data/types';
import { isCurrencyCode, type CurrencyCode } from '../lib/currencies';
import { currentMonth } from '../lib/dates';
import { applyTheme, readThemeSetting, resolveTheme, THEME_KEY, type ThemeSetting } from '../lib/theme';

export type GlassStyle = 'tinted' | 'classic' | 'clear';

export type ExpenseSheetRequest =
  | { mode: 'new'; date?: string }
  | { mode: 'edit'; expense: Expense; pocketId: string };

interface Ui {
  toast: string | null;
  showToast: (message: string) => void;
  /** Selected month, shared by Home, Transactions and Calendar ('YYYY-MM'). */
  month: string;
  setMonth: (m: string) => void;
  glass: GlassStyle;
  setGlass: (g: GlassStyle) => void;
  theme: ThemeSetting;
  setTheme: (t: ThemeSetting) => void;
  online: boolean;
  pendingExpenses: number;
  sheet: ExpenseSheetRequest | null;
  openExpenseSheet: (r: ExpenseSheetRequest) => void;
  closeExpenseSheet: () => void;
  /** Combined total currency per Pocket on this phone (null = off). */
  combinedFor: (pid: string) => CurrencyCode | null;
  setCombined: (pid: string, code: CurrencyCode | null) => void;
  /** Shared Pocket to show the Invite sheet for (after creating one). */
  invitePocketId: string | null;
  setInvitePocketId: (id: string | null) => void;
}

const Ctx = createContext<Ui | null>(null);

const GLASS_KEY = 'spendr.glass';
const combinedKey = (pid: string) => `spendr.combined.${pid}`;

function readCombined(pid: string): CurrencyCode | null {
  try {
    const v = localStorage.getItem(combinedKey(pid));
    return v && isCurrencyCode(v) ? v : null;
  } catch {
    return null;
  }
}

function readGlass(): GlassStyle {
  try {
    const v = localStorage.getItem(GLASS_KEY);
    if (v === 'tinted' || v === 'clear' || v === 'classic') return v;
  } catch {
    /* storage unavailable */
  }
  return 'classic';
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number>(undefined);
  const [month, setMonth] = useState(currentMonth());
  const [glass, setGlassState] = useState<GlassStyle>(readGlass);
  const [theme, setThemeState] = useState<ThemeSetting>(readThemeSetting);
  const [online, setOnline] = useState(navigator.onLine);
  const [inFlight, setInFlight] = useState(0);
  const [inOutbox, setInOutbox] = useState(0);
  // Writes sent this session, or saved on the phone from an earlier one, whichever is more.
  const pendingExpenses = Math.max(inFlight, inOutbox);
  const [sheet, setSheet] = useState<ExpenseSheetRequest | null>(null);
  const [invitePocketId, setInvitePocketId] = useState<string | null>(null);
  const [combined, setCombinedState] = useState<Record<string, CurrencyCode | null>>({});

  const combinedFor = useCallback((pid: string) => (pid in combined ? combined[pid] : readCombined(pid)), [combined]);
  const setCombined = useCallback((pid: string, code: CurrencyCode | null) => {
    setCombinedState((c) => ({ ...c, [pid]: code }));
    try {
      if (code) localStorage.setItem(combinedKey(pid), code);
      else localStorage.removeItem(combinedKey(pid));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(timer.current);
    setToast(message);
    timer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.glass = glass;
  }, [glass]);

  // Automatic follows the phone's Light/Dark setting as it changes.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => applyTheme(resolveTheme(theme));
    apply();
    if (theme !== 'auto') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = (t: ThemeSetting) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* storage unavailable */
    }
  };

  const setGlass = (g: GlassStyle) => {
    setGlassState(g);
    try {
      localStorage.setItem(GLASS_KEY, g);
    } catch {
      /* storage unavailable */
    }
  };

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const unsub = subscribePending(setInFlight);
    const unsubOutbox = subscribeOutbox((list) => setInOutbox(list.filter((e) => e.kind === 'expense').length));
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      unsub();
      unsubOutbox();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        toast,
        showToast,
        month,
        setMonth,
        glass,
        setGlass,
        theme,
        setTheme,
        online,
        pendingExpenses,
        sheet,
        openExpenseSheet: setSheet,
        closeExpenseSheet: () => setSheet(null),
        combinedFor,
        setCombined,
        invitePocketId,
        setInvitePocketId,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUi(): Ui {
  const s = useContext(Ctx);
  if (!s) throw new Error('useUi outside UiProvider');
  return s;
}
