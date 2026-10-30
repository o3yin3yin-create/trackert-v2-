import { chromium } from 'playwright';
import path from 'path';

async function generateOgImage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1200px;
        height: 630px;
        background: #000000;
        color: #FFFFFF;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 80px;
        position: relative;
        overflow: hidden;
      }
      .glow {
        position: absolute;
        top: -150px;
        right: -150px;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(0, 122, 255, 0.25) 0%, rgba(0, 0, 0, 0) 70%);
        border-radius: 50%;
        filter: blur(40px);
      }
      .glow2 {
        position: absolute;
        bottom: -200px;
        left: -100px;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0) 70%);
        border-radius: 50%;
        filter: blur(30px);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 24px;
        z-index: 1;
      }
      .logo {
        width: 72px;
        height: 72px;
        background: #111113;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
      }
      .brand-title {
        font-size: 36px;
        font-weight: 800;
        letter-spacing: -0.03em;
        text-transform: lowercase;
      }
      .main {
        z-index: 1;
      }
      .headline {
        font-size: 64px;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1.1;
        margin-bottom: 20px;
        background: linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.75) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .subhead {
        font-size: 24px;
        color: rgba(255, 255, 255, 0.65);
        max-width: 800px;
        line-height: 1.4;
      }
      .footer {
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 1;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9999px;
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.85);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .dot {
        width: 8px;
        height: 8px;
        background: #007AFF;
        border-radius: 50%;
      }
    </style>
  </head>
  <body>
    <div class="glow"></div>
    <div class="glow2"></div>
    <div class="brand">
      <div class="logo">
        <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
          <circle cx="42" cy="50" r="22" stroke="rgba(255,255,255,0.4)" stroke-width="7"/>
          <circle cx="62" cy="50" r="16" fill="white"/>
        </svg>
      </div>
      <div class="brand-title">bokra</div>
    </div>
    <div class="main">
      <div class="headline">Habit Tracker &amp; Ambient Focus Companion</div>
      <div class="subhead">Offline-first habit streaks, synchronized live flights, Pomodoro soundscapes, and social accountability.</div>
    </div>
    <div class="footer">
      <div class="pill"><span class="dot"></span> Offline First</div>
      <div class="pill">FlightRadar Live</div>
      <div class="pill">macOS &bull; Windows &bull; Web &bull; Android</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.screenshot({ path: path.resolve('public/og-image.png'), fullPage: false });
  await browser.close();
  console.log('Generated public/og-image.png (1200x630)');
}

generateOgImage().catch(console.error);
