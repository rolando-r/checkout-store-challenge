import { fireEvent, render, screen } from '@testing-library/react';
import { ProductImage } from './ProductImage';

const UNSPLASH = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e';

function getFrame(container: HTMLElement) {
  return container.querySelector('[data-status]') as HTMLElement;
}

describe('ProductImage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts in the loading state and lazy-loads by default', () => {
    const { container } = render(<ProductImage src="headphones.png" alt="Headphones" />);
    const img = screen.getByAltText('Headphones');

    expect(getFrame(container)).toHaveAttribute('data-status', 'loading');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).toHaveAttribute('fetchpriority', 'auto');
  });

  it('loads eagerly with high priority when it is above the fold', () => {
    render(<ProductImage src="headphones.png" alt="Headphones" priority />);
    const img = screen.getByAltText('Headphones');

    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('switches to the loaded state once the image loads', () => {
    const { container } = render(<ProductImage src="headphones.png" alt="Headphones" />);
    fireEvent.load(screen.getByAltText('Headphones'));

    expect(getFrame(container)).toHaveAttribute('data-status', 'loaded');
  });

  it('marks images that were already cached as loaded without waiting for onLoad', () => {
    jest.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    jest.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(480);

    const { container } = render(<ProductImage src="headphones.png" alt="Headphones" />);

    expect(getFrame(container)).toHaveAttribute('data-status', 'loaded');
  });

  it('shows an accessible fallback instead of a broken image when loading fails', () => {
    const { container } = render(<ProductImage src="broken.png" alt="Headphones" />);
    fireEvent.error(screen.getByAltText('Headphones'));

    expect(getFrame(container)).toHaveAttribute('data-status', 'error');
    expect(screen.queryByAltText('Headphones')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Image unavailable: Headphones' })).toBeInTheDocument();
  });

  it('resets to loading when the src changes', () => {
    const { container, rerender } = render(<ProductImage src="a.png" alt="Headphones" />);
    fireEvent.error(screen.getByAltText('Headphones'));
    expect(getFrame(container)).toHaveAttribute('data-status', 'error');

    rerender(<ProductImage src="b.png" alt="Headphones" />);

    expect(getFrame(container)).toHaveAttribute('data-status', 'loading');
    expect(screen.getByAltText('Headphones')).toBeInTheDocument();
  });

  it('offers a responsive srcset for resizable CDN images', () => {
    render(<ProductImage src={UNSPLASH} alt="Headphones" widths={[320, 640]} sizes="100vw" />);
    const img = screen.getByAltText('Headphones');

    expect(img.getAttribute('srcset')).toContain('w=320');
    expect(img.getAttribute('srcset')).toContain('640w');
    expect(img).toHaveAttribute('sizes', '100vw');
  });

  it('does not set srcset or sizes for images it cannot resize', () => {
    render(<ProductImage src="headphones.png" alt="Headphones" sizes="100vw" />);
    const img = screen.getByAltText('Headphones');

    expect(img).not.toHaveAttribute('srcset');
    expect(img).not.toHaveAttribute('sizes');
  });
});
