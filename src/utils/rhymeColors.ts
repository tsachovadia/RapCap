// Palette of distinct, vibrant colors for rhyme highlighting
// Designed to pop against a dark background (#121212)

export const RHYME_COLORS = [
    '#FF5733', // Red-Orange
    '#33FF57', // Bright Green
    '#3357FF', // Bright Blue
    '#FF33F6', // Magenta
    '#F3FF33', // Yellow
    '#33FFF6', // Cyan
    '#FF8333', // Orange
    '#8333FF', // Purple
    '#FF3383', // Pink
    '#33FF83', // Mint
    '#83FF33', // Lime
    '#3383FF', // Sky Blue
    '#FF5733', // Coral
    '#5733FF', // Indigo
    '#FF3333', // Red
    '#33FFCC', // Turquoise
];

/**
 * Returns a color from the palette based on an index.
 * Uses modulo to cycle through colors if index exceeds palette length.
 */
export const getRhymeColor = (index: number): string => {
    return RHYME_COLORS[Math.abs(index) % RHYME_COLORS.length];
};
