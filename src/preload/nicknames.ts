import {ipcRenderer} from 'electron';
import {applyNicknames, personAt} from './applyNicknames';

// Local-only display names: right-click a person's name or picture and choose the menu item (or Alt+click). Stored in the app config,
// never sent to Google.
const DIALOG_ID = 'gce-nickname-dialog';

let nicknames: Record<string, string> = {};

const apply = () => applyNicknames(document, nicknames);

const closeDialog = () => document.getElementById(DIALOG_ID)?.remove();

const style = (el: HTMLElement, props: Record<string, string>) => {
  for (const [k, v] of Object.entries(props)) {
    el.style.setProperty(k, v);
  }
};

const save = (memberId: string, nickname: string) => {
  if (nickname) {
    nicknames[memberId] = nickname;
  } else {
    delete nicknames[memberId];
  }
  ipcRenderer.invoke('nicknames:set', memberId, nickname);
  apply();
};

const openDialog = (memberId: string, original: string) => {
  closeDialog();
  const overlay = document.createElement('div');
  overlay.id = DIALOG_ID;
  style(overlay, {
    position: 'fixed', inset: '0', 'z-index': '2147483647', display: 'flex',
    'align-items': 'center', 'justify-content': 'center', background: 'rgba(0,0,0,.4)',
    'font-family': 'Roboto, Arial, sans-serif',
  });

  const box = document.createElement('div');
  style(box, {
    background: '#35373b', color: '#f1f3f4', 'border-radius': '10px', padding: '16px',
    width: '320px', 'box-shadow': '0 8px 24px rgba(0,0,0,.55)', display: 'flex',
    'flex-direction': 'column', gap: '10px', 'font-size': '14px',
  });

  const label = document.createElement('div');
  label.textContent = `별명 지정: ${original || '이 사람'}`;

  const input = document.createElement('input');
  input.value = nicknames[memberId] ?? '';
  input.placeholder = '비우고 저장하면 원래 이름으로 돌아갑니다';
  style(input, {
    padding: '8px', 'border-radius': '6px', border: '1px solid rgba(255,255,255,.2)',
    background: '#202124', color: '#f1f3f4', 'font-size': '14px',
  });

  const commit = () => {
    save(memberId, input.value.trim());
    closeDialog();
  };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      closeDialog();
    }
  });
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  });

  box.append(label, input);
  overlay.append(box);
  document.body.appendChild(overlay);
  input.focus();
};

window.addEventListener('click', (e) => {
  const person = e.altKey && personAt(e.target as HTMLElement);
  if (!person) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  openDialog(person.id, person.name);
}, true);

// Chat has no hook for its own context menus, so draw a minimal one in the page.
const MENU_ID = 'gce-nickname-menu';

const closeMenu = () => document.getElementById(MENU_ID)?.remove();

const openMenu = (x: number, y: number, person: {id: string, name: string}) => {
  closeMenu();
  const menu = document.createElement('div');
  menu.id = MENU_ID;
  style(menu, {
    position: 'fixed', left: `${x}px`, top: `${y}px`, 'z-index': '2147483647', padding: '4px 0',
    background: '#35373b', color: '#f1f3f4', 'border-radius': '8px', 'min-width': '140px',
    'box-shadow': '0 8px 24px rgba(0,0,0,.55)', 'font-family': 'Roboto, Arial, sans-serif', 'font-size': '14px',
  });
  const item = document.createElement('div');
  item.textContent = '별명 설정하기';
  style(item, {padding: '8px 16px', cursor: 'pointer'});
  item.addEventListener('mouseenter', () => style(item, {background: 'rgba(255,255,255,.12)'}));
  item.addEventListener('mouseleave', () => style(item, {background: 'transparent'}));
  item.addEventListener('click', () => {
    closeMenu();
    openDialog(person.id, person.name);
  });
  menu.append(item);
  document.body.appendChild(menu);
};

window.addEventListener('contextmenu', (e) => {
  const person = personAt(e.target as HTMLElement);
  if (!person) {
    closeMenu();
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  openMenu(e.clientX, e.clientY, person);
}, true);

window.addEventListener('mousedown', (e) => {
  if (!(e.target as HTMLElement).closest(`#${MENU_ID}`)) {
    closeMenu();
  }
}, true);
window.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu(), true);
window.addEventListener('blur', closeMenu);

ipcRenderer.invoke('nicknames:get').then((stored: Record<string, string>) => {
  nicknames = stored;
  apply();
});

let scheduled = false;
new MutationObserver(() => {
  if (scheduled) {
    return;
  }
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    apply();
  });
}).observe(document, {childList: true, subtree: true});
