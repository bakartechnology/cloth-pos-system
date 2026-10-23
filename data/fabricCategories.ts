export type FabricGender = 'Male' | 'Female' | 'Both';

// Male Fabrics (Summer, Year-Round & Winter)
export const MALE_FABRIC_CATEGORIES = [
  'Cotton Suit',
  'Wash & Wear',
  'Blended Fabric',
  'Lawn',
  'Cambric',
  'Khaddar',
  'Linen',
  'Boski',
  'Karandi',
  'Latha',
  'Tropical',
  'Wool',
  'Tweed',
  'Flannel',
  'Fleece',
  'Velvet',
  'Pashmina-style Fabric',
  'Blended Wool',
  'Heavy Khaddar',
  'Winter Wash & Wear',
];

// Female Fabrics (Summer, Luxury, Formal & Winter)
export const FEMALE_FABRIC_CATEGORIES = [
  'Lawn',
  'Digital Printed Lawn',
  'Embroidered Lawn',
  'Chiffon',
  'Pure Crinkle Chiffon',
  'Silk',
  'Raw Silk',
  'Shamooz Silk',
  'Grip Silk',
  'Organza',
  'Velvet',
  'Micro Velvet 9000',
  'Khaddar',
  'Marina',
  'Linen',
  'Karandi',
  'Cotton',
  'Cambric',
  'Jacquard',
  'Banarsi / Brocade',
  'Net',
  'Tissue / Tissue Silk',
  'Satin',
  'Georgette',
  'Pashmina / Woolen Shawl',
  'Embroidered Fabric',
  'Printed Fabric',
  'Plain Fabric',
];

// Combined unique categories for Both / All
export const BOTH_FABRIC_CATEGORIES = Array.from(
  new Set([
    ...MALE_FABRIC_CATEGORIES,
    ...FEMALE_FABRIC_CATEGORIES,
    'Cotton',
    'Silk & Chiffon',
    'Unstitched',
    'Suit',
    'Thaan',
    'Cut Piece',
  ])
);

// Packaging / Unit Types for Male
export const MALE_PACKAGING_UNITS = [
  'Suit Packet (Standard 4.5m / 4.0m)',
  'Unstitched Box',
  'Thaan (Meter / Yard)',
  'Suit (4.5m)',
];

// Packaging / Unit Types for Female
export const FEMALE_PACKAGING_UNITS = [
  '3-Piece Box (Dabba)',
  '3-Piece Suit (3PC)',
  '2-Piece Box (Dabba)',
  '2-Piece Suit (2PC)',
  'Stitched Suit',
  '1-Piece',
  'Thaan (Meter / Yard)',
];

// Combined packaging / unit types
export const BOTH_PACKAGING_UNITS = Array.from(
  new Set([
    ...MALE_PACKAGING_UNITS,
    ...FEMALE_PACKAGING_UNITS,
  ])
);

export function getCategoriesByGender(gender: FabricGender): string[] {
  if (gender === 'Male') return MALE_FABRIC_CATEGORIES;
  if (gender === 'Female') return FEMALE_FABRIC_CATEGORIES;
  return BOTH_FABRIC_CATEGORIES;
}

export function getUnitsByGender(gender: FabricGender): string[] {
  if (gender === 'Male') return MALE_PACKAGING_UNITS;
  if (gender === 'Female') return FEMALE_PACKAGING_UNITS;
  return BOTH_PACKAGING_UNITS;
}
