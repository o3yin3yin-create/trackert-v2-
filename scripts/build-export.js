/**
 * scripts/build-export.js
 * 
 * Builds static HTML/JS export for desktop (Tauri / Mac) without breaking Vercel SSR API routes.
 * 
 * 1. Temporarily isolates app/api (so Next.js export doesn't fail on server API routes).
 * 2. Bridges Clerk auth to pure client-side offline context (eliminating server actions in static build).
 * 3. Runs Next.js static export with output: 'export' to produce the 'out' directory.
 * 4. Safely restores all files in finally block so web and Vercel remain 100% full-stack.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'app', 'api');
const apiBackupDir = path.join(rootDir, '.api_backup');
const desktopAuthDir = path.join(rootDir, 'app', 'desktop-auth');
const desktopAuthBackupDir = path.join(rootDir, '.desktop_auth_backup');
const authBridgeFile = path.join(rootDir, 'components', 'AuthBridge.jsx');
const authBridgeBackup = path.join(rootDir, 'components', '.AuthBridge_backup.jsx');

let apiMoved = false;
let desktopAuthMoved = false;
let authBridgeSwapped = false;

console.log('🚀 Starting bokra static export build for desktop...');

try {
  // 1. Isolate app/api and web-only routes
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, apiBackupDir);
    apiMoved = true;
    console.log('✓ Isolated app/api for static client export.');
  }

  if (fs.existsSync(desktopAuthDir)) {
    fs.renameSync(desktopAuthDir, desktopAuthBackupDir);
    desktopAuthMoved = true;
    console.log('✓ Isolated app/desktop-auth for static client export.');
  }

  // 2. Switch AuthBridge to client-only mode
  if (fs.existsSync(authBridgeFile)) {
    fs.copyFileSync(authBridgeFile, authBridgeBackup);
    const clientAuthContent = `export { ClerkProvider, useUser, Show, SignInButton, SignUpButton, UserButton } from './ClientClerk';\n`;
    fs.writeFileSync(authBridgeFile, clientAuthContent);
    authBridgeSwapped = true;
    console.log('✓ Switched AuthBridge to offline-first client mode.');
  }

  // 3. Clear old .next cache to ensure fresh static export
  const nextCacheDir = path.join(rootDir, '.next');
  if (fs.existsSync(nextCacheDir)) {
    fs.rmSync(nextCacheDir, { recursive: true, force: true });
  }

  // 4. Run Next.js static build
  console.log('📦 Generating static export bundle into out/...');
  execSync('OUTPUT_EXPORT=true npx next build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      OUTPUT_EXPORT: 'true',
      NEXT_PUBLIC_IS_DESKTOP: 'true',
    }
  });

  console.log('✅ bokra static export build completed successfully into out/ !');
} catch (err) {
  console.error('❌ Static export build failed:', err.message);
  process.exitCode = 1;
} finally {
  // Always restore original files
  if (authBridgeSwapped && fs.existsSync(authBridgeBackup)) {
    fs.copyFileSync(authBridgeBackup, authBridgeFile);
    fs.rmSync(authBridgeBackup);
    console.log('✓ Restored AuthBridge for full-stack web/Vercel.');
  }

  if (desktopAuthMoved && fs.existsSync(desktopAuthBackupDir)) {
    fs.renameSync(desktopAuthBackupDir, desktopAuthDir);
    console.log('✓ Restored app/desktop-auth for full-stack web/Vercel.');
  }

  if (apiMoved && fs.existsSync(apiBackupDir)) {
    fs.renameSync(apiBackupDir, apiDir);
    console.log('✓ Restored app/api for full-stack web/Vercel.');
  }
}
