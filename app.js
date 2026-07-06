(function () {
  const storageKey = "s1gnsPatreonNavigator:v1";
  const githubLibraryCacheKey = "s1gnsNavigatorGitHubLibraryCache";
  const githubLibraryUrl = "https://raw.githubusercontent.com/s1gnsofl1fe/S1gns-Patreon-Guide/main/library-content.json";
  const builtInData = normalizeBuiltInLibrary(window.S1GNS_DATA);
  const loadedGitHubCache = loadGitHubCachedLibrary();
  const seededLocalCache = loadSeededLocalCacheLibrary();
  let data = loadedGitHubCache?.library || seededLocalCache?.library || builtInData;
  let activeLibrarySource = loadedGitHubCache
    ? "Saved Browser Guide"
    : seededLocalCache
      ? "Packaged Offline Guide"
      : "Built-in Library";
  const els = {
    search: document.getElementById("searchInput"),
    section: document.getElementById("sectionFilter"),
    type: document.getElementById("typeFilter"),
    pathway: document.getElementById("pathwayFilter"),
    level: document.getElementById("levelFilter"),
    tool: document.getElementById("toolFilter"),
    tag: document.getElementById("tagFilter"),
    clear: document.getElementById("clearFilters"),
    helperButtons: document.getElementById("helperButtons"),
    recommendation: document.getElementById("recommendation"),
    pathwayCards: document.getElementById("pathwayCards"),
    resourceList: document.getElementById("resourceList"),
    categoryTabs: document.getElementById("categoryTabs"),
    tabSummary: document.getElementById("tabSummary"),
    resourcePaging: document.getElementById("resourcePaging"),
    resultsCount: document.getElementById("resultsCount"),
    activeChips: document.getElementById("activeChips"),
    detail: document.getElementById("detailPanel"),
    resourceCount: document.getElementById("resourceCount"),
    favoriteCount: document.getElementById("favoriteCount"),
    completedCount: document.getElementById("completedCount"),
    pathwaysStartedCount: document.getElementById("pathwaysStartedCount"),
    recentCount: document.getElementById("recentCount"),
    recentList: document.getElementById("recentList"),
    progressImportInput: document.getElementById("progressImportInput"),
    importProgress: document.getElementById("importProgress"),
    exportProgress: document.getElementById("exportProgress"),
    exportFavorites: document.getElementById("exportFavorites"),
    exportCompleted: document.getElementById("exportCompleted"),
    clearTracking: document.getElementById("clearTracking"),
    exportStatus: document.getElementById("exportStatus"),
    librarySourceLabel: document.getElementById("librarySourceLabel"),
    libraryMetaLabel: document.getElementById("libraryMetaLabel"),
    contentVersion: document.getElementById("contentVersion"),
    contentUpdated: document.getElementById("contentUpdated"),
    contentResourceCount: document.getElementById("contentResourceCount"),
    contentSource: document.getElementById("contentSource"),
    githubCacheStatus: document.getElementById("githubCacheStatus"),
    importStatus: document.getElementById("importStatus")
  };

  let byId = new Map(data.resources.map((resource) => [resource.id, resource]));
  const pageSize = 24;
  const recentlyAddedTab = "Recently Added";
  let openPathway = data.pathways[0]?.id || "";
  let selectedId = data.pathways[0]?.resourceIds[0] || data.resources[0]?.id || "";
  let state = loadState();
  let activeRecommendation = null;
  let activeTab = "All";
  let visibleLimit = pageSize;
  let recentlyAddedIds = buildRecentlyAddedIds(data);

  const helperOptions = [
    { label: "Show me what's new", title: "Recently added", tab: recentlyAddedTab, reason: "Starts with the posts added in the July 2026 refresh, including the newest walkthroughs, livestreams, presets, and blog posts.", recent: true },
    { label: "I’m new here", pathwayTitle: "Beginner Pathway", tab: "Pathways", reason: "A clear first pass through foundational ambient production, beginner concepts, and core S1gns teaching material." },
    { label: "I want to improve sound design", pathwayTitle: "Sound Design Pathway", tab: "Pathways", reason: "Best for patch building, synthesis, textures, wavetables, pads, plucks, and motion." },
    { label: "I want better mixes", pathwayTitle: "Mixing Pathway", tab: "Pathways", reason: "Focuses the library around frequency, space, routing, mastering, and balanced ambient mixes." },
    { label: "I want to finish tracks", title: "Track walkthroughs and arrangement", tab: "Full Track Walkthroughs", reason: "Prioritizes full walkthroughs, construction kits, arrangement, and composition resources.", filters: { section: "Full Track Walkthroughs", tag: "arrangement" } },
    { label: "I want sequenced space ambient", pathwayTitle: "Sequenced Space Ambient Pathway", tab: "Pathways", reason: "A direct route into cosmic sequences, generative motion, and Synphaera-style space ambient structure." },
    { label: "I want pure ambient", pathwayTitle: "Pure Ambient Pathway", tab: "Pathways", reason: "A slower, deeper pathway for meditative atmosphere, musical architecture, and spacious ambient pieces." },
    { label: "I want downloads or presets", title: "Downloads and preset packs", tab: "All", reason: "Surfaces presets, wavetables, sample packs, MIDI packs, construction kits, and other downloadable assets.", filters: { tag: "downloads" } },
    { label: "I want inspiration or mindset content", title: "Inspiration and mindset", tab: "All", reason: "Collects blogs, check-ins, and creative process material for motivation and perspective.", filters: { tag: "mindset" } }
  ];

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey)) || {};
      return {
        favorites: new Set(stored.favorites || []),
        completed: new Set(stored.completed || []),
        notes: stored.notes || {},
        recent: stored.recent || []
      };
    } catch {
      return { favorites: new Set(), completed: new Set(), notes: {}, recent: [] };
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify({
      favorites: [...state.favorites],
      completed: [...state.completed],
      notes: state.notes,
      recent: state.recent
    }));
    renderStats();
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function fillSelect(select, values, label) {
    select.innerHTML = `<option value="">All ${label}</option>`;
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  }

  function initFilters() {
    fillSelect(els.section, data.sections, "sections");
    fillSelect(els.type, uniqueSorted(data.resources.map((r) => r.contentType)), "types");
    fillSelect(els.pathway, data.pathways.map((p) => p.title), "pathways");
    fillSelect(els.level, uniqueSorted(data.resources.map((r) => r.skillLevel)), "levels");
    fillSelect(els.tool, uniqueSorted(data.resources.flatMap((r) => r.tools)), "tools");
    fillSelect(els.tag, uniqueSorted(data.resources.flatMap((r) => r.tags)), "tags");
  }

  function matchesSearch(resource, query) {
    if (!query) return true;
    const text = [
      resource.title,
      resource.category,
      resource.section,
      resource.contentType,
      resource.skillLevel,
      ...(resource.pathways || []),
      ...(resource.tags || []),
      ...(resource.tools || [])
    ].join(" ").toLowerCase();
    return text.includes(query.toLowerCase());
  }

  function currentFilters() {
    return {
      section: els.section.value,
      type: els.type.value,
      pathway: els.pathway.value,
      level: els.level.value,
      tool: els.tool.value,
      tag: els.tag.value,
      query: els.search.value.trim()
    };
  }

  function getFilteredResources() {
    const filters = currentFilters();
    return data.resources.filter((resource) => {
      return matchesSearch(resource, filters.query)
        && (!filters.section || resource.section === filters.section || (resource.alsoInSections || []).includes(filters.section))
        && (!filters.type || resource.contentType === filters.type)
        && (!filters.pathway || (resource.pathways || []).includes(filters.pathway))
        && (!filters.level || resource.skillLevel === filters.level)
        && (!filters.tool || (resource.tools || []).includes(filters.tool))
        && (!filters.tag || (resource.tags || []).includes(filters.tag));
    });
  }

  function renderStats() {
    const pathwaysStarted = data.pathways.filter((pathway) => pathway.resourceIds.some((id) => state.completed.has(id))).length;
    els.resourceCount.textContent = String(data.resources.length);
    els.favoriteCount.textContent = String(state.favorites.size);
    els.completedCount.textContent = String(state.completed.size);
    els.pathwaysStartedCount.textContent = String(pathwaysStarted);
    els.recentCount.textContent = String(state.recent.length);
    renderLibraryMeta();
  }

  function renderLibraryMeta() {
    const version = data.version || "Built-in";
    const updated = data.updatedAt || data.sourceUpdated || "Unknown";
    const sourceName = data.sourceName || data.source || activeLibrarySource;
    els.librarySourceLabel.textContent = activeLibrarySource;
    els.libraryMetaLabel.textContent = `${version} / ${updated}`;
    setText(els.contentVersion, version);
    setText(els.contentUpdated, updated);
    setText(els.contentResourceCount, String(data.resources.length));
    setText(els.contentSource, sourceName);
  }

  function renderHelper() {
    els.helperButtons.innerHTML = "";
    helperOptions.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.label;
      button.addEventListener("click", () => {
        clearFilters(false);
        if (option.pathwayTitle) {
          els.pathway.value = option.pathwayTitle;
          openPathway = data.pathways.find((p) => p.title === option.pathwayTitle)?.id || openPathway;
        }
        if (option.filters) {
          Object.entries(option.filters).forEach(([key, value]) => {
            if (els[key]) els[key].value = value;
          });
        }
        setActiveTab(option.tab || "All", false);
        activeRecommendation = buildRecommendation(option);
        render();
        document.getElementById("resultsTitle").scrollIntoView({ block: "start" });
      });
      els.helperButtons.append(button);
    });
  }

  function buildRecommendation(option) {
    const pathway = option.pathwayTitle ? data.pathways.find((p) => p.title === option.pathwayTitle) : null;
    const resources = pathway
      ? pathway.resourceIds.map((id) => byId.get(id)).filter(Boolean)
      : option.recent
        ? [...recentlyAddedIds].map((id) => byId.get(id)).filter(Boolean)
        : getFilteredResources();
    return {
      title: option.pathwayTitle || option.title,
      reason: option.reason,
      resources: resources.slice(0, 3)
    };
  }

  function buildRecentlyAddedIds(library) {
    const ids = Array.isArray(library.metadata?.recentlyAddedResourceIds)
      ? library.metadata.recentlyAddedResourceIds.map(cleanString).filter(Boolean)
      : [];
    const validIds = new Set((library.resources || []).map((resource) => resource.id));
    return new Set(ids.filter((id) => validIds.has(id)));
  }

  function renderRecommendation() {
    if (!activeRecommendation) {
      els.recommendation.innerHTML = `<p class="muted">Pick an intention to surface a pathway or section with a few suggested first stops.</p>`;
      return;
    }

    const suggestions = activeRecommendation.resources.length
      ? activeRecommendation.resources.map((resource) => `
        <li>
          <button type="button" class="link-button" data-recommendation-resource="${escapeHtml(resource.id)}">${escapeHtml(resource.title)}</button>
          <span>${escapeHtml(resource.contentType)}</span>
        </li>
      `).join("")
      : `<li><span>No matching resources found for the current recommendation.</span></li>`;

    els.recommendation.innerHTML = `
      <div class="recommendation-card__header">
        <span class="badge badge--accent">Recommended</span>
        <h3>${escapeHtml(activeRecommendation.title)}</h3>
      </div>
      <p>${escapeHtml(activeRecommendation.reason)}</p>
      <ol>${suggestions}</ol>
    `;

    els.recommendation.querySelectorAll("[data-recommendation-resource]").forEach((button) => {
      button.addEventListener("click", () => selectResource(button.dataset.recommendationResource));
    });
  }

  function renderPathways() {
    els.pathwayCards.innerHTML = "";
    data.pathways.forEach((pathway) => {
      const card = document.createElement("article");
      card.className = `pathway-card${openPathway === pathway.id ? " is-open" : ""}`;
      const completed = pathway.resourceIds.filter((id) => state.completed.has(id)).length;
      const progress = pathway.resourceIds.length ? Math.round((completed / pathway.resourceIds.length) * 100) : 0;
      card.innerHTML = `
        <div class="pathway-card__top">
          <div>
            <h3>${escapeHtml(pathway.title)}</h3>
            <p>${escapeHtml(pathway.description)}</p>
          </div>
          <span class="count-pill">${pathway.resourceIds.length} resources</span>
        </div>
        <p><strong>Recommended for:</strong> ${escapeHtml(pathway.recommendedFor)}</p>
        <div class="pathway-progress" aria-label="${completed} of ${pathway.resourceIds.length} completed">
          <div class="pathway-progress__meta">
            <span>${completed} completed</span>
            <span>${progress}%</span>
          </div>
          <div class="progress-track"><span style="width: ${progress}%"></span></div>
        </div>
        <div class="resource-card__actions">
          <button type="button" class="button" data-action="filter-pathway" data-pathway="${escapeHtml(pathway.title)}">View pathway</button>
          <button type="button" class="button button--secondary" data-action="toggle-pathway">${openPathway === pathway.id ? "Collapse" : "Open list"}</button>
        </div>
      `;

      if (openPathway === pathway.id) {
        const list = document.createElement("div");
        list.className = "pathway-list";
        pathway.resourceIds.forEach((id) => {
          const resource = byId.get(id);
          if (!resource) return;
          const row = document.createElement("div");
          row.className = "pathway-item";
          row.innerHTML = `
            <input type="checkbox" ${state.completed.has(id) ? "checked" : ""} aria-label="Mark ${escapeHtml(resource.title)} complete">
            <button type="button" class="link-button" data-resource="${escapeHtml(id)}">${escapeHtml(resource.title)}</button>
            <a href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer" data-open="${escapeHtml(id)}">Open</a>
          `;
          row.querySelector("input").addEventListener("change", (event) => toggleCompleted(id, event.target.checked));
          row.querySelector(".link-button").addEventListener("click", () => selectResource(id));
          row.querySelector("[data-open]").addEventListener("click", () => markRecent(id));
          list.append(row);
        });
        card.append(list);
      }

      card.querySelector('[data-action="filter-pathway"]').addEventListener("click", () => {
        clearFilters(false);
        els.pathway.value = pathway.title;
        openPathway = pathway.id;
        setActiveTab("Pathways", false);
        activeRecommendation = buildRecommendation({
          pathwayTitle: pathway.title,
          reason: `A guided route through ${pathway.resourceIds.length} curated resources in this pathway.`
        });
        render();
      });
      card.querySelector('[data-action="toggle-pathway"]').addEventListener("click", () => {
        openPathway = openPathway === pathway.id ? "" : pathway.id;
        renderPathways();
      });
      els.pathwayCards.append(card);
    });
  }

  function renderChips() {
    const filters = currentFilters();
    const chips = [];
    if (filters.query) chips.push(`Search: ${filters.query}`);
    ["section", "type", "pathway", "level", "tool", "tag"].forEach((key) => {
      if (filters[key]) chips.push(`${key}: ${filters[key]}`);
    });
    els.activeChips.innerHTML = chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("");
  }

  function renderTabs(filteredResources) {
    const browseSections = getBrowseSections();
    const counts = new Map(browseSections.map((section) => [section, 0]));
    filteredResources.forEach((resource) => {
      browseSections.forEach((section) => {
        if (resourceBelongsToSection(resource, section)) {
          counts.set(section, counts.get(section) + 1);
        }
      });
    });

    const tabs = [{ section: "All", count: filteredResources.length }, ...browseSections.map((section) => ({
      section,
      count: counts.get(section) || 0
    }))];

    if (activeTab !== "All" && !browseSections.includes(activeTab)) {
      activeTab = "All";
    }

    els.categoryTabs.innerHTML = tabs.map((tab) => `
      <button
        type="button"
        class="category-tab${activeTab === tab.section ? " is-active" : ""}"
        role="tab"
        aria-selected="${activeTab === tab.section ? "true" : "false"}"
        data-tab="${escapeHtml(tab.section)}"
      >
        <span>${escapeHtml(tab.section)}</span>
        <strong>${tab.count}</strong>
      </button>
    `).join("");

    els.categoryTabs.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        setActiveTab(button.dataset.tab);
        render();
      });
    });
  }

  function resourcesForActiveTab(filteredResources) {
    if (activeTab === "All") return filteredResources;
    return filteredResources.filter((resource) => resourceBelongsToSection(resource, activeTab));
  }

  function resourceBelongsToSection(resource, section) {
    if (section === recentlyAddedTab) return recentlyAddedIds.has(resource.id);
    return resource.section === section || (resource.alsoInSections || []).includes(section);
  }

  function getBrowseSections() {
    return recentlyAddedIds.size ? [recentlyAddedTab, ...data.sections] : data.sections;
  }

  function keepActiveTabUseful(filteredResources) {
    if (activeTab === "All" || !filteredResources.length) return;
    if (resourcesForActiveTab(filteredResources).length) return;
    setActiveTab("All");
  }

  function renderResources() {
    const filteredResources = getFilteredResources();
    keepActiveTabUseful(filteredResources);
    renderTabs(filteredResources);
    const resources = resourcesForActiveTab(filteredResources);
    const visibleResources = resources.slice(0, visibleLimit);
    const tabName = activeTab === "All" ? "All" : activeTab;
    const shownCount = Math.min(visibleLimit, resources.length);
    els.resultsCount.textContent = `${filteredResources.length} matching`;
    els.tabSummary.textContent = `Showing ${shownCount} of ${resources.length} resources in ${tabName}`;
    els.resourceList.innerHTML = "";
    els.resourcePaging.innerHTML = "";
    if (!resources.length) {
      els.resourceList.innerHTML = `
        <article class="empty-state">
          <span class="badge badge--accent">No matches</span>
          <h3>No resources found in ${escapeHtml(tabName)}</h3>
          <p>Try clearing filters, choosing All, or searching common terms like Pigments, mixing, arrangement, Vital, generative, or space ambient.</p>
          <div class="resource-card__actions">
            <button type="button" class="button" data-empty-all>Choose All</button>
            <button type="button" class="button button--secondary" data-empty-clear>Clear filters</button>
          </div>
        </article>
      `;
      els.resourceList.querySelector("[data-empty-all]").addEventListener("click", () => {
        setActiveTab("All");
        render();
      });
      els.resourceList.querySelector("[data-empty-clear]").addEventListener("click", () => {
        clearFilters();
        render();
      });
      return;
    }

    visibleResources.forEach((resource, index) => {
      const card = document.createElement("article");
      card.className = "resource-card";
      card.style.setProperty("--card-index", String(index % pageSize));
      const tags = [...(resource.pathways || []), ...(resource.tags || []), ...(resource.tools || [])].slice(0, 8);
      card.innerHTML = `
        <div class="resource-card__main">
          <div>
            <h3>${escapeHtml(resource.title)}</h3>
            <div class="meta">
              <span class="badge badge--section">${escapeHtml(resource.section)}</span>
              <span class="badge badge--type">${escapeHtml(resource.contentType)}</span>
              <span class="badge badge--level">${escapeHtml(resource.skillLevel)}</span>
            </div>
            <p>${escapeHtml(resource.notes || "")}</p>
            <div class="meta">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
          <div class="resource-card__actions">
            <button type="button" class="icon-button ${state.favorites.has(resource.id) ? "is-active" : ""}" title="Favorite" aria-label="Favorite ${escapeHtml(resource.title)}" data-fav="${escapeHtml(resource.id)}">★</button>
            <label class="check-row"><input type="checkbox" data-complete="${escapeHtml(resource.id)}" ${state.completed.has(resource.id) ? "checked" : ""}> Done</label>
          </div>
        </div>
        <div class="resource-card__actions">
          <button type="button" class="button button--secondary" data-detail="${escapeHtml(resource.id)}">Details</button>
          <a class="button" href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer" data-open="${escapeHtml(resource.id)}">Open link</a>
        </div>
      `;
      card.querySelector("[data-detail]").addEventListener("click", () => selectResource(resource.id));
      card.querySelector("[data-fav]").addEventListener("click", () => toggleFavorite(resource.id));
      card.querySelector("[data-complete]").addEventListener("change", (event) => toggleCompleted(resource.id, event.target.checked));
      card.querySelector("[data-open]").addEventListener("click", () => markRecent(resource.id));
      els.resourceList.append(card);
    });

    if (resources.length > pageSize) {
      const canShowMore = visibleLimit < resources.length;
      els.resourcePaging.innerHTML = `
        <span>${shownCount} of ${resources.length} shown</span>
        <div class="resource-paging__actions">
          ${canShowMore ? '<button type="button" class="button" data-show-more>Show more</button>' : ''}
          ${visibleLimit > pageSize ? '<button type="button" class="button button--secondary" data-show-less>Collapse</button>' : ''}
        </div>
      `;
      const showMore = els.resourcePaging.querySelector("[data-show-more]");
      const showLess = els.resourcePaging.querySelector("[data-show-less]");
      if (showMore) {
        showMore.addEventListener("click", () => {
          visibleLimit += pageSize;
          renderResources();
        });
      }
      if (showLess) {
        showLess.addEventListener("click", () => {
          visibleLimit = pageSize;
          renderResources();
          document.getElementById("resultsTitle").scrollIntoView({ block: "start" });
        });
      }
    }
  }

  function renderDetail() {
    const resource = byId.get(selectedId);
    if (!resource) return;
    const note = state.notes[resource.id] || "";
    els.detail.innerHTML = `
      <p class="eyebrow">Resource detail</p>
      <h2 id="detailTitle">${escapeHtml(resource.title)}</h2>
      <div class="meta">
        <span class="badge badge--section">${escapeHtml(resource.category)}</span>
        <span class="badge badge--section">${escapeHtml(resource.section)}</span>
        <span class="badge badge--type">${escapeHtml(resource.contentType)}</span>
        <span class="badge badge--level">${escapeHtml(resource.skillLevel)}</span>
      </div>
      <p class="muted">${escapeHtml(resource.notes || "")}</p>
      <div class="meta">
        ${(resource.pathways || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        ${(resource.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        ${(resource.tools || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="detail__actions">
        <a class="button" href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer" data-open="${escapeHtml(resource.id)}">Open link</a>
        <button type="button" class="button button--secondary" data-detail-fav>${state.favorites.has(resource.id) ? "Unfavorite" : "Favorite"}</button>
        <label class="check-row"><input type="checkbox" data-detail-complete ${state.completed.has(resource.id) ? "checked" : ""}> Completed</label>
      </div>
      <label class="detail__notes">
        <span class="search-label">Personal notes</span>
        <textarea id="resourceNotes" placeholder="Private notes saved in this browser only.">${escapeHtml(note)}</textarea>
      </label>
    `;
    els.detail.querySelector("[data-open]").addEventListener("click", () => markRecent(resource.id));
    els.detail.querySelector("[data-detail-fav]").addEventListener("click", () => toggleFavorite(resource.id));
    els.detail.querySelector("[data-detail-complete]").addEventListener("change", (event) => toggleCompleted(resource.id, event.target.checked));
    els.detail.querySelector("#resourceNotes").addEventListener("input", (event) => {
      state.notes[resource.id] = event.target.value;
      saveState();
    });
  }

  function renderRecent() {
    if (!state.recent.length) {
      els.recentList.hidden = true;
      els.recentList.innerHTML = "";
      return;
    }
    els.recentList.hidden = false;
    els.recentList.innerHTML = state.recent.slice(0, 8).map((entry) => {
      const resource = byId.get(entry.id);
      if (!resource) return "";
      return `<div class="recent-item"><span>${escapeHtml(resource.title)}</span><time>${new Date(entry.openedAt).toLocaleString()}</time></div>`;
    }).join("");
  }

  function render() {
    renderStats();
    renderPathways();
    renderRecommendation();
    renderChips();
    renderResources();
    renderDetail();
    renderRecent();
  }

  function selectResource(id) {
    selectedId = id;
    renderDetail();
    els.detail.setAttribute("tabindex", "-1");
    const targetTop = Math.max(0, els.detail.getBoundingClientRect().top + window.scrollY - 18);
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, targetTop);
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    els.detail.focus({ preventScroll: true });
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id);
    else state.favorites.add(id);
    saveState();
    render();
  }

  function toggleCompleted(id, checked) {
    if (checked) state.completed.add(id);
    else state.completed.delete(id);
    saveState();
    render();
  }

  function markRecent(id) {
    state.recent = [{ id, openedAt: new Date().toISOString() }, ...state.recent.filter((entry) => entry.id !== id)].slice(0, 20);
    saveState();
    renderRecent();
  }

  function clearFilters(clearMessage = true) {
    els.search.value = "";
    [els.section, els.type, els.pathway, els.level, els.tool, els.tag].forEach((select) => {
      select.value = "";
    });
    if (clearMessage) activeRecommendation = null;
    setActiveTab("All", false);
    visibleLimit = pageSize;
  }

  function setActiveTab(tab, resetLimit = true) {
    activeTab = tab || "All";
    if (resetLimit) visibleLimit = pageSize;
  }

  function exportProgress() {
    download("s1gns-progress.json", JSON.stringify({
      exportedAt: new Date().toISOString(),
      source: data.source,
      favorites: [...state.favorites].map((id) => serializeResource(id)),
      completed: [...state.completed].map((id) => serializeResource(id)),
      recent: state.recent.map((entry) => ({ ...entry, resource: serializeResource(entry.id) })),
      notes: Object.entries(state.notes).map(([id, note]) => ({ resource: serializeResource(id), note }))
    }, null, 2), "application/json");
  }

  function handleProgressImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        if (!isProgressImport(parsed)) {
          els.exportStatus.textContent = "Import failed. Choose a progress JSON exported from this guide.";
          return;
        }
        const result = window.S1GNS_PROGRESS.mergeProgressState(state, parsed, new Set(data.resources.map((resource) => resource.id)));
        state = result.state;
        saveState();
        render();
        els.exportStatus.textContent = progressImportMessage(result.summary);
      } catch {
        els.exportStatus.textContent = "Import failed. Choose a valid progress JSON file.";
      } finally {
        els.progressImportInput.value = "";
      }
    };
    reader.onerror = () => {
      els.exportStatus.textContent = "Import failed. The file could not be read.";
      els.progressImportInput.value = "";
    };
    reader.readAsText(file);
  }

  function isProgressImport(value) {
    return Boolean(value && typeof value === "object" && (
      Array.isArray(value.favorites)
      || Array.isArray(value.completed)
      || Array.isArray(value.notes)
      || Array.isArray(value.recent)
    ));
  }

  function progressImportMessage(summary) {
    return `Imported ${summary.favoritesAdded} favorites, ${summary.completedAdded} completed resources, ${summary.notesImported} notes, and ${summary.recentsImported} recents. Ignored ${summary.ignoredCount} entries that were invalid or no longer in this library.`;
  }

  function exportMarkdown(kind) {
    const ids = kind === "favorites" ? [...state.favorites] : [...state.completed];
    const title = kind === "favorites" ? "S1gns Patreon Navigator Favorites" : "S1gns Patreon Navigator Completed Resources";
    const lines = [`# ${title}`, "", `Exported ${new Date().toLocaleString()}`, ""];
    if (!ids.length) {
      lines.push("_No resources saved yet._");
    } else {
      ids.map((id) => byId.get(id)).filter(Boolean).sort((a, b) => a.title.localeCompare(b.title)).forEach((resource) => {
        lines.push(`- [${resource.title}](${resource.url}) — ${resource.section} / ${resource.contentType}`);
      });
    }
    download(`s1gns-${kind}.md`, lines.join("\n"), "text/markdown");
  }

  function serializeResource(id) {
    const resource = byId.get(id);
    if (!resource) return { id };
    return {
      id: resource.id,
      title: resource.title,
      section: resource.section,
      category: resource.category,
      contentType: resource.contentType,
      url: resource.url
    };
  }

  function download(filename, content, type) {
    window.S1GNS_LAST_EXPORT = { filename, content, type };
    els.exportStatus.textContent = `Prepared ${filename}`;
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clearTracking() {
    state = { favorites: new Set(), completed: new Set(), notes: {}, recent: [] };
    localStorage.removeItem(storageKey);
    els.exportStatus.textContent = "Saved tracking cleared";
    activeRecommendation = null;
    render();
  }

  async function refreshGitHubLibrary() {
    els.importStatus.textContent = "Checking for the latest guide update...";
    setGitHubCacheStatus("Checking update feed...");
    try {
      const response = await fetch(githubLibraryUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`GitHub returned ${response.status}`);
      }
      const rawLibrary = await response.json();
      validateRawLibraryContent(rawLibrary, "GitHub library-content.json");
      const result = normalizeImportedLibrary(rawLibrary);
      if (!result.library) {
        throw new Error("The GitHub file did not contain a valid resources array.");
      }
      saveGitHubCachedLibrary(result.library);
      applyLibrary(result.library, "Latest Guide");
      setGitHubCacheStatus("Latest guide saved for offline use");
      els.importStatus.textContent = "Latest guide loaded and saved for offline use.";
    } catch (error) {
      const cached = loadGitHubCachedLibrary();
      if (cached) {
        applyLibrary(cached.library, "Saved Browser Guide");
        setGitHubCacheStatus("Using browser-saved guide");
        els.importStatus.textContent = error.validationFailed
          ? "The latest guide update looked invalid. Using the guide saved in this browser."
          : "Could not reach the update feed. Using the guide saved in this browser.";
      } else if (seededLocalCache) {
        applyLibrary(seededLocalCache.library, "Packaged Offline Guide");
        saveGitHubCachedLibrary(seededLocalCache.library);
        setGitHubCacheStatus("Using packaged offline guide");
        els.importStatus.textContent = error.validationFailed
          ? "The latest guide update looked invalid. Using the packaged offline guide."
          : "Could not reach the update feed. Using the packaged offline guide.";
      } else {
        setGitHubCacheStatus("No saved guide yet");
        const fallbackName = activeLibrarySource === "Built-in Library" ? "built-in guide" : "current local guide";
        els.importStatus.textContent = `Could not reach the update feed. Using the ${fallbackName} until a saved guide is available.`;
      }
    }
  }

  function setGitHubCacheStatus(message) {
    setText(els.githubCacheStatus, message);
  }

  function applyLibrary(nextLibrary, sourceLabel) {
    data = nextLibrary;
    activeLibrarySource = sourceLabel;
    byId = new Map(data.resources.map((resource) => [resource.id, resource]));
    recentlyAddedIds = buildRecentlyAddedIds(data);
    openPathway = data.pathways[0]?.id || "";
    selectedId = data.pathways[0]?.resourceIds[0] || data.resources[0]?.id || "";
    activeRecommendation = null;
    setActiveTab("All");
    clearFilters(false);
    initFilters();
    renderHelper();
    render();
  }

  function loadGitHubCachedLibrary() {
    try {
      const stored = localStorage.getItem(githubLibraryCacheKey);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const rawLibrary = parsed.library || parsed;
      validateRawLibraryContent(rawLibrary, "Cached GitHub library");
      const result = normalizeImportedLibrary(rawLibrary);
      if (!result.library) return null;
      return {
        library: result.library,
        cachedAt: parsed.cachedAt || ""
      };
    } catch {
      return null;
    }
  }

  function saveGitHubCachedLibrary(library) {
    localStorage.setItem(githubLibraryCacheKey, JSON.stringify({
      cachedAt: new Date().toISOString(),
      library: toContentFile(library)
    }));
  }

  function loadSeededLocalCacheLibrary() {
    try {
      validateRawLibraryContent(window.S1GNS_LOCAL_CACHE_LIBRARY, "Packaged local_cache library");
      const result = normalizeImportedLibrary(window.S1GNS_LOCAL_CACHE_LIBRARY);
      if (!result.library) return null;
      return { library: result.library };
    } catch {
      return null;
    }
  }

  function validateRawLibraryContent(raw, sourceName) {
    const validator = window.S1GNS_LIBRARY_VALIDATOR;
    if (!validator?.validateLibraryContent) return { ok: true, errors: [], warnings: [] };
    const result = validator.validateLibraryContent(raw, { sourceName });
    if (result.ok) return result;
    const error = new Error(result.errors.join(" "));
    error.validationFailed = true;
    error.validationErrors = result.errors;
    throw error;
  }

  function normalizeBuiltInLibrary(raw) {
    return {
      version: raw.version || "Built-in",
      updatedAt: raw.updatedAt || raw.sourceUpdated || "",
      sourceName: raw.sourceName || raw.source || "Built-in Library",
      source: raw.source,
      sourceUpdated: raw.sourceUpdated,
      metadata: raw.metadata || {},
      sections: Array.isArray(raw.sections) ? raw.sections : uniqueSorted((raw.resources || []).map((resource) => resource.section)),
      pathways: Array.isArray(raw.pathways) ? raw.pathways : [],
      resources: Array.isArray(raw.resources) ? raw.resources : []
    };
  }

  function normalizeImportedLibrary(raw) {
    const errors = [];
    const warnings = [];
    const summary = {
      resourcesFound: Array.isArray(raw?.resources) ? raw.resources.length : 0,
      pathwaysFound: Array.isArray(raw?.pathways) ? raw.pathways.length : 0,
      sectionsFound: Array.isArray(raw?.sections) ? raw.sections.length : 0,
      duplicateIds: [],
      duplicateUrls: [],
      missingUrlCount: 0,
      missingSectionCount: 0,
      skippedCount: 0
    };

    if (!raw || typeof raw !== "object") {
      errors.push("The imported file must contain a JSON object.");
      return { library: null, summary, warnings, errors };
    }
    if (!Array.isArray(raw.resources)) {
      errors.push("Missing required resources array.");
      return { library: null, summary, warnings, errors };
    }

    const builtInUrlIds = new Map();
    builtInData.resources.forEach((resource) => {
      if (resource.url) builtInUrlIds.set(normalizeUrl(resource.url), resource.id);
    });

    const usedIds = new Set();
    const seenUrls = new Map();
    const resources = [];

    raw.resources.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        summary.skippedCount += 1;
        warnings.push(`Skipped resource ${index + 1}: item is not an object.`);
        return;
      }
      const title = cleanString(item.title);
      const section = cleanString(item.section);
      const url = cleanString(item.url);

      if (!title) {
        summary.skippedCount += 1;
        warnings.push(`Skipped resource ${index + 1}: missing title.`);
        return;
      }
      if (!section) {
        summary.missingSectionCount += 1;
        summary.skippedCount += 1;
        warnings.push(`Skipped "${title}": missing section.`);
        return;
      }
      if (!url) summary.missingUrlCount += 1;

      const normalizedUrl = normalizeUrl(url);
      if (normalizedUrl) {
        if (seenUrls.has(normalizedUrl)) {
          summary.duplicateUrls.push(url);
          warnings.push(`Duplicate URL found: ${url}`);
        }
        seenUrls.set(normalizedUrl, title);
      }

      let id = cleanString(item.id) || (normalizedUrl && builtInUrlIds.get(normalizedUrl)) || slugify(`${section}-${title}`);
      if (usedIds.has(id)) {
        summary.duplicateIds.push(id);
        warnings.push(`Duplicate ID normalized: ${id}`);
        id = makeUniqueId(id, usedIds);
      }
      usedIds.add(id);

      const pathways = normalizeArray(item.pathways || item.pathway);
      resources.push({
        ...item,
        id,
        title,
        section,
        category: cleanString(item.category) || section,
        contentType: cleanString(item.contentType) || cleanString(item.type) || "resource",
        pathways,
        url,
        skillLevel: cleanString(item.skillLevel) || "Unspecified",
        tools: normalizeArray(item.tools || item.tool || item.plugins),
        tags: normalizeArray(item.tags),
        year: item.year || null,
        description: cleanString(item.description),
        notes: cleanString(item.notes || item.description)
      });
    });

    if (!resources.length) {
      errors.push("No valid resources were found.");
      return { library: null, summary, warnings, errors };
    }

    const sections = normalizeSections(raw.sections, resources);
    const resourceIds = new Set(resources.map((resource) => resource.id));
    const pathways = normalizePathways(raw.pathways, resources, resourceIds);
    const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
    pathways.forEach((pathway) => {
      pathway.resourceIds.forEach((id) => {
        const resource = resourcesById.get(id);
        if (resource && !resource.pathways.includes(pathway.title)) {
          resource.pathways.push(pathway.title);
        }
      });
    });
    summary.sectionsFound = sections.length;
    summary.pathwaysFound = pathways.length;

    const library = {
      version: cleanString(raw.version) || "Imported",
      updatedAt: cleanString(raw.updatedAt) || new Date().toISOString().slice(0, 10),
      sourceName: cleanString(raw.sourceName) || "Imported Library",
      metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
      sections,
      pathways,
      resources
    };

    return { library, summary, warnings, errors };
  }

  function normalizePathways(pathways, resources, resourceIds) {
    if (!Array.isArray(pathways)) return [];
    const byUrl = new Map(resources.filter((resource) => resource.url).map((resource) => [normalizeUrl(resource.url), resource.id]));
    return pathways.filter((pathway) => pathway && typeof pathway === "object").map((pathway) => {
      const title = cleanString(pathway.title) || "Untitled Pathway";
      const ids = Array.isArray(pathway.resourceIds)
        ? pathway.resourceIds
        : Array.isArray(pathway.items)
          ? pathway.items.map((item) => {
            if (typeof item === "string") return item;
            if (item?.id) return item.id;
            if (item?.url) return byUrl.get(normalizeUrl(item.url));
            return "";
          })
          : [];
      return {
        id: cleanString(pathway.id) || slugify(title),
        title,
        description: cleanString(pathway.description),
        recommendedFor: cleanString(pathway.recommendedFor),
        resourceIds: ids.map(cleanString).filter((id) => resourceIds.has(id))
      };
    });
  }

  function normalizeSections(sections, resources) {
    const fromFile = Array.isArray(sections) ? sections.map(cleanString).filter(Boolean) : [];
    const fromResources = resources.map((resource) => resource.section);
    return uniqueSorted([...fromFile, ...fromResources]);
  }

  function toContentFile(library) {
    return {
      version: library.version || "Exported",
      updatedAt: library.updatedAt || new Date().toISOString().slice(0, 10),
      sourceName: library.sourceName || activeLibrarySource,
      metadata: library.metadata || {},
      sections: library.sections || [],
      pathways: library.pathways || [],
      resources: library.resources || []
    };
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.map(cleanString).filter(Boolean);
    if (!value) return [];
    return [cleanString(value)].filter(Boolean);
  }

  function cleanString(value) {
    return String(value ?? "").trim();
  }

  function setText(element, message) {
    if (element) element.textContent = message;
  }

  function normalizeUrl(value) {
    return cleanString(value).replace(/\/$/, "").toLowerCase();
  }

  function makeUniqueId(base, usedIds) {
    let counter = 2;
    let candidate = `${base}-${counter}`;
    while (usedIds.has(candidate)) {
      counter += 1;
      candidate = `${base}-${counter}`;
    }
    return candidate;
  }

  function slugify(value) {
    return cleanString(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || `resource-${Date.now()}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  initFilters();
  renderHelper();
  render();
  setGitHubCacheStatus(loadedGitHubCache
    ? "Browser-saved guide ready"
    : seededLocalCache ? "Packaged offline guide ready" : "Not saved yet");

  els.search.addEventListener("input", () => {
    visibleLimit = pageSize;
    render();
  });
  [els.section, els.type, els.pathway, els.level, els.tool, els.tag].forEach((select) => select.addEventListener("change", () => {
    visibleLimit = pageSize;
    render();
  }));
  els.clear.addEventListener("click", () => {
    clearFilters();
    render();
  });
  els.exportProgress.addEventListener("click", exportProgress);
  els.importProgress.addEventListener("click", () => els.progressImportInput.click());
  els.progressImportInput.addEventListener("change", handleProgressImportFile);
  els.exportFavorites.addEventListener("click", () => exportMarkdown("favorites"));
  els.exportCompleted.addEventListener("click", () => exportMarkdown("completed"));
  els.clearTracking.addEventListener("click", clearTracking);
  refreshGitHubLibrary();
})();
