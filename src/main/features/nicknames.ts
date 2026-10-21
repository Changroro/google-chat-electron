import {ipcMain} from 'electron';
import store from '../config.js';

export default () => {
  ipcMain.handle('nicknames:get', () => store.get('app.nicknames') ?? {});

  ipcMain.handle('nicknames:set', (_event, memberId: string, nickname: string) => {
    const next: Record<string, string> = {...(store.get('app.nicknames') as Record<string, string>)};
    if (nickname) {
      next[memberId] = nickname;
    } else {
      delete next[memberId];
    }
    store.set('app.nicknames', next);
  });
}
