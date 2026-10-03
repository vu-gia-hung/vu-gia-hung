const test = require('node:test');
const assert = require('node:assert/strict');

const { generateMonthlyActivitySvg } = require('../scripts/update-activity-graph');
const { transform3dLightSvg, transform3dNightSvg } = require('../scripts/recolor-3d-graph');
const { transformTrophies } = require('../scripts/update-trophies');

test('generateMonthlyActivitySvg creates valid dark and light SVGs with correct metadata', () => {
  const dark = generateMonthlyActivitySvg({
    year: 2026,
    authorName: 'Vu Gia Hung',
    monthlyData: [10, 20, 30, 0, 5, 0, 0, 0, 0, 0, 0, 0],
    total: 65,
    isDark: true
  });
  assert.match(dark, /Vu Gia Hung's Monthly Contribution Activity \(2026\)/);
  assert.match(dark, /65 Total Contributions/);
  assert.match(dark, /#060913/);
  assert.match(dark, /MONTHS/);
  assert.match(dark, /CONTRIBUTIONS/);

  const light = generateMonthlyActivitySvg({
    year: 2026,
    authorName: 'Vu Gia Hung',
    monthlyData: [10, 20, 30, 0, 5, 0, 0, 0, 0, 0, 0, 0],
    total: 65,
    isDark: false
  });
  assert.match(light, /Vu Gia Hung's Monthly Contribution Activity \(2026\)/);
  assert.match(light, /#ffffff/);
});

test('3D recoloring supports new counts and is safe to run more than once', () => {
  const dark = transform3dNightSvg('<svg><path fill="rgb(255, 200, 55)"/><rect fill="#f1e05a"/></svg>');
  const light = transform3dLightSvg('<svg><rect fill="rgb(216, 232, 135)"/><text fill="#111133">8123</text></svg>');

  assert.match(dark.svg, /rgb\(56,189,248\)/);
  assert.equal(transform3dNightSvg(dark.svg).svg, dark.svg);
  assert.match(light.svg, /rgb\(186, 230, 253\)/);
  assert.match(light.svg, /fill="#0284c7">8123/);
  assert.equal(transform3dLightSvg(light.svg).svg, light.svg);
});

test('trophy rank formatting works when attributes are reordered', () => {
  const darkSvg = '<svg><rect fill="#178600"/><text font-size="7" y="8" fill="#abcdef" font-family="Courier, Monospace" x="6">A</text></svg>';
  const lightSvg = '<svg><rect fill="#009366"/><circle r="4" fill="#FFF" cy="6" cx="8"/><text font-size="7" fill="#abcdef" font-family="Courier, Monospace" y="8" x="6">A</text></svg>';
  const result = transformTrophies(darkSvg, lightSvg);

  assert.match(result.darkSvg, /font-weight="bold"/);
  assert.match(result.darkSvg, /fill="#0d1117"/);
  assert.match(result.lightSvg, /stroke="#bae6fd"/);
  assert.match(result.lightSvg, /font-weight="bold"/);
  assert.match(result.lightSvg, /fill="#0284c7"/);
});

test('trophy transformation rejects an unrecognized source palette', () => {
  assert.throws(
    () => transformTrophies('<svg/>', '<svg/>'),
    /no recognized source colors found in dark trophy SVG/i
  );
});
