import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/alejo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const root = "C:/Users/alejo/Documents/Repos/F1-arcade-ui";
const outputPath = path.resolve("presentation/assets/f1-arcade-experiment.png");
const port = 4174;

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
]);

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `http://localhost:${port}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const normalized = path.normalize(path.join(root, decodedPath === "/" ? "index.html" : decodedPath));
  const normalizedRoot = path.normalize(root);

  if (!normalized.startsWith(normalizedRoot)) {
    return null;
  }

  return normalized;
}

const server = http.createServer(async (req, res) => {
  const targetPath = resolveRequestPath(req.url ?? "/");

  if (!targetPath) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(targetPath);
    res.writeHead(200, {
      "Content-Type": contentTypes.get(path.extname(targetPath).toLowerCase()) ?? "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: "networkidle" });
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log(outputPath);
} finally {
  if (browser) {
    await browser.close();
  }
  await new Promise((resolve) => server.close(resolve));
}
