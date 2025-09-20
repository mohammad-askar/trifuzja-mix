// E:\trifuzja-mix\utils\youtube.ts
export function getYouTubeId(input: string): string | null {
  try {
    const u = new URL(input.trim());

    // normalize host (mobile, www, etc.)
    const host = u.host.replace(/^m\./, '');

    // youtu.be/<id>
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id || null;
    }

    if (host.endsWith('youtube.com')) {
      const seg = u.pathname.split('/').filter(Boolean);

      // /watch?v=<id>
      const v = u.searchParams.get('v');
      if (v) return v;

      // /shorts/<id>
      if (seg[0] === 'shorts' && seg[1]) return seg[1];

      // /embed/<id>
      if (seg[0] === 'embed' && seg[1]) return seg[1];

      // sometimes share links look like /live/<id>, handle if you want:
      if (seg[0] === 'live' && seg[1]) return seg[1];
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function toYouTubeEmbed(url: string): string {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

export function getYouTubeThumb(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
