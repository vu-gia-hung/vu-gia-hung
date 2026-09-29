const fs = require('fs');
const https = require('https');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OWNER = 'vu-gia-hung';
const README_PATH = path.join(ROOT_DIR, 'README.md');
const DATA_PATH = path.join(ROOT_DIR, 'data/stargazers.json');
const API_VERSION = '2026-03-10';
const PER_PAGE = 100;
const MAX_DISPLAYED_MEMBERS = 5;

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

function renderMember(member, rank, horizontalMargin = 4) {
  const role = roleForRank(rank);
  const current = member.isCurrentlyStarred;
  const repositoryCount = member.repositories.length;
  const state = current
    ? `⭐ ${repositoryCount} stars`
    : '🕰️ Former stargazer';
  return `<div style="display:inline-block; width:112px; vertical-align:top; margin:8px ${horizontalMargin}px; text-align:center;">` +
    `<a href="${escapeHtml(member.htmlUrl)}" title="${escapeHtml(`Star #${rank} · ${member.login} · ${role.title}`)}"><img src="${escapeHtml(avatarWithSize(member.avatarUrl, 72))}" width="64" height="64" alt="@${escapeHtml(member.login)}" style="border-radius:50%; border:2px solid #38bdf8;" /></a>` +
    `<br/><b>#${rank} ${insigniaImage(rank)}</b><br/><small>@${escapeHtml(member.login)}</small><br/><small>${escapeHtml(role.title)}</small><br/><small style="display:block; text-align:center; white-space:nowrap;">${state}</small></div>`;
}

function renderEmptyMember(rank, horizontalMargin = 4) {
  const role = roleForRank(rank);
  return `<div style="display:inline-block; width:112px; vertical-align:top; margin:8px ${horizontalMargin}px; text-align:center;">` +
    `<div title="Awaiting stargazer" style="display:inline-flex; width:64px; height:64px; align-items:center; justify-content:center; border:2px dashed #475569; border-radius:50%; color:#64748b; font-size:24px;">?</div>` +
    `<br/><b>#${rank} ${insigniaImage(rank)}</b><br/><small>Open slot</small><br/><small>Awaiting star</small></div>`;
}

function renderPyramid(members) {
  const slots = Array.from({ length: MAX_DISPLAYED_MEMBERS }, (_, index) => members[index] || null);
  const rows = [slots.slice(0, 1), slots.slice(1, 3), slots.slice(3, 5)];
  return rows
    .filter(row => row.length > 0)
    .map((row, rowIndex) => {
      const renderSlot = (member, rank, horizontalMargin = 4) => member
        ? renderMember(member, rank, horizontalMargin)
        : renderEmptyMember(rank, horizontalMargin);

      if (rowIndex >= 1) {
        const firstRank = rowIndex === 1 ? 2 : 4;
        if (rowIndex === 1) {
          return `<table data-hall-row="2" width="100%" border="0" cellpadding="0" cellspacing="0"><tbody><tr><td width="25%"></td><td width="25%" align="center">${renderSlot(row[0], firstRank, 0)}</td><td width="25%" align="center">${renderSlot(row[1], firstRank + 1, 0)}</td><td width="25%"></td></tr></tbody></table>`;
        }
        return `<table data-hall-row="3" width="100%" border="0" cellpadding="0" cellspacing="0"><tbody><tr><td width="50%" align="center">${renderSlot(row[0], firstRank, 0)}</td><td width="50%" align="center">${renderSlot(row[1], firstRank + 1, 0)}</td></tr></tbody></table>`;
      }

      return `<div data-hall-row="${rowIndex + 1}">${row.map((member, index) => {
        const rank = rowIndex === 0 ? 1 : index + 2;
        const horizontalMargin = rowIndex === 1 ? 18 : 4;
        return renderSlot(member, rank, horizontalMargin);
      }).join('')}</div>`;
    })
    .join('\n');
}

function renderRemainingMembers(members) {
  const remainingMembers = members.slice(MAX_DISPLAYED_MEMBERS);
  if (remainingMembers.length === 0) {
    return `<details><summary>View all ranks (${members.length})</summary><p><small>No additional stargazers yet.</small></p></details>`;
  }
  const rows = remainingMembers.map((member, index) => {
    const rank = index + MAX_DISPLAYED_MEMBERS + 1;
    const role = roleForRank(rank);
    const state = member.isCurrentlyStarred ? `⭐ ${member.repositories.length} stars` : '🕰️ Former stargazer';
    return `<li><a href="${escapeHtml(member.htmlUrl)}">@${escapeHtml(member.login)}</a> · <b>#${rank}</b> · ${insigniaImage(rank)} ${escapeHtml(role.title)} · ${state}</li>`;
  }).join('');
  return `<details><summary>View all remaining ranks (${remainingMembers.length})</summary><ul>${rows}</ul></details>`;
}

function renderRankLadder() {
  const ranges = [
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
  const rows = ranges.map(([range, rank]) => {
    const role = roleForRank(rank);
    return `<tr><td width="20%" align="right">${insigniaImage(rank, 30)}</td><td width="25%" align="left"><b>${range}</b></td><td width="55%" align="left"> · ${escapeHtml(role.title)}</td></tr>`;
  }).join('');
  return `<details><summary>View rank ladder</summary><table width="100%" border="0" cellpadding="2" cellspacing="0"><tbody>${rows}</tbody></table></details>`;
}

function renderRankControls(members) {
  return `<table width="100%" border="0" cellpadding="4" cellspacing="0"><tbody><tr>` +
    `<td width="50%" align="center">${renderRankLadder()}</td>` +
    `<td width="50%" align="center">${renderRemainingMembers(members)}</td>` +
    `</tr></tbody></table>`;
}

function renderStargazerHtml(snapshot) {
  const members = snapshot.members;
  const currentMembers = members.filter(member => member.isCurrentlyStarred);
  const displayedMembers = members.slice(0, MAX_DISPLAYED_MEMBERS);
  const wallHtml = `${members.length === 0 ? '<p><b>No stargazers yet.</b><br/><small>Be the first person to star one of Hung\'s repositories.</small></p>' : ''}${renderPyramid(displayedMembers)}`;

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

module.exports = { createPreviewSnapshot, mergeSnapshot, renderStargazerHtml, syncStargazers };
