import { createRequire } from "node:module";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("../frontend/", import.meta.url));
const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { build } = require("esbuild");
const expectedContact = process.argv[2];
if (!expectedContact) throw new Error("Provide the contact number expected for this site.");

const result = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import assert from 'node:assert/strict';
      import App from './src/App.jsx';
      import { eventConfig, featuredBirthdayPhotos } from './src/config/eventConfig.js';

      assert.equal(eventConfig.date, '28 October 2026');
      assert.equal(eventConfig.time, '7:00 PM onwards');
      assert.equal(eventConfig.venue, 'Madhura Banquet Hall, Nagole, Hyderabad');
      assert.equal(eventConfig.eventDateTime, '2026-10-28T19:00:00+05:30');
      assert.deepEqual(eventConfig.contactNumbers, [${JSON.stringify(expectedContact)}]);
      assert.equal(featuredBirthdayPhotos.length, 8);
      assert.equal(new Set(featuredBirthdayPhotos.map(photo => photo.filename)).size, 8);
      const home = renderToStaticMarkup(React.createElement(App));
      assert.equal(home.split('class="gallery-preview__photo"').length - 1, 8);
      assert.ok(!home.includes('View all gallery'));
      assert.ok(!home.includes('gallery.html'));
      assert.ok(home.includes('href="#gallery"'));
      for (const photo of featuredBirthdayPhotos) {
        assert.ok(photo.url.endsWith(photo.filename));
        assert.ok(!photo.originalUrl);
        assert.ok(!photo.thumbnailUrl);
      }
      assert.ok(!home.includes('memory-nav'));
      assert.ok(home.includes('THANK YOU SO MUCH!'));
      assert.ok(home.includes('making Devansh'));
      assert.ok(home.includes('id="birthday-video"'));
      assert.equal(home.split('<h3>Coming Soon</h3>').length - 1, 2);
      for (const oldCopy of ['Open Invitation', 'Counting down to the magic', 'CLAIM YOUR TICKET', 'Let the celebration begin', 'Join us for a day']) {
        assert.ok(!home.includes(oldCopy), 'Outdated invitation copy: ' + oldCopy);
      }
      assert.ok(!home.includes('class="birthday-gallery__thumbnail"'));
      console.log('PASS: Eight home highlights, no standalone gallery links, thank-you copy, both coming-soon video sections, and original event/contact details.');
    `,
    resolveDir: frontendRoot,
    sourcefile: "memory-pages-check.mjs",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  write: false,
  loader: { ".css": "empty" },
});

new Function("require", result.outputFiles[0].text)(require);

const stylesheet = await readFile(new URL("../frontend/src/memory-pages.css", import.meta.url), "utf8");
if (!stylesheet.includes("grid-template-columns: repeat(4, minmax(0, 1fr))")) {
  throw new Error("The home gallery must use four columns.");
}
const html = await readFile(new URL("../frontend/dist/index.html", import.meta.url), "utf8");
if (!html.includes('type="module"')) throw new Error("Missing production home entry");
const output = new URL("../frontend/dist/", import.meta.url);
const files = await readdir(output, { recursive: true });
for (const obsolete of ["gallery.html", "collections.json", "images/devansh-birthday/originals", "images/devansh-birthday/thumbnails", "images/gallery"]) {
  if (files.some(file => file.replaceAll("\\", "/") === obsolete)) throw new Error(`Obsolete output: ${obsolete}`);
}
const previews = files.filter(file => /^images[\\/]devansh-birthday[\\/]previews[\\/].+\.jpg$/.test(file));
if (previews.length !== 8) throw new Error(`Expected 8 production photos, got ${previews.length}`);
const config = await import("../frontend/src/config/eventConfig.js");
for (const photo of config.featuredBirthdayPhotos) {
  const file = await stat(new URL(`../frontend/dist${photo.url}`, import.meta.url));
  if (!file.size) throw new Error(`Empty highlight: ${photo.filename}`);
}
console.log("PASS: Four-column layout, eight valid photo assets, and a home-only production build.");
