import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarStack } from '../components/Avatar';
import { Fades } from '../components/Chrome';
import { SwipeRow, useSwipeRows } from '../components/ExpenseRow';
import { ListSkeleton } from '../components/Skeletons';
import { useExpenses } from '../data/useExpenses';
import type { CurrencyCode } from '../lib/currencies';
import { addMonths } from '../lib/dates';
import { Icon } from '../lib/icons';
import { inMonth } from '../lib/stats';
import { useCurrentPocket, usePockets } from '../state/pockets';
import { useUi } from '../state/ui';
import { ByPerson } from './home/ByPerson';
import { CurrencyCards } from './home/CurrencyCards';
import { Insight } from './home/Insight';
import { MonthHeader } from './home/MonthHeader';
import { WeeklySpend } from './home/WeeklySpend';
import { WhereItWent } from './home/WhereItWent';
import { NewPocketSheet } from './pockets/NewPocketSheet';
import { PocketDeck } from './pockets/PocketDeck';
import { memberInitials, PocketSwitcher } from './pockets/PocketSwitcher';

export function Home() {
  const pocket = useCurrentPocket();
  const { categories } = usePockets();
  const { month, setMonth, openExpenseSheet } = useUi();
  const navigate = useNavigate();
  const prev = addMonths(month, -1);
  const { expenses: both, loading } = useExpenses(pocket.id, prev, month);
  const expenses = useMemo(() => inMonth(both, month), [both, month]);
  const prevExpenses = useMemo(() => inMonth(both, prev), [both, prev]);
  const [cur, setCur] = useState<CurrencyCode>(pocket.currencies[0]);
  const [switcher, setSwitcher] = useState(false);
  const [newPocket, setNewPocket] = useState(false);
  const swipe = useSwipeRows(pocket.id);

  useEffect(() => {
    if (!pocket.currencies.includes(cur)) setCur(pocket.currencies[0]);
  }, [pocket.id, pocket.currencies.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const empty = !loading && expenses.length === 0;

  return (
    <div className="screen">
      <div className="scroll home-scroll">
        <PocketDeck onOpenMenu={() => setSwitcher(true)} onMore={() => setSwitcher(true)} />
        <div className="action-pills">
          <button className="action-pill primary press" onClick={() => openExpenseSheet({ mode: 'new' })}>
            <Icon name="plus" weight="bold" size={16} />
            Add expense
          </button>
          <button className="action-pill press" onClick={() => navigate('/settings', { state: { sheet: 'export' } })}>
            <Icon name="download-simple" size={17} />
            Export
          </button>
          <button className="action-pill press" onClick={() => navigate('/settings/tags')}>
            <Icon name="tag" size={17} />
            Tags
          </button>
        </div>
        <MonthHeader month={month} onChange={setMonth} />
        <CurrencyCards pocket={pocket} month={month} expenses={expenses} prevExpenses={prevExpenses} empty={empty} selected={cur} onSelect={setCur} />
        {loading ? (
          <>
            <div className="skel skel-card" />
            <ListSkeleton />
          </>
        ) : (
          <>
            <WeeklySpend expenses={expenses} code={cur} month={month} empty={empty} />
            {!empty && <WhereItWent expenses={expenses} code={cur} onSeeAll={() => navigate('/transactions', { state: { currency: cur } })} />}
            {!empty && pocket.type === 'shared' && <ByPerson expenses={expenses} pocket={pocket} />}
            <Insight pocketId={pocket.id} month={month} expenses={expenses} code={cur} empty={empty} />
            {!empty && (
              <div className="recent">
                <div className="recent-head">
                  <span className="recent-title">Recent</span>
                  <button className="link see-all press" onClick={() => navigate('/transactions')}>
                    See all
                  </button>
                </div>
                <div className="list-card">
                  {expenses.slice(0, 5).map((e, i) => (
                    <SwipeRow key={e.id} expense={e} categories={categories} first={i === 0} {...swipe(e)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Fades />
      <div className="top-bar" style={{ zIndex: switcher ? 35 : 15 }}>
        <button className="circle-52 glass press" aria-label="Search expenses" onClick={() => navigate('/transactions', { state: { search: true } })}>
          <Icon name="magnifying-glass" size={22} />
        </button>
        {pocket.type === 'shared' ? (
          <button className="top-people press" aria-label="People in this Pocket" onClick={() => navigate('/settings/people')}>
            <AvatarStack initials={memberInitials(pocket)} size={36} ring="var(--page)" />
          </button>
        ) : (
          <div className="spacer-52" />
        )}
      </div>
      {switcher && (
        <PocketSwitcher
          onClose={() => setSwitcher(false)}
          onNew={() => {
            setSwitcher(false);
            setNewPocket(true);
          }}
          onJoin={() => {
            setSwitcher(false);
            navigate('/join');
          }}
        />
      )}
      {newPocket && <NewPocketSheet onClose={() => setNewPocket(false)} />}
    </div>
  );
}
