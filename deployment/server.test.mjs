import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createSiteServer, originalDownloadUrl } from "./server.mjs";

test("serves both pages, supports downloads and ranges, and protects private originals with a cached identity token", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "birthday-server-"));
  const fixtureFiles = {
    "index.html": "<title>Thank You</title>",
    "gallery.html": "<title>Photo Gallery</title>",
    "photo.jpg": "0123456789",
    "server.mjs": "server implementation",
    "collections.json": "[]",
  };
  for (const [name, value] of Object.entries(fixtureFiles)) await writeFile(join(root, name), value);
  let tokenRequests = 0;
  const photoRequests = [];
  const server = createSiteServer({
    rootDirectory: root,
    originalsBaseUrl: "https://private.example/birthday-originals",
    identityEndpoint: "http://identity.local/token",
    identityHeader: "test-platform-identity-header",
    fetchImpl: async (url, options) => {
      if (String(url).startsWith("http://identity.local/")) {
        tokenRequests++;
        assert.equal(options.headers["X-IDENTITY-HEADER"], "test-platform-identity-header");
        assert.equal(new URL(url).searchParams.get("resource"), "https://storage.azure.com/");
        return Response.json({ access_token: "test-access-token", expires_on: Math.floor(Date.now() / 1000) + 3600 });
      }
      assert.equal(url, "https://private.example/birthday-originals/VIJ00365.JPG");
      assert.equal(options.headers.Authorization, "Bearer test-access-token");
      photoRequests.push(options);
      if (options.method === "HEAD") return new Response(null, { headers: { "content-length": "10", "content-type": "image/jpeg" } });
      if (options.headers.range) return new Response("2345", { status: 206, headers: { "content-range": "bytes 2-5/10", "content-type": "image/jpeg" } });
      return new Response("0123456789", { headers: { "content-length": "10", "content-type": "image/jpeg" } });
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    for (const name of Object.keys(fixtureFiles)) await unlink(join(root, name));
    await rmdir(root);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.match(await (await fetch(base + "/")).text(), /Thank You/);
  assert.match(await (await fetch(base + "/gallery.html")).text(), /Photo Gallery/);
  assert.equal((await fetch(base + "/missing.html")).status, 404);
  assert.equal((await fetch(base + "/server.mjs")).status, 404);
  const manifest = await fetch(base + "/collections.json", { headers: { "Accept-Encoding": "gzip" } });
  assert.equal(manifest.headers.get("Content-Encoding"), "gzip");
  assert.equal(manifest.headers.get("Vary"), "Accept-Encoding");
  assert.equal(manifest.headers.get("Cache-Control"), "no-cache");
  assert.deepEqual(await manifest.json(), []);
  assert.equal((await fetch(base + "/", { method: "POST" })).status, 405);
  const staticRange = await fetch(base + "/photo.jpg", { headers: { Range: "bytes=2-5" } });
  assert.equal(staticRange.status, 206);
  assert.equal(await staticRange.text(), "2345");
  assert.equal((await fetch(base + "/photo.jpg", { headers: { Range: "bytes=40-50" } })).status, 416);
  const original = base + "/images/devansh-birthday/originals/VIJ00365.JPG";
  assert.equal(await (await fetch(original)).text(), "0123456789");
  assert.equal((await fetch(original, { method: "HEAD" })).headers.get("content-length"), "10");
  const originalRange = await fetch(original, { headers: { Range: "bytes=2-5" } });
  assert.equal(originalRange.status, 206);
  assert.equal(await originalRange.text(), "2345");
  assert.equal(tokenRequests, 1);
  assert.equal(photoRequests.length, 3);
  assert.equal((await fetch(base + "/images/devansh-birthday/originals/bad%2Ffile.JPG")).status, 404);
  assert.equal((await fetch(base + "/%E0%A4%A")).status, 400);
});

test("direct originals use HTTPS read-only links with the correct download filename and short expiry", () => {
  const now = Date.parse("2026-10-30T12:00:00Z");
  const key = {
    SignedOid: "test-object", SignedTid: "test-tenant", SignedStart: "2026-10-30T11:00:00Z",
    SignedExpiry: "2026-10-30T18:00:00Z", SignedService: "b", SignedVersion: "2023-11-03",
    Value: Buffer.from("test-signing-key").toString("base64"),
  };
  const download = new URL(originalDownloadUrl("https://photos.blob.core.windows.net/birthday-originals", "VIJ00365.JPG", key, true, now));
  assert.equal(download.protocol, "https:");
  assert.equal(download.searchParams.get("sp"), "r");
  assert.equal(download.searchParams.get("sr"), "b");
  assert.equal(download.searchParams.get("se"), "2026-10-30T12:30:00Z");
  assert.equal(download.searchParams.get("rscd"), 'attachment; filename="VIJ00365.JPG"');
  assert.ok(download.searchParams.get("sig"));
  const view = new URL(originalDownloadUrl("https://photos.blob.core.windows.net/birthday-originals", "VIJ00365.JPG", key, false, now));
  assert.equal(view.searchParams.get("rscd"), 'inline; filename="VIJ00365.JPG"');
  assert.notEqual(view.searchParams.get("sig"), download.searchParams.get("sig"));
});

test("download routes redirect directly to storage and cache the delegation key", async (context) => {
  let tokenRequests = 0;
  let keyRequests = 0;
  const key = {
    SignedOid: "test-object", SignedTid: "test-tenant", SignedStart: new Date(Date.now() - 600_000).toISOString(),
    SignedExpiry: new Date(Date.now() + 6 * 3600_000).toISOString(), SignedService: "b", SignedVersion: "2023-11-03",
    Value: Buffer.from("test-signing-key").toString("base64"),
  };
  const server = createSiteServer({
    originalsBaseUrl: "https://photos.blob.core.windows.net/birthday-originals",
    identityEndpoint: "http://identity.local/token", identityHeader: "test-header", directOriginalDownloads: true,
    fetchImpl: async (url, options) => {
      if (String(url).startsWith("http://identity.local/")) {
        tokenRequests++;
        return Response.json({ access_token: "test-token", expires_on: Math.floor(Date.now() / 1000) + 3600 });
      }
      if (new URL(url).searchParams.get("comp") === "userdelegationkey") {
        keyRequests++;
        assert.equal(options.method, "POST");
        assert.equal(options.headers.Authorization, "Bearer test-token");
        return new Response(`<UserDelegationKey>${Object.entries(key).map(([name, value]) => `<${name}>${value}</${name}>`).join("")}</UserDelegationKey>`);
      }
      assert.equal(options.method, "HEAD", "Full image bytes must be delivered directly by storage");
      return new Response(null, { headers: { "Content-Length": "10", "Content-Type": "image/jpeg" } });
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const original = `http://127.0.0.1:${server.address().port}/images/devansh-birthday/originals/VIJ00365.JPG`;
  for (const download of [false, true]) {
    const response = await fetch(original + (download ? "?download=1" : ""), { redirect: "manual" });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const target = new URL(response.headers.get("location"));
    assert.equal(target.hostname, "photos.blob.core.windows.net");
    assert.equal(target.searchParams.get("rscd"), `${download ? "attachment" : "inline"}; filename="VIJ00365.JPG"`);
    assert.equal(await response.text(), "");
  }
  assert.equal((await fetch(original, { method: "HEAD" })).headers.get("content-length"), "10");
  assert.equal(tokenRequests, 1);
  assert.equal(keyRequests, 1);
});

test("collection files and ZIP64 archives redirect only for published ready files with original names and suitable lifetimes", async (context) => {
  const collection = {
    title: "Family Collection", archiveBlob: "collections/family/archives/Family Collection.zip", archiveReady: true,
    files: [
      { filename: "Devansh’s Photo.JPG", blob: "collections/family/originals/Photos/Devansh’s Photo.JPG", kind: "photo", ready: true, previewReady: true, thumbnailBlob: "collections/family/thumbnails/one.jpg", previewBlob: "collections/family/previews/one.jpg" },
      { filename: "Birthday.mp4", blob: "collections/family/originals/Video/Birthday.mp4", kind: "video", ready: true },
      { filename: "Pending.JPG", blob: "collections/family/originals/Pending.JPG", kind: "photo", ready: false },
    ],
  };
  const key = {
    SignedOid: "test-object", SignedTid: "test-tenant", SignedStart: new Date(Date.now() - 600_000).toISOString(),
    SignedExpiry: new Date(Date.now() + 12 * 3600_000).toISOString(), SignedService: "b", SignedVersion: "2023-11-03",
    Value: Buffer.from("test-signing-key").toString("base64"),
  };
  let storageReads = 0;
  const server = createSiteServer({
    originalsBaseUrl: "https://photos.blob.core.windows.net/birthday-originals",
    collectionManifest: [collection], identityEndpoint: "http://identity.local/token", identityHeader: "test-header",
    fetchImpl: async (url) => {
      if (String(url).startsWith("http://identity.local/")) return Response.json({ access_token: "test-token", expires_on: Math.floor(Date.now() / 1000) + 3600 });
      assert.equal(new URL(url).searchParams.get("comp"), "userdelegationkey");
      storageReads++;
      return new Response(`<UserDelegationKey>${Object.entries(key).map(([name, value]) => `<${name}>${value}</${name}>`).join("")}</UserDelegationKey>`);
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}/collection-media/`;
  for (const [blob, minutes] of [[collection.files[0].blob, 30], [collection.files[1].blob, 240], [collection.archiveBlob, 360]]) {
    const response = await fetch(base + blob.split("/").map(encodeURIComponent).join("/") + "?download=1", { redirect: "manual" });
    assert.equal(response.status, 302);
    const target = new URL(response.headers.get("location"));
    assert.equal(decodeURIComponent(target.pathname), "/birthday-originals/" + blob);
    assert.equal(target.searchParams.get("sp"), "r");
    const lifetime = (Date.parse(target.searchParams.get("se")) - Date.now()) / 60_000;
    assert.ok(lifetime > minutes - 1 && lifetime <= minutes);
    assert.match(target.searchParams.get("rscd"), /^attachment;/);
    if (blob.includes("Devansh’s")) assert.ok(target.searchParams.get("rscd").includes("filename*=UTF-8''Devansh%E2%80%99s%20Photo.JPG"));
    assert.equal(await response.text(), "");
  }
  assert.equal(storageReads, 1, "No original file or archive bytes should pass through the website");
  assert.equal((await fetch(base + collection.files[2].blob, { redirect: "manual" })).status, 404);
  assert.equal((await fetch(base + "collections/family/private.txt", { redirect: "manual" })).status, 404);
  assert.equal((await fetch(base + collection.files[0].thumbnailBlob, { redirect: "manual" })).status, 302);
});
