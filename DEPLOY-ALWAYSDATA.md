# Cash Society on AlwaysData (stable public link)

Use **AlwaysData for both the website and MySQL** so free remote DB hosts are never needed.

Public URL example: `https://cashsociety.alwaysdata.net`

---

## One-time setup (already done if the site exists)

### Site settings (Web → Sites)

| Field | Exact value |
|--------|-------------|
| Type | **Node.js** |
| Working directory | `cash_society` (folder from `git clone`) |
| Command | `node scripts/start-production.js` |
| Node version | **20** (or 18+) |

Environment (one line each — real values from Databases → MySQL):

```
NODE_ENV=production
DB_HOST=mysql-cashsociety.alwaysdata.net
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
DB_SSL=false
ADMIN_SECRET=your-secret-key
```

MySQL host/user/password/name must match **phpMyAdmin / MySQL**, not the SSH user.

---

## Update the site after every code change (always do this)

### On AlwaysData SSH

```bash
cd ~/cash_society
bash scripts/host-update.sh
```

That script:

1. Pulls latest `main` from GitHub  
2. Installs backend packages only (no heavy Vite build)  
3. Checks `backend/public` prebuilt UI is present  

### Then restart (required)

**Web → Sites → your site → Restart**

AlwaysData will **not** pick up new code until the site process is restarted.

### Check it worked

1. Open: `https://YOURNAME.alwaysdata.net/api/version`  
   - `commit` must match the latest push  
2. Open: `https://YOURNAME.alwaysdata.net/api/health`  
   - `"database":"connected"`  
3. Browser: **Ctrl+F5** on the dashboard  

If `/api/version` shows an **old commit**, the site is still running old files or the working directory is wrong.

---

## From your PC (when you change features)

```bash
npm run build
git add -A
git commit -m "describe change"
git push origin main
```

Then run the SSH `host-update.sh` + Restart steps above.

Never run `npm run build` on free AlwaysData — memory kills Vite. The built UI lives in `backend/public` on GitHub.

---

## Common problems

| Symptom | Fix |
|---------|-----|
| Dashboard looks old | Ctrl+F5 + confirm `/api/version` is new + **Restart site** |
| `git pull` says conflict | `bash scripts/host-update.sh` uses hard reset to origin/main |
| Database disconnected | Check DB_* env on the **site** (not only SSH) |
| Penalties not clearing | Record penalty with **for month** = late contribution month |
| 404 or API only | Working directory and start command from table above |

---

## Data on AlwaysData MySQL

Tables were imported earlier. Code updates do **not** change MySQL data.  
If a late penalty was saved under the wrong month, fix `transaction_month` in phpMyAdmin or re-record with the correct **Penalty is for** month.
