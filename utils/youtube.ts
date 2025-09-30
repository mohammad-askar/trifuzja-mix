// utils/youtube.ts
/** يستخرج معرّف يوتيوب من أشكال الروابط الشائعة */
export function getYouTubeId(input: string): string | null {
  try {
    const u = new URL(input.trim());
    const host = u.host.replace(/^m\./, ''); // ط normalize

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

      // /live/<id>
      if (seg[0] === 'live' && seg[1]) return seg[1];
    }
  } catch {
    /* ignore malformed url */
  }
  return null;
}

/** URL أيمبد صالح من أي رابط يوتيوب */
export function toYouTubeEmbed(url: string): string {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

/** مرشّح صور مصغّرة موثوق: i.ytimg.com + سلسلة بدائل */
export function getYouTubeThumbCandidates(url: string): string[] {
  const id = getYouTubeId(url);
  if (!id) return [];
  const base = `https://i.ytimg.com/vi/${id}`;
  // الترتيب حسب الجودة المتاحة غالبًا
  return [`${base}/maxresdefault.jpg`, `${base}/hqdefault.jpg`, `${base}/mqdefault.jpg`];
}

/** الصورة الأولى المقترحة (يمكن 404 لبعض الفيديوهات، لذا الأفضل استخدام السلسلة مع onError) */
export function getYouTubeThumb(url: string): string | null {
  const list = getYouTubeThumbCandidates(url);
  return list[0] ?? null;
}
