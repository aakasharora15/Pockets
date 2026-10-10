import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { OfflineToast, PlusButton, TabBar, Toast } from './components/Chrome';
import { HomeSkeleton } from './components/Skeletons';
import { configMissing } from './firebase';
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
import { Settings } from './screens/settings/Settings';
import { SetPinScreen, UnlockScreen } from './screens/setup/PinScreen';
import { Setup } from './screens/setup/Setup';
import { SetupNeeded } from './screens/SetupNeeded';
import { Transactions } from './screens/Transactions';
import { LockProvider, useLock } from './state/lock';
import { PocketsProvider, usePockets } from './state/pockets';
import { SessionProvider, useSession } from './state/session';
import { UiProvider, useUi } from './state/ui';

const JOIN_KEY = 'pockets.join';

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
        <Route path="/join" element={<Join />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Overlays />
    </>
  );
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
