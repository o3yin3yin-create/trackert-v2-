import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FALLBACK_VERSION = '0.1.2';
const GITHUB_REPO = 'o3yin3yin-create/trackert-v2-';

const DEFAULT_DOWNLOADS = {
  mac: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.2/bokra_0.1.2_aarch64.dmg`,
  macArm: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.2/bokra_0.1.2_aarch64.dmg`,
  macSilicon: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.2/bokra_0.1.2_aarch64.dmg`,
  macIntel: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.2/bokra_0.1.2_x64.dmg`,
  windows: '/bokra-windows.zip',
  android: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.2/app-debug.apk`,
  linuxDeb: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.2/bokra_0.1.2_amd64.deb`,
  linuxAppImage: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.2/bokra_0.1.2_amd64.AppImage`,
  linuxRpm: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.2/bokra-0.1.2-1.x86_64.rpm`,
};

const RELEASE_NOTES_0_1_2 = `bokra v0.1.2 - التحديث الشامل:
- حل مشكلة البحث وإضافة الأصدقاء بالكامل على الماك وسطح المكتب.
- فصل حزم ماك كلياً بين معالجات Apple Silicon ومعالجات Intel.
- استعادة وحفظ استمرارية الستريك ومزامنتها سحابياً.
- تحسين أداء استجابة الشبكة وضمان استقرار المزامنة دون انقطاع.`;

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
        if (name.includes('aarch64') || name.includes('arm64')) {
          downloads.macArm = url;
          downloads.macSilicon = url;
          downloads.mac = url;
        } else if (name.includes('x64') || name.includes('x86_64') || name.includes('intel')) {
          downloads.macIntel = url;
        } else {
          downloads.mac = url;
        }
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
      notes: data.body || RELEASE_NOTES_0_1_2,
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
      notes: RELEASE_NOTES_0_1_2,
      downloads: DEFAULT_DOWNLOADS,
      fallback: true,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  }
}
