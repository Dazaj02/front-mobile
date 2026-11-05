import { isVideoPlatformLink } from './links';

describe('isVideoPlatformLink', () => {
  it.each([
    'https://www.tiktok.com/@alguien/video/123',
    'https://vm.tiktok.com/ZM123/',
    'https://youtu.be/abc',
    'https://m.youtube.com/watch?v=abc',
    'instagram.com/reel/xyz',
    'https://x.com/user/status/1',
  ])('detecta %s', (url) => expect(isVideoPlatformLink(url)).toBe(true));

  it.each(['https://es.wikipedia.org/wiki/Neurociencia', 'https://www.nationalgeographic.es/ciencia', 'https://mix.com/a', '', 'hola'])(
    'no marca %s',
    (url) => expect(isVideoPlatformLink(url)).toBe(false),
  );
});
