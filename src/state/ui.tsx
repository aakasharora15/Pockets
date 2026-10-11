import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { subscribePending } from '../data/pending';
import type { Expense } from '../data/types';
import { currentMonth } from '../lib/dates';

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
  online: boolean;
  pendingExpenses: number;
  sheet: ExpenseSheetRequest | null;
  openExpenseSheet: (r: ExpenseSheetRequest) => void;
  closeExpenseSheet: () => void;
  /** Shared Pocket to show the Invite sheet for (after creating one). */
  invitePocketId: string | null;
  setInvitePocketId: (id: string | null) => void;
}

const Ctx = createContext<Ui | null>(null);

const GLASS_KEY = 'spendr.glass';

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
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingExpenses, setPending] = useState(0);
  const [sheet, setSheet] = useState<ExpenseSheetRequest | null>(null);
  const [invitePocketId, setInvitePocketId] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(timer.current);
    setToast(message);
    timer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.glass = glass;
  }, [glass]);

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
    const unsub = subscribePending(setPending);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      unsub();
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
        online,
        pendingExpenses,
        sheet,
        openExpenseSheet: setSheet,
        closeExpenseSheet: () => setSheet(null),
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
