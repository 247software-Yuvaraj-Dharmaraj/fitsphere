// Small wrapper around localStorage for auth tokens.
// (localStorage is fine for a portfolio app; httpOnly cookies would be the
// hardened production choice.)
const ACCESS_KEY = 'fs_access';
const REFRESH_KEY = 'fs_refresh';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
