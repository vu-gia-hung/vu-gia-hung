const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const GUESTBOOK_PATH = path.join(ROOT_DIR, 'data/guestbook.json');
const README_PATH = path.join(ROOT_DIR, 'README.md');

function sanitizeText(str, maxLength = 100) {
  if (!str) return '';
  return str
    .replace(/[<>]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function truncateMessage(str, maxLen = 42) {
  if (!str) return '';
  const clean = str
    .replace(/[<>]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  if (clean.length > maxLen) {
    return clean.slice(0, maxLen - 3).trim() + '...';
  }
  return clean;
}

function renderGuestbookHtml(entries) {
  let listHtml = '';
  entries.slice(0, 2).forEach((e, idx) => {
    const safeUser = sanitizeText(e.username, 30);
    const safeMsg = truncateMessage(e.message, 42);
    const safeDate = sanitizeText(e.date || 'Recent', 20);
    listHtml += `<p>
<a href="https://github.com/${safeUser}">
<img src="https://github.com/${safeUser}.png?size=32" width="32" height="32" align="left" />
</a>
&nbsp;<b><a href="https://github.com/${safeUser}">@${safeUser}</a></b> <small style="color: #8b949e;">• ${safeDate}</small><br/>
&nbsp;💬 <i>"${safeMsg}"</i>
</p>${idx < Math.min(entries.length, 2) - 1 ? '\n<hr/>\n' : '\n'}`;
  });

  return `<!-- GUESTBOOK:START -->
<div align="left">
<p>
<img src="https://img.shields.io/badge/RECENT_GUESTBOOK_ENTRIES-0284c7?style=flat-square" alt="Recent Guestbook Entries" /> <img src="https://img.shields.io/badge/Live-38bdf8?style=flat-square" alt="Live" />
<br/>
<small style="color: #8b949e;">Leave a message on the left to appear here!</small>
</p>
<hr/>
${listHtml}<hr/>
<p align="right">
<small><a href="https://github.com/vu-gia-hung/vu-gia-hung/issues?q=is%3Aissue+guestbook">View all messages &rarr;</a></small>
</p>
</div>
<!-- GUESTBOOK:END -->`;
}

function updateReadmeContent() {
  const guestbookData = JSON.parse(fs.readFileSync(GUESTBOOK_PATH, 'utf8'));
  let readme = fs.readFileSync(README_PATH, 'utf8');

  // Replace Guestbook section if tags exist
  const gbRegex = /<!-- GUESTBOOK:START -->[\s\S]*?<!-- GUESTBOOK:END -->/;
  if (gbRegex.test(readme)) {
    readme = readme.replace(gbRegex, renderGuestbookHtml(guestbookData));
  }

  fs.writeFileSync(README_PATH, readme, 'utf8');
  console.log('README.md updated with latest Guestbook data.');
}

async function processIssueEvent() {
  const issueTitle = process.env.ISSUE_TITLE || '';
  const issueBody = process.env.ISSUE_BODY || '';
  const issueUser = process.env.ISSUE_USER || 'anonymous';
  const issueUserAvatar = process.env.ISSUE_USER_AVATAR || `https://github.com/${issueUser}.png`;

  console.log(`Processing issue: "${issueTitle}" from @${issueUser}`);

  let updated = false;

  // Guestbook Entry
  if (/^guestbook/i.test(issueTitle)) {
    // Strip HTML comments <!-- ... -->
    let msg = issueBody.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (!msg) {
      msg = issueTitle.replace(/^.*guestbook:?\s*/i, '').trim();
    }
    msg = sanitizeText(msg) || 'Left a mark on Hung\'s profile! ✨';

    const guestbookData = JSON.parse(fs.readFileSync(GUESTBOOK_PATH, 'utf8'));
    guestbookData.unshift({
      username: issueUser,
      name: issueUser,
      avatar: issueUserAvatar,
      message: msg,
      date: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 16)
    });

    // Keep top 10
    const trimmed = guestbookData.slice(0, 10);
    fs.writeFileSync(GUESTBOOK_PATH, JSON.stringify(trimmed, null, 2), 'utf8');
    updated = true;
    console.log(`Added guestbook entry from @${issueUser}: "${msg}"`);
  }

  if (updated) {
    updateReadmeContent();
  }
}

if (require.main === module) {
  if (process.env.ISSUE_TITLE) {
    processIssueEvent().catch(console.error);
  } else {
    updateReadmeContent();
  }
}

module.exports = { updateReadmeContent, processIssueEvent };
