import type { MarkState } from '../mark/index.ts'

/* The bare mark, ink only: the states that describe themselves in level and
 * geometry alone. The ones that need the field canvas to say anything —
 * powerOn, bloom, run — are not here, and the accent is greyed on the stage,
 * so what runs is the mark and nothing behind it. */
export const WORDMARK_STATES: { id: MarkState | 'rest'; label: string; note: string }[] = [
  { id: 'rest', label: 'Rest', note: 'The mark, lit and still. Everything else is a departure from this.' },
  { id: 'pending', label: 'Pending', note: 'The ink drops low and brightens under a travelling band. Something is in flight.' },
  { id: 'scan', label: 'Scan', note: 'A band runs down the rows and the ink dims as it crosses. Something is being read.' },
  { id: 'confirm', label: 'Confirm', note: 'One pass down, leaving the mark lit. Once, on success.' },
  { id: 'tear', label: 'Tear', note: 'Rows shear by whole columns, drop out, snap back. Something is wrong.' },
  { id: 'dissolve', label: 'Dissolve', note: 'Cells leave in random order and come back along the same path.' }
]

export const ICON_STATES: { id: MarkState | 'rest'; label: string; note: string }[] = [
  { id: 'morph', label: 'Morph', note: 'Picks the next form, its travel and its hold. Every frame between is a legible glyph.' },
  { id: 'rest', label: 'Rest', note: 'The S. One glyph, seven cells wide.' },
  { id: 'cycle', label: 'Cycle', note: 'The same three forms in order, evenly, lines in step.' },
  { id: 'spin', label: 'Spin', note: 'The glyph turns on the box axis, down to one column and open again.' },
  { id: 'sign', label: 'Sign', note: 'One pass down while the glyph travels to the diamond, and it stays there.' }
]

export const SWATCHES = [
  { name: 'Accent', hex: '#1c9ba0', note: 'And #00eaf2 inverted. One hue in two weights: the darker one carries light surfaces, the exact accent carries black ones.' },
  { name: 'Ink on canvas', hex: '#000000', note: 'And #ffffff inverted. The mark is ink; there is no grey ink.' },
  { name: 'Field', hex: '#cdcdd3', note: 'And #3a3a3a inverted. The grid behind the mark, never a text colour.' },
  { name: 'Accent on screen', hex: '#00eaf2', note: 'The panel weight. Screen panels are black in both themes, so the accent inside them never changes.' }
]
