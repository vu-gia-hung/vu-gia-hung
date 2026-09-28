const fs = require('fs');
const path = require('path');
const { getAttribute, replaceColorMappings, setAttribute } = require('./svg-utils');

function transform3dNightSvg(svg) {
  return replaceColorMappings(svg, [
    [/rgb\(\s*255\s*,\s*200\s*,\s*55\s*\)/g, 'rgb(56,189,248)'],
    [/#f1e05a|#818cf8/gi, '#0ea5e9'],
    [/#e34c26/gi, '#60a5fa'],
    [/#f34b7d/gi, '#0284c7'],
    [/#3178c6/gi, '#38bdf8'],
    [/#3572a5/gi, '#0369a1']
  ], '3D night graph', /rgb\(\s*56\s*,\s*189\s*,\s*248\s*\)|#0ea5e9|#60a5fa|#0284c7|#38bdf8|#0369a1/i);
}

function recolor3dNightGraph(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  const result = transform3dNightSvg(fs.readFileSync(filePath, 'utf8'));

  fs.writeFileSync(filePath, result.svg, 'utf8');
  console.log(`Updated ${result.replacements} source colors in 3D night graph at ${filePath}.`);
}

function transform3dLightSvg(svg) {
  const result = replaceColorMappings(svg, [
    [/#47a042/gi, '#0284c7'],
    [/#f1e05a/gi, '#0ea5e9'],
    [/#e34c26/gi, '#60a5fa'],
    [/#f34b7d/gi, '#0284c7'],
    [/#3178c6/gi, '#38bdf8'],
    [/#3572a5/gi, '#0369a1'],
    [/rgb\(\s*216\s*,\s*232\s*,\s*135\s*\)/g, 'rgb(186, 230, 253)'],
    [/rgb\(\s*181\s*,\s*194\s*,\s*113\s*\)/g, 'rgb(155, 215, 250)'],
    [/rgb\(\s*151\s*,\s*162\s*,\s*95\s*\)/g, 'rgb(125, 195, 240)'],
    [/rgb\(\s*140\s*,\s*197\s*,\s*105\s*\)/g, 'rgb(125, 211, 252)'],
    [/rgb\(\s*117\s*,\s*165\s*,\s*88\s*\)/g, 'rgb(80, 185, 245)'],
    [/rgb\(\s*98\s*,\s*138\s*,\s*74\s*\)/g, 'rgb(50, 160, 235)'],
    [/rgb\(\s*71\s*,\s*160\s*,\s*66\s*\)/g, 'rgb(56, 189, 248)'],
    [/rgb\(\s*59\s*,\s*134\s*,\s*55\s*\)/g, 'rgb(30, 160, 230)'],
    [/rgb\(\s*50\s*,\s*112\s*,\s*46\s*\)/g, 'rgb(15, 135, 210)'],
    [/rgb\(\s*29\s*,\s*106\s*,\s*35\s*\)/g, 'rgb(2, 132, 199)'],
    [/rgb\(\s*24\s*,\s*89\s*,\s*29\s*\)/g, 'rgb(2, 115, 175)'],
    [/rgb\(\s*20\s*,\s*74\s*,\s*25\s*\)/g, 'rgb(2, 95, 150)']
  ], '3D light graph', /#0284c7|rgb\(\s*186\s*,\s*230\s*,\s*253\s*\)/i);
  let content = result.svg;

  // Recolor numeric labels regardless of their value or the order of SVG attributes.
  content = content.replace(/(<text\b[^>]*>)([^<]*)(<\/text>)/gi, (element, openingTag, text, closingTag) => {
    if (getAttribute(openingTag, 'fill')?.toLowerCase() !== '#111133' || !/^\s*\d+\s*$/.test(text)) {
      return element;
    }
    return `${setAttribute(openingTag, 'fill', '#0284c7')}${text}${closingTag}`;
  });

  return { svg: content, replacements: result.replacements };
}

function recolor3dLightGraph(filePath, destPath = filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  const result = transform3dLightSvg(fs.readFileSync(filePath, 'utf8'));
  fs.writeFileSync(destPath, result.svg, 'utf8');
  console.log(`Updated ${result.replacements} source colors in 3D light graph at ${destPath}.`);
}

module.exports = { recolor3dNightGraph, recolor3dLightGraph, transform3dNightSvg, transform3dLightSvg };

if (require.main === module) {
  const nightTarget = path.resolve(__dirname, '../profile-3d-contrib/profile-night-view.svg');
  const lightTarget = path.resolve(__dirname, '../profile-3d-contrib/profile-blue.svg');
  recolor3dNightGraph(nightTarget);
  recolor3dLightGraph(lightTarget);
}
