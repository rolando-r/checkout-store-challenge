/**
 * redux-persist expects a storage engine with this shape (getItem/setItem/
 * removeItem returning promises). redux-persist/lib/storage should provide
 * exactly this, wrapping window.localStorage — but its CJS export doesn't
 * resolve correctly under some bundler/resolution combinations (Vite import
 * conditions picking a different build). Implementing the same tiny
 * interface directly against window.localStorage avoids the interop issue.
 */
const webStorage = {
  getItem(key: string): Promise<string | null> {
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem(key: string, value: string): Promise<void> {
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem(key: string): Promise<void> {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export default webStorage;