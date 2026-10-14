import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { ADDED_IN, RENAMED_IN_V3, CATEGORY_PALETTE, DEFAULT_CATEGORIES, DEFAULTS_VERSION, ORDER_STEP, OTHER_ID } from '../lib/categories';
import { recategorise } from './expenses';
import { commit } from './pockets';
import { categoriesCol, categoryRef, pocketRef } from './refs';
import type { Category } from './types';

/** New categories go just above Other and take the next palette colour in turn. */
export async function addCategory(pid: string, existing: Category[], name: string, icon: string): Promise<string> {
  const sorted = [...existing].sort((a, b) => a.order - b.order);
  const other = sorted.find((c) => c.id === OTHER_ID);
  const nonOther = sorted.filter((c) => c.id !== OTHER_ID);
  const prev = nonOther[nonOther.length - 1]?.order ?? 0;
  const next = other ? other.order : prev + 2 * ORDER_STEP;
  let order = (prev + next) / 2;
  const batch = writeBatch(db);
  if (other && next - prev < 2) {
    // Ran out of room between the last category and Other: push Other down.
    order = prev + ORDER_STEP;
    batch.update(categoryRef(pid, OTHER_ID), { order: prev + 2 * ORDER_STEP });
  }
  const custom = existing.filter((c) => !c.system).length;
  const ref = doc(categoriesCol(pid));
  batch.set(ref, {
    name: name.trim().slice(0, 40),
    icon,
    colour: CATEGORY_PALETTE[custom % CATEGORY_PALETTE.length],
    order,
    system: false,
  });
  await commit(batch);
  return ref.id;
}

/** Moves the category's expenses to Other, then deletes it. */
export async function deleteCategory(pid: string, cid: string, hasExpenses: boolean): Promise<void> {
  if (cid === OTHER_ID) throw new Error("Other can't be deleted");
  if (hasExpenses) await recategorise(pid, cid, OTHER_ID);
  const batch = writeBatch(db);
  batch.delete(categoryRef(pid, cid));
  await commit(batch);
}

export async function reorderCategories(pid: string, orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, i) => batch.update(categoryRef(pid, id), { order: (i + 1) * ORDER_STEP }));
  await commit(batch);
}

/**
 * Brings a Pocket's categories up to the current default set, once per Pocket. Versions 2 and 4
 * add categories just above Other, skipping any the Pocket already has by id or name. Version 3
 * renames defaults, but only ones still called by their old name. The Pocket is then marked, so a
 * category someone deletes or renames later is left alone.
 */
export async function upgradeDefaults(pid: string, existing: Category[], fromVersion: number): Promise<number> {
  const names = new Set(existing.map((c) => c.name.trim().toLowerCase()));
  const ids = new Set(existing.map((c) => c.id));
  const newIds = Object.entries(ADDED_IN)
    .filter(([v]) => fromVersion < Number(v))
    .flatMap(([, list]) => list);
  const toAdd = DEFAULT_CATEGORIES.filter((c) => newIds.includes(c.id) && !ids.has(c.id) && !names.has(c.name.toLowerCase()));
  const sorted = [...existing].sort((a, b) => a.order - b.order);
  const other = sorted.find((c) => c.id === OTHER_ID);
  const last = sorted.filter((c) => c.id !== OTHER_ID).pop()?.order ?? 0;
  const batch = writeBatch(db);
  toAdd.forEach((c, i) => {
    batch.set(categoryRef(pid, c.id), { name: c.name, icon: c.icon, colour: c.colour, order: last + (i + 1) * ORDER_STEP, system: false });
  });
  if (toAdd.length && other && other.order <= last + toAdd.length * ORDER_STEP) {
    batch.update(categoryRef(pid, OTHER_ID), { order: last + (toAdd.length + 1) * ORDER_STEP });
  }
  if (fromVersion < 3) {
    for (const [id, [from, to]] of Object.entries(RENAMED_IN_V3)) {
      const c = existing.find((x) => x.id === id);
      if (c && c.name === from && !names.has(to.toLowerCase())) batch.update(categoryRef(pid, id), { name: to });
    }
  }
  batch.update(pocketRef(pid), { defaultsVersion: DEFAULTS_VERSION });
  await commit(batch);
  return toAdd.length;
}
