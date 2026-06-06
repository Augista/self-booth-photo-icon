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
    layout: '2x3',
  },
  // 4x4wide.png — 4 photos, wide format
  '4x4wide': {
    displayName: 'Wide 4 Foto',
    photoCount: 4,
    layout: '2x2',
  },
  // 4x4wide2.png — alternate wide 4-photo template
  '4x4wide2': {
    displayName: 'Wide 4 Foto II',
    photoCount: 4,
    layout: '2x2',
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
