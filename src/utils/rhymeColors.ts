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

/**
 * Parse hex color to HSL components.
 */
function hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }

    return [h * 360, s * 100, l * 100];
}

/**
 * Convert HSL to hex color string.
 */
function hslToHex(h: number, s: number, l: number): string {
    h /= 360; s /= 100; l /= 100;
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate shade variants for syllable positions within a scheme.
 * Position 0 → lightest, Position N-1 → darkest.
 */
export function getSchemeShades(baseColor: string, syllableCount: number): string[] {
    if (syllableCount <= 1) return [baseColor];

    const [h, s, l] = hexToHsl(baseColor);
    const lightStart = Math.min(l + 20, 85); // lightest
    const lightEnd = Math.max(l - 15, 20);   // darkest

    return Array.from({ length: syllableCount }, (_, i) => {
        const t = i / (syllableCount - 1);
        const newL = lightStart + t * (lightEnd - lightStart);
        return hslToHex(h, s, newL);
    });
}
