const fs = require('fs');
const https = require('https');
const path = require('path');

const { updateReadmeContent } = require('./handle-interactive.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const GUESTBOOK_PATH = path.join(ROOT_DIR, 'data/guestbook.json');
const API_VERSION = '2022-11-28';

function requestUser(id, token) {
  return new Promise((resolve, reject) => {
    const request = https.get(`https://api.github.com/user/${id}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'vu-gia-hung-profile-guestbook',
        'X-GitHub-Api-Version': API_VERSION
      }
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode === 404) {
          resolve(null);
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GitHub API ${response.statusCode} for /user/${id}: ${body.slice(0, 240)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`GitHub API returned invalid JSON for /user/${id}: ${error.message}`));
        }
      });
      response.on('error', reject);
    });
    request.setTimeout(20_000, () => request.destroy(new Error(`GitHub API timed out for /user/${id}`)));
    request.on('error', reject);
  });
}

function applyUsernameUpdates(entries, resolutions) {
  const changes = [];
  const nextEntries = entries.map(entry => {
    if (!Number.isInteger(entry.id)) return entry;
    const resolved = resolutions.get(entry.id);
    if (!resolved) return entry;
    const { login, avatarUrl } = resolved;
    if (!login || entry.username === login) return entry;
    changes.push({ id: entry.id, from: entry.username, to: login });
    return {
      ...entry,
      username: login,
      name: login,
      avatar: avatarUrl
    };
  });
  return { entries: nextEntries, changes };
}

async function main() {
  const token = process.env.GUESTBOOK_REFRESH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('No GITHUB_TOKEN or GUESTBOOK_REFRESH_TOKEN available');
    process.exitCode = 1;
    return;
  }

  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(GUESTBOOK_PATH, 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${GUESTBOOK_PATH}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const uniqueIds = [...new Set(entries.map(e => e.id).filter(Number.isInteger))];
  const missing = entries.filter(e => !Number.isInteger(e.id)).length;
  if (missing > 0) console.log(`skipped ${missing} entries without id`);

  const resolutions = new Map();
  for (const id of uniqueIds) {
    const user = await requestUser(id, token);
    if (user === null) {
      console.log(`account ${id} no longer exists; keeping cached values`);
      continue;
    }
    resolutions.set(id, { login: user.login, avatarUrl: user.avatar_url });
  }

  const { entries: nextEntries, changes } = applyUsernameUpdates(entries, resolutions);

  if (changes.length === 0) {
    console.log('No username changes; guestbook already in sync');
    return;
  }

  fs.writeFileSync(GUESTBOOK_PATH, JSON.stringify(nextEntries, null, 2), 'utf8');
  updateReadmeContent();
  const summary = changes.map(c => `${c.from}→${c.to}`).join(', ');
  console.log(`Updated ${changes.length} username(s): ${summary}`);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}

module.exports = { refreshGuestbookUsernames: main, applyUsernameUpdates };
