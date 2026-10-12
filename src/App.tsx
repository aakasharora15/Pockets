import { useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { OfflineToast, PlusButton, TabBar, Toast } from './components/Chrome';
import { HomeSkeleton } from './components/Skeletons';
import { onMovedToPersonal, replayOutbox } from './data/outbox';
import { addMissingDefaults } from './data/categories';
import { logDueRecurring } from './data/recurring';
import { DEFAULTS_VERSION } from './lib/categories';
import { configMissing } from './firebase';
import { firstName } from './lib/initials';
import { AuthForm } from './screens/auth/AuthForm';
import { Welcome } from './screens/auth/Welcome';
import { Calendar } from './screens/Calendar';
import { ExpenseSheet } from './screens/ExpenseSheet';
import { Home } from './screens/Home';
import { InviteSheet } from './screens/pockets/InviteSheet';
import { Join } from './screens/pockets/Join';
import { People } from './screens/pockets/People';
import { Account } from './screens/settings/Account';
import { Budgets } from './screens/settings/Budgets';
import { Categories } from './screens/settings/Categories';
import { Currencies } from './screens/settings/Currencies';
import { Recurring } from './screens/settings/Recurring';
import { Settings } from './screens/settings/Settings';
import { Tags } from './screens/tags/Tags';
import { TagView } from './screens/tags/TagView';
import { SetPinScreen, UnlockScreen } from './screens/setup/PinScreen';
import { Setup } from './screens/setup/Setup';
import { SetupNeeded } from './screens/SetupNeeded';
import { Transactions } from './screens/Transactions';
import { LockProvider, useLock } from './state/lock';
import { PocketsProvider, usePockets } from './state/pockets';
import { SessionProvider, useSession } from './state/session';
import { UiProvider, useUi } from './state/ui';

const JOIN_KEY = 'spendr.join';

export default function App() {
  if (configMissing) return <SetupNeeded />;
  return (
    <BrowserRouter>
      <UiProvider>
        <SessionProvider>
          <LockProvider>
            <PocketsProvider>
              <div className="app">
                <Gate />
                <Toast />
              </div>
            </PocketsProvider>
          </LockProvider>
        </SessionProvider>
      </UiProvider>
    </BrowserRouter>
  );
}

/** Remembers an invite link opened before signing in, so it opens after. */
function RememberJoin() {
  const { code } = useParams();
  useEffect(() => {
    if (code) sessionStorage.setItem(JOIN_KEY, code);
  }, [code]);
  return <Navigate to="/welcome" replace />;
}

function Gate() {
  const { user, profile, profileError } = useSession();
  const lock = useLock();
  const { loading } = usePockets();

  if (user === undefined) return <div className="screen" />;

  if (user === null) {
    return (
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/signup" element={<AuthForm mode="signup" />} />
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/join/:code" element={<RememberJoin />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    );
  }

  if (profile === undefined || lock.state === 'checking') {
    return profileError ? <SetupNeeded offline /> : <HomeSkeleton />;
  }

  if (profile === null) return <Setup />;

  if (lock.state === 'none') return <SetPinScreen onDone={lock.createPin} />;
  if (lock.state === 'locked') return <UnlockScreen onUnlock={lock.unlock} onForgot={lock.forgot} />;

  if (loading) return <HomeSkeleton />;

  return <MainRoutes />;
}

function MainRoutes() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { current } = usePockets();

  // Top bars get their material once the page scrolls under them (see .fade-top).
  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target;
      if (el instanceof HTMLElement && el.classList.contains('scroll')) el.parentElement?.classList.toggle('scrolled', el.scrollTop > 2);
    };
    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, []);

  // Open a remembered invite link once everything is ready.
  useEffect(() => {
    const code = sessionStorage.getItem(JOIN_KEY);
    if (code) {
      sessionStorage.removeItem(JOIN_KEY);
      if (!pathname.startsWith('/join')) navigate(`/join/${code}`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return <HomeSkeleton />;

  return (
    <>
      <JoinWatcher />
      <OutboxRunner />
      <RecurringRunner />
      <DefaultsRunner />
      <Routes>
        <Route element={<Tabs />}>
          <Route path="/" element={<Home />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/settings/people" element={<People />} />
        <Route path="/settings/currencies" element={<Currencies />} />
        <Route path="/settings/budgets" element={<Budgets />} />
        <Route path="/settings/categories" element={<Categories />} />
        <Route path="/settings/account" element={<Account />} />
        <Route path="/settings/tags" element={<Tags />} />
        <Route path="/settings/tags/:tag" element={<TagView />} />
        <Route path="/settings/recurring" element={<Recurring />} />
        <Route path="/join" element={<Join />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Overlays />
    </>
  );
}

/** Tells existing members when someone new joins one of their shared Pockets. */
function JoinWatcher() {
  const { pockets } = usePockets();
  const { user } = useSession();
  const { showToast } = useUi();
  const seen = useRef<Map<string, Set<string>>>(new Map());
  useEffect(() => {
    for (const p of pockets) {
      if (p.type !== 'shared' || p.members.length === 0) continue;
      const uids = new Set(p.members.map((m) => m.uid));
      const before = seen.current.get(p.id);
      if (before && before.has(user?.uid ?? '')) {
        const fresh = p.members.find((m) => !before.has(m.uid) && m.uid !== user?.uid);
        if (fresh) showToast(`${firstName(fresh.name)} joined ${p.name}`);
      }
      seen.current.set(p.id, uids);
    }
  }, [pockets, user?.uid, showToast]);
  return null;
}

/** Re-sends anything saved on this phone that the server hasn't confirmed: now, when back online, every minute. */
function OutboxRunner() {
  const { user } = useSession();
  const { showToast } = useUi();
  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    onMovedToPersonal((n) => showToast(`Saved ${n} ${n === 1 ? 'expense' : 'expenses'} to Personal: its Pocket isn't available`));
    const run = () => void replayOutbox(uid);
    const onVisible = () => document.visibilityState === 'visible' && run();
    // Give Firestore a moment to send its own queue first.
    const first = window.setTimeout(run, 4000);
    const every = window.setInterval(run, 60_000);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', onVisible);
      onMovedToPersonal(null);
    };
  }, [uid, showToast]);
  return null;
}

/**
 * Logs monthly repeats that are due, in every Pocket you're in: on opening, when back online, when
 * the app comes back to the front and every half hour. Whoever opens Spendr first logs them.
 */
function RecurringRunner() {
  const { pockets } = usePockets();
  const { showToast } = useUi();
  const ids = pockets.map((p) => p.id).join(',');
  const last = useRef(0);
  useEffect(() => {
    if (!ids) return;
    const run = async (force = false) => {
      if (!navigator.onLine || (!force && Date.now() - last.current < 60_000)) return;
      last.current = Date.now();
      let n = 0;
      for (const pid of ids.split(',')) n += await logDueRecurring(pid).catch(() => 0);
      if (n) showToast(`${n} repeating ${n === 1 ? 'expense' : 'expenses'} added`);
    };
    const first = window.setTimeout(() => void run(true), 2500);
    const every = window.setInterval(() => void run(), 30 * 60_000);
    const onOnline = () => void run();
    const onVisible = () => document.visibilityState === 'visible' && void run();
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ids, showToast]);
  return null;
}

/** Adds categories introduced in later versions to older Pockets, once per Pocket. */
function DefaultsRunner() {
  const { pockets, categoriesFor } = usePockets();
  const done = useRef(new Set<string>());
  useEffect(() => {
    if (!navigator.onLine) return;
    for (const p of pockets) {
      const cats = categoriesFor(p.id);
      if ((p.defaultsVersion ?? 1) >= DEFAULTS_VERSION || cats.length === 0 || done.current.has(p.id)) continue;
      done.current.add(p.id);
      addMissingDefaults(p.id, cats).catch(() => done.current.delete(p.id));
    }
  }, [pockets, categoriesFor]);
  return null;
}

/** Main tabs share the tab bar, plus button and offline toast. */
function Tabs() {
  return (
    <>
      <Outlet />
      <OfflineToast />
      <TabBar />
      <PlusButton />
    </>
  );
}

function Overlays() {
  const { sheet, invitePocketId, setInvitePocketId } = useUi();
  return (
    <>
      {sheet && <ExpenseSheet request={sheet} />}
      {invitePocketId && <InviteSheet pocketId={invitePocketId} onClose={() => setInvitePocketId(null)} />}
    </>
  );
}
