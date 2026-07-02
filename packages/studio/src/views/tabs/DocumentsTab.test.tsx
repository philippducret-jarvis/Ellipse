// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentsTab } from './DocumentsTab.js';
import { createDocument, createStudioTestSnapshot } from '../../test/fixtures.js';

describe('DocumentsTab', () => {
  afterEach(() => cleanup());

  it('renders and switches between workspace documents', () => {
    const snap = createStudioTestSnapshot({
      documents: [
        createDocument({ id: 'doc-1', title: 'Pitch', kind: 'pitch', content: '# Pitch\nIntro' }),
        createDocument({ id: 'doc-2', title: 'Story Bible', kind: 'narrative_bible', content: '# Story\nMyla guide' }),
      ],
    });

    render(<DocumentsTab snap={snap} />);

    expect(screen.getByText('Intro')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Story/i }));
    expect(screen.getByRole('heading', { name: 'Story Bible' })).toBeTruthy();
    expect(screen.getByText('Myla guide')).toBeTruthy();
  });
});
