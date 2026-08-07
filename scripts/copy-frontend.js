const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'frontend', 'dist');
const dest = path.join(__dirname, '..', 'backend', 'public');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(fromPath, toPath);
    else fs.copyFileSync(fromPath, toPath);
  }
}

if (!fs.existsSync(src)) {
  console.error('frontend/dist not found. Run: npm run build --prefix frontend');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);

// stamp so hosts can verify deploy without git
const stamp = new Date().toISOString();
fs.writeFileSync(path.join(dest, 'deploy-version.txt'), `${stamp}\n`, 'utf8');
console.log(`Copied frontend build → backend/public (${stamp})`);
