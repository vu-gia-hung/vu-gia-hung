const https = require('https');
const fs = require('fs');
const path = require('path');

const fetchSvg = (url) => new Promise((resolve, reject) => {
  https.get(url, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => resolve(d));
  }).on('error', reject);
});

async function updateTrophies() {
  const darkTrophyUrl = 'https://profile-trophy.vercel.app/?username=vu-gia-hung&theme=tokyonight&no-bg=true&margin-w=4&column=7';
  const lightTrophyUrl = 'https://profile-trophy.vercel.app/?username=vu-gia-hung&theme=flat&no-bg=true&margin-w=4&column=7';

  console.log('Fetching GitHub Trophies...');
  const [rawDark, rawLight] = await Promise.all([
    fetchSvg(darkTrophyUrl),
    fetchSvg(lightTrophyUrl)
  ]);

  // Recolor Dark Theme Trophies to 100% PURE Cosmic Blues & Cyans (ZERO purple/lilac/green)
  let darkSvg = rawDark;
  // Replace green laurels with deep sapphire blue
  darkSvg = darkSvg.replace(/#178600/gi, '#0284c7');
  // Replace green cup gradient with vibrant sky cyan
  darkSvg = darkSvg.replace(/#2dde98/gi, '#38bdf8');
  // Replace lilac rank text & circle with luminous ice cyan
  darkSvg = darkSvg.replace(/#bf91f3/gi, '#7dd3fc');
  // Replace teal descriptions with clean slate
  darkSvg = darkSvg.replace(/#38bdae/gi, '#94a3b8');
  // Replace card border with cosmic border
  darkSvg = darkSvg.replace(/#e1e4e8/gi, '#1e293b');
  // Replace background with cosmic void
  darkSvg = darkSvg.replace(/#1a1b27/gi, '#060913');
  // Replace titles & bars with cyan
  darkSvg = darkSvg.replace(/#70a5fd/gi, '#38bdf8');
  darkSvg = darkSvg.replace(/#00aeff/gi, '#38bdf8');
  // Replace purplish C & ? cups (#5c75c3, #6272a4) with pure deep ocean sapphire & navy
  darkSvg = darkSvg.replace(/#5c75c3/gi, '#0284c7');
  darkSvg = darkSvg.replace(/#6272a4/gi, '#0c4a6e');
  // Replace B cup with radiant ice cyan
  darkSvg = darkSvg.replace(/#8be9fd/gi, '#7dd3fc');

  // Recolor Light Theme Trophies to Crisp Sapphire & Sky Blue (ZERO brown/gold/green)
  let lightSvg = rawLight;
  lightSvg = lightSvg.replace(/#009366/gi, '#0284c7');
  lightSvg = lightSvg.replace(/#eac200/gi, '#0284c7');
  lightSvg = lightSvg.replace(/#886000/gi, '#0369a1');
  lightSvg = lightSvg.replace(/#B0B0B0/gi, '#38bdf8');
  lightSvg = lightSvg.replace(/#A18D66/gi, '#60a5fa');
  lightSvg = lightSvg.replace(/#412D06/gi, '#ffffff');
  lightSvg = lightSvg.replace(/#505050/gi, '#ffffff');
  lightSvg = lightSvg.replace(/#777777|#777/gi, '#0284c7');
  lightSvg = lightSvg.replace(/#0366d6/gi, '#0284c7');
  lightSvg = lightSvg.replace(/#e1e4e8/gi, '#e2e8f0');
  lightSvg = lightSvg.replace(/#000000|#000/gi, '#0284c7');
  lightSvg = lightSvg.replace(/#666666|#666/gi, '#475569');
  lightSvg = lightSvg.replace(/#333333|#333/gi, '#475569');

  const assetsDir = path.resolve(__dirname, '../assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, 'trophies-dark.svg'), darkSvg, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'trophies-light.svg'), lightSvg, 'utf8');
  console.log('Successfully updated trophies-dark.svg and trophies-light.svg in assets/ (100% pure blue, zero purple)');
}

module.exports = { updateTrophies };

if (require.main === module) {
  updateTrophies().catch(console.error);
}
