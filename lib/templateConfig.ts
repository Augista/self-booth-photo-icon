export interface TemplateSlot {
  left: number   // fraction of template width from left edge
  top: number    // fraction of template height from top edge
  width: number  // fraction of template width
  height: number // fraction of template height
}

export interface TemplateConfig {
  displayName: string
  photoCount: number
  layout: string       // used for grid fallback in process/college
  slots?: TemplateSlot[] // if defined, photos are placed at exact positions
}

// Keys match the filename stems (without extension) from the 'templates' Supabase bucket.
// Slot coordinates are fractions (0–1) of the actual template image dimensions.
// Adjust slot values once you measure the real "hole" positions in each template file.
const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  // 2x2.png — Bestie newspaper (2 photo slots, vertical stack)
  '2x2': {
    displayName: 'Bestie',
    photoCount: 2,
    layout: '1x4',
    slots: [
      { left: 0.04, top: 0.10, width: 0.90, height: 0.34 },
      { left: 0.04, top: 0.46, width: 0.90, height: 0.34 },
    ],
  },
  // 3x2.png — 3-row × 2-column grid (6 photos)
  '3x2': {
    displayName: 'Grid 3×2',
    photoCount: 6,
    layout: '2x2',
    slots: [
      { left: 0.088, top: 0.098, width: 0.344, height: 0.192 }, // slot 1
      { left: 0.590, top: 0.108, width: 0.352, height: 0.187 }, // slot 2
      { left: 0.077, top: 0.331, width: 0.357, height: 0.184 }, // slot 3
      { left: 0.585, top: 0.336, width: 0.352, height: 0.192 }, // slot 4
      { left: 0.077, top: 0.551, width: 0.362, height: 0.198 }, // slot 5
      { left: 0.580, top: 0.556, width: 0.354, height: 0.194 }, // slot 6
    ],
  },
  // 4x4wide.png — newspaper template, 4 green-screen photo boxes in 2×2 grid
  // Slot fractions measured from the template (3764×5610 source image)
  // Adjust values by ±0.01 if photos bleed into border/text areas
  '4x4wide': {
    displayName: 'Wide 4 Foto',
    photoCount: 4,
    layout: '2x2',
    slots: [
      { left: 0.535, top: 0.192, width: 0.435, height: 0.194 }, // slot 1
      { left: 0.016, top: 0.194, width: 0.441, height: 0.187 }, // slot 2
      { left: 0.031, top: 0.575, width: 0.431, height: 0.204 }, // slot 3
      { left: 0.535, top: 0.577, width: 0.445, height: 0.200 }, // slot 4
    ],
  },
  // 4x4wide2.png — alternate wide 4-photo template
  '4x4wide2': {
    displayName: 'Wide 4 Foto II',
    photoCount: 4,
    layout: '2x2',
    slots: [
      { left: 0.025, top: 0.257, width: 0.430, height: 0.189 }, // slot 1
      { left: 0.530, top: 0.258, width: 0.445, height: 0.192 }, // slot 2
      { left: 0.533, top: 0.514, width: 0.424, height: 0.191 }, // slot 3
      { left: 0.025, top: 0.517, width: 0.419, height: 0.192 }, // slot 4
    ],
  },
  // Generic fallback for any unrecognised template
  default: {
    displayName: 'Custom',
    photoCount: 4,
    layout: '2x2',
  },
}

export function getTemplateConfig(templateId: string): TemplateConfig {
  const key = templateId.toLowerCase()
  return TEMPLATE_CONFIGS[key] ?? TEMPLATE_CONFIGS['default']
}
