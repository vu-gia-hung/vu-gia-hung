const assert = require('node:assert/strict');
const test = require('node:test');

const { createPreviewSnapshot, mergeSnapshot, renderHallOfFameSvg, renderRankLadderSvg, renderStargazerHtml } = require('../scripts/update-stargazers');

const repo = { name: 'demo', url: 'https://github.com/vu-gia-hung/demo' };

test('stargazer snapshots keep first rank while reflecting current status', () => {
  const first = mergeSnapshot(
    { version: 1, updatedAt: null, repositories: [], members: [] },
    [repo],
    [{
      id: 7,
      login: 'alice',
      avatarUrl: 'https://github.com/alice.png',
      htmlUrl: 'https://github.com/alice',
      starredAt: '2026-09-01T00:00:00Z',
      repository: repo
    }],
    '2026-09-02T00:00:00Z'
  );
  const second = mergeSnapshot(first, [repo], [], '2026-09-03T00:00:00Z');
  const restored = mergeSnapshot(second, [repo], [{
    id: 7,
    login: 'alice',
    avatarUrl: 'https://github.com/alice.png',
    htmlUrl: 'https://github.com/alice',
    starredAt: '2026-09-04T00:00:00Z',
    repository: repo
  }], '2026-09-04T01:00:00Z');

  assert.equal(second.members[0].isCurrentlyStarred, false);
  assert.equal(restored.members[0].isCurrentlyStarred, true);
  assert.equal(restored.members[0].firstStarredAt, '2026-09-01T00:00:00.000Z');
});

test('Hall of Fame renders an honest empty state', () => {
  const html = renderStargazerHtml({
    repositories: [{ name: 'demo', url: repo.url }],
    members: []
  });

  assert.match(html, /Stargazers Hall of Fame/);
  assert.match(html, /No stargazers yet/);
  assert.match(html, /1 public repository scanned/);
});

test('Hall of Fame escapes user supplied profile fields', () => {
  const svg = renderHallOfFameSvg({
    repositories: [repo],
    members: [{
      id: 8,
      login: '<script>alert(1)</script>',
      avatarUrl: 'https://github.com/avatar.png',
      htmlUrl: 'https://github.com/example?a=1&b=2',
      firstStarredAt: '2026-09-01T00:00:00Z',
      lastSeenAt: '2026-09-01T00:00:00Z',
      isCurrentlyStarred: true,
      repositories: [repo]
    }]
  });

  assert.doesNotMatch(svg, /<script>/i);
  assert.match(svg, /&lt;script&gt;/i);
});

test('Hall of Fame renders a fixed five-slot pyramid in one SVG', () => {
  const preview = createPreviewSnapshot({
    repositories: [],
    members: [{
      id: 7,
      login: 'alice',
      avatarUrl: 'https://github.com/alice.png',
      htmlUrl: 'https://github.com/alice',
      firstStarredAt: '2026-09-01T00:00:00Z',
      lastSeenAt: '2026-09-01T00:00:00Z',
      isCurrentlyStarred: true,
      repositories: []
    }]
  });
  const avatarData = 'data:image/png;base64,aGVsbG8=';
  const svg = renderHallOfFameSvg(preview, new Map([['7', avatarData]]));
  const html = renderStargazerHtml(preview);

  assert.equal((svg.match(/data-rank="[1-5]"/g) || []).length, 5);
  assert.doesNotMatch(svg, /class="guide"/);
  assert.match(svg, /@alice/);
  assert.match(svg, /data:image\/png;base64,aGVsbG8=/);
  assert.equal((svg.match(/Open slot/g) || []).length, 4);
  assert.match(html, /assets\/stargazers\/hall-of-fame\.svg/);
  assert.doesNotMatch(html, /data-hall-row/);
});

test('Hall of Fame exposes ranks after the pyramid in a collapsed list', () => {
  const members = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    login: `user-${index + 1}`,
    avatarUrl: 'https://github.com/avatar.png',
    htmlUrl: `https://github.com/user-${index + 1}`,
    firstStarredAt: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    lastSeenAt: '2026-09-10T00:00:00Z',
    isCurrentlyStarred: true,
    repositories: []
  }));
  const html = renderStargazerHtml({ repositories: [], members });

  assert.match(html, /View all remaining ranks \(1\)/);
  assert.match(html, /@user-6/);
});

test('Hall of Fame exposes the complete rank ladder separately', () => {
  const html = renderStargazerHtml({ repositories: [], members: [] });
  const svg = renderRankLadderSvg();

  assert.match(html, /View rank ladder/);
  assert.match(html, /rank-ladder\.svg/);
  assert.match(svg, /Sergeant Major of the Army/);
  assert.match(svg, /Corporal/);
  assert.doesNotMatch(svg, /Specialist/);
  assert.match(svg, /Private E-1/);
});
