const http = require("http");
const fs = require("fs");
const path = require("path");
const { searchSeace } = require("./lib/seace");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const requestedPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500);
      return res.end(error.code === "ENOENT" ? "Not found" : "Server error");
    }

    const extension = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".svg": "image/svg+xml",
    };

    res.writeHead(200, { "Content-Type": types[extension] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/status") {
    const nomenclature = url.searchParams.get("nomenclatura")?.trim();

    if (!nomenclature || nomenclature.length < 4) {
      return sendJson(res, 400, { error: "Ingresa una nomenclatura valida." });
    }

    try {
      const result = await searchSeace(nomenclature);
      return sendJson(res, 200, {
        nomenclature,
        ...result,
        message: result.results.length
          ? ""
          : "No se encontro la nomenclatura en la API de Contrataciones Abiertas.",
      });
    } catch (error) {
      return sendJson(res, error.code === "API_UNAVAILABLE" ? 503 : 502, {
        error: "No fue posible consultar la API oficial de SEACE.",
        detail: error.message,
        attempts: error.attempts || [],
      });
    }
  }

  if (req.method === "GET") {
    return serveStatic(req, res);
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`Buscador SEACE disponible en http://localhost:${PORT}`);
});
