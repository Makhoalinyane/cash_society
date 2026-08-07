# Host Cash Society — public link (AlwaysData)

**Main guide:** [DEPLOY-ALWAYSDATA.md](./DEPLOY-ALWAYSDATA.md)

### After every push to GitHub

On AlwaysData SSH:

```bash
cd ~/cash_society
bash scripts/host-update.sh
```

Then **Web → Sites → Restart** the Node site.

Check: `https://YOURNAME.alwaysdata.net/api/version`  
(the `commit` must match GitHub)

---

## Optional: Render

Only if MySQL allows remote access (AlwaysData free MySQL does **not**).

- Build: `npm run install:all && npm run build`
- Start: `npm start`

---

## Local production test

```bash
npm run install:all
npm run build
npm start
```

Open http://localhost:5000
