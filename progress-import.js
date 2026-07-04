(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.S1GNS_PROGRESS = api;
})(globalThis, function () {
  function mergeProgressState(current, imported, validIds) {
    const next = {
      favorites: new Set(current.favorites || []),
      completed: new Set(current.completed || []),
      notes: { ...(current.notes || {}) },
      recent: Array.isArray(current.recent) ? [...current.recent] : []
    };
    const summary = {
      favoritesAdded: 0,
      completedAdded: 0,
      notesImported: 0,
      recentsImported: 0,
      ignoredCount: 0
    };

    readIdList(imported?.favorites).forEach((id) => {
      if (!isValidId(id, validIds)) {
        summary.ignoredCount += 1;
        return;
      }
      if (!next.favorites.has(id)) summary.favoritesAdded += 1;
      next.favorites.add(id);
    });

    readIdList(imported?.completed).forEach((id) => {
      if (!isValidId(id, validIds)) {
        summary.ignoredCount += 1;
        return;
      }
      if (!next.completed.has(id)) summary.completedAdded += 1;
      next.completed.add(id);
    });

    readNotes(imported?.notes).forEach(({ id, note }) => {
      if (!isValidId(id, validIds)) {
        summary.ignoredCount += 1;
        return;
      }
      if (!note) return;
      next.notes[id] = note;
      summary.notesImported += 1;
    });

    const importedRecent = readRecent(imported?.recent).filter((entry) => {
      if (!isValidId(entry.id, validIds)) {
        summary.ignoredCount += 1;
        return false;
      }
      summary.recentsImported += 1;
      return true;
    });

    next.recent = mergeRecent(next.recent, importedRecent, validIds);
    return { state: next, summary };
  }

  function readIdList(value) {
    if (!Array.isArray(value)) return [];
    return value.map(readResourceId).filter(Boolean);
  }

  function readNotes(value) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => ({
      id: readResourceId(entry),
      note: cleanString(entry?.note)
    })).filter((entry) => entry.id);
  }

  function readRecent(value) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => ({
      id: readResourceId(entry),
      openedAt: cleanString(entry?.openedAt) || new Date().toISOString()
    })).filter((entry) => entry.id);
  }

  function readResourceId(value) {
    if (typeof value === "string") return cleanString(value);
    return cleanString(value?.id || value?.resource?.id);
  }

  function mergeRecent(currentRecent, importedRecent, validIds) {
    const byId = new Map();
    [...currentRecent, ...importedRecent].forEach((entry) => {
      const id = readResourceId(entry);
      if (!isValidId(id, validIds)) return;
      const openedAt = cleanString(entry.openedAt) || new Date().toISOString();
      const existing = byId.get(id);
      if (!existing || Date.parse(openedAt) > Date.parse(existing.openedAt)) {
        byId.set(id, { id, openedAt });
      }
    });
    return [...byId.values()]
      .sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt))
      .slice(0, 20);
  }

  function isValidId(id, validIds) {
    return Boolean(id) && (!validIds || validIds.has(id));
  }

  function cleanString(value) {
    return String(value ?? "").trim();
  }

  return { mergeProgressState };
});
