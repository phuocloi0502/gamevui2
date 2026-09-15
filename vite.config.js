import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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

const petAssetPath = /^(?:(layers|effects)\/)?([a-z0-9]+(?:-[a-z0-9]+)*\.png)$/;

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

function isPetManifestFile(file) {
  const normalized = String(file).replaceAll("\\", "/");
  return normalized.endsWith("/asset.json") && normalized.includes("/assets/pets/");
}

function assetManifestApi() {
  return {
    name: "asset-manifest-api",
    handleHotUpdate({ file }) {
      if (isPetManifestFile(file)) return [];
    },
    hotUpdate({ file }) {
      if (isPetManifestFile(file)) return [];
    },
    configureServer(server) {
      // Vite snapshots publicDir when the dev server starts. Asset Studio can
      // create PNG files after that point, so serve pet production files from
      // disk here instead of letting a new URL fall through to index.html.
      server.middlewares.use("/assets/pets", async (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        try {
          const pathname = decodeURIComponent((req.url ?? "").split("?", 1)[0]);
          if (!/^\/[a-z0-9]+(?:-[a-z0-9]+)*\/level-[123]\/(?:(?:layers|effects)\/)?[a-z0-9]+(?:-[a-z0-9]+)*\.png$/.test(pathname)) return next();
          const file = safeChild(publicPetRoot, ...pathname.slice(1).split("/"));
          if (!await exists(file)) return next();
          const data = await readFile(file);
          res.statusCode = 200;
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Content-Length", String(data.length));
          res.setHeader("Cache-Control", "no-cache");
          res.end(req.method === "HEAD" ? undefined : data);
        } catch {
          next();
        }
      });
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
          const parseAsset = (src, label) => {
            const relativeAsset = typeof src === "string" && src.startsWith(publicPrefix) ? src.slice(publicPrefix.length) : "";
            const match = petAssetPath.exec(relativeAsset);
            if (!match) throw new Error(`Đường dẫn ảnh không hợp lệ: ${label}`);
            return { src, folder: match[1] ?? "", file: match[2], relativeAsset };
          };
          const currentFileOf = ({ folder, file }) => safeChild(publicPetRoot, manifest.lineageId, levelFolder, folder, file);
          const next = structuredClone(manifest);
          const seenDest = new Set();
          const decoded = [];
          for (const upload of uploads) {
            const kind = upload?.kind === "combat" ? "combat" : upload?.kind === "layer" ? "layer" : "";
            const bindingId = typeof upload?.id === "string" ? upload.id : "";
            const current = parseAsset(upload?.src, "src hiện tại");
            const dest = parseAsset(upload?.destSrc ?? upload?.src, "src đích");
            if (dest.src !== current.src && !dest.folder) throw new Error(`${dest.file} phải nằm trong layers/ hoặc effects/ khi tách file dùng chung`);
            if (seenDest.has(dest.src)) throw new Error(`Trùng đích ${dest.src}`);
            seenDest.add(dest.src);
            if (kind === "layer") {
              const layer = next.layers.find((item) => item.id === bindingId);
              if (!layer || layer.src !== current.src) throw new Error(`Layer ${bindingId || "?"} không khớp ảnh hiện tại`);
              layer.src = dest.src;
            } else if (kind === "combat") {
              const attackSrc = next.effects?.attack?.[bindingId];
              const legacyProjectile = bindingId === "projectile" ? next.effects?.projectile : undefined;
              if (attackSrc !== current.src && legacyProjectile !== current.src) throw new Error(`Combat VFX ${bindingId || "?"} không khớp ảnh hiện tại`);
              next.effects ??= {};
              if (attackSrc === current.src) {
                next.effects.attack ??= {};
                next.effects.attack[bindingId] = dest.src;
              }
              if (legacyProjectile === current.src) next.effects.projectile = dest.src;
            } else {
              throw new Error("Thiếu kind layer hoặc combat khi thay ảnh");
            }
            const currentFile = currentFileOf(current);
            if (!await exists(currentFile)) throw new Error(`Không tìm thấy ảnh production ${current.src}`);
            const destFile = currentFileOf(dest);
            const source = decodePng(upload.sourceDataUrl, dest.file);
            const runtime = decodePng(upload.runtimeDataUrl, `${dest.file} runtime`);
            if (await exists(destFile)) {
              const existing = decodePng(`data:image/png;base64,${(await readFile(destFile)).toString("base64")}`, `${dest.file} hiện tại`);
              if (runtime.width !== existing.width || runtime.height !== existing.height) {
                throw new Error(`${dest.file} runtime phải giữ kích thước ${existing.width}×${existing.height}`);
              }
            }
            decoded.push({
              dest: dest.src,
              folder: dest.folder,
              file: dest.file,
              currentFile,
              destFile,
              destExists: await exists(destFile),
              sourceData: source.data,
              runtimeData: runtime.data,
            });
          }
          const destCounts = new Map();
          const bumpDest = (src) => {
            if (!src) return;
            destCounts.set(src, (destCounts.get(src) ?? 0) + 1);
          };
          for (const layer of next.layers) bumpDest(layer.src);
          const attack = { ...next.effects?.attack };
          if (!attack.projectile && next.effects?.projectile) attack.projectile = next.effects.projectile;
          for (const src of Object.values(attack)) bumpDest(src);
          for (const upload of decoded) {
            if ((destCounts.get(upload.dest) ?? 0) !== 1) {
              throw new Error(`Đích ${upload.dest} đang bị layer hoặc VFX khác dùng`);
            }
          }
          const revision = new Date().toISOString().replace(/\D/g, "").slice(0, 17);
          const revisionRoot = safeChild(inboxRoot, manifest.lineageId, levelFolder, "replacements", revision);
          const writtenFiles = [];
          for (const upload of decoded) {
            const revisionFolder = upload.folder || "root";
            const sourceFolder = safeChild(revisionRoot, "source", revisionFolder);
            const previousFolder = safeChild(revisionRoot, "previous-runtime", revisionFolder);
            await mkdir(sourceFolder, { recursive: true });
            await mkdir(previousFolder, { recursive: true });
            await mkdir(safeChild(publicPetRoot, manifest.lineageId, levelFolder, upload.folder || "."), { recursive: true });
            await writeFile(safeChild(sourceFolder, upload.file), upload.sourceData);
            await copyFile(upload.destExists ? upload.destFile : upload.currentFile, safeChild(previousFolder, upload.file));
            if (!upload.destExists) {
              const inboxFile = safeChild(inboxRoot, manifest.lineageId, levelFolder, upload.folder, upload.file);
              if (!await exists(inboxFile)) {
                await mkdir(safeChild(inboxRoot, manifest.lineageId, levelFolder, upload.folder), { recursive: true });
                server.watcher.unwatch(inboxFile);
                await writeFile(inboxFile, upload.sourceData);
                writtenFiles.push(inboxFile);
              }
            }
            server.watcher.unwatch(upload.destFile);
            await writeFile(upload.destFile, upload.runtimeData);
            writtenFiles.push(upload.destFile);
          }
          const manifestChanged = JSON.stringify(next) !== JSON.stringify(manifest);
          if (manifestChanged) {
            const manifestFile = safeChild(manifestRoot, manifest.lineageId, levelFolder, "asset.json");
            server.watcher.unwatch(manifestFile);
            await writeFile(manifestFile, JSON.stringify(next, null, 2) + "\n", "utf8");
            writtenFiles.push(manifestFile);
          }
          for (const file of writtenFiles) server.watcher.add(file);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, revision, replaced: decoded.map((item) => item.dest) }));
        } catch (error) {
          res.statusCode = 400;
          res.end(error instanceof Error ? error.message : "Could not replace pet images");
        }
      });
      server.middlewares.use("/__asset-studio/add-pet-images", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        try {
          const body = await readJsonBody(req);
          const id = typeof body.id === "string" ? body.id : "";
          const manifest = body.manifest;
          const uploads = body.uploads;
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || manifest?.id !== id || manifest?.kind !== "pet" || !Array.isArray(manifest?.layers) || !Array.isArray(uploads) || !uploads.length) {
            throw new Error("Gói thêm asset không hợp lệ");
          }
          const current = (await readPetManifests()).find((item) => item.id === id);
          if (!current) throw new Error(`Không tìm thấy pet ${id}`);
          if (manifest.lineageId !== current.lineageId || manifest.evolutionLevel !== current.evolutionLevel || manifest.extends !== current.extends || !knownRigs.has(manifest.extends)) {
            throw new Error("Không được đổi danh tính, level hoặc rig khi thêm asset");
          }
          const levelFolder = `level-${current.evolutionLevel}`;
          const publicPrefix = `/assets/pets/${current.lineageId}/${levelFolder}/`;
          const sourcesOf = (item) => new Set([
            ...item.layers.map((layer) => layer.src),
            item.effects?.projectile,
            ...Object.values(item.effects?.attack ?? {}),
          ].filter((src) => typeof src === "string"));
          const previousSources = sourcesOf(current);
          const nextSources = sourcesOf(manifest);
          if ([...nextSources].some((src) => !src.startsWith(publicPrefix))) throw new Error("Manifest chứa đường dẫn ảnh ngoài pet");
          if ([...previousSources].some((src) => !nextSources.has(src))) throw new Error("Chức năng này chỉ thêm asset, không được xóa binding hiện có");
          const seen = new Set();
          const decoded = [];
          for (const upload of uploads) {
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.png$/.test(upload?.file) || !["layers", "effects"].includes(upload?.folder)) throw new Error("Tên file upload không hợp lệ");
            const src = `${publicPrefix}${upload.folder}/${upload.file}`;
            if (seen.has(src) || previousSources.has(src) || !nextSources.has(src)) throw new Error(`Asset mới không hợp lệ: ${src}`);
            seen.add(src);
            const inboxFile = safeChild(inboxRoot, current.lineageId, levelFolder, upload.folder, upload.file);
            const publicFile = safeChild(publicPetRoot, current.lineageId, levelFolder, upload.folder, upload.file);
            if (await exists(inboxFile) || await exists(publicFile)) throw new Error(`${src} đã tồn tại`);
            decoded.push({
              file: upload.file,
              folder: upload.folder,
              inboxFile,
              publicFile,
              sourceData: decodePng(upload.sourceDataUrl, upload.file).data,
              runtimeData: decodePng(upload.runtimeDataUrl, `${upload.file} runtime`).data,
            });
          }
          const manifestFile = safeChild(manifestRoot, current.lineageId, levelFolder, "asset.json");
          const writtenFiles = [];
          for (const upload of decoded) {
            await mkdir(safeChild(inboxRoot, current.lineageId, levelFolder, upload.folder), { recursive: true });
            await mkdir(safeChild(publicPetRoot, current.lineageId, levelFolder, upload.folder), { recursive: true });
            server.watcher.unwatch(upload.inboxFile);
            server.watcher.unwatch(upload.publicFile);
            await writeFile(upload.inboxFile, upload.sourceData);
            await writeFile(upload.publicFile, upload.runtimeData);
            writtenFiles.push(upload.inboxFile, upload.publicFile);
          }
          server.watcher.unwatch(manifestFile);
          await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");
          for (const file of [...writtenFiles, manifestFile]) server.watcher.add(file);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, added: [...seen] }));
        } catch (error) {
          res.statusCode = 400;
          res.end(error instanceof Error ? error.message : "Could not add pet images");
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
  plugins: [react(), assetManifestApi()],
  server: {
    // Cloudflare quick tunnels use random *.trycloudflare.com hosts
    allowedHosts: [".trycloudflare.com"],
    watch: {
      ignored: ["**/assets/pets/**/asset.json"],
    },
  },
});
