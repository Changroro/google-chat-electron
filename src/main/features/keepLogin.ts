import {Cookie, session} from 'electron';
import {debounce} from 'throttle-debounce';
import log from 'electron-log';

// Chromium caps cookie lifetime at 400 days.
const LIFETIME_SECONDS = 400 * 24 * 60 * 60;

// Session cookies (no expiry) are dropped when the app exits, which signs the user out.
const persist = async (cookie: Cookie) => {
  const url = `https://${cookie.domain!.replace(/^\./, '')}${cookie.path}`;
  try {
    await session.defaultSession.cookies.set({
      url,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.hostOnly ? undefined : cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: Date.now() / 1000 + LIFETIME_SECONDS,
    });
    log.info(`[keepLogin] persisted session cookie ${cookie.name} (${cookie.domain})`);
  } catch (e) {
    log.error(`[keepLogin] failed to persist ${cookie.name} (${cookie.domain})`, e);
  }
};

export default () => {
  const {cookies} = session.defaultSession;

  // Every app.exit() skips before-quit, so flush shortly after each cookie write instead of at exit.
  const flush = debounce(2000, () => cookies.flushStore());

  cookies.on('changed', (_event, cookie, _cause, removed) => {
    if (removed) {
      return;
    }
    if (cookie.session) {
      persist(cookie);
      return;
    }
    flush();
  });
};
