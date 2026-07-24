# Host Cash Society without Netlify (one free URL)

You do **not** need Netlify. Host **frontend + backend together** on **[Render](https://render.com)** (free).

After deploy you get one link, for example:

- App (admin): `https://cash-society.onrender.com`
- Members (view only): `https://cash-society.onrender.com/view`
- API health: `https://cash-society.onrender.com/api/health`

---

## 1) Free MySQL

1. Create a free MySQL at [Aiven](https://aiven.io) or [Railway](https://railway.app)
2. Run `database/schema-cloud.sql` on that database
3. Keep host / user / password / database / port ready

---

## 2) Deploy everything on Render

1. Put this project on **GitHub**
2. Open https://dashboard.render.com → **New** → **Web Service**
3. Connect the repo
4. Settings:
   - **Root Directory:** leave empty (project root)
   - **Build Command:** `npm run install:all && npm run build`
   - **Start Command:** `npm start`
5. Environment variables:

```
NODE_ENV=production
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
ADMIN_SECRET=cash-society-admin
```

6. Create Web Service → wait for deploy
7. Open the Render URL

**First load tip:** Render free tier sleeps when idle; the first visit can take ~1 minute.

---

## 3) How to use it

| Who | Link |
|-----|------|
| You (record / edit) | `https://YOUR-APP.onrender.com` → unlock with `cash-society-admin` |
| Members (view only) | `https://YOUR-APP.onrender.com/view` |

---

## Optional: Netlify later

If you still want Netlify for the UI only, see the older Netlify notes.  
**Recommended:** stay on Render only — fewer moving parts, one link, no `dist` upload.

---

## Local production test

```bash
npm run install:all
npm run build
npm start
```

Then open http://localhost:5000
