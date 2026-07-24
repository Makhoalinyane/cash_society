/**
 * Prints a ready-to-send member view link (phones / any network).
 * Keep backend (:5000) and frontend (:3000) running first.
 */
import { spawn } from 'child_process';

console.log('');
console.log('Starting public member view link…');
console.log('');

const child = spawn(
  'npx',
  ['--yes', 'cloudflared', 'tunnel', '--url', 'http://localhost:3000'],
  { shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
);

let announced = false;

function maybeAnnounce(text) {
  if (announced) return;
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (!match) return;
  announced = true;
  console.log('');
  console.log('================================================');
  console.log('  SEND THIS TO MEMBERS (view only):');
  console.log(`  ${match[0]}/view`);
  console.log('================================================');
  console.log('');
  console.log('Members only tap the link — no editing.');
  console.log('You keep using http://localhost:3000 to record.');
  console.log('Keep this window open while they browse.');
  console.log('');
}

child.stdout.on('data', (buf) => {
  const text = buf.toString();
  process.stdout.write(text);
  maybeAnnounce(text);
});
child.stderr.on('data', (buf) => {
  const text = buf.toString();
  process.stderr.write(text);
  maybeAnnounce(text);
});
child.on('exit', (code) => process.exit(code ?? 0));
