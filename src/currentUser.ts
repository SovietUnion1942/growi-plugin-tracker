// Third-party script plugins get no user context from growiFacade (verified:
// GrowiFacade only carries markdownRenderer/react) — this is the one existing
// public API that reports the logged-in user, so we ask it directly.
let cachedUsername: string | null | undefined;

export const getCurrentUsername = async (): Promise<string | null> => {
  if (cachedUsername !== undefined) return cachedUsername;

  let username: string | null = null;
  try {
    const res = await fetch('/_api/v3/personal-setting/', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      username = data?.currentUser?.username ?? null;
    }
  } catch {
    username = null;
  }

  cachedUsername = username;
  return cachedUsername;
};
