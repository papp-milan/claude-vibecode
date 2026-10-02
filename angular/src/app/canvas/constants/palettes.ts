export interface Palette {
  id: string;
  name: string;
  colors: readonly string[];
}

export const PALETTES: readonly Palette[] = [
  {
    id: 'standard',
    name: 'Standard',
    colors: [
      '#ffffff', '#b0bec5', '#455a64', '#000000', '#e53935', '#fb8c00',
      '#fdd835', '#43a047', '#00acc1', '#1e88e5', '#5e35b1', '#d81b60',
    ],
  },
  {
    id: 'pastell',
    name: 'Pastell',
    colors: [
      '#ffcdd2', '#ffe0b2', '#fff9c4', '#c8e6c9', '#b2ebf2', '#bbdefb',
      '#d1c4e9', '#f8bbd0', '#d7ccc8', '#cfd8dc', '#f0f4c3', '#e1bee7',
    ],
  },
  {
    id: 'neon',
    name: 'Neon',
    colors: [
      '#ff1744', '#ff9100', '#ffea00', '#76ff03', '#00e676', '#1de9b6',
      '#00e5ff', '#2979ff', '#651fff', '#d500f9', '#f50057', '#ffffff',
    ],
  },
  {
    id: 'erde',
    name: 'Erde',
    colors: [
      '#3e2723', '#5d4037', '#8d6e63', '#bcaaa4', '#827717', '#9e9d24',
      '#33691e', '#689f38', '#bf360c', '#e65100', '#ff8f00', '#ffcc80',
    ],
  },
];
