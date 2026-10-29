/**
 * scripts/build-export.js
 * 
 * Builds static HTML/JS export for desktop (Tauri / Mac / Windows / Linux) without breaking Vercel SSR API routes.
 * 
 * 1. Temporarily isolates app/api and web dynamic routes (so Next.js export doesn't fail on server API routes or dynamic params).
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
const signInDir = path.join(rootDir, 'app', 'sign-in');
const signInBackupDir = path.join(rootDir, '.sign_in_backup');
const signUpDir = path.join(rootDir, 'app', 'sign-up');
const signUpBackupDir = path.join(rootDir, '.sign_up_backup');

const authBridgeFile = path.join(rootDir, 'components', 'AuthBridge.jsx');
const authBridgeBackup = path.join(rootDir, 'components', '.AuthBridge_backup.jsx');

let apiMoved = false;
let desktopAuthMoved = false;
let signInMoved = false;
let signUpMoved = false;
let authBridgeSwapped = false;

console.log('[build-export] Starting bokra static export build for desktop...');

try {
  // 1. Isolate app/api and web-only dynamic routes
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, apiBackupDir);
    apiMoved = true;
    console.log('[build-export] Isolated app/api for static client export.');
  }

  if (fs.existsSync(desktopAuthDir)) {
    fs.renameSync(desktopAuthDir, desktopAuthBackupDir);
    desktopAuthMoved = true;
    console.log('[build-export] Isolated app/desktop-auth for static client export.');
  }

  if (fs.existsSync(signInDir)) {
    fs.renameSync(signInDir, signInBackupDir);
    signInMoved = true;
    console.log('[build-export] Isolated app/sign-in for static client export.');
  }

  if (fs.existsSync(signUpDir)) {
    fs.renameSync(signUpDir, signUpBackupDir);
    signUpMoved = true;
    console.log('[build-export] Isolated app/sign-up for static client export.');
  }

  // 2. Switch AuthBridge to client-only mode
  if (fs.existsSync(authBridgeFile)) {
    fs.copyFileSync(authBridgeFile, authBridgeBackup);
    const clientAuthContent = `export { ClerkProvider, useUser, useAuth, useClerk, Show, SignInButton, SignUpButton, UserButton, SignIn, SignUp } from './ClientClerk';\n`;
    fs.writeFileSync(authBridgeFile, clientAuthContent);
    authBridgeSwapped = true;
    console.log('[build-export] Switched AuthBridge to offline-first client mode.');
  }

  // 3. Clear old .next cache to ensure fresh static export
  const nextCacheDir = path.join(rootDir, '.next');
  try {
    if (fs.existsSync(nextCacheDir)) {
      fs.rmSync(nextCacheDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.warn('[build-export] Notice: .next cleanup notice:', e.message);
  }

  // 4. Run Next.js static build
  console.log('[build-export] Generating static export bundle into out/...');
  execSync('npx next build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      OUTPUT_EXPORT: 'true',
      NEXT_PUBLIC_IS_DESKTOP: 'true',
    }
  });

  console.log('[build-export] bokra static export build completed successfully into out/ !');
} catch (err) {
  console.error('[build-export] Static export build failed:', err.message);
  process.exitCode = 1;
} finally {
  // Always restore original files
  if (authBridgeSwapped && fs.existsSync(authBridgeBackup)) {
    fs.copyFileSync(authBridgeBackup, authBridgeFile);
    fs.rmSync(authBridgeBackup);
    console.log('[build-export] Restored AuthBridge for full-stack web/Vercel.');
  }

  if (signUpMoved && fs.existsSync(signUpBackupDir)) {
    fs.renameSync(signUpBackupDir, signUpDir);
    console.log('[build-export] Restored app/sign-up for full-stack web/Vercel.');
  }

  if (signInMoved && fs.existsSync(signInBackupDir)) {
    fs.renameSync(signInBackupDir, signInDir);
    console.log('[build-export] Restored app/sign-in for full-stack web/Vercel.');
  }

  if (desktopAuthMoved && fs.existsSync(desktopAuthBackupDir)) {
    fs.renameSync(desktopAuthBackupDir, desktopAuthDir);
    console.log('[build-export] Restored app/desktop-auth for full-stack web/Vercel.');
  }

  if (apiMoved && fs.existsSync(apiBackupDir)) {
    fs.renameSync(apiBackupDir, apiDir);
    console.log('[build-export] Restored app/api for full-stack web/Vercel.');
  }
}
