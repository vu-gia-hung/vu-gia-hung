const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const GUESTBOOK_PATH = path.join(ROOT_DIR, 'data/guestbook.json');
const COFFEE_PATH = path.join(ROOT_DIR, 'data/coffee.json');
const README_PATH = path.join(ROOT_DIR, 'README.md');

function sanitizeText(str) {
  if (!str) return '';
  return str
    .replace(/[<>]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 100);
}

function renderGuestbookHtml(entries) {
  let listHtml = '';
  entries.slice(0, 2).forEach(e => {
    const safeUser = sanitizeText(e.username);
    const safeMsg = sanitizeText(e.message);
    listHtml += `  <p style="margin: 6px 0; font-size: 11px; line-height: 1.4;">\n    <a href="https://github.com/${safeUser}"><b>@${safeUser}</b></a>: <i>"${safeMsg}"</i>\n  </p>\n`;
  });

  return `<!-- GUESTBOOK:START -->
<div align="center">
  <b>📖 SỔ LƯU BÚT</b><br/>
  <a href="https://github.com/vu-gia-hung/vu-gia-hung/issues/new?title=guestbook:+L%E1%BB%9Di+ch%C3%A0o+c%E1%BB%A7a+b%E1%BA%A1n&body=Nh%E1%BA%ADp+l%E1%BB%9Di+nh%E1%BA%AFn+g%E1%BB%ADi+t%E1%BB%9Bi+V%C5%A9+Gia+H%C6%B0ng+%E1%BB%9F+%C4%91%C3%A2y+nha!+%F0%9F%9A%80"><img src="https://img.shields.io/badge/%E2%9C%8D%EF%B8%8F_K%C3%BD_T%C3%AAn-L%C6%B0u_B%C3%BAt-38bdf8?style=flat-square&logoColor=white" alt="Ký Lưu Bút" /></a>
</div>

${listHtml}<!-- GUESTBOOK:END -->`;
}

function renderCoffeeHtml(coffee) {
  return `<!-- COFFEE:START -->
<div align="center">
  <b>☕ MÁY PHA CÀ PHÊ</b><br/>
  <sub><i>(Caffeine Fuel Station)</i></sub>
  <br/><br/>
  <table border="0" width="100%">
    <tr><td>☕ Cà phê sữa:</td><td align="right"><b>${coffee.suada || 128} ly</b></td></tr>
    <tr><td>⚡ Espresso:</td><td align="right"><b>${coffee.espresso || 84} shot</b></td></tr>
    <tr><td>🥛 Bạc xỉu:</td><td align="right"><b>${coffee.bacxiu || 95} ly</b></td></tr>
  </table>
  <br/>
  <a href="https://github.com/vu-gia-hung/vu-gia-hung/issues/new?title=coffee:suada&body=M%E1%BB%9Di+H%C6%B0ng+1+ly+C%C3%A0+ph%C3%AA+s%E1%BB%AFa+%C4%91%C3%A1+%C4%91%E1%BB%83+ch%E1%BA%A1y+deadline+RMIT!+%E2%98%95"><img src="https://img.shields.io/badge/%E2%98%95_M%E1%BB%9Di_C%C3%A0_Ph%C3%AA_S%E1%BB%AFa-38bdf8?style=flat-square&logoColor=white" alt="Mời Cà Phê Sữa" /></a><br/>
  <a href="https://github.com/vu-gia-hung/vu-gia-hung/issues/new?title=coffee:espresso&body=B%C6%A1m+cho+H%C6%B0ng+1+shot+Espresso+t%C4%83ng+c%C6%B0%E1%BB%9Dng+%C3%A1p+l%E1%BB%B1c!+%E2%9A%A1"><img src="https://img.shields.io/badge/%E2%9A%A1_B%C6%A1m_Shot_Espresso-0284c7?style=flat-square&logoColor=white" alt="Bơm Espresso" /></a><br/>
  <a href="https://github.com/vu-gia-hung/vu-gia-hung/issues/new?title=coffee:bacxiu&body=M%E1%BB%9Di+H%C6%B0ng+1+ly+B%E1%BA%A1c+x%E1%BB%89u+ng%E1%BB%8Dt+ng%C3%A0o+%C3%ADt+%C4%91%C6%B0%E1%BB%9Dng!+%F0%9F%A5%9B"><img src="https://img.shields.io/badge/%F0%9F%A5%9B_M%E1%BB%9Di_Ly_B%E1%BA%A1c_X%E1%BB%89u-0369a1?style=flat-square&logoColor=white" alt="Mời Bạc Xỉu" /></a>
</div>
<!-- COFFEE:END -->`;
}

