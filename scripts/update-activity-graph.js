const fs = require('fs');
const path = require('path');
const fetchSvg = require('./fetch-svg');
const { escapeXmlText, getAttribute, hasClass } = require('./svg-utils');
const { recolor3dNightGraph, recolor3dLightGraph } = require('./recolor-3d-graph');
const { updateTrophies } = require('./update-trophies');

function injectNumbers(svg, textColor, strokeColor) {
  const pointLines = (svg.match(/<line\b[^>]*>/gi) || []).filter(tag => hasClass(tag, 'ct-point'));
  if (pointLines.length === 0) {
    throw new Error('Activity graph SVG contains no ct-point elements to label.');
  }

  let labels = '\n  <!-- Dynamic Point Value Labels -->\n  <g font-family="-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif" font-size="10" font-weight="700" text-anchor="middle">\n';
  for (const tag of pointLines) {
    const xValue = getAttribute(tag, 'x1');
    const yValue = getAttribute(tag, 'y1');
    const value = getAttribute(tag, 'ct:value');
    const x = Number(xValue);
    const y = Number(yValue);

    if (xValue === null || yValue === null || value === null || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Activity graph contains a ct-point with missing or invalid coordinates: ${tag}`);
    }

    // Place text 9px above the dot with clean background outline for crisp contrast
    labels += `    <text x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}" fill="${textColor}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="round" paint-order="stroke fill">${escapeXmlText(value)}</text>\n`;
  }
  labels += '  </g>\n';

  const closingTags = [...svg.matchAll(/<\/svg\s*>/gi)];
  const lastClosingTag = closingTags[closingTags.length - 1];
  if (!lastClosingTag) {
    throw new Error('Activity graph response has no closing </svg> tag.');
  }

  console.log('Injected labels count:', pointLines.length);
  return svg.slice(0, lastClosingTag.index) + labels + svg.slice(lastClosingTag.index);
}

function recolorActivityArea(svg) {
  let replacements = 0;
  const recolored = svg.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector, declarations) => {
    if (!/\.ct-area\b/i.test(selector)) return rule;

    let ruleReplacements = 0;
    const updatedDeclarations = declarations.replace(/(\bfill\s*:\s*)[^;]+/gi, (_match, prefix) => {
      ruleReplacements += 1;
      return `${prefix}#bae6fd`;
    });
    if (ruleReplacements === 0) return rule;

    replacements += ruleReplacements;
    return `${selector}{${updatedDeclarations}}`;
  });

  if (replacements === 0) {
    throw new Error('Activity graph SVG contains no fill rule for its .ct-area region.');
  }
  return recolored;
}

async function run() {
  // 100% Cosmic Blue palette for Dark Mode (Sky cyan #38bdf8, Ice cyan #7dd3fc, Void #060913) - ZERO red/yellow
  const darkUrl = 'https://github-activity-graph.vercel.app/graph?username=vu-gia-hung&theme=tokyo-night&bg_color=060913&color=38bdf8&line=38bdf8&point=7dd3fc&area=true&hide_border=false&border=1e293b';
  // Crisp Sapphire & Ice Blue palette for Light Mode
  const lightUrl = 'https://github-activity-graph.vercel.app/graph?username=vu-gia-hung&theme=github-light&bg_color=ffffff&color=0284c7&line=0284c7&point=0284c7&area=true&hide_border=false&border=e2e8f0';

  console.log('Fetching Activity Graphs from Vercel...');
  const [darkSvg, lightSvg] = await Promise.all([fetchSvg(darkUrl), fetchSvg(lightUrl)]);

  const enhancedDark = injectNumbers(darkSvg, '#7dd3fc', '#060913');
  const enhancedLight = recolorActivityArea(injectNumbers(lightSvg, '#0284c7', '#ffffff'));

  fs.mkdirSync('assets', { recursive: true });
  fs.writeFileSync('assets/activity-graph-dark.svg', enhancedDark);
  fs.writeFileSync('assets/activity-graph-light.svg', enhancedLight);
  console.log('Saved enhanced activity graphs to assets/');

  // Also sanitize 3D graphs (both dark and light) to guarantee 100% blue consistency
  const nightGraphPath = path.resolve(__dirname, '../profile-3d-contrib/profile-night-view.svg');
  const lightSourcePath = path.resolve(__dirname, '../profile-3d-contrib/profile-green.svg');
  const lightBluePath = path.resolve(__dirname, '../profile-3d-contrib/profile-blue.svg');

  recolor3dNightGraph(nightGraphPath);

  if (fs.existsSync(lightSourcePath)) {
    recolor3dLightGraph(lightSourcePath, lightBluePath);
    if (lightSourcePath !== lightBluePath && fs.existsSync(lightSourcePath)) {
      fs.unlinkSync(lightSourcePath);
    }
  } else if (fs.existsSync(lightBluePath)) {
    recolor3dLightGraph(lightBluePath, lightBluePath);
  }

  // Also fetch and recolor trophies to 100% cosmic blues
  await updateTrophies();
}

if (require.main === module) {
  run().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { injectNumbers, recolorActivityArea };
