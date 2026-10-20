// Theme configuration system.
// Themes are pure data — the storefront renders from tokens via CSS variables.
// Never hard-code per-theme components; extend TOKENS instead.

export type ThemeId =
  | "classic"
  | "luxury"
  | "minimal"
  | "dark"
  | "fashion"
  | "restaurant"
  | "modern";

export type ThemeTier = "free" | "pro";
export type ThemeLayout = "classic" | "editorial" | "restaurant" | "modern";

export interface Theme {
  id: ThemeId;
  name: string;
  tier: ThemeTier;
  description: string;
  layout: ThemeLayout;
  dark: boolean;
  fonts: {
    heading: "sans" | "serif";
  };
  tokens: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textSecondary: string;
    muted: string;
    primary: string;
    primaryHover: string;
    onPrimary: string;
    accent: string;
    onAccent: string;
    shadow: string;
  };
}

export const THEMES: Record<ThemeId, Theme> = {
  classic: {
    id: "classic",
    name: "Classic Navy",
    tier: "free",
    description: "Premium navy and white — clean and trustworthy.",
    layout: "classic",
    dark: false,
    fonts: { heading: "sans" },
    tokens: {
      bg: "#FFFFFF",
      surface: "#F6F6F4",
      surfaceAlt: "#EFEFEC",
      border: "#E7E6E2",
      text: "#1A1A17",
      textSecondary: "#5C5B54",
      muted: "#85847C",
      primary: "#0B2136",
      primaryHover: "#123252",
      onPrimary: "#FFFFFF",
      accent: "#C9A45C",
      onAccent: "#0B2136",
      shadow: "rgba(26, 26, 23, 0.08)",
    },
  },
  luxury: {
    id: "luxury",
    name: "Luxury",
    tier: "pro",
    description: "Deep navy with champagne gold accents.",
    layout: "classic",
    dark: true,
    fonts: { heading: "serif" },
    tokens: {
      bg: "#04111F",
      surface: "#071A33",
      surfaceAlt: "#0B2342",
      border: "#163D6B",
      text: "#F4F7FB",
      textSecondary: "#A3BBD4",
      muted: "#6E93BE",
      primary: "#C9A45C",
      primaryHover: "#E0C27A",
      onPrimary: "#04111F",
      accent: "#C9A45C",
      onAccent: "#04111F",
      shadow: "rgba(0, 0, 0, 0.45)",
    },
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    tier: "pro",
    description: "White space, subtle navy, quiet elegance.",
    layout: "editorial",
    dark: false,
    fonts: { heading: "sans" },
    tokens: {
      bg: "#FFFFFF",
      surface: "#FAFAF9",
      surfaceAlt: "#F4F4F2",
      border: "#E7E6E2",
      text: "#1A1A17",
      textSecondary: "#5C5B54",
      muted: "#85847C",
      primary: "#0B2136",
      primaryHover: "#123252",
      onPrimary: "#FFFFFF",
      accent: "#1B4A73",
      onAccent: "#FFFFFF",
      shadow: "rgba(26, 26, 23, 0.06)",
    },
  },
  dark: {
    id: "dark",
    name: "Midnight",
    tier: "pro",
    description: "Full midnight-navy dark mode.",
    layout: "modern",
    dark: true,
    fonts: { heading: "sans" },
    tokens: {
      bg: "#04111F",
      surface: "#071A33",
      surfaceAlt: "#0B2342",
      border: "#123054",
      text: "#EDF2F8",
      textSecondary: "#9FB4CC",
      muted: "#6E93BE",
      primary: "#2D5F91",
      primaryHover: "#3D72A8",
      onPrimary: "#FFFFFF",
      accent: "#E0C27A",
      onAccent: "#04111F",
      shadow: "rgba(0, 0, 0, 0.5)",
    },
  },
  fashion: {
    id: "fashion",
    name: "Fashion",
    tier: "pro",
    description: "Elegant editorial style with serif headings.",
    layout: "editorial",
    dark: false,
    fonts: { heading: "serif" },
    tokens: {
      bg: "#FAF8F4",
      surface: "#FFFFFF",
      surfaceAlt: "#F1EDE5",
      border: "#E5DFD3",
      text: "#14181F",
      textSecondary: "#57606E",
      muted: "#8A93A1",
      primary: "#0B2342",
      primaryHover: "#163D6B",
      onPrimary: "#FFFFFF",
      accent: "#C9A45C",
      onAccent: "#0B2342",
      shadow: "rgba(20, 24, 31, 0.10)",
    },
  },
  restaurant: {
    id: "restaurant",
    name: "Restaurant",
    tier: "pro",
    description: "Food-focused layout with a hero banner.",
    layout: "restaurant",
    dark: false,
    fonts: { heading: "serif" },
    tokens: {
      bg: "#FFFFFF",
      surface: "#FBF9F6",
      surfaceAlt: "#F4EFE7",
      border: "#EAE3D6",
      text: "#1A1D24",
      textSecondary: "#5B6470",
      muted: "#98A0AC",
      primary: "#071A33",
      primaryHover: "#163D6B",
      onPrimary: "#FFFFFF",
      accent: "#C9A45C",
      onAccent: "#071A33",
      shadow: "rgba(26, 29, 36, 0.10)",
    },
  },
  modern: {
    id: "modern",
    name: "Modern",
    tier: "pro",
    description: "Contemporary commerce with soft geometry.",
    layout: "modern",
    dark: false,
    fonts: { heading: "sans" },
    tokens: {
      bg: "#F7F9FC",
      surface: "#FFFFFF",
      surfaceAlt: "#EEF3F8",
      border: "#DFE7F0",
      text: "#0A1728",
      textSecondary: "#526074",
      muted: "#8B97A7",
      primary: "#163D6B",
      primaryHover: "#2D5F91",
      onPrimary: "#FFFFFF",
      accent: "#C9A45C",
      onAccent: "#071A33",
      shadow: "rgba(22, 61, 107, 0.12)",
    },
  },
};

export const THEME_LIST = Object.values(THEMES);

export function getTheme(id: string | null | undefined): Theme {
  return THEMES[(id as ThemeId) ?? "classic"] ?? THEMES.classic;
}

/** Accent colors a Pro user can pick for their storefront. */
export const ACCENT_COLORS = [
  { id: "default", name: "Brand", value: "#C9A45C" },
  { id: "royal", name: "Royal", value: "#163D6B" },
  { id: "emerald", name: "Emerald", value: "#16845B" },
  { id: "wine", name: "Wine", value: "#7A2E4D" },
  { id: "copper", name: "Copper", value: "#B4642F" },
  { id: "teal", name: "Teal", value: "#1F6F78" },
];
