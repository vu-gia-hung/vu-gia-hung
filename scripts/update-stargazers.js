const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OWNER = 'vu-gia-hung';
const README_PATH = path.join(ROOT_DIR, 'README.md');
const DATA_PATH = path.join(ROOT_DIR, 'data/stargazers.json');
const AVATAR_ASSETS_DIR = path.join(ROOT_DIR, 'assets/stargazers');
const HALL_ASSET_PATH = path.join(AVATAR_ASSETS_DIR, 'hall-of-fame.svg');
const HALL_ASSET_URL = 'https://cdn.jsdelivr.net/gh/vu-gia-hung/vu-gia-hung@main/assets/stargazers/hall-of-fame.svg';
const RANK_LADDER_ASSET_PATH = path.join(AVATAR_ASSETS_DIR, 'rank-ladder.svg');
const RANK_LADDER_ASSET_URL = 'https://cdn.jsdelivr.net/gh/vu-gia-hung/vu-gia-hung@main/assets/stargazers/rank-ladder.svg';
const API_VERSION = '2026-03-10';
const PER_PAGE = 100;
const MAX_DISPLAYED_MEMBERS = 5;
const RANK_RANGES = [
  ['#1', 1],
  ['#2', 2],
  ['#3', 3],
  ['#4', 4],
  ['#5', 5],
  ['#6–10', 6],
  ['#11–20', 11],
  ['#21–50', 21],
  ['#51–100', 51],
  ['#101–200', 101],
  ['#201–500', 201],
  ['#501+', 501]
];

function requestJson(apiPath, token) {
  return new Promise((resolve, reject) => {
    const request = https.get(`https://api.github.com${apiPath}`, {
      headers: {
        Accept: 'application/vnd.github.star+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'vu-gia-hung-profile-stargazers',
        'X-GitHub-Api-Version': API_VERSION
      }
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GitHub API ${response.statusCode} for ${apiPath}: ${body.slice(0, 240)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`GitHub API returned invalid JSON for ${apiPath}: ${error.message}`));
        }
      });
      response.on('error', reject);
    });
    request.setTimeout(20_000, () => request.destroy(new Error(`GitHub API timed out for ${apiPath}`)));
    request.on('error', reject);
  });
}

