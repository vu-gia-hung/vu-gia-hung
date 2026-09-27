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

function recolor3dLightGraph(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace green radar with sapphire blue
  content = content.replace(/#47a042/gi, '#0284c7');

  // Replace language breakdown colors with pure blues (ZERO purple/red/yellow)
  content = content.replace(/#f1e05a/gi, '#0ea5e9'); // JS -> ocean sky blue
  content = content.replace(/#e34c26/gi, '#60a5fa'); // HTML -> electric cobalt blue
  content = content.replace(/#f34b7d/gi, '#0284c7'); // C++ -> sapphire blue
  content = content.replace(/#3178c6/gi, '#38bdf8'); // TS -> sky cyan
  content = content.replace(/#3572a5/gi, '#0369a1'); // Python -> deep space navy

  // Replace green contribution cubes with crisp sapphire/ice cyan shades
  // Level 1:
  content = content.replace(/rgb\(\s*216\s*,\s*232\s*,\s*135\s*\)/g, 'rgb(186, 230, 253)'); // top
  content = content.replace(/rgb\(\s*181\s*,\s*194\s*,\s*113\s*\)/g, 'rgb(155, 215, 250)'); // left
  content = content.replace(/rgb\(\s*151\s*,\s*162\s*,\s*95\s*\)/g, 'rgb(125, 195, 240)'); // right

  // Level 2:
  content = content.replace(/rgb\(\s*140\s*,\s*197\s*,\s*105\s*\)/g, 'rgb(125, 211, 252)'); // top
  content = content.replace(/rgb\(\s*117\s*,\s*165\s*,\s*88\s*\)/g, 'rgb(80, 185, 245)'); // left
  content = content.replace(/rgb\(\s*98\s*,\s*138\s*,\s*74\s*\)/g, 'rgb(50, 160, 235)'); // right

  // Level 3:
  content = content.replace(/rgb\(\s*71\s*,\s*160\s*,\s*66\s*\)/g, 'rgb(56, 189, 248)'); // top
  content = content.replace(/rgb\(\s*59\s*,\s*134\s*,\s*55\s*\)/g, 'rgb(30, 160, 230)'); // left
  content = content.replace(/rgb\(\s*50\s*,\s*112\s*,\s*46\s*\)/g, 'rgb(15, 135, 210)'); // right

  // Level 4:
  content = content.replace(/rgb\(\s*29\s*,\s*106\s*,\s*35\s*\)/g, 'rgb(2, 132, 199)'); // top
  content = content.replace(/rgb\(\s*24\s*,\s*89\s*,\s*29\s*\)/g, 'rgb(2, 115, 175)'); // left
  content = content.replace(/rgb\(\s*20\s*,\s*74\s*,\s*25\s*\)/g, 'rgb(2, 95, 150)'); // right

  // Number 735 (fill="#111133" -> fill="#0284c7")
  content = content.replace(/fill="#111133">735<\/text>/g, 'fill="#0284c7">735</text>');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully recolored 3D light graph at ${filePath} to pure sapphire/cyan blues.`);
}

module.exports = { recolor3dNightGraph, recolor3dLightGraph };

if (require.main === module) {
  const nightTarget = path.resolve(__dirname, '../profile-3d-contrib/profile-night-view.svg');
  const lightTarget = path.resolve(__dirname, '../profile-3d-contrib/profile-green.svg');
  recolor3dNightGraph(nightTarget);
  recolor3dLightGraph(lightTarget);
}
