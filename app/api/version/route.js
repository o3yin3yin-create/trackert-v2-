import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FALLBACK_VERSION = '0.1.0';
const GITHUB_REPO = 'o3yin3yin-create/trackert-v2-';

const DEFAULT_DOWNLOADS = {
  mac: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.0/bokra_0.1.0_universal.dmg`,
  windows: '/bokra-windows.zip',
  android: '/bokra.apk',
  linuxDeb: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.0/bokra_0.1.0_amd64.deb`,
  linuxAppImage: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.0/bokra_0.1.0_amd64.AppImage`,
  linuxRpm: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.0/bokra-0.1.0-1.x86_64.rpm`,
};

export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'User-Agent': 'bokra-update-service',
        'Accept': 'application/vnd.github.v3+json',
      },
      next: { revalidate: 180 }, // cache for 3 minutes
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const data = await res.json();
    const tagName = data.tag_name || `v${FALLBACK_VERSION}`;
    const cleanVersion = tagName.replace(/^v/, '');
    const assets = Array.isArray(data.assets) ? data.assets : [];

    // Find specific binary download URLs from release assets
    const downloads = { ...DEFAULT_DOWNLOADS };

    for (const asset of assets) {
      const name = (asset.name || '').toLowerCase();
      const url = asset.browser_download_url;
      if (!url) continue;

      if (name.endsWith('.dmg')) {
        downloads.mac = url;
      } else if (name.endsWith('.apk')) {
        downloads.android = url;
      } else if (name.endsWith('.zip') && (name.includes('win') || name.includes('windows'))) {
        downloads.windows = url;
      } else if (name.endsWith('.deb')) {
        downloads.linuxDeb = url;
      } else if (name.endsWith('.appimage')) {
        downloads.linuxAppImage = url;
      } else if (name.endsWith('.rpm')) {
        downloads.linuxRpm = url;
      }
    }

    return NextResponse.json({
      success: true,
      version: cleanVersion,
      tagName,
      releaseName: data.name || `Release ${tagName}`,
      publishedAt: data.published_at || new Date().toISOString(),
      notes: data.body || '',
      downloads,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=360',
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      version: FALLBACK_VERSION,
      tagName: `v${FALLBACK_VERSION}`,
      releaseName: `Release v${FALLBACK_VERSION}`,
      publishedAt: new Date().toISOString(),
      notes: 'Latest stable release.',
      downloads: DEFAULT_DOWNLOADS,
      fallback: true,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  }
}