async function listPages(apiPathFactory, token) {
  const items = [];
  for (let page = 1; page <= 100; page += 1) {
    const pageItems = await requestJson(apiPathFactory(page), token);
    if (!Array.isArray(pageItems)) {
      throw new Error('GitHub API returned an unexpected list response.');
    }
    items.push(...pageItems);
    if (pageItems.length < PER_PAGE) return items;
  }
  throw new Error('GitHub API pagination exceeded 100 pages.');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function timestampOr(value, fallback) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function earliest(first, second) {
  if (!first) return second;
  if (!second) return first;
  return Date.parse(first) <= Date.parse(second) ? first : second;
}

function roleForRank(rank) {
  if (rank === 1) return { insignia: 'sergeant-major-of-the-army', title: 'Sergeant Major of the Army' };
  if (rank === 2) return { insignia: 'command-sergeant-major', title: 'Command Sergeant Major' };
  if (rank === 3) return { insignia: 'sergeant-major', title: 'Sergeant Major' };
  if (rank === 4) return { insignia: 'first-sergeant', title: 'First Sergeant' };
  if (rank === 5) return { insignia: 'master-sergeant', title: 'Master Sergeant' };
  if (rank <= 10) return { insignia: 'sergeant-first-class', title: 'Sergeant First Class' };
  if (rank <= 20) return { insignia: 'staff-sergeant', title: 'Staff Sergeant' };
  if (rank <= 50) return { insignia: 'sergeant', title: 'Sergeant' };
  if (rank <= 100) return { insignia: 'corporal', title: 'Corporal' };
  if (rank <= 200) return { insignia: 'private-first-class', title: 'Private First Class' };
  if (rank <= 500) return { insignia: 'private-e2', title: 'Private E-2' };
  return { insignia: 'private-e1', title: 'Private E-1' };
}

function avatarWithSize(url, size) {
  return `${url}${url.includes('?') ? '&' : '?'}s=${size}`;
}

function assetVersion(assetPath, fallback = '1') {
  if (!fs.existsSync(assetPath)) return encodeURIComponent(fallback);
  return crypto.createHash('sha256').update(fs.readFileSync(assetPath)).digest('hex').slice(0, 12);
}

function requestImage(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error(`Too many redirects while downloading ${url}`));
      return;
    }

    const request = https.get(url, {
      headers: { 'User-Agent': 'vu-gia-hung-profile-stargazers' }
    }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        const redirectedUrl = new URL(response.headers.location, url).toString();
        requestImage(redirectedUrl, redirectCount + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`Avatar request returned HTTP ${response.statusCode}`));
        return;
      }

      const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!/^image\/(?:png|jpe?g|gif|webp)$/.test(contentType)) {
        response.resume();
        reject(new Error(`Avatar request returned unsupported content type: ${contentType || 'unknown'}`));
        return;
      }

      const chunks = [];
      let length = 0;
      response.on('data', chunk => {
        length += chunk.length;
        if (length > 5 * 1024 * 1024) {
          request.destroy(new Error('Avatar image exceeded 5 MB'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ contentType, buffer: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    request.setTimeout(20_000, () => request.destroy(new Error(`Avatar request timed out for ${url}`)));
    request.on('error', reject);
  });
}

function avatarAssetKey(member) {
  return String(member.id || member.login).replace(/[^a-zA-Z0-9_-]/g, '-');
}

function readInsigniaSvg(rank, instanceId, x, y, width, height) {
  const role = roleForRank(rank);
  const source = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'army-ranks', `${role.insignia}.svg`), 'utf8');
  const viewBox = source.match(/viewBox="([^"]+)"/)?.[1] || '0 0 80 64';
  const prefix = `rank-${instanceId}-`;
  const inner = source
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`);
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}" overflow="visible" aria-hidden="true">${inner}</svg>`;
}

function renderSlotAura(rank, centerX, centerY) {
  if (rank > 5) return '';
  const duration = rank === 1 ? '2.2s' : rank <= 3 ? '2.7s' : '3.2s';
  const maxRadius = rank === 1 ? 54 : rank <= 3 ? 50 : 47;
  const opacity = rank === 1 ? '.65' : rank <= 3 ? '.42' : '.24';
  const secondRing = rank === 1
    ? `<circle cx="${centerX}" cy="${centerY}" r="45" fill="none" stroke="#bae6fd" stroke-width="1.5" opacity=".3"><animate attributeName="r" values="45;59;45" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values=".32;.05;.32" dur="3s" repeatCount="indefinite"/></circle>`
    : '';
  return `<circle cx="${centerX}" cy="${centerY}" r="44" fill="none" stroke="#38bdf8" stroke-width="2" opacity="${opacity}"><animate attributeName="r" values="44;${maxRadius};44" dur="${duration}" repeatCount="indefinite"/><animate attributeName="opacity" values="${opacity};.06;${opacity}" dur="${duration}" repeatCount="indefinite"/></circle>${secondRing}`;
}

