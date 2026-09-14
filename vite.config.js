import { defineConfig } from "vite";
import { resolve, relative } from "node:path";
import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const manifestRoot = resolve(process.cwd(), "assets/pets");
const inboxRoot = resolve(process.cwd(), "assets/inbox");
const publicPetRoot = resolve(process.cwd(), "public/assets/pets");
const knownRigs = new Set(["pet-base", "quadruped-base", "fox-quadruped", "hopper-base", "tank-base", "winged-base", "blob-base", "serpent-base"]);

const exists = async (file) => {
  try { await access(file); return true; } catch { return false; }
};

async function readJsonBody(req, limit = 128 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("Upload vượt quá giới hạn 128 MB");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function safeChild(root, ...parts) {
  const file = resolve(root, ...parts);
  if (relative(root, file).startsWith("..")) throw new Error("Invalid path");
  return file;
}

function decodePng(dataUrl, label) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!match) throw new Error(`${label} không phải PNG`);
  const data = Buffer.from(match[1], "base64");
  if (data.length > 25 * 1024 * 1024) throw new Error(`${label} vượt quá 25 MB`);
  if (data.length < 26 || data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`${label} có chữ ký PNG không hợp lệ`);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const colorType = data[25];
  const hasTransparency = colorType === 4 || colorType === 6 || data.includes(Buffer.from("tRNS"));
  if (!width || !height || width > 8192 || height > 8192) throw new Error(`${label} có kích thước không hợp lệ`);
  if (!hasTransparency) throw new Error(`${label} không có kênh alpha/transparency`);
  return { data, width, height };
}

async function readPetManifests() {
  const manifests = [];
  const lineages = await readdir(manifestRoot, { withFileTypes: true });
  for (const lineage of lineages.filter(entry => entry.isDirectory())) {
    const lineageFolder = safeChild(manifestRoot, lineage.name);
    const levels = await readdir(lineageFolder, { withFileTypes: true });
    for (const level of levels.filter(entry => entry.isDirectory() && /^level-[123]$/.test(entry.name))) {
      const file = safeChild(lineageFolder, level.name, "asset.json");
      if (await exists(file)) manifests.push(JSON.parse(await readFile(file, "utf8")));
    }
  }
  return manifests;
}

