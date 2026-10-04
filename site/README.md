# Mynote Assets — Admin Website

Static admin portal for browsing and uploading assets. The site is served from
`site/` and the serverless API lives in `functions/` (Cloudflare Pages Functions).

## What it does

- **Login** — admin-only access (username / password checked server-side, session
  stored in an HttpOnly cookie).
- **Browse** — shows every file in `diagrams/<Subject>/` live from the repo
  (images render as thumbnails, other files as download links).
- **Upload** — after login, any file can be uploaded to a subject/category.
  The file is committed directly into this repo under `diagrams/<Subject>/…`,
  so it is stored permanently and picked up by the Cag Note app automatically.

> All content reads and writes go **through the serverless functions** using the
> GitHub token stored as a Cloudflare secret. This works even when the repo is
> **private** — the browser never talks to GitHub directly and never sees the token.

## Deploy on Cloudflare Pages

1. **Create a GitHub token** (for uploads to write to the repo):
   - GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token
   - Repository access: only `jalalamanj1/mynoteassets`
   - Permissions → Contents → **Read and write**
2. **Cloudflare dashboard** → Workers & Pages → Create → Pages → Connect to Git →
   select the `mynoteassets` repo.
3. **Build settings**:
   - Build command: *(leave empty)*
   - Build output directory: `site`
4. **Environment variables / secrets** (Settings → Environment variables):

   | Name | Value |
   | ---- | ----- |
   | `CAG_USER` | `cagadmin` |
   | `CAG_PASS` | your admin password |
   | `GITHUB_TOKEN` | the fine-grained token from step 1 |
   | `SESSION_SECRET` | any long random string (used to sign login sessions) |
   | `GITHUB_REPO` | `jalalamanj1/mynoteassets` *(optional)* |
   | `GITHUB_BRANCH` | `main` *(optional)* |

5. Deploy. The site URL is shown in the dashboard (e.g. `https://mynoteassets.pages.dev`).

> The admin password and GitHub token live only as Cloudflare secrets — they are
> never committed to the repo or visible in the browser.

## Local development

```
npx wrangler pages dev site
```

Secrets can be passed via `.dev.vars` (see Cloudflare docs) or set in the
Cloudflare dashboard.

## Troubleshooting

- **`/api/upload` returns 404** — the serverless functions are not deployed.
  Make sure you connected the repo with **Connect to Git** (not Direct Upload),
  and trigger a fresh deployment so the latest commit (which includes the
  `functions/` directory at the repo root) is live.
- **Browser shows 404s from `api.github.com`** — this only happens on old
  versions. The app no longer calls the GitHub API directly; everything goes
  through `/api/list` and `/api/file`. Redeploy the latest commit.
- **Can't log in / login fails** — confirm `CAG_USER` and `CAG_PASS` are set as
  environment variables in the Cloudflare Pages project settings.