function renderHallSlot(member, rank, centerX, top, avatarDataUri) {
  const role = roleForRank(rank);
  const avatarCenterY = top + 46;
  const insigniaWidth = rank === 1 ? 46 : rank <= 3 ? 42 : 38;
  const insigniaHeight = Math.round(insigniaWidth * 0.8);
  const insigniaX = centerX + 8;
  const insigniaY = top + 93;
  const rankX = centerX - 18;
  const clipId = `avatar-clip-${rank}`;
  const aura = renderSlotAura(rank, centerX, avatarCenterY);

  if (!member) {
    return `<g data-rank="${rank}">${aura}<circle cx="${centerX}" cy="${avatarCenterY}" r="42" class="empty-slot"/><text x="${centerX}" y="${avatarCenterY + 12}" class="question">?</text><text x="${rankX}" y="${top + 119}" class="rank-number">#${rank}</text>${readInsigniaSvg(rank, `slot-${rank}`, insigniaX, insigniaY, insigniaWidth, insigniaHeight)}<text x="${centerX}" y="${top + 153}" class="label">Open slot</text><text x="${centerX}" y="${top + 181}" class="muted">Awaiting star</text></g>`;
  }

  const login = `@${member.login}`;
  const loginSizing = login.length > 21
    ? ` textLength="190" lengthAdjust="spacingAndGlyphs"`
    : '';
  const repositoryCount = Array.isArray(member.repositories) ? member.repositories.length : 0;
  const status = member.isCurrentlyStarred ? `★ ${repositoryCount} stars` : 'Former stargazer';
  const statusClass = member.isCurrentlyStarred ? 'status' : 'muted';
  const avatar = avatarDataUri
    ? `<image href="${avatarDataUri}" x="${centerX - 40}" y="${top + 6}" width="80" height="80" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
    : `<circle cx="${centerX}" cy="${avatarCenterY}" r="40" class="avatar-fallback"/><text x="${centerX}" y="${avatarCenterY + 11}" class="fallback-letter">${escapeHtml(String(member.login || '?').charAt(0).toUpperCase())}</text>`;

  return `<g data-rank="${rank}"><defs><clipPath id="${clipId}"><circle cx="${centerX}" cy="${avatarCenterY}" r="40"/></clipPath></defs>${aura}${avatar}<circle cx="${centerX}" cy="${avatarCenterY}" r="41" class="avatar-ring"/><text x="${rankX}" y="${top + 119}" class="rank-number">#${rank}</text>${readInsigniaSvg(rank, `member-${rank}`, insigniaX, insigniaY, insigniaWidth, insigniaHeight)}<text x="${centerX}" y="${top + 153}" class="label"${loginSizing}>${escapeHtml(login)}</text><text x="${centerX}" y="${top + 178}" class="title">${escapeHtml(role.title)}</text><text x="${centerX}" y="${top + 203}" class="${statusClass}">${escapeHtml(status)}</text></g>`;
}

