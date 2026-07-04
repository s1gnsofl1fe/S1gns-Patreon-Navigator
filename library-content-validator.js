(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.S1GNS_LIBRARY_VALIDATOR = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function validateLibraryContent(raw, options = {}) {
    const sourceName = options.sourceName || "Library content";
    const errors = [];
    const warnings = [];
    const summary = {
      resources: Array.isArray(raw?.resources) ? raw.resources.length : 0,
      pathways: Array.isArray(raw?.pathways) ? raw.pathways.length : 0,
      sections: Array.isArray(raw?.sections) ? raw.sections.length : 0
    };

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push(`${sourceName} must be a JSON object.`);
      return { ok: false, errors, warnings, summary };
    }

    if (!Array.isArray(raw.resources)) {
      errors.push(`${sourceName} must include a resources array.`);
      return { ok: false, errors, warnings, summary };
    }

    if (!raw.resources.length) {
      errors.push(`${sourceName} must include at least one resource.`);
    }

    const ids = new Set();
    const urls = new Set();
    const sectionNames = new Set(Array.isArray(raw.sections) ? raw.sections.map(cleanString).filter(Boolean) : []);

    raw.resources.forEach((resource, index) => {
      const label = `Resource ${index + 1}`;
      if (!resource || typeof resource !== "object" || Array.isArray(resource)) {
        errors.push(`${label} must be an object.`);
        return;
      }

      const id = cleanString(resource.id);
      const title = cleanString(resource.title);
      const section = cleanString(resource.section);
      const contentType = cleanString(resource.contentType || resource.type);
      const url = cleanString(resource.url);

      if (!id) errors.push(`${label} is missing id.`);
      else if (ids.has(id)) errors.push(`Duplicate resource id: "${id}".`);
      else ids.add(id);

      if (!title) errors.push(`${label} is missing title.`);
      if (!section) errors.push(`${label} is missing section.`);
      else if (sectionNames.size && !sectionNames.has(section)) {
        warnings.push(`${label} uses section "${section}" that is not listed in sections.`);
      }
      if (!contentType) errors.push(`${label} is missing contentType.`);

      if (!url) {
        errors.push(`${label} is missing url.`);
      } else if (!isHttpUrl(url)) {
        errors.push(`${label} has an invalid url: "${url}".`);
      } else {
        const normalizedUrl = normalizeUrl(url);
        if (urls.has(normalizedUrl)) errors.push(`Duplicate resource url: "${url}".`);
        else urls.add(normalizedUrl);
      }
    });

    validatePathways(raw.pathways, ids, errors);

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      summary
    };
  }

  function validatePathways(pathways, resourceIds, errors) {
    if (pathways === undefined) return;
    if (!Array.isArray(pathways)) {
      errors.push("pathways must be an array when provided.");
      return;
    }

    pathways.forEach((pathway, index) => {
      if (!pathway || typeof pathway !== "object" || Array.isArray(pathway)) {
        errors.push(`Pathway ${index + 1} must be an object.`);
        return;
      }
      const title = cleanString(pathway.title) || `Pathway ${index + 1}`;
      if (!Array.isArray(pathway.resourceIds)) return;
      pathway.resourceIds.forEach((id) => {
        const cleanId = cleanString(id);
        if (cleanId && !resourceIds.has(cleanId)) {
          errors.push(`Pathway "${title}" references missing resource id "${cleanId}".`);
        }
      });
    });
  }

  function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function normalizeUrl(value) {
    try {
      const url = new URL(value);
      url.hash = "";
      url.searchParams.sort();
      return url.toString().replace(/\/$/, "");
    } catch {
      return value.trim().toLowerCase();
    }
  }

  return { validateLibraryContent };
});
