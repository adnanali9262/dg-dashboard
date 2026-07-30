const storage = (() => {
  if (typeof window !== "undefined" && window.storage) return window.storage;

  const base = "/.netlify/functions/storage";
  const hasLocalStorage = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  function localGet(key) {
    if (!hasLocalStorage) return null;
    const value = window.localStorage.getItem(key);
    return value === null ? null : { value };
  }

  function localSet(key, value) {
    if (!hasLocalStorage) return { ok: false };
    window.localStorage.setItem(key, value);
    return { ok: true };
  }

  function localDelete(key) {
    if (!hasLocalStorage) return { ok: false };
    window.localStorage.removeItem(key);
    return { ok: true };
  }

  return {
    async get(key) {
      try {
        const r = await fetch(`${base}?key=${encodeURIComponent(key)}`);
        if (r.status === 404) return localGet(key);
        if (!r.ok) throw new Error("storage read failed");
        return r.json();
      } catch {
        return localGet(key);
      }
    },

    async set(key, value) {
      try {
        const r = await fetch(base, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ key, value })
        });

        if (!r.ok) throw new Error("storage write failed");
        return r.json();
      } catch {
        return localSet(key, value);
      }
    },

    async delete(key) {
      try {
        const r = await fetch(
          `${base}?key=${encodeURIComponent(key)}`,
          {
            method: "DELETE"
          }
        );

        if (!r.ok) throw new Error("storage delete failed");
        return r.json();
      } catch {
        return localDelete(key);
      }
    }
  };
})();


const INDEX_KEY = "dg-reports:index";
const reportKey = (monthKey) => `dg-report:${monthKey}`;
const REPAIRS_KEY = "dg-repairs:list";


async function loadIndex() {
  try {
    const res = await storage.get(INDEX_KEY);
    return res && res.value ? JSON.parse(res.value) : [];
  } catch {
    return [];
  }
}


async function saveReport(parsed) {

  const entry = {
    monthKey: parsed.monthKey,
    monthLabel: parsed.monthLabel,
    savedAt: new Date().toISOString()
  };

  await storage.set(
    reportKey(parsed.monthKey),
    JSON.stringify(parsed)
  );

  const index = await loadIndex();

  const next = [
    entry,
    ...index.filter(
      e => e.monthKey !== parsed.monthKey
    )
  ].sort(
    (a,b)=>a.monthKey < b.monthKey ? 1 : -1
  );

  await storage.set(
    INDEX_KEY,
    JSON.stringify(next)
  );

  return next;
}


async function deleteReport(monthKey) {

  await storage.delete(
    reportKey(monthKey)
  ).catch(()=>{});

  const index = await loadIndex();

  const next = index.filter(
    e => e.monthKey !== monthKey
  );

  await storage.set(
    INDEX_KEY,
    JSON.stringify(next)
  );

  return next;
}


async function loadRepairs() {

  try {

    const res = await storage.get(REPAIRS_KEY);

    return res && res.value
      ? JSON.parse(res.value)
      : [];

  } catch {

    return [];

  }
}


async function saveRepairs(list) {

  await storage.set(
    REPAIRS_KEY,
    JSON.stringify(list)
  );

}


export {
  storage,
  loadIndex,
  saveReport,
  deleteReport,
  loadRepairs,
  saveRepairs,
  reportKey
};