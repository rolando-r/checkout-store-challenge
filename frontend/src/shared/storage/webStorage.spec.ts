import webStorage from './webStorage';

describe('webStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('setItem stores the value in window.localStorage and resolves', async () => {
    await webStorage.setItem('key', 'value');
    expect(window.localStorage.getItem('key')).toBe('value');
  });

  it('getItem reads the value back from window.localStorage', async () => {
    window.localStorage.setItem('key', 'value');
    await expect(webStorage.getItem('key')).resolves.toBe('value');
  });

  it('getItem resolves null when the key is missing', async () => {
    await expect(webStorage.getItem('missing')).resolves.toBeNull();
  });

  it('removeItem deletes the value and resolves', async () => {
    window.localStorage.setItem('key', 'value');
    await webStorage.removeItem('key');
    expect(window.localStorage.getItem('key')).toBeNull();
  });
});