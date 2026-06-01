const KEY = "castle.token";

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // ignore
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
