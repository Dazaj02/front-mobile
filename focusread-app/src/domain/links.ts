// Plataformas de video o redes sociales: su enlace es un video o una publicación sin artículo, o bloquea a los lectores
// automáticos. Solo sirve para avisar al usuario antes de intentar la importación.
const VIDEO_HOSTS = ['tiktok.com', 'youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'fb.watch', 'twitter.com', 'x.com'];

export function isVideoPlatformLink(input: string): boolean {
  const m = /^\s*(?:https?:\/\/)?([^/\s?#:]+)/i.exec(input);
  if (!m) return false;
  const host = m[1].toLowerCase();
  return VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}
