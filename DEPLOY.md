# Deploying FitSphere

Two free services + the MongoDB Atlas you already have:

- **Backend (Express API)** → [Render](https://render.com)
- **Frontend (React SPA)** → [Vercel](https://vercel.com)
- **Database** → MongoDB Atlas (already set up and seeded — same cluster as dev)

Deploy the **backend first** (you need its URL for the frontend), then the
frontend, then connect them. Sign up for both with your **personal** account.

> Atlas note: your cluster already allows access from anywhere (`0.0.0.0/0`),
> so Render can connect with no extra step. The demo accounts are already seeded
> (it's the same cloud DB you've been using).

---

## 1. Backend on Render

**Option A — Blueprint (uses the committed `render.yaml`):**
1. Render dashboard → **New + → Blueprint** → connect the `fitsphere` repo.
2. Render reads `render.yaml` and creates the `fitsphere-api` service.
3. Fill the secret env vars it prompts for:
   - `MONGODB_URI` → your Atlas connection string
   - `CLIENT_ORIGIN` → leave a placeholder for now (fill in after step 2)
   - (`JWT_*` secrets are auto-generated; TTLs are preset)
4. **Create** → wait for the build. Note the URL, e.g. `https://fitsphere-api.onrender.com`.
5. Verify: open `https://fitsphere-api.onrender.com/api/health` → `{"status":"ok",...}`.

**Option B — manual:** New + → **Web Service** → connect repo → set
**Root Directory** = `server`, **Build** = `npm install && npm run build`,
**Start** = `npm start`, then add the env vars from `server/.env.example`.

> Free tier sleeps after inactivity, so the first request after idle takes
> ~30s to wake. Fine for a demo — just mention it.

---

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import the `fitsphere` repo.
2. Set **Root Directory** = `client`. Framework preset: **Vite** (auto-detected).
   Build = `npm run build`, Output = `dist` (defaults are correct).
3. Add an **Environment Variable**:
   - `VITE_API_URL` = `https://fitsphere-api.onrender.com/api` (your Render URL + `/api`)
4. **Deploy.** Note the URL, e.g. `https://fitsphere.vercel.app`.

`vercel.json` already handles SPA routing (deep links / refresh won't 404).

---

## 3. Connect them (CORS)

1. Back in **Render** → `fitsphere-api` → **Environment** → set
   `CLIENT_ORIGIN` = your Vercel URL (e.g. `https://fitsphere.vercel.app`).
2. Save → Render redeploys. The API now accepts requests from your frontend.

Done. Visit the Vercel URL and log in with `member@fitsphere.app` / `password123`.

---

## Redeploys
Both platforms auto-deploy on every push to `main`. No manual steps after setup.

## Live links — add to README once up
- Frontend: `https://<your>.vercel.app`
- Update the README's "Live demo: _coming soon_" line.
