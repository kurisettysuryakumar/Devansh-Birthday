import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHmac } from "node:crypto";
import { gzipSync } from "node:zlib";

const originalPrefix = "/images/devansh-birthday/originals/";
const contentTypes = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".ico": "image/x-icon",
};

export function originalDownloadUrl(baseUrl, filename, key, download, now = Date.now(), { lifetimeMinutes = 30, downloadName = filename } = {}) {
  const blob = new URL(`${baseUrl.replace(/\/$/, "")}/${filename.split("/").map(encodeURIComponent).join("/")}`);
  const start = new Date(now - 5 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const expiry = new Date(Math.min(now + lifetimeMinutes * 60_000, Date.parse(key.SignedExpiry) - 60_000)).toISOString().replace(/\.\d{3}Z$/, "Z");
  const safeName = downloadName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const disposition = `${download ? "attachment" : "inline"}; filename="${safeName}"${safeName !== downloadName ? `; filename*=UTF-8''${encodeURIComponent(downloadName)}` : ""}`;
  const version = "2023-11-03";
  const fields = [
    "r", start, expiry, `/blob/${blob.hostname.split(".")[0]}${decodeURIComponent(blob.pathname)}`,
    key.SignedOid, key.SignedTid, key.SignedStart, key.SignedExpiry, key.SignedService, key.SignedVersion,
    "", "", "", "", "https", version, "b", "", "", "", disposition, "", "", "",
  ];
  const signature = createHmac("sha256", Buffer.from(key.Value, "base64")).update(fields.join("\n")).digest("base64");
  const parameters = {
    sp: "r", st: start, se: expiry, skoid: key.SignedOid, sktid: key.SignedTid,
    skt: key.SignedStart, ske: key.SignedExpiry, sks: key.SignedService, skv: key.SignedVersion,
    spr: "https", sv: version, sr: "b", rscd: disposition, sig: signature,
  };
  blob.search = new URLSearchParams(parameters).toString();
  return blob.href;
}

export function createSiteServer({
  rootDirectory = dirname(fileURLToPath(import.meta.url)),
  originalsBaseUrl = process.env.BIRTHDAY_ORIGINALS_BASE_URL,
  identityEndpoint = process.env.IDENTITY_ENDPOINT,
  identityHeader = process.env.IDENTITY_HEADER,
  directOriginalDownloads = process.env.BIRTHDAY_DIRECT_DOWNLOADS === "true",
  collectionManifest,
  fetchImpl = fetch,
} = {}) {
  const root = resolve(rootDirectory);
  let identityToken;
  let tokenRequest;
  let delegationKey;
  let delegationRequest;
  let collectionCache;
  let collectionModified;
  let compressedManifest;

  async function collectionResources() {
    let collections = collectionManifest;
    if (!collections) {
      const path = resolve(root, "collections.json");
      let file;
      try { file = await stat(path); } catch (error) {
        if (error.code === "ENOENT") return new Map();
        throw error;
      }
      if (collectionCache && collectionModified === file.mtimeMs) return collectionCache;
      collections = JSON.parse(await readFile(path, "utf8"));
      collectionModified = file.mtimeMs;
    }
    const resources = new Map();
    for (const collection of collections) {
      for (const file of collection.files) {
        if (file.ready) resources.set(file.blob, { filename: file.filename, lifetimeMinutes: ["video", "audio"].includes(file.kind) ? 240 : 30 });
        if (file.previewReady) for (const blob of [file.thumbnailBlob, file.previewBlob]) resources.set(blob, { filename: file.filename, lifetimeMinutes: 30 });
      }
      if (collection.archiveReady) resources.set(collection.archiveBlob, { filename: `${collection.title}.zip`, lifetimeMinutes: 360 });
    }
    collectionCache = resources;
    return resources;
  }

  async function storageToken() {
    if (identityToken && identityToken.expiresAt > Date.now() + 300_000) return identityToken.value;
    if (!identityEndpoint || !identityHeader) throw new Error("Storage identity is unavailable");
    if (!tokenRequest) {
      tokenRequest = (async () => {
        const endpoint = new URL(identityEndpoint);
        endpoint.searchParams.set("resource", "https://storage.azure.com/");
        endpoint.searchParams.set("api-version", "2019-08-01");
        const response = await fetchImpl(endpoint, {
          headers: { "X-IDENTITY-HEADER": identityHeader },
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`Identity returned HTTP ${response.status}`);
        const result = await response.json();
        if (!result.access_token) throw new Error("Identity returned no access token");
        identityToken = { value: result.access_token, expiresAt: Number(result.expires_on) * 1000 };
        return identityToken.value;
      })().finally(() => { tokenRequest = null; });
    }
    return tokenRequest;
  }

  async function signingKey(minimumMinutes = 30) {
    if (delegationKey && Date.parse(delegationKey.SignedExpiry) > Date.now() + (minimumMinutes + 5) * 60_000) return delegationKey;
    if (!delegationRequest) {
      delegationRequest = (async () => {
        const endpoint = new URL(originalsBaseUrl);
        endpoint.pathname = "/";
        endpoint.search = "restype=service&comp=userdelegationkey";
        const start = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
        const expiry = new Date(Date.now() + 12 * 3600_000).toISOString().replace(/\.\d{3}Z$/, "Z");
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${await storageToken()}`, "x-ms-version": "2023-11-03", "Content-Type": "application/xml" },
          body: `<KeyInfo><Start>${start}</Start><Expiry>${expiry}</Expiry></KeyInfo>`,
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`Storage signing returned HTTP ${response.status}`);
        const xml = await response.text();
        const parsed = {};
        for (const name of ["SignedOid", "SignedTid", "SignedStart", "SignedExpiry", "SignedService", "SignedVersion", "Value"]) {
          const value = new RegExp(`<${name}>([^<]+)</${name}>`).exec(xml)?.[1];
          if (!value) throw new Error("Storage signing returned an incomplete key");
          parsed[name] = value;
        }
        delegationKey = parsed;
        return parsed;
      })().finally(() => { delegationRequest = null; });
    }
    return delegationRequest;
  }

  return createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      if (pathname === "/healthz") {
        response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        response.end(request.method === "HEAD" ? undefined : '{"status":"ok"}');
        return;
      }

      if (pathname.startsWith("/collection-media/")) {
        const blob = pathname.slice("/collection-media/".length);
        const resource = (await collectionResources()).get(blob);
        if (!resource || !originalsBaseUrl) { response.writeHead(404).end(); return; }
        const download = new URL(request.url, "http://localhost").searchParams.get("download") === "1";
        const location = originalDownloadUrl(originalsBaseUrl, blob, await signingKey(resource.lifetimeMinutes), download, Date.now(), {
          lifetimeMinutes: resource.lifetimeMinutes, downloadName: resource.filename,
        });
        response.writeHead(302, { Location: location, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" }).end();
        return;
      }

      if (originalsBaseUrl && pathname.startsWith(originalPrefix)) {
        const filename = pathname.slice(originalPrefix.length);
        if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\.(jpe?g|png|webp|tiff?|bmp)$/i.test(filename)) {
          response.writeHead(404).end();
          return;
        }
        if (directOriginalDownloads && request.method === "GET") {
          const download = new URL(request.url, "http://localhost").searchParams.get("download") === "1";
          let location;
          try {
            location = originalDownloadUrl(originalsBaseUrl, filename, await signingKey(), download);
          } catch (error) {
            // Keep downloads available while Azure permissions propagate or signing is temporarily unavailable.
            console.error(`Direct download unavailable; using the streaming fallback: ${error.message}`);
          }
          if (location) {
            response.writeHead(302, {
              Location: location, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer",
            }).end();
            return;
          }
        }
        const controller = new AbortController();
        response.once("close", () => controller.abort());
        const headers = {
          Authorization: `Bearer ${await storageToken()}`,
          "x-ms-version": "2023-11-03",
        };
        for (const name of ["range", "if-range", "if-none-match", "if-modified-since"]) {
          if (request.headers[name]) headers[name] = request.headers[name];
        }
        const upstream = await fetchImpl(`${originalsBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(filename)}`, {
          method: request.method, headers, signal: controller.signal, redirect: "error",
        });
        if (![200, 206, 304, 404, 416].includes(upstream.status)) {
          await upstream.body?.cancel();
          throw new Error(`Photo storage returned HTTP ${upstream.status}`);
        }
        if (upstream.status === 404) {
          await upstream.body?.cancel();
          response.writeHead(404, { "Content-Type": "text/plain" }).end("Photo not found");
          return;
        }
        const outgoing = { "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" };
        for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
          const value = upstream.headers.get(name);
          if (value) outgoing[name] = value;
        }
        response.writeHead(upstream.status, outgoing);
        if (request.method === "HEAD" || !upstream.body) {
          await upstream.body?.cancel();
          response.end();
        } else {
          await pipeline(Readable.fromWeb(upstream.body), response);
        }
        return;
      }

      const filePath = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!filePath.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      let file;
      try { file = await stat(filePath); } catch (error) {
        if (["ENOENT", "ENOTDIR"].includes(error.code)) { response.writeHead(404).end(); return; }
        throw error;
      }
      if (!file.isFile() || filePath === resolve(root, "server.mjs")) {
        response.writeHead(404).end();
        return;
      }
      const etag = `"${file.size}-${Math.trunc(file.mtimeMs)}"`;
      const extension = extname(filePath).toLowerCase();
      const headers = {
        "Content-Type": contentTypes[extension] || "application/octet-stream",
        "Cache-Control": extension === ".html" || pathname === "/collections.json" ? "no-cache" : "public, max-age=3600",
        "Last-Modified": file.mtime.toUTCString(), ETag: etag,
        "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff",
        ...(pathname === "/collections.json" ? { Vary: "Accept-Encoding" } : {}),
      };
      if (request.headers["if-none-match"] === etag) {
        response.writeHead(304, headers).end();
        return;
      }
      if (pathname === "/collections.json" && /\bgzip\b/.test(request.headers["accept-encoding"] || "")) {
        if (compressedManifest?.etag !== etag) compressedManifest = { etag, body: gzipSync(await readFile(filePath)) };
        response.writeHead(200, { ...headers, "Content-Encoding": "gzip", Vary: "Accept-Encoding", "Content-Length": compressedManifest.body.length });
        response.end(request.method === "HEAD" ? undefined : compressedManifest.body);
        return;
      }
      let start = 0;
      let end = file.size - 1;
      let status = 200;
      if (request.headers.range && (!request.headers["if-range"] || request.headers["if-range"] === etag)) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if (!range || (!range[1] && !range[2])) {
          response.writeHead(416, { "Content-Range": `bytes */${file.size}` }).end();
          return;
        }
        if (!range[1]) start = Math.max(0, file.size - Number(range[2]));
        else {
          start = Number(range[1]);
          if (range[2]) end = Math.min(end, Number(range[2]));
        }
        if (start > end || start >= file.size) {
          response.writeHead(416, { "Content-Range": `bytes */${file.size}` }).end();
          return;
        }
        status = 206;
        headers["Content-Range"] = `bytes ${start}-${end}/${file.size}`;
      }
      headers["Content-Length"] = Math.max(0, end - start + 1);
      response.writeHead(status, headers);
      if (request.method === "HEAD" || !file.size) response.end();
      else await pipeline(createReadStream(filePath, { start, end }), response);
    } catch (error) {
      if (!response.destroyed) {
        if (response.headersSent) response.destroy();
        else response.writeHead(error instanceof URIError ? 400 : 502, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("Unable to load this resource. Please try again shortly.");
      }
      if (error.name !== "AbortError" && error.code !== "ERR_STREAM_PREMATURE_CLOSE") console.error(error.message);
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  createSiteServer().listen(port, "0.0.0.0", () => console.log(`Birthday memories site listening on ${port}`));
}
