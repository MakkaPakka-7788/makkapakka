(() => {
  const DB_NAME = "flashcard-local-games";
  const STORE_NAME = "files";
  const KEY = "pokemon-fire-red-source-html";
  const openDatabase = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const run = async (mode, action) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const req = action(tx.objectStore(STORE_NAME));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  };
  async function getHandle() {
    return run("readonly", store => store.get(KEY));
  }
  async function chooseSource() {
    if (!window.showOpenFilePicker) throw new Error("Use the latest Chrome or Edge to choose and remember a local HTML file.");
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: "HTML source file", accept: { "text/html": [".html", ".htm"] } }]
    });
    if (!/\.html?$/i.test(handle.name)) throw new Error("Choose an .html or .htm source file.");
    await run("readwrite", store => store.put(handle, KEY));
    return handle;
  }
  async function getAuthorizedHandle() {
    let handle = await getHandle();
    if (!handle) return null;
    let permission = await handle.queryPermission({ mode: "read" });
    if (permission !== "granted") permission = await handle.requestPermission({ mode: "read" });
    return permission === "granted" ? handle : null;
  }
  window.PokemonSourceAuthorization = { getHandle, chooseSource, getAuthorizedHandle };
})();