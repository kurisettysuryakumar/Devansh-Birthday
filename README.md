# Wonderful Carnival of Devansh

A premium vintage circus-themed invitation website for Devansh’s first birthday celebration.

## Overview

This project keeps the frontend and backend separate:

- Frontend: React + Vite + JavaScript + CSS
- Backend: Java + Spring Boot + MongoDB
- Purpose: interactive invitation site with celebration details, eight photo highlights, videos, ticket CTA, and share options

## Frontend setup

```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

The app runs locally at:

- http://localhost:5173/

To build for production:

```powershell
cd frontend
npm run build
```

## Backend setup

```powershell
cd backend
mvn spring-boot:run
```

## MongoDB configuration

Set your MongoDB connection via environment variables or a local `.env` file. Example:

```powershell
set MONGODB_URI=mongodb://127.0.0.1:27017/birthday-event-planner
set PORT=8080
```

## Event and media configuration

The existing central app config is:

- `frontend/src/config/eventConfig.js`

It manages event information, video sources, and the eight `featuredBirthdayPhotos` shown on the home page.

## Home page photos

The home page keeps eight hand-picked birthday highlights in a four-column, two-row grid. Clicking a photo opens the preview viewer with keyboard, swipe, and slideshow controls. Downloads use the same lightweight preview photo.

The standalone gallery page and its links have been removed. Only the eight selected JPEGs remain under `frontend/public/images/devansh-birthday/previews/`; the bulk originals, unused previews, thumbnails, pre-birthday gallery images, and collection manifest are no longer bundled. Vite builds only `index.html`.

A new external gallery can be linked from `GalleryPreview.jsx` when it is ready. Keep its original media outside this site's `public` directory to keep builds small. Legacy gallery import, collection upload, sync, and download-verification scripts are retained for reference and should not be run against this home-only site.

## Azure production hosting

Build with `npm run build` in `frontend`. The existing `deployment/server.mjs` can serve the resulting `frontend/dist` directory. Its App Service startup command is `node /home/site/wwwroot/server.mjs`.

`scripts/package-azure-sites.py` packages the built frontend and server without requiring the removed gallery manifest. The script also supports the existing Meenakshi checkout when present. Use a full deployment with cleanup when publishing this removal: code-only patches and deployments with `--clean false` retain old gallery files and media on the host.

The gallery removal in this checkout does not delete media already stored in Azure Blob Storage.

## Add videos

Local MP4 files are detected automatically when present:

- Pre-birthday shoot: `frontend/public/videos/pre-birthday-shoot.mp4`
- Krishna theme: `frontend/public/videos/krishna-theme.mp4`

Leave `preBirthdayVideoUrl` and `krishnaVideoUrl` empty to use those local files. To use YouTube instead, paste its URL into the corresponding field in `frontend/src/config/eventConfig.js`; for example:

```js
preBirthdayVideoUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
krishnaVideoUrl: "",
```

The video sections use native playback controls for local MP4 files and an embedded player for YouTube. They never autoplay, and keep the designed placeholder visible when media is not available.

## Preview locally

From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173/). To test the production build locally:

```powershell
npm run build
npm run preview
```

## Publish media through GitHub and the existing pipeline

The repository’s `azure-pipelines.yml` triggers on pushes to the `main` branch, builds `frontend`, then stages `frontend/dist/**` together with `backend/**` as the `birthday-event-planner` build artifact. Vite copies files from `frontend/public/` into `frontend/dist/`, so committed images and videos are included in that artifact.

1. Add the media files under `frontend/public/images/` or `frontend/public/videos/`, then update the appropriate entries in `frontend/src/config/eventConfig.js`.
2. Run `npm run build` in `frontend` and check the changes.
3. Commit and push the changes to GitHub, including to `main` to trigger the configured Azure Pipelines build.
4. In Azure Pipelines, confirm the run succeeded and download or inspect its `birthday-event-planner` artifact.
5. Deploy that artifact using the existing hosting/deployment setup. The checked-in pipeline publishes an artifact; it does not itself include a deployment task, so do not expect a GitHub push alone to deploy the site unless a separate deployment stage or service connection is configured.

The frontend build and asset setup does not replace or modify the existing Java/Spring Boot and MongoDB backend. Never commit MongoDB credentials or other secrets.

## Local run summary

```powershell
cd frontend
npm run dev -- --host 0.0.0.0
```

Then open:

- http://localhost:5173/
