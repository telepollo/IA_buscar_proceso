const { searchSeace } = require("../lib/seace");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metodo no permitido." });
  }

  const nomenclature = String(req.query.nomenclatura || "").trim();

  if (!nomenclature || nomenclature.length < 4) {
    return res.status(400).json({ error: "Ingresa una nomenclatura valida." });
  }

  try {
    const result = await searchSeace(nomenclature);
    return res.status(200).json({
      nomenclature,
      ...result,
      message: result.results.length
        ? ""
        : "No se encontro la nomenclatura en la API de Contrataciones Abiertas.",
    });
  } catch (error) {
    return res.status(error.code === "API_UNAVAILABLE" ? 503 : 502).json({
      error: "No fue posible consultar la API oficial de SEACE.",
      detail: error.message,
      attempts: error.attempts || [],
    });
  }
};