function assetManifestApi() {
  return {
    name: "asset-manifest-api",
    handleHotUpdate({ file }) {
      // The editor already applies transform changes to the live PetView.
      // Do not let saving the imported manifest trigger a full page reload.
      if (file.startsWith(manifestRoot) && file.endsWith("/asset.json")) return [];
    },
    configureServer(server) {
      server.middlewares.use("/__asset-studio/pet-manifests", async (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        try {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(await readPetManifests()));
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : "Could not read pet manifests");
        }
      });
      server.middlewares.use("/__asset-studio/create-pet", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        try {
          const body = await readJsonBody(req);
          const { id, manifest, uploads } = body;
          const lineageId = manifest?.lineageId;
          const evolutionLevel = manifest?.evolutionLevel;
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lineageId) || ![1, 2, 3].includes(evolutionLevel) || id !== `${lineageId}-level-${evolutionLevel}` || manifest?.id !== id || manifest?.kind !== "pet" || !knownRigs.has(manifest?.extends) || !Array.isArray(manifest?.layers) || !Array.isArray(uploads)) {
            res.statusCode = 400;
            res.end("Invalid pet package");
            return;
          }
          const levelFolder = `level-${evolutionLevel}`;
          const manifestFile = safeChild(manifestRoot, lineageId, levelFolder, "asset.json");
          if (await exists(manifestFile)) {
            res.statusCode = 409;
            res.end(`Pet ${id} đã tồn tại`);
            return;
          }
          const decoded = uploads.map((upload) => {
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.png$/.test(upload?.file) || !["layers", "effects"].includes(upload?.folder)) throw new Error("Tên file upload không hợp lệ");
            return { file: upload.file, folder: upload.folder, sourceData: decodePng(upload.sourceDataUrl, upload.file).data, runtimeData: decodePng(upload.runtimeDataUrl, `${upload.file} runtime`).data };
          });
          const publicPrefix = `/assets/pets/${lineageId}/${levelFolder}/`;
          if (manifest.layers.some((item) => typeof item?.src !== "string" || !item.src.startsWith(publicPrefix))) throw new Error("Manifest chứa đường dẫn layer ngoài pet");
          for (const upload of decoded) {
            if (await exists(safeChild(inboxRoot, lineageId, levelFolder, upload.folder, upload.file))) throw new Error(`File gốc assets/inbox/${lineageId}/${levelFolder}/${upload.folder}/${upload.file} đã tồn tại`);
          }
          await mkdir(safeChild(manifestRoot, lineageId, levelFolder), { recursive: true });
          const writtenFiles = [manifestFile];
          for (const upload of decoded) {
            const inboxFolder = safeChild(inboxRoot, lineageId, levelFolder, upload.folder);
            const publicFolder = safeChild(publicPetRoot, lineageId, levelFolder, upload.folder);
            await mkdir(inboxFolder, { recursive: true });
            await mkdir(publicFolder, { recursive: true });
            const inboxFile = safeChild(inboxFolder, upload.file);
            const publicFile = safeChild(publicFolder, upload.file);
            writtenFiles.push(inboxFile, publicFile);
            server.watcher.unwatch(inboxFile);
            server.watcher.unwatch(publicFile);
            await writeFile(inboxFile, upload.sourceData);
            await writeFile(publicFile, upload.runtimeData);
          }
          server.watcher.unwatch(manifestFile);
          await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");
          for (const file of writtenFiles) server.watcher.add(file);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, path: `assets/pets/${lineageId}/${levelFolder}/asset.json` }));
        } catch (error) {
          res.statusCode = 400;
          res.end(error instanceof Error ? error.message : "Could not create pet");
        }
      });
      server.middlewares.use("/__asset-studio/replace-pet-images", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        try {
          const body = await readJsonBody(req);
          const id = typeof body.id === "string" ? body.id : "";
          const uploads = body.uploads;
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !Array.isArray(uploads) || !uploads.length) throw new Error("Gói thay ảnh không hợp lệ");
          const manifests = await readPetManifests();
          const manifest = manifests.find((item) => item.id === id);
          if (!manifest) throw new Error(`Không tìm thấy pet ${id}`);
          const levelFolder = `level-${manifest.evolutionLevel}`;
          const publicPrefix = `/assets/pets/${manifest.lineageId}/${levelFolder}/`;
          const referencedSources = new Set([
            ...manifest.layers.flatMap((layer) => [layer.src, layer.closedSrc].filter(Boolean)),
            manifest.effects?.projectile,
            ...Object.values(manifest.effects?.attack ?? {}),
          ].filter(Boolean));
          const seen = new Set();
          const decoded = [];
          for (const upload of uploads) {
            const src = typeof upload?.src === "string" ? upload.src : "";
            const relativeAsset = src.startsWith(publicPrefix) ? src.slice(publicPrefix.length) : "";
            const match = /^(?:(layers|effects)\/)?([a-z0-9]+(?:-[a-z0-9]+)*\.png)$/.exec(relativeAsset);
            if (!match || !referencedSources.has(src) || seen.has(src)) throw new Error(`Đường dẫn ảnh không hợp lệ: ${src || "trống"}`);
            seen.add(src);
            const source = decodePng(upload.sourceDataUrl, match[2]);
            const runtime = decodePng(upload.runtimeDataUrl, `${match[2]} runtime`);
            const folder = match[1] ?? "";
            const publicFile = safeChild(publicPetRoot, manifest.lineageId, levelFolder, folder, match[2]);
            if (!await exists(publicFile)) throw new Error(`Không tìm thấy ảnh production ${src}`);
            const current = decodePng(`data:image/png;base64,${(await readFile(publicFile)).toString("base64")}`, `${match[2]} hiện tại`);
            if (runtime.width !== current.width || runtime.height !== current.height) {
              throw new Error(`${match[2]} runtime phải giữ kích thước ${current.width}×${current.height}`);
            }
            decoded.push({ src, folder, file: match[2], publicFile, sourceData: source.data, runtimeData: runtime.data });
          }
          const revision = new Date().toISOString().replace(/\D/g, "").slice(0, 17);
          const revisionRoot = safeChild(inboxRoot, manifest.lineageId, levelFolder, "replacements", revision);
          for (const upload of decoded) {
            const revisionFolder = upload.folder || "root";
            const sourceFolder = safeChild(revisionRoot, "source", revisionFolder);
            const previousFolder = safeChild(revisionRoot, "previous-runtime", revisionFolder);
            await mkdir(sourceFolder, { recursive: true });
            await mkdir(previousFolder, { recursive: true });
            await writeFile(safeChild(sourceFolder, upload.file), upload.sourceData);
            await copyFile(upload.publicFile, safeChild(previousFolder, upload.file));
            server.watcher.unwatch(upload.publicFile);
            await writeFile(upload.publicFile, upload.runtimeData);
            server.watcher.add(upload.publicFile);
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, revision, replaced: decoded.map((item) => item.src) }));
        } catch (error) {
          res.statusCode = 400;
          res.end(error instanceof Error ? error.message : "Could not replace pet images");
        }
      });
      server.middlewares.use("/__asset-studio/save-manifest", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        try {
          const body = await readJsonBody(req, 2 * 1024 * 1024);
          const id = typeof body.id === "string" ? body.id : "";
          const manifest = body.manifest;
          const lineageId = manifest?.lineageId;
          const evolutionLevel = manifest?.evolutionLevel;
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lineageId) || ![1, 2, 3].includes(evolutionLevel) || id !== `${lineageId}-level-${evolutionLevel}` || !manifest || manifest.id !== id) {
            res.statusCode = 400;
            res.end("Invalid manifest");
            return;
          }
          const levelFolder = `level-${evolutionLevel}`;
          const file = safeChild(manifestRoot, lineageId, levelFolder, "asset.json");
          server.watcher.unwatch(file);
          await mkdir(safeChild(manifestRoot, lineageId, levelFolder), { recursive: true });
          await writeFile(file, JSON.stringify(manifest, null, 2) + "\n", "utf8");
          server.watcher.add(file);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, path: `assets/pets/${lineageId}/${levelFolder}/asset.json` }));
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : "Could not save manifest");
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [assetManifestApi()],
  server: {
    // Cloudflare quick tunnels use random *.trycloudflare.com hosts
    allowedHosts: [".trycloudflare.com"],
  },
});
