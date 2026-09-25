const https = require('https');
const fs = require('fs');

const fetchSvg = (url) => new Promise((resolve, reject) => {
  https.get(url, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => resolve(d));
  }).on('error', reject);
});

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

    // Place text 10px above the dot with clean background outline for crisp contrast
    labels += `    <text x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}" fill="${textColor}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="round" paint-order="stroke fill">${val}</text>\n`;
  }
  labels += '  </g>\n';

  console.log('Injected labels count:', count);
  const lastIndex = svg.lastIndexOf('</svg>');
  if (lastIndex === -1) return svg + labels;
  return svg.slice(0, lastIndex) + labels + svg.slice(lastIndex);
};

async function run() {
  const darkUrl = 'https://github-activity-graph.vercel.app/graph?username=vu-gia-hung&theme=tokyo-night&bg_color=060913&color=38bdf8&line=38bdf8&point=e11d48&area=true&hide_border=false&border=1e293b';
  const lightUrl = 'https://github-activity-graph.vercel.app/graph?username=vu-gia-hung&theme=github-light&bg_color=ffffff&color=0284c7&line=0284c7&point=e11d48&area=true&hide_border=false&border=e2e8f0';

  console.log('Fetching Activity Graphs from Vercel...');
  const [darkSvg, lightSvg] = await Promise.all([fetchSvg(darkUrl), fetchSvg(lightUrl)]);

  const enhancedDark = injectNumbers(darkSvg, '#38bdf8', '#060913');
  const enhancedLight = injectNumbers(lightSvg, '#0284c7', '#ffffff');

  fs.mkdirSync('assets', { recursive: true });
  fs.writeFileSync('assets/activity-graph-dark.svg', enhancedDark);
  fs.writeFileSync('assets/activity-graph-light.svg', enhancedLight);
  console.log('Saved enhanced activity graphs to assets/');
}

run().catch(console.error);