function renderHallOfFameSvg(snapshot, avatarDataUris = new Map()) {
  const slots = [
    { rank: 1, centerX: 500, top: 8 },
    { rank: 2, centerX: 375, top: 225 },
    { rank: 3, centerX: 625, top: 225 },
    { rank: 4, centerX: 250, top: 442 },
    { rank: 5, centerX: 750, top: 442 }
  ];
  const members = snapshot.members.slice(0, MAX_DISPLAYED_MEMBERS);
  const cards = slots.map(({ rank, centerX, top }, index) => {
    const member = members[index] || null;
    const avatarDataUri = member ? avatarDataUris.get(avatarAssetKey(member)) : null;
    return renderHallSlot(member, rank, centerX, top, avatarDataUri);
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 655" role="img" aria-labelledby="hall-title hall-description">
  <title id="hall-title">Stargazers Hall of Fame top five</title>
  <desc id="hall-description">Five ranks arranged as a pyramid, with rank one at the top.</desc>
  <style>
    .avatar-ring{fill:none;stroke:#38bdf8;stroke-width:3}
    .avatar-fallback{fill:#0f172a;stroke:#38bdf8;stroke-width:3}
    .empty-slot{fill:#0f172a;stroke:#64748b;stroke-width:3;stroke-dasharray:7 6}
    .label,.title,.rank-number,.muted,.status,.question,.fallback-letter{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;text-anchor:middle}
    .rank-number{fill:#c9d1d9;font-size:18px;font-weight:700}
    .label{fill:#c9d1d9;font-size:16px;font-weight:600}
    .title{fill:#c9d1d9;font-size:15px}
    .muted{fill:#8b949e;font-size:15px}
    .status{fill:#e3b341;font-size:15px;font-weight:600}
    .question{fill:#8b949e;font-size:36px}
    .fallback-letter{fill:#e6edf3;font-size:32px;font-weight:700}
    @media (prefers-color-scheme:light){
      .rank-number,.label,.title{fill:#24292f}.muted,.question{fill:#57606a}.avatar-fallback,.empty-slot{fill:#f6f8fa}
    }
  </style>
  ${cards}
</svg>`;
}

async function writeHallAsset(snapshot) {
  fs.mkdirSync(AVATAR_ASSETS_DIR, { recursive: true });
  const avatarDataUris = new Map();
  const displayedMembers = snapshot.members.slice(0, MAX_DISPLAYED_MEMBERS);

  await Promise.all(displayedMembers.map(async member => {
    try {
      const { contentType, buffer } = await requestImage(avatarWithSize(member.avatarUrl, 192));
      avatarDataUris.set(avatarAssetKey(member), `data:${contentType};base64,${buffer.toString('base64')}`);
    } catch (error) {
      console.warn(`Could not embed @${member.login}'s avatar: ${error.message}`);
    }
  }));

  fs.writeFileSync(HALL_ASSET_PATH, `${renderHallOfFameSvg(snapshot, avatarDataUris)}\n`, 'utf8');
  for (const assetName of fs.readdirSync(AVATAR_ASSETS_DIR)) {
    if (/^stargazer-.+\.svg$/.test(assetName)) {
      fs.unlinkSync(path.join(AVATAR_ASSETS_DIR, assetName));
    }
  }
}

function insigniaImage(rank, fixedSize = null) {
  const role = roleForRank(rank);
  const size = fixedSize || (rank === 1 ? 42 : rank <= 3 ? 38 : 34);
  const aura = rank === 1
    ? 'filter:drop-shadow(0 0 3px #bae6fd) drop-shadow(0 0 8px #38bdf8) drop-shadow(0 0 14px #0284c7);'
    : rank <= 3
      ? 'filter:drop-shadow(0 0 3px #7dd3fc) drop-shadow(0 0 7px #38bdf8);'
      : rank <= 5
        ? 'filter:drop-shadow(0 0 3px #38bdf8);'
        : '';
  return `<img src="./assets/army-ranks/${role.insignia}.svg" width="${size}" height="${Math.round(size * 0.875)}" alt="${escapeHtml(role.title)} insignia" style="vertical-align:middle; margin:0 2px; ${aura}" />`;
}

function readSnapshot() {
  if (!fs.existsSync(DATA_PATH)) {
    return { version: 1, updatedAt: null, repositories: [], members: [] };
  }
  const snapshot = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  return {
    version: 1,
    updatedAt: snapshot.updatedAt || null,
    repositories: Array.isArray(snapshot.repositories) ? snapshot.repositories : [],
    members: Array.isArray(snapshot.members) ? snapshot.members : []
  };
}

function mergeSnapshot(previous, repositories, observedMembers, updatedAt) {
  const members = new Map();
  for (const previousMember of previous.members) {
    const key = String(previousMember.id || previousMember.login);
    members.set(key, {
      ...previousMember,
      repositories: [],
      isCurrentlyStarred: false
    });
  }

  for (const observed of observedMembers) {
    const key = String(observed.id || observed.login);
    const existing = members.get(key);
    const starredAt = timestampOr(observed.starredAt, updatedAt);
    const currentRepositories = existing?.repositories || [];
    const repoMap = new Map(currentRepositories.map(repo => [repo.name, repo]));
    repoMap.set(observed.repository.name, {
      name: observed.repository.name,
      url: observed.repository.url,
      starredAt
    });

    members.set(key, {
      id: observed.id,
      login: observed.login,
      avatarUrl: observed.avatarUrl,
      htmlUrl: observed.htmlUrl,
      firstStarredAt: earliest(existing?.firstStarredAt, starredAt),
      lastSeenAt: existing?.isCurrentlyStarred ? existing.lastSeenAt : updatedAt,
      isCurrentlyStarred: true,
      repositories: [...repoMap.values()].sort((a, b) => a.name.localeCompare(b.name))
    });
  }

  return {
    version: 1,
    updatedAt,
    repositories,
    members: [...members.values()].sort((a, b) => {
      const first = Date.parse(a.firstStarredAt || '') || Number.MAX_SAFE_INTEGER;
      const second = Date.parse(b.firstStarredAt || '') || Number.MAX_SAFE_INTEGER;
      return first - second || a.login.localeCompare(b.login);
    })
  };
}

function renderAllMembers(members) {
  if (members.length === 0) {
    return '<details><summary>View all ranks (0)</summary><p><small>No stargazers yet.</small></p></details>';
  }
  const rows = members.map((member, index) => {
    const rank = index + 1;
    const role = roleForRank(rank);
    const state = member.isCurrentlyStarred ? `⭐ ${member.repositories.length} stars` : '🕰️ Former stargazer';
    return `<p align="left">${insigniaImage(rank, 28)} <b><span>#</span>${rank}</b> · <a href="${escapeHtml(member.htmlUrl)}">@${escapeHtml(member.login)}</a><br/><small>${escapeHtml(role.title)} · ${state}</small></p>`;
  }).join('');
  return `<details><summary>View all ranks (${members.length})</summary>${rows}</details>`;
}

function renderRankLadderSvg() {
  const rowHeight = 48;
  const rows = RANK_RANGES.map(([range, rank], index) => {
    const role = roleForRank(rank);
    const top = 8 + index * rowHeight;
    return `<g data-ladder-rank="${rank}">${readInsigniaSvg(rank, `ladder-${rank}`, 20, top + 4, 42, 34)}<text x="88" y="${top + 28}" class="range">${escapeHtml(range)}</text><text x="190" y="${top + 28}" class="title">${escapeHtml(role.title)}</text></g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 592" role="img" aria-labelledby="ladder-title ladder-description">
  <title id="ladder-title">Military rank ladder</title>
  <desc id="ladder-description">Rank insignia, position ranges, and military titles shown in three aligned columns.</desc>
  <style>
    .range,.title{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;dominant-baseline:middle;fill:#c9d1d9;font-size:17px}
    .range{font-weight:700;text-anchor:start}
    .title{text-anchor:start}
    @media (prefers-color-scheme:light){.range,.title{fill:#24292f}}
  </style>
  ${rows}
</svg>`;
}

function writeRankLadderAsset() {
  fs.mkdirSync(AVATAR_ASSETS_DIR, { recursive: true });
  fs.writeFileSync(RANK_LADDER_ASSET_PATH, `${renderRankLadderSvg()}\n`, 'utf8');
}

function renderRankLadder() {
  const version = assetVersion(RANK_LADDER_ASSET_PATH);
  return `<details><summary>View rank ladder</summary><p><img src="${RANK_LADDER_ASSET_URL}?v=${version}" width="100%" alt="Military rank ladder with aligned insignia, rank, and title columns" /></p></details>`;
}

function renderRankControls(members) {
  return `<table width="100%" cellspacing="0" cellpadding="8"><tbody><tr>` +
    `<td width="50%" align="center" valign="top"><img src="./assets/spacer.svg" width="480" height="1" align="left" alt="" />${renderRankLadder()}</td>` +
    `<td width="50%" align="center" valign="top"><img src="./assets/spacer.svg" width="480" height="1" align="left" alt="" />${renderAllMembers(members)}</td>` +
    `</tr></tbody></table>`;
}

function renderStargazerHtml(snapshot) {
  const members = snapshot.members;
  const currentMembers = members.filter(member => member.isCurrentlyStarred);
  const hallVersion = assetVersion(HALL_ASSET_PATH, snapshot.updatedAt || '1');
  const wallHtml = `${members.length === 0 ? '<p><b>No stargazers yet.</b><br/><small>Be the first person to star one of Hung\'s repositories.</small></p>' : ''}<p><img src="${HALL_ASSET_URL}?v=${hallVersion}" width="100%" alt="Top five stargazers arranged as a pyramid" /></p>`;

  return `<!-- STARGAZERS:START -->
<div align="center">
<h3>⭐ Stargazers Hall of Fame</h3>
<p><small>Star counts are based on how many vu-gia-hung repositories each person has starred.</small></p>
<p><small>${currentMembers.length} currently starring · ${members.length} Hall of Fame member${members.length === 1 ? '' : 's'} · ${snapshot.repositories.length} public repositor${snapshot.repositories.length === 1 ? 'y' : 'ies'} scanned</small></p>
${wallHtml}
<p><small>Ranks update when a new star is detected. Other star statuses (for example, when someone unstars) refresh hourly.</small></p>
${renderRankControls(members)}
</div>
<!-- STARGAZERS:END -->`;
}

function updateReadme(snapshot) {
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const marker = /<!-- STARGAZERS:START -->[\s\S]*?<!-- STARGAZERS:END -->/;
  if (!marker.test(readme)) {
    throw new Error('README.md is missing STARGAZERS:START/END markers.');
  }
  fs.writeFileSync(README_PATH, readme.replace(marker, renderStargazerHtml(snapshot)), 'utf8');
}

function createPreviewSnapshot(snapshot) {
  return { ...snapshot, isPreview: true };
}

async function syncStargazers({ token, owner = OWNER } = {}) {
  const authToken = token || process.env.STARGAZER_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!authToken) throw new Error('Missing STARGAZER_TOKEN (or GH_TOKEN/GITHUB_TOKEN).');

  const repoItems = await listPages(page => `/users/${encodeURIComponent(owner)}/repos?type=owner&per_page=${PER_PAGE}&page=${page}`, authToken);
  const repositories = repoItems
    .filter(repo => repo.owner?.login?.toLowerCase() === owner.toLowerCase() && repo.visibility === 'public')
    .map(repo => ({ name: repo.name, url: repo.html_url }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const observedMembers = [];
  for (const repository of repositories) {
    const stars = await listPages(page => `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository.name)}/stargazers?per_page=${PER_PAGE}&page=${page}`, authToken);
    for (const star of stars) {
      const user = star.user || star;
      if (!user.login || user.type === 'Bot') continue;
      observedMembers.push({
        id: user.id || user.login,
        login: user.login,
        avatarUrl: user.avatar_url || `https://github.com/${encodeURIComponent(user.login)}.png`,
        htmlUrl: user.html_url || `https://github.com/${encodeURIComponent(user.login)}`,
        starredAt: star.starred_at,
        repository
      });
    }
  }

  const previous = readSnapshot();
  const candidate = mergeSnapshot(previous, repositories, observedMembers, new Date().toISOString());
  const stateKey = value => JSON.stringify({ repositories: value.repositories, members: value.members });
  const snapshot = stateKey(previous) === stateKey(candidate)
    ? { ...candidate, updatedAt: previous.updatedAt }
    : candidate;
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await writeHallAsset(snapshot);
  writeRankLadderAsset();
  updateReadme(process.env.STARGAZER_PREVIEW === '1' ? createPreviewSnapshot(snapshot) : snapshot);
  console.log(`Scanned ${repositories.length} public repositories and ${observedMembers.length} current star records.`);
  console.log(`Hall of Fame contains ${snapshot.members.length} unique users (${snapshot.members.filter(member => member.isCurrentlyStarred).length} currently starring).`);
  return snapshot;
}

if (require.main === module) {
  syncStargazers().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { createPreviewSnapshot, mergeSnapshot, renderHallOfFameSvg, renderRankLadderSvg, renderStargazerHtml, syncStargazers };