function updateReadmeContent() {
  const guestbookData = JSON.parse(fs.readFileSync(GUESTBOOK_PATH, 'utf8'));
  const coffeeData = JSON.parse(fs.readFileSync(COFFEE_PATH, 'utf8'));
  let readme = fs.readFileSync(README_PATH, 'utf8');

  // Replace Guestbook section if tags exist
  const gbRegex = /<!-- GUESTBOOK:START -->[\s\S]*?<!-- GUESTBOOK:END -->/;
  if (gbRegex.test(readme)) {
    readme = readme.replace(gbRegex, renderGuestbookHtml(guestbookData));
  }

  // Replace Coffee section if tags exist
  const coffeeRegex = /<!-- COFFEE:START -->[\s\S]*?<!-- COFFEE:END -->/;
  if (coffeeRegex.test(readme)) {
    readme = readme.replace(coffeeRegex, renderCoffeeHtml(coffeeData));
  }

  fs.writeFileSync(README_PATH, readme, 'utf8');
  console.log('README.md updated with latest Guestbook & Coffee data.');
}

async function processIssueEvent() {
  const issueTitle = process.env.ISSUE_TITLE || '';
  const issueBody = process.env.ISSUE_BODY || '';
  const issueUser = process.env.ISSUE_USER || 'anonymous';
  const issueUserAvatar = process.env.ISSUE_USER_AVATAR || `https://github.com/${issueUser}.png`;

  console.log(`Processing issue: "${issueTitle}" from @${issueUser}`);

  let updated = false;

  // Case 1: Guestbook Entry
  if (/guestbook:/i.test(issueTitle)) {
    let msg = issueTitle.replace(/^.*guestbook:\s*/i, '').trim();
    if (!msg || msg.toLowerCase() === 'lời chào của bạn' || msg.toLowerCase() === 'nhập lời nhắn ở đây') {
      msg = issueBody.trim();
    }
    msg = sanitizeText(msg) || 'Đã ghé thăm profile của Hưng! 🚀';

    const guestbookData = JSON.parse(fs.readFileSync(GUESTBOOK_PATH, 'utf8'));
    guestbookData.unshift({
      username: issueUser,
      name: issueUser,
      avatar: issueUserAvatar,
      message: msg,
      date: new Date().toISOString().split('T')[0]
    });

    // Keep top 10
    const trimmed = guestbookData.slice(0, 10);
    fs.writeFileSync(GUESTBOOK_PATH, JSON.stringify(trimmed, null, 2), 'utf8');
    updated = true;
    console.log(`Added guestbook entry from @${issueUser}: "${msg}"`);
  }

  // Case 2: Coffee Fuel
  else if (/coffee:/i.test(issueTitle)) {
    const coffeeData = JSON.parse(fs.readFileSync(COFFEE_PATH, 'utf8'));
    if (/espresso/i.test(issueTitle) || /espresso/i.test(issueBody)) {
      coffeeData.espresso = (coffeeData.espresso || 84) + 1;
      console.log('Incremented espresso shot!');
    } else if (/bacxiu/i.test(issueTitle) || /bacxiu/i.test(issueBody)) {
      coffeeData.bacxiu = (coffeeData.bacxiu || 95) + 1;
      console.log('Incremented bac xiu!');
    } else {
      coffeeData.suada = (coffeeData.suada || 128) + 1;
      console.log('Incremented ca phe sua da!');
    }
    coffeeData.total = (coffeeData.suada || 0) + (coffeeData.espresso || 0) + (coffeeData.bacxiu || 0);
    fs.writeFileSync(COFFEE_PATH, JSON.stringify(coffeeData, null, 2), 'utf8');
    updated = true;
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
