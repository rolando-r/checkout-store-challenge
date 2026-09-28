import { buildImageSources, buildImageUrl } from './image';

const UNSPLASH = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e';

describe('buildImageUrl', () => {
  it('adds width, quality, crop and auto-format params to Unsplash URLs', () => {
    const url = new URL(buildImageUrl(UNSPLASH, 480));
    expect(url.searchParams.get('w')).toBe('480');
    expect(url.searchParams.get('q')).toBe('70');
    expect(url.searchParams.get('fit')).toBe('crop');
    expect(url.searchParams.get('auto')).toBe('format');
  });

  it('overrides params that are already in the stored URL instead of duplicating them', () => {
    const url = new URL(buildImageUrl(`${UNSPLASH}?w=4000&q=100`, 320, 60));
    expect(url.searchParams.getAll('w')).toEqual(['320']);
    expect(url.searchParams.getAll('q')).toEqual(['60']);
  });

  it('returns relative URLs unchanged', () => {
    expect(buildImageUrl('headphones.png', 480)).toBe('headphones.png');
  });

  it('returns URLs from other hosts unchanged', () => {
    expect(buildImageUrl('https://example.com/a.jpg', 480)).toBe('https://example.com/a.jpg');
  });
});

describe('buildImageSources', () => {
  it('builds a width-descriptor srcset sorted ascending, with the middle width as src', () => {
    const { src, srcSet } = buildImageSources(UNSPLASH, [640, 320, 480]);

    expect(new URL(src).searchParams.get('w')).toBe('480');
    expect(srcSet?.split(', ').map((entry) => entry.split(' ')[1])).toEqual(['320w', '480w', '640w']);
  });

  it('uses the default widths when none are given', () => {
    const { srcSet } = buildImageSources(UNSPLASH);
    expect(srcSet?.split(', ')).toHaveLength(5);
  });

  it('skips srcset for URLs it cannot resize', () => {
    expect(buildImageSources('headphones.png')).toEqual({ src: 'headphones.png' });
  });

  it('skips srcset when no widths are provided', () => {
    expect(buildImageSources(UNSPLASH, [])).toEqual({ src: UNSPLASH });
  });
});
