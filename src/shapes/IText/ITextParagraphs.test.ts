import { describe, expect, it } from 'vitest';
import { IText } from './IText';

describe('IText paragraph styles', () => {
  it('inserts a paragraph that inherits the style of the paragraph being split', () => {
    const t = new IText('aaa\nbbb\nccc', {
      paragraphs: [
        { id: 'p0', style: { align: 'left' } },
        { id: 'p1', style: { align: 'center' } },
        { id: 'p2', style: { align: 'right' } },
      ],
    });

    // Split paragraph 0 after 1st character: "a|aa".
    t.insertChars('\n', undefined, 1);

    expect(t.text).toBe('a\naa\nbbb\nccc');
    expect(t.paragraphs).toHaveLength(4);
    expect(t.paragraphs[0].style?.align).toBe('left');
    // new paragraph inherits paragraph 0
    expect(t.paragraphs[1].style?.align).toBe('left');
    // old paragraph 1 and 2 shift down unchanged
    expect(t.paragraphs[2].style?.align).toBe('center');
    expect(t.paragraphs[3].style?.align).toBe('right');
  });

  it('inserts at paragraph start and still inherits the current paragraph style', () => {
    const t = new IText('aaa\nbbb', {
      paragraphs: [
        { id: 'p0', style: { align: 'left' } },
        { id: 'p1', style: { align: 'center' } },
      ],
    });

    // Insert newline at start of paragraph 1 (index after "aaa\n" is 4)
    t.insertChars('\n', undefined, 4);

    expect(t.text).toBe('aaa\n\nbbb');
    expect(t.paragraphs).toHaveLength(3);
    // New empty paragraph above should inherit current paragraph (p1)
    expect(t.paragraphs[1].style?.align).toBe('center');
    expect(t.paragraphs[2].style?.align).toBe('center');
  });
});
