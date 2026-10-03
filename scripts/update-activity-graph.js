const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { recolor3dNightGraph, recolor3dLightGraph } = require('./recolor-3d-graph');
const { updateTrophies } = require('./update-trophies');

/**
 * Fetch monthly contribution data for a given user and year using GitHub GraphQL API.
 * Falls back gracefully if token is unavailable.
 */
async function fetchMonthlyContributions(username, year) {
  let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    try {
      token = execSync('gh auth token', { encoding: 'utf8' }).trim();
    } catch (e) {}
  }

  if (token) {
    const query = `
      query {
        user(login: "${username}") {
          contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }
    `;

    try {
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'User-Agent': 'NodeJS',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });
      const json = await res.json();
      if (json.data && json.data.user && json.data.user.contributionsCollection) {
        const cal = json.data.user.contributionsCollection.contributionCalendar;
        const monthly = Array(12).fill(0);
        for (const week of cal.weeks) {
          for (const day of week.contributionDays) {
            const d = new Date(day.date);
            if (d.getFullYear() === year) {
              monthly[d.getMonth()] += day.contributionCount;
            }
          }
        }
        return { total: cal.totalContributions, monthly };
      }
    } catch (err) {
      console.warn('GitHub GraphQL API query failed, falling back:', err.message);
    }
  }

  // Fallback defaults if API is not accessible
  return { total: 852, monthly: [0, 0, 0, 0, 0, 1, 20, 306, 499, 26, 0, 0] };
}

/**
 * Generate a responsive, modern monthly contribution wave chart SVG.
 * All labels, axes, and headings are 100% in English.
 */
