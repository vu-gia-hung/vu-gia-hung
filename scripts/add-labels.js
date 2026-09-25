const fs = require('fs');
const path = require('path');

function getPastMonths() {
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), currentMonth - i, 1);
    result.push(shortMonths[d.getMonth()]);
  }
  return result;
}

function processSvg(filePath, isDark) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  const textColor = isDark ? '#94a3b8' : '#57606a';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const cardBg = isDark ? '#060913' : '#ffffff';

  // 12 months spaced across the 53 weeks (53 weeks * 16px ≈ 848px)
  const months = getPastMonths();
  const startX = 35;
  const stepX = 66;

  let monthElements = '';
  months.forEach((m, idx) => {
    const x = startX + idx * stepX;
    monthElements += `<text x="${x}" y="-8" fill="${textColor}" font-size="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-weight="600">${m}</text>`;
  });

  const dayElements = `
    <text x="-12" y="30" fill="${textColor}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" text-anchor="end" font-weight="600">Mon</text>
    <text x="-12" y="62" fill="${textColor}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" text-anchor="end" font-weight="600">Wed</text>
    <text x="-12" y="94" fill="${textColor}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" text-anchor="end" font-weight="600">Fri</text>
  `;

  // Elegant container card matching GitHub's profile stats style
  const borderCard = `<rect x="-35" y="-24" width="895" height="188" rx="8" fill="${cardBg}" stroke="${borderColor}" stroke-width="1" />`;

  // Adjust viewBox for labels, card borders, and padding
  content = content.replace(/viewBox="[^"]*"/, 'viewBox="-40 -28 905 195"');

  // Insert background card right after <desc>...</desc> or after <style>...</style>
  const insertBgPos = content.indexOf('</style>') !== -1 ? content.indexOf('</style>') + 8 : content.indexOf('>') + 1;
  content = content.slice(0, insertBgPos) + borderCard + content.slice(insertBgPos);

  // Insert labels before closing </svg>
  content = content.replace('</svg>', `<g id="calendar-labels">${monthElements}${dayElements}</g></svg>`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath} with month and day labels.`);
}

const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  processSvg(path.join(distDir, 'github-contribution-grid-snake.svg'), false);
  processSvg(path.join(distDir, 'github-contribution-grid-snake-dark.svg'), true);
}
