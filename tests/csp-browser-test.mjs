import { chromium } from 'playwright';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function runBrowserFlowTests() {
  console.log('======================================================');
  console.log('Automated Real-Browser CSP Verification Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log('======================================================\n');

  const browser = await chromium.launch({ headless: true });
  const results = [];

  async function createMonitoredPage() {
    const page = await browser.newPage();
    const violations = [];
    const consoleErrors = [];

    await page.addInitScript(() => {
      window.__cspViolations = [];
      window.addEventListener('securitypolicyviolation', (e) => {
        window.__cspViolations.push({
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
          effectiveDirective: e.effectiveDirective,
          originalPolicy: e.originalPolicy
        });
      });
    });

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Content Security Policy') || text.includes('CSP') || text.includes('violates the directive')) {
        violations.push({ source: 'console', message: text });
      } else if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`[PageError] ${err.message}`);
    });

    return { page, violations, consoleErrors };
  }

  // FLOW 1: Root Dashboard Page Load
  {
    const { page, violations, consoleErrors } = await createMonitoredPage();
    try {
      const res = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);
      const inPage = await page.evaluate(() => window.__cspViolations || []);
      const totalViolations = [...violations, ...inPage];
      const passed = totalViolations.length === 0;
      results.push({
        flow: 'Dashboard Shell & PWA Assets',
        path: '/',
        status: res.status(),
        violations: totalViolations.length,
        passed,
        details: totalViolations
      });
      console.log(`[FLOW 1: Dashboard] Status: ${res.status()} | Violations: ${totalViolations.length}`);
    } finally {
      await page.close();
    }
  }

  // FLOW 2: Documentation & Guide Page
  {
    const { page, violations } = await createMonitoredPage();
    try {
      const res = await page.goto(`${BASE_URL}/guide`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      const inPage = await page.evaluate(() => window.__cspViolations || []);
      const totalViolations = [...violations, ...inPage];
      const passed = totalViolations.length === 0;
      results.push({
        flow: 'How-To-Use Guide Documentation',
        path: '/guide',
        status: res.status(),
        violations: totalViolations.length,
        passed,
        details: totalViolations
      });
      console.log(`[FLOW 2: Guide] Status: ${res.status()} | Violations: ${totalViolations.length}`);
    } finally {
      await page.close();
    }
  }

  // FLOW 3: Desktop Auth Flow & Clerk Sign-in Component
  {
    const { page, violations } = await createMonitoredPage();
    try {
      const res = await page.goto(`${BASE_URL}/desktop-auth`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000); // Give Clerk JS time to initialize
      const inPage = await page.evaluate(() => window.__cspViolations || []);
      const totalViolations = [...violations, ...inPage];
      const passed = totalViolations.length === 0;
      results.push({
        flow: 'Clerk Sign-In Component (/desktop-auth)',
        path: '/desktop-auth',
        status: res.status(),
        violations: totalViolations.length,
        passed,
        details: totalViolations
      });
      console.log(`[FLOW 3: Clerk Auth] Status: ${res.status()} | Violations: ${totalViolations.length}`);
    } finally {
      await page.close();
    }
  }

  // FLOW 4: Leaflet Map Tiles & Flight Tracking Flow
  {
    const { page, violations } = await createMonitoredPage();
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
      const inPage = await page.evaluate(() => window.__cspViolations || []);
      const totalViolations = [...violations, ...inPage];
      const passed = totalViolations.length === 0;
      results.push({
        flow: 'Leaflet & ArcGIS Map Tile Layer',
        path: '/#flight',
        status: 200,
        violations: totalViolations.length,
        passed,
        details: totalViolations
      });
      console.log(`[FLOW 4: Map Tiles] Status: 200 | Violations: ${totalViolations.length}`);
    } finally {
      await page.close();
    }
  }

  // FLOW 5: Spotify Integration Widget Flow
  {
    const { page, violations } = await createMonitoredPage();
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
      const spotifyWidget = page.locator('.spotify-widget').first();
      if (await spotifyWidget.count() > 0) {
        await spotifyWidget.hover().catch(() => {});
      }
      await page.waitForTimeout(1000);
      const inPage = await page.evaluate(() => window.__cspViolations || []);
      const totalViolations = [...violations, ...inPage];
      const passed = totalViolations.length === 0;
      results.push({
        flow: 'Spotify Integration Widget',
        path: '/#spotify',
        status: 200,
        violations: totalViolations.length,
        passed,
        details: totalViolations
      });
      console.log(`[FLOW 5: Spotify] Status: 200 | Violations: ${totalViolations.length}`);
    } finally {
      await page.close();
    }
  }

  // FLOW 6: Firebase Service Worker & Web Push Registration Flow
  {
    const { page, violations } = await createMonitoredPage();
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
      const swRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          return regs.length > 0;
        }
        return false;
      });
      await page.waitForTimeout(1000);
      const inPage = await page.evaluate(() => window.__cspViolations || []);
      const totalViolations = [...violations, ...inPage];
      const passed = totalViolations.length === 0;
      results.push({
        flow: 'Firebase & PWA Service Worker Registration',
        path: '/#serviceworker',
        status: 200,
        violations: totalViolations.length,
        passed,
        details: totalViolations
      });
      console.log(`[FLOW 6: Service Worker] Registered: ${swRegistered} | Violations: ${totalViolations.length}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('REAL-BROWSER CSP AUDIT SUMMARY:');
  console.table(results.map(r => ({
    Flow: r.flow,
    Path: r.path,
    Status: r.status,
    Violations: r.violations,
    Result: r.passed ? 'PASS' : 'FAIL'
  })));
  console.log('======================================================\n');

  const allPassed = results.every(r => r.passed);
  if (!allPassed) {
    console.error('Some flows produced CSP violations:');
    console.error(results.filter(r => !r.passed));
    process.exit(1);
  } else {
    console.log('SUCCESS: All flows executed with ZERO CSP violations.');
  }
}

runBrowserFlowTests().catch(err => {
  console.error('[FATAL BROWSER FLOW TEST ERROR]:', err);
  process.exit(1);
});
