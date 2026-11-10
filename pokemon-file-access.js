(() => {
  const DB_NAME = "flashcard-local-games";
  const STORE_NAME = "files";
  const KEY = "pokemon-fire-red";
  const openDatabase = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transaction = async (mode, action) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = action(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  };
  async function saveHandle(handle) {
    await transaction("readwrite", store => store.put(handle, KEY));
  }
  async function getHandle() {
    return transaction("readonly", store => store.get(KEY));
  }
  async function chooseFile() {
    if (!window.showOpenFilePicker) {
      throw new Error("This browser cannot save local file access. Use the latest Chrome or Edge.");
    }
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: "Game Boy Advance game file", accept: { "application/octet-stream": [".gba", ".zip"] } }]
    });
    if (!/\.(gba|zip)$/i.test(handle.name)) {
      throw new Error("Please choose a .gba or .zip game file.");
    }
    await saveHandle(handle);
    return handle;
  }
  async function getUsableFile() {
    let handle = await getHandle();
    if (!handle) return chooseFile();
    let permission = await handle.queryPermission({ mode: "read" });
    if (permission !== "granted") permission = await handle.requestPermission({ mode: "read" });
    if (permission !== "granted") throw new Error("Unauthorised to use this game.");
    return handle;
  }
  window.PokemonLocalFile = { chooseFile, getHandle, getUsableFile };
})();