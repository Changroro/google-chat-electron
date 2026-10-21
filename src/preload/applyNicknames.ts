// Chat shows a person in many shapes: avatars and name labels carry a stable data-member-id,
// sender prefixes ("name:") only an email in data-hovercard-id, and conversation titles nothing.
// A leaf is rewritten when its text (minus "@" prefix and ":" suffix) is that person's real name.
const DECORATION = /^(@?)([\s\S]*?)(:?)$/;

type People = {nameById: Map<string, string>, idByName: Map<string, string | null>, idByEmail: Map<string, string>};

const collectPeople = (root: ParentNode): People => {
  const people: People = {nameById: new Map(), idByName: new Map(), idByEmail: new Map()};
  root.querySelectorAll<HTMLElement>('[data-member-id]').forEach((el) => {
    const id = el.dataset.memberId!;
    const name = el.dataset.name;
    if (name) {
      people.nameById.set(id, name);
      // null marks two people sharing a name, which cannot be told apart by text alone.
      const known = people.idByName.get(name);
      people.idByName.set(name, known === undefined || known === id ? id : null);
    }
    if (el.dataset.hovercardId) {
      people.idByEmail.set(el.dataset.hovercardId, id);
    }
  });
  return people;
};

const coreOf = (leaf: HTMLElement): string => DECORATION.exec(leaf.textContent!.trim())![2];

const nameLeaves = (el: HTMLElement): HTMLElement[] =>
  Array.from(el.querySelectorAll<HTMLElement>('*')).filter((child) => child.children.length === 0 && coreOf(child) !== '');

const resolveId = (leaf: HTMLElement, core: string, people: People): string | undefined => {
  const owner = leaf.closest<HTMLElement>('[data-member-id]');
  if (owner) {
    const id = owner.dataset.memberId!;
    const known = people.nameById.get(id);
    // Without a known name (bots), trust the owner only when it holds a single text leaf.
    if (known ? known === core : !owner.querySelector('img') && nameLeaves(owner).length === 1) {
      return id;
    }
  }
  const emailOwner = leaf.closest<HTMLElement>('[data-hovercard-id]');
  const emailId = emailOwner && people.idByEmail.get(emailOwner.dataset.hovercardId!);
  if (emailId && people.nameById.get(emailId) === core) {
    return emailId;
  }
  return people.idByName.get(core) ?? undefined;
};

export const applyNicknames = (root: ParentNode, nicknames: Record<string, string>): void => {
  const people = collectPeople(root);
  root.querySelectorAll<HTMLElement>('*').forEach((leaf) => {
    const text = leaf.textContent!.trim();
    if (leaf.children.length > 0 || text === '') {
      return;
    }
    const [, prefix, core, suffix] = DECORATION.exec(text)!;
    // Text we wrote ourselves keeps its remembered person; anything else is re-identified from scratch.
    const ours = leaf.dataset.gceShown === text && leaf.dataset.gceId !== undefined;
    const id = ours ? leaf.dataset.gceId : resolveId(leaf, core, people);
    if (!id) {
      delete leaf.dataset.gceId;
      delete leaf.dataset.gceOrig;
      delete leaf.dataset.gceShown;
      return;
    }
    const original = ours ? leaf.dataset.gceOrig! : core;
    const wanted = prefix + (nicknames[id] ?? original) + suffix;
    leaf.dataset.gceId = id;
    leaf.dataset.gceOrig = original;
    leaf.dataset.gceShown = wanted;
    if (wanted !== text) {
      leaf.textContent = wanted;
    }
  });
};

// The person under a right-click: a recognized name label, or an avatar.
export const personAt = (target: HTMLElement): {id: string, name: string} | null => {
  const label = target.closest<HTMLElement>('[data-gce-id]');
  if (label) {
    return {id: label.dataset.gceId!, name: label.dataset.gceOrig!};
  }
  const avatar = target.closest<HTMLElement>('[data-member-id]');
  return avatar ? {id: avatar.dataset.memberId!, name: avatar.dataset.name ?? ''} : null;
};
