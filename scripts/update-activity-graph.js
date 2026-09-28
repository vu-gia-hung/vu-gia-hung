const fs = require('fs');
const path = require('path');
const fetchSvg = require('./fetch-svg');
const { recolor3dNightGraph, recolor3dLightGraph } = require('./recolor-3d-graph');
const { updateTrophies } = require('./update-trophies');

const injectNumbers = (svg, textColor, strokeColor) => {
  // Regex to match ct-point with x1, y1 and ct:value
  const regex = /<line\s+[^>]*x1="([^"]+)"[^>]*y1="([^"]+)"[^>]*class="ct-point"[^>]*ct:value="([^"]+)"[^>]*>/g;
  let labels = '\n  <!-- Dynamic Point Value Labels -->\n  <g font-family="-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif" font-size="10" font-weight="700" text-anchor="middle">\n';
  let count = 0;

  let match;
  while ((match = regex.exec(svg)) !== null) {
    count++;
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const val = match[3];

    // Place text 9px above the dot with clean background outline for crisp contrast
    labels += `    <text x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}" fill="${textColor}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="round" paint-order="stroke fill">${val}</text>\n`;
  }
  labels += '  </g>\n';

  console.log('Injected labels count:', count);
  const lastIndex = svg.lastIndexOf('</svg>');
  if (lastIndex === -1) return svg + labels;
  return svg.slice(0, lastIndex) + labels + svg.slice(lastIndex);
};

async function run() {
  // 100% Cosmic Blue palette for Dark Mode (Sky cyan #38bdf8, Ice cyan #7dd3fc, Void #060913) - ZERO red/yellow
  const darkUrl = 'https://github-activity-graph.vercel.app/graph?username=vu-gia-hung&theme=tokyo-night&bg_color=060913&color=38bdf8&line=38bdf8&point=7dd3fc&area=true&hide_border=false&border=1e293b';
  // Crisp Sapphire & Ice Blue palette for Light Mode
  const lightUrl = 'https://github-activity-graph.vercel.app/graph?username=vu-gia-hung&theme=github-light&bg_color=ffffff&color=0284c7&line=0284c7&point=0284c7&area=true&hide_border=false&border=e2e8f0';

  console.log('Fetching Activity Graphs from Vercel...');
  const [darkSvg, lightSvg] = await Promise.all([fetchSvg(darkUrl), fetchSvg(lightUrl)]);

  const enhancedDark = injectNumbers(darkSvg, '#7dd3fc', '#060913');
  let enhancedLight = injectNumbers(lightSvg, '#0284c7', '#ffffff');
  // Replace GitHub green wave area fill with pure luminous ice blue
  enhancedLight = enhancedLight.replace(/#9be9a8/gi, '#bae6fd');

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

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
