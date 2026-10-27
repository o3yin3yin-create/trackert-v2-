import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Security whitelist: only allow Spotify CDN domains
    const parsed = new URL(imageUrl);
    const allowedHosts = [
      'i.scdn.co',
      'mosaic.scdn.co',
      'image-cdn-ak.spotifycdn.com',
      'image-cdn-fa.spotifycdn.com',
      'seeded-session-images.scdn.co',
      'wrapped-images.spotifycdn.com'
    ];

    const isAllowed = allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.scdn.co') || parsed.hostname.endsWith('.spotifycdn.com'));
    if (!isAllowed) {
      return new NextResponse('Host not allowed', { status: 403 });
    }

    const upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      next: { revalidate: 86400 }
    });

    if (!upstream.ok) {
      return new NextResponse('Failed to fetch upstream image', { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new NextResponse('Internal error', { status: 500 });
  }
}
