const assert = require('node:assert/strict');
const test = require('node:test');

const { applyUsernameUpdates } = require('../scripts/refresh-guestbook-usernames.js');

test('applyUsernameUpdates renames stale entries and preserves synced ones byte-for-byte', () => {
  const entries = [
    {
      id: 1,
      username: 'old1',
      name: 'old1',
      avatar: 'https://example.invalid/old1.png',
      message: 'hello',
      date: '2026-01-01 00:00'
    },
    {
      id: 2,
      username: 'same2',
      name: 'same2',
      avatar: 'https://example.invalid/same2.png',
      message: 'world',
      date: '2026-01-02 00:00'
    }
  ];
  const resolutions = new Map([
    [1, { login: 'new1', avatarUrl: 'https://example.invalid/new1.png' }],
    [2, { login: 'same2', avatarUrl: 'https://example.invalid/same2.png' }]
  ]);

  const { entries: next, changes } = applyUsernameUpdates(entries, resolutions);

  assert.deepEqual(changes, [{ id: 1, from: 'old1', to: 'new1' }]);
  assert.deepEqual(next[0], {
    id: 1,
    username: 'new1',
    name: 'new1',
    avatar: 'https://example.invalid/new1.png',
    message: 'hello',
    date: '2026-01-01 00:00'
  });
  assert.equal(next[1], entries[1]);
});

test('applyUsernameUpdates leaves entries untouched when the account was deleted (404)', () => {
  const entries = [
    {
      id: 42,
      username: 'ghost',
      name: 'ghost',
      avatar: 'https://example.invalid/ghost.png',
      message: 'rip',
      date: '2026-02-02 02:02'
    }
  ];
  const resolutions = new Map();

  const { entries: next, changes } = applyUsernameUpdates(entries, resolutions);

  assert.equal(changes.length, 0);
  assert.equal(next[0], entries[0]);
});
