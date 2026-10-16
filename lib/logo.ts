// Logo service abstraction.
// Generates an elegant SVG monogram logo. An AI image service can be added
// behind this interface by setting an AI provider key — until then the
// deterministic SVG generator is the graceful fallback and always works.

export interface LogoRequest {
  businessName: string;
  category?: string;
  style: "minimal" | "luxury" | "modern" | "bold" | "elegant" | "professional";
  color: string; // hex
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "P";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function generateLogoSvg(req: LogoRequest): string {
  const letters = initials(req.businessName);
  const bg = req.color;
  const fg = luminance(bg) > 0.55 ? "#071A33" : "#FFFFFF";
  const styleVariants: Record<string, { radius: number; weight: number; letterSpacing: number; decorative: boolean }> = {
    minimal: { radius: 12, weight: 300, letterSpacing: 2, decorative: false },
    luxury: { radius: 200, weight: 500, letterSpacing: 1, decorative: true },
    modern: { radius: 26, weight: 700, letterSpacing: 0, decorative: false },
    bold: { radius: 8, weight: 800, letterSpacing: 0, decorative: false },
    elegant: { radius: 200, weight: 300, letterSpacing: 3, decorative: true },
    professional: { radius: 10, weight: 600, letterSpacing: 0, decorative: false },
  };
  const v = styleVariants[req.style] ?? styleVariants.professional;
  const decorative =
    v.decorative
      ? `<circle cx="180" cy="32" r="5" fill="none" stroke="${fg}" stroke-opacity="0.55" stroke-width="2"/>
         <circle cx="200" cy="200" r="44" fill="none" stroke="${fg}" stroke-opacity="0.4" stroke-width="2"/>`
      : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="${v.radius}" fill="${bg}"/>
  ${decorative}
  <text x="120" y="120" text-anchor="middle" dominant-baseline="central"
    font-family="Georgia, 'Times New Roman', serif" font-size="${v.weight >= 700 ? 96 : 84}"
    font-weight="${v.weight}" letter-spacing="${v.letterSpacing}" fill="${fg}">${letters}</text>
</svg>`;
  return svg;
}

export function logoSvgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
