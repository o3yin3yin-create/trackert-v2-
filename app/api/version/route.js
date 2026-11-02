import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FALLBACK_VERSION = '0.1.3';
const GITHUB_REPO = 'o3yin3yin-create/trackert-v2-';

const DEFAULT_DOWNLOADS = {
  mac: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.3/bokra_0.1.3_aarch64.dmg`,
  macArm: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.3/bokra_0.1.3_aarch64.dmg`,
  macSilicon: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.3/bokra_0.1.3_aarch64.dmg`,
  macIntel: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.3/bokra_0.1.3_x64.dmg`,
  windows: '/bokra-windows.zip',
  android: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.3/app-debug.apk`,
  linuxDeb: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.3/bokra_0.1.3_amd64.deb`,
  linuxAppImage: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.3/bokra_0.1.3_amd64.AppImage`,
  linuxRpm: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.3/bokra_0.1.3-1.x86_64.rpm`,
};

const RELEASE_NOTES_0_1_3 = `bokra v0.1.3 - تحديث الدروع وشبكة الأصدقاء:
- إصلاح نظام دروع حماية الستريك (Emergency Shields) بالكامل: إتاحة الدرع تلقائياً لكل عادة تصل لـ 7 أيام ستريك فأكثر.
- إتاحة نافذة استعادة لمدة 3 أيام عند كسر الستريك لفحص الـ 7 أيام السابقة واستعادة الستريك بنقرة واحدة عند استخدام الدرع.
- إصلاح كامل للاتصال والبحث في قائمة الأصدقاء (Friends) على ماك وسطح المكتب وضبط الـ CORS والـ Timeouts.
- منع مسح جلسات تسجيل الدخول وتثبيت أداء المزامنة السحابية.`;

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
      notes: data.body || RELEASE_NOTES_0_1_3,
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
      notes: RELEASE_NOTES_0_1_3,
      downloads: DEFAULT_DOWNLOADS,
      fallback: true,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  }
}
