import { useNavigate } from 'react-router-dom';
import { useShopping } from '../../data/shopping';
import type { PocketWithMembers } from '../../data/types';
import { Icon } from '../../lib/icons';

/** Home's way into the shopping list: how many things are left to buy, and the first few. */
export function ShoppingCard({ pocket }: { pocket: PocketWithMembers }) {
  const navigate = useNavigate();
  const { items, loading } = useShopping(pocket.id);
  const left = items.filter((i) => !i.done);
  // This week's things first.
  const first = [...left.filter((i) => i.when === 'week'), ...left.filter((i) => i.when === 'month')].map((i) => i.name);
  const sub = loading ? ' ' : left.length ? first.join(', ') : pocket.type === 'shared' ? 'A shared list for this Pocket' : 'Jot down what you need this week';
  return (
    <button className="card shop-card press" onClick={() => navigate('/list')}>
      <span className="shop-card-icon">
        <Icon name="basket" size={20} />
      </span>
      <span className="shop-card-text">
        <span className="shop-card-title">To buy</span>
        <span className="shop-card-sub">{sub}</span>
      </span>
      {left.length > 0 && <span className="shop-card-count num">{left.length}</span>}
      <Icon name="caret-right" size={16} />
    </button>
  );
}
