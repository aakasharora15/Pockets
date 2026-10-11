import { useEffect } from 'react';
import type { Photo } from '../data/receipts';
import { Icon } from '../lib/icons';
import { useObjectUrl } from '../lib/useObjectUrl';

/** Full-screen receipt photo, from the expense sheet's Receipt row. */
export function ReceiptViewer({ photo, onClose, onRemove, onFill }: { photo: Photo | null; onClose: () => void; onRemove: () => void; onFill: () => void }) {
  const url = useObjectUrl(photo?.blob);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Receipt photo">
      <button className="circle-44 glass press viewer-close" aria-label="Close" onClick={onClose}>
        <Icon name="x" weight="bold" />
      </button>
      <div className="viewer-photo">{url ? <img src={url} alt="Receipt" /> : <span className="viewer-wait">The photo is still on its way from another phone.</span>}</div>
      <div className="viewer-actions">
        {photo && (
          <button className="primary-btn press" onClick={onFill}>
            Fill in from receipt
          </button>
        )}
        <button className="delete-link press" onClick={onRemove}>
          Remove photo
        </button>
      </div>
    </div>
  );
}
