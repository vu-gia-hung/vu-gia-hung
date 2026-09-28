const fs = require('fs');
const path = require('path');
const fetchSvg = require('./fetch-svg');
const { getAttribute, replaceColorMappings, setAttribute } = require('./svg-utils');

function styleRankLabels(svg, fill) {
  let updated = 0;
  const result = svg.replace(/<text\b[^>]*>/gi, tag => {
    const fontFamily = getAttribute(tag, 'font-family');
    const fontSize = getAttribute(tag, 'font-size');
    if (!fontFamily || fontFamily.replace(/\s+/g, '').toLowerCase() !== 'courier,monospace' || Number.parseFloat(fontSize) !== 7) {
      return tag;
    }

    updated += 1;
    return setAttribute(setAttribute(tag, 'font-weight', 'bold'), 'fill', fill);
  });
  if (updated === 0) {
    throw new Error('No trophy rank labels found; the SVG text structure may have changed.');
  }
  return { svg: result, updated };
}

function transformTrophies(rawDark, rawLight) {
  const darkResult = replaceColorMappings(rawDark, [
    [/#178600/gi, '#0284c7'],
    [/#2dde98/gi, '#38bdf8'],
    [/#bf91f3/gi, '#7dd3fc'],
    [/#38bdae/gi, '#94a3b8'],
    [/#e1e4e8/gi, '#1e293b'],
    [/#1a1b27/gi, '#060913'],
    [/#70a5fd/gi, '#38bdf8'],
    [/#00aeff/gi, '#38bdf8'],
    [/#5c75c3/gi, '#0284c7'],
    [/#6272a4/gi, '#0c4a6e'],
    [/#8be9fd/gi, '#7dd3fc']
  ], 'dark trophy SVG');
  const darkRankLabels = styleRankLabels(darkResult.svg, '#0d1117');
  const darkSvg = darkRankLabels.svg;

  const lightResult = replaceColorMappings(rawLight, [
    [/#009366/gi, '#0284c7'],
    [/#eac200/gi, '#0284c7'],
    [/#886000/gi, '#0369a1'],
    [/#b0b0b0/gi, '#38bdf8'],
    [/#a18d66/gi, '#60a5fa'],
    [/#777777|#777/gi, '#0284c7'],
    [/#0366d6/gi, '#0284c7'],
    [/#e1e4e8/gi, '#e2e8f0'],
    [/#000000|#000/gi, '#0284c7'],
    [/#666666|#666/gi, '#475569'],
    [/#333333|#333/gi, '#475569']
  ], 'light trophy SVG');
  let lightSvg = lightResult.svg;

  // Match rank circles by their attributes, independent of their order in the SVG tag.
  lightSvg = lightSvg.replace(/<circle\b[^>]*\/?>/gi, circle => {
    if (Number(getAttribute(circle, 'cx')) !== 8 ||
        Number(getAttribute(circle, 'cy')) !== 6 ||
        Number(getAttribute(circle, 'r')) !== 4 ||
        !['#fff', '#ffffff'].includes(getAttribute(circle, 'fill')?.toLowerCase())) {
      return circle;
    }
    return setAttribute(setAttribute(setAttribute(circle, 'fill', '#ffffff'), 'stroke', '#bae6fd'), 'stroke-width', '0.6');
  });

  const lightRankLabels = styleRankLabels(lightSvg, '#0284c7');
  lightSvg = lightRankLabels.svg;

  return {
    darkSvg,
    lightSvg,
    darkColorReplacements: darkResult.replacements,
    lightColorReplacements: lightResult.replacements,
    darkRankLabels: darkRankLabels.updated,
    lightRankLabels: lightRankLabels.updated
  };
}

async function updateTrophies() {
  const darkTrophyUrl = 'https://profile-trophy.vercel.app/?username=vu-gia-hung&theme=tokyonight&no-bg=true&margin-w=4&column=7';
  const lightTrophyUrl = 'https://profile-trophy.vercel.app/?username=vu-gia-hung&theme=flat&no-bg=true&margin-w=4&column=7';

  console.log('Fetching GitHub Trophies...');
  const [rawDark, rawLight] = await Promise.all([
    fetchSvg(darkTrophyUrl),
    fetchSvg(lightTrophyUrl)
  ]);
  const result = transformTrophies(rawDark, rawLight);

  const assetsDir = path.resolve(__dirname, '../assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, 'trophies-dark.svg'), result.darkSvg, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'trophies-light.svg'), result.lightSvg, 'utf8');
  console.log(`Updated trophy palettes (dark: ${result.darkColorReplacements}, light: ${result.lightColorReplacements} color replacements).`);
}

module.exports = { transformTrophies, updateTrophies };

if (require.main === module) {
  updateTrophies().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
