const DEFAULT_API_BASE = "https://contratacionesabiertas.osce.gob.pe/api/v1";

const statusLabels = {
  planning: "Planificado",
  planned: "Planificado",
  active: "Convocado / activo",
  cancelled: "Cancelado",
  complete: "Completado",
  unsuccessful: "Desierto / sin exito",
  withdrawn: "Retirado",
  pending: "Pendiente",
};

function getApiBase() {
  return (process.env.SEACE_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
}

function getReleases(payload) {
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.results,
    payload.releases,
    payload.records,
    payload.data,
    payload.items,
  ].find(Array.isArray);

  if (!candidates) {
    if (payload.compiledRelease || payload.tender) return [payload];
    return [];
  }

  return candidates.flatMap((entry) => {
    if (entry?.compiledRelease) return [entry.compiledRelease];
    if (Array.isArray(entry?.releases)) return entry.releases;
    return [entry];
  });
}

function textIncludes(value, query) {
  return String(value || "").toLocaleUpperCase("es-PE").includes(query);
}

function normalizeItem(item, index) {
  const rawStatus = item?.statusDetails || item?.status || item?.state || "";
  return {
    id: item?.id || String(index + 1),
    description: item?.description || item?.title || "Item sin descripcion",
    status: rawStatus,
    statusLabel: statusLabels[String(rawStatus).toLowerCase()] || rawStatus || "No informado",
  };
}

function normalizeRelease(release) {
  const tender = release?.tender || {};
  const rawStatus = tender.statusDetails || tender.status || release?.statusDetails || release?.status || "";
  const nomenclature =
    tender.id ||
    tender.title ||
    release?.tenderId ||
    release?.id ||
    release?.ocid ||
    "";

  return {
    nomenclature,
    ocid: release?.ocid || "",
    status: rawStatus,
    statusLabel: statusLabels[String(rawStatus).toLowerCase()] || rawStatus || "No informado",
    entity: tender?.procuringEntity?.name || release?.buyer?.name || "",
    description: tender?.description || tender?.title || "",
    method: tender?.procurementMethodDetails || tender?.procurementMethod || "",
    publishedDate: tender?.datePublished || release?.date || release?.publishedDate || "",
    items: Array.isArray(tender?.items) ? tender.items.map(normalizeItem) : [],
  };
}

function matchesNomenclature(result, query) {
  return (
    textIncludes(result.nomenclature, query) ||
    textIncludes(result.ocid, query) ||
    textIncludes(result.description, query)
  );
}

function buildCandidateUrls(nomenclature) {
  const q = encodeURIComponent(nomenclature);
  const urls = [];
  const customSearchUrl = process.env.SEACE_SEARCH_URL || "";
  const apiBase = getApiBase();

  if (customSearchUrl) {
    urls.push(customSearchUrl.replace("{nomenclatura}", q));
  }

  urls.push(
    `${apiBase}/records?search=${q}&format=json`,
    `${apiBase}/records?query=${q}&format=json`,
    `${apiBase}/releases?search=${q}&format=json`,
    `${apiBase}/search?search=${q}&format=json`,
    `${apiBase}/search?q=${q}&format=json`
  );

  return [...new Set(urls)];
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Buscador-Estado-SEACE/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function searchSeace(nomenclature) {
  const query = nomenclature.trim().toLocaleUpperCase("es-PE");
  const attempts = [];

  for (const url of buildCandidateUrls(nomenclature)) {
    try {
      const payload = await fetchJson(url);
      const results = getReleases(payload)
        .map(normalizeRelease)
        .filter((result) => matchesNomenclature(result, query));

      attempts.push({ url, ok: true, count: results.length });

      if (results.length) {
        return { results, source: url, attempts };
      }
    } catch (error) {
      attempts.push({ url, ok: false, error: error.message });
    }
  }

  if (attempts.length && attempts.every((attempt) => !attempt.ok)) {
    const error = new Error("No se pudo conectar con la API oficial de Contrataciones Abiertas.");
    error.code = "API_UNAVAILABLE";
    error.attempts = attempts;
    throw error;
  }

  return { results: [], attempts };
}

module.exports = {
  searchSeace,
};
