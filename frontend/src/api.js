const API_ROOT = "/api";

function getLocalStorageEntry(key) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : [];
  } catch {
    return [];
  }
}

function writeLocalStorageEntry(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function fallbackRequest(path, options = {}) {
  const storageKey = path === "/rsvp" ? "birthday-rsvp" : "birthday-wishes";
  const existingItems = getLocalStorageEntry(storageKey);

  if (!options.method || options.method === "GET") {
    return Promise.resolve(existingItems);
  }

  if (options.method === "POST") {
    const payload = JSON.parse(options.body || "{}");
    const item = {
      ...payload,
      _id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    };

    const nextItems = [item, ...existingItems];
    writeLocalStorageEntry(storageKey, nextItems);
    return Promise.resolve(item);
  }

  return Promise.reject(new Error("This request is not supported in local fallback mode."));
}

export async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || `Request failed (${response.status})`);
    }

    return payload;
  } catch (error) {
    if ((path === "/rsvp" || path === "/wishes") && typeof window !== "undefined") {
      return fallbackRequest(path, options);
    }
    throw error;
  }
}
