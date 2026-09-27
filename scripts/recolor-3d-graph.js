const fs = require('fs');
const path = require('path');

function recolor3dNightGraph(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace radar chart & count text yellows with radiant cosmic cyan (#38bdf8)
  content = content.replace(/rgb\(\s*255\s*,\s*200\s*,\s*55\s*\)/g, 'rgb(56,189,248)');

  // Replace language breakdown colors with nuanced pure cosmic blue shades (ZERO purple/red/yellow)
  // JavaScript: #f1e05a (yellow) -> #0ea5e9 (ocean sky blue)
  content = content.replace(/#f1e05a|#818cf8/gi, '#0ea5e9');
  // HTML: #e34c26 (red-orange) -> #60a5fa (electric cobalt blue)
  content = content.replace(/#e34c26/gi, '#60a5fa');
  // C++: #f34b7d (pink-red) -> #0284c7 (sapphire blue)
  content = content.replace(/#f34b7d/gi, '#0284c7');
  // TypeScript: #3178c6 -> #38bdf8 (sky cyan)
  content = content.replace(/#3178c6/gi, '#38bdf8');
  // Python: #3572A5 -> #0369a1 (deep space navy)
  content = content.replace(/#3572a5/gi, '#0369a1');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully recolored 3D night graph at ${filePath} to pure cosmic blues (no purple).`);
}

module.exports = { recolor3dNightGraph };

if (require.main === module) {
  const target = path.resolve(__dirname, '../profile-3d-contrib/profile-night-view.svg');
  recolor3dNightGraph(target);
}
