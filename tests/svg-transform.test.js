const test = require('node:test');
const assert = require('node:assert/strict');

const { injectNumbers, recolorActivityArea } = require('../scripts/update-activity-graph');
const { transform3dLightSvg, transform3dNightSvg } = require('../scripts/recolor-3d-graph');
const { transformTrophies } = require('../scripts/update-trophies');

test('activity point labels work when SVG attributes are reordered', () => {
  const svg = '<svg><line ct:value="7" class="ct-grid ct-point" y1="20" x1="10"></line></svg>';
  const result = injectNumbers(svg, '#123456', '#ffffff');

  assert.match(result, /<text x="10\.0" y="11\.0"[^>]*>7<\/text>/);
});

test('activity transformation fails clearly when required graph structure is missing', () => {
  assert.throws(
    () => injectNumbers('<svg></svg>', '#123456', '#ffffff'),
    /no ct-point elements/i
  );
  assert.throws(
    () => recolorActivityArea('<svg><style>.ct-area{stroke:none;}</style></svg>'),
    /no fill rule/i
  );
});

test('activity area recoloring follows its selector instead of a specific source color', () => {
  const svg = '<svg><style>.ct-area{fill:#123456;}</style></svg>';
  assert.match(recolorActivityArea(svg), /\.ct-area\{fill:#bae6fd;\}/);
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