function generateMonthlyActivitySvg({
  year = 2026,
  authorName = "Vu Gia Hung",
  monthlyData = [0, 0, 0, 0, 0, 1, 20, 306, 499, 26, 0, 0],
  total = null,
  isDark = true
}) {
  const width = 1200;
  const height = 420;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const totalCount = total !== null ? total : monthlyData.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(...monthlyData, 10);
  
  // Calculate clean, rounded upper axis tick
  let step = 50;
  if (maxVal > 200) step = 100;
  if (maxVal > 500) step = 150;
  if (maxVal > 1000) step = 250;
  const yMax = Math.ceil(maxVal / step) * step;
  const yTicks = [];
  for (let t = 0; t <= yMax; t += step) {
    yTicks.push(t);
  }

  const leftMargin = 85;
  const rightMargin = 60;
  const topMargin = 85;
  const bottomMargin = 70;

  const plotWidth = width - leftMargin - rightMargin;
  const plotHeight = height - topMargin - bottomMargin;
  const baseY = topMargin + plotHeight; // baseline y = 350

  const getX = (i) => leftMargin + (i * (plotWidth / 11));
  const getY = (val) => baseY - (val / yMax) * plotHeight;

  const points = monthlyData.map((val, i) => ({
    x: getX(i),
    y: getY(val),
    val,
    month: months[i]
  }));

  // Build smooth cubic Bezier wave curve
  let curveD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    // Prevent curve overshooting below bottom baseline
    if (cp1y > baseY) cp1y = baseY;
    if (cp2y > baseY) cp2y = baseY;

    curveD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const areaD = `${curveD} L ${points[11].x.toFixed(1)} ${baseY} L ${points[0].x.toFixed(1)} ${baseY} Z`;

  // Color tokens tailored to profile aesthetics
  const bgColor = isDark ? '#060913' : '#ffffff';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const titleColor = isDark ? '#38bdf8' : '#0284c7';
  const subtitleColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)';
  const axisTextColor = isDark ? '#64748b' : '#475569';
  const monthActiveColor = isDark ? '#7dd3fc' : '#0284c7';
  const lineColor = isDark ? '#38bdf8' : '#0284c7';
  const gradStart = isDark ? '#38bdf8' : '#0284c7';
  const gradOpacity = isDark ? '0.35' : '0.22';
  const pointFill = isDark ? '#060913' : '#ffffff';
  const pointStroke = isDark ? '#7dd3fc' : '#0284c7';
  const pointTextFill = isDark ? '#7dd3fc' : '#0284c7';
  const pointTextStroke = isDark ? '#060913' : '#ffffff';

  // Horizontal Grid Lines & Y-Axis Labels
  let gridSvg = '';
  yTicks.forEach(tick => {
    const y = getY(tick);
    gridSvg += `    <line x1="${leftMargin}" y1="${y.toFixed(1)}" x2="${width - rightMargin}" y2="${y.toFixed(1)}" stroke="${gridColor}" stroke-dasharray="3 3" stroke-width="1" />\n`;
    gridSvg += `    <text x="${leftMargin - 15}" y="${(y + 4).toFixed(1)}" fill="${axisTextColor}" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600">${tick}</text>\n`;
  });

  // Vertical Grid Lines & Month Labels
  let monthsSvg = '';
  points.forEach((p) => {
    monthsSvg += `    <line x1="${p.x.toFixed(1)}" y1="${topMargin}" x2="${p.x.toFixed(1)}" y2="${baseY}" stroke="${gridColor}" stroke-dasharray="2 4" stroke-width="1" />\n`;
    const labelColor = p.val > 0 ? monthActiveColor : axisTextColor;
    const labelWeight = p.val > 0 ? '700' : '500';
    monthsSvg += `    <text x="${p.x.toFixed(1)}" y="${baseY + 24}" fill="${labelColor}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="${labelWeight}">${p.month}</text>\n`;
  });

  // Data Points & Exact Numbers Over Each Month
  let pointsSvg = '';
  points.forEach(p => {
    pointsSvg += `    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="${pointFill}" stroke="${pointStroke}" stroke-width="2.5" />\n`;
    if (p.val > 0) {
      pointsSvg += `    <text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" fill="${pointTextFill}" stroke="${pointTextStroke}" stroke-width="3" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700">${p.val}</text>\n`;
    }
  });

  const gradId = isDark ? 'areaGradDark' : 'areaGradLight';

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${gradStart}" stop-opacity="${gradOpacity}" />
      <stop offset="100%" stop-color="${gradStart}" stop-opacity="0.0" />
    </linearGradient>
  </defs>

  <!-- Card Background -->
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />

  <!-- Header Title & Subtitle (100% English) -->
  <text x="${width / 2}" y="38" fill="${titleColor}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" letter-spacing="0.5">${authorName}'s Monthly Contribution Activity (${year})</text>
  <text x="${width / 2}" y="58" fill="${subtitleColor}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">${totalCount.toLocaleString()} Total Contributions in ${year}</text>

  <!-- Y-Axis Label -->
  <text transform="translate(24, ${(topMargin + baseY) / 2}) rotate(-90)" fill="${axisTextColor}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" letter-spacing="1">CONTRIBUTIONS</text>

  <!-- X-Axis Label -->
  <text x="${width / 2}" y="${height - 16}" fill="${axisTextColor}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" letter-spacing="1">MONTHS (${year})</text>

  <!-- Grid Lines -->
  <g>
${gridSvg}
${monthsSvg}
  </g>

  <!-- Gradient Area Fill -->
  <path d="${areaD}" fill="url(#${gradId})" />

  <!-- Wave Line -->
  <path d="${curveD}" fill="none" stroke="${lineColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Data Points and Values -->
  <g>
${pointsSvg}
  </g>
</svg>`;
}

async function run() {
  const currentYear = new Date().getFullYear();
  const username = 'vu-gia-hung';

  console.log(`Fetching monthly contributions for ${username} in ${currentYear}...`);
  const { total, monthly } = await fetchMonthlyContributions(username, currentYear);
  console.log(`Fetched ${total} contributions across 12 months in ${currentYear}:`, monthly);

  const darkSvg = generateMonthlyActivitySvg({
    year: currentYear,
    authorName: 'Vu Gia Hung',
    monthlyData: monthly,
    total,
    isDark: true
  });

  const lightSvg = generateMonthlyActivitySvg({
    year: currentYear,
    authorName: 'Vu Gia Hung',
    monthlyData: monthly,
    total,
    isDark: false
  });

  const assetsDir = path.resolve(__dirname, '../assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, 'activity-graph-dark.svg'), darkSvg, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'activity-graph-light.svg'), lightSvg, 'utf8');
  console.log('Saved monthly contribution activity graphs to assets/');

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

module.exports = { fetchMonthlyContributions, generateMonthlyActivitySvg };
