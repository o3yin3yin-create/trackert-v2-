import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FALLBACK_VERSION = '0.1.1';
const GITHUB_REPO = 'o3yin3yin-create/trackert-v2-';

const DEFAULT_DOWNLOADS = {
  mac: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.1/bokra_0.1.1_aarch64.dmg`,
  macArm: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.1/bokra_0.1.1_aarch64.dmg`,
  macIntel: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.1/bokra_0.1.1_x64.dmg`,
  windows: '/bokra-windows.zip',
  android: '/bokra.apk',
  linuxDeb: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.1/bokra_0.1.1_amd64.deb`,
  linuxAppImage: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.1/bokra_0.1.1_amd64.AppImage`,
  linuxRpm: `https://github.com/${GITHUB_REPO}/releases/download/v0.1.1/bokra-0.1.1-1.x86_64.rpm`,
};

const RELEASE_NOTES_0_1_1 = `bokra v0.1.1 - التحديث الشامل:
- تطبيق أندرويد رسمي أصلي بصيغة APK مع إشعارات محلية تعمل بدون إنترنت.
- حل مشكلة الإشعارات نهائيا وضمان وصول إشعارات الأصدقاء والنكزات في الخلفية بنسبة 100%.
- استمرار عمل تطبيق ماك في الخلفية عند إغلاق النافذة للحفاظ على العدادات والتنبيهات.
- إصلاح تعليق شاشة الأصدقاء والبحث عن المعرفات.
- صفحات رسمية جديدة: عن التطبيق (/about)، شروط الاستخدام (/terms)، الأمان والخصوصية (/security).
- إضافة روابط الدعم المباشر وانستغرام الرسمي وحساب المطور في الإعدادات.`;

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
      notes: data.body || RELEASE_NOTES_0_1_1,
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
      notes: RELEASE_NOTES_0_1_1,
      downloads: DEFAULT_DOWNLOADS,
      fallback: true,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  }
}
