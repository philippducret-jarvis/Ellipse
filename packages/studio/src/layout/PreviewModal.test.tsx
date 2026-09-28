// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PreviewModal } from './PreviewModal.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('ouvre et quitte la preview plein écran sans recharger le jeu', async () => {
  let fullElement: Element | null = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullElement });
  const request = vi.fn(async function (this: HTMLElement) {
    fullElement = this;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: request });
  const exit = vi.fn(async () => {
    fullElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
  const close = vi.fn();
  render(<PreviewModal url="/workspaces/shadow-echoes/07_exports/web/preview.html" title="Shadow Echoes" onClose={close} />);
  const frame = screen.getByTitle('Shadow Echoes');
  expect(frame.hasAttribute('allowfullscreen')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Plein écran' }));
  await waitFor(() => expect(request).toHaveBeenCalledOnce());
  expect(screen.getByTitle('Shadow Echoes')).toBe(frame);
  fireEvent.click(screen.getByRole('button', { name: 'Quitter le plein écran' }));
  await waitFor(() => expect(exit).toHaveBeenCalledOnce());
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Plein écran' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  fullElement = null; // Escape handled by the browser's native fullscreen API.
  document.dispatchEvent(new Event('fullscreenchange'));
  await waitFor(() => expect(screen.getByRole('dialog').className).not.toContain('is-expanded'));
});

it('agrandit dans la fenêtre Ellipse si le système refuse le plein écran natif', async () => {
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: vi.fn().mockRejectedValue(new Error('denied')) });
  render(<PreviewModal url="/preview.html" title="Jeu" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Plein écran' }));
  await waitFor(() => expect(screen.getByRole('dialog').className).toContain('is-expanded'));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('dialog').className).not.toContain('is-expanded');
});
