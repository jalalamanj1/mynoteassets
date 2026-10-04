# Mynote Assets — Admin Website

Static admin portal for browsing and uploading assets. The site is served from
`site/` and the serverless API lives in `functions/` (Cloudflare Pages Functions).

## What it does

- **Login** — admin-only access (username / password checked server-side).
- **Browse** — shows every file in `diagrams/<Subject>/` live from the repo
  (images render as thumbnails, other files as download links).
- **Upload** — after login, any file can be uploaded to a subject/category.
  The file is committed directly into this repo under `diagrams/<Subject>/…`,
  so it is stored permanently and picked up by the Cag Note app automatically.

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