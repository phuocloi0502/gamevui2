import { defineConfig } from "vite";
import { resolve, relative } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const manifestRoot = resolve(process.cwd(), "assets/pets");

function assetManifestApi() {
  return {
    name: "asset-manifest-api",
    handleHotUpdate({ file }) {
      // The editor already applies transform changes to the live PetView.
      // Do not let saving the imported manifest trigger a full page reload.
      if (file.startsWith(manifestRoot) && file.endsWith("/asset.json")) return [];
    },
    configureServer(server) {
      server.middlewares.use("/__asset-studio/save-manifest", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const id = typeof body.id === "string" ? body.id : "";
          const manifest = body.manifest;
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !manifest || manifest.id !== id) {
            res.statusCode = 400;
            res.end("Invalid manifest");
            return;
          }
          const file = resolve(manifestRoot, id, "asset.json");
          if (relative(manifestRoot, file).startsWith("..")) {
            res.statusCode = 400;
            res.end("Invalid manifest path");
            return;
          }
          server.watcher.unwatch(file);
          await mkdir(resolve(manifestRoot, id), { recursive: true });
          await writeFile(file, JSON.stringify(manifest, null, 2) + "\n", "utf8");
          server.watcher.add(file);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, path: `assets/pets/${id}/asset.json` }));
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
