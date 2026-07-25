/**
 * Hex aproximado por colorSlug de Capri, solo para swatches decorativos.
 * Colores no mapeados caen en el neutro.
 */
const COLOR_HEX: Record<string, string> = {
  black: "#232326",
  brown: "#6b4a2f",
  coffee: "#4e342e",
  gunmetal: "#5a5f66",
  gold: "#c9a24b",
  "black-gold": "#4a3c1e",
  tortoise: "#7a4b26",
  "tortoise-gold": "#8a6030",
  demi: "#8a5a2a",
  burgundy: "#6d2734",
  wine: "#5c2233",
  red: "#a63a3a",
  pink: "#e3a0b0",
  rose: "#d98e9c",
  purple: "#6d5a8c",
  blue: "#3a5f8a",
  navy: "#283a5c",
  teal: "#3a7d78",
  green: "#4c6b4f",
  olive: "#6b6b3a",
  grey: "#8d8d92",
  gray: "#8d8d92",
  silver: "#b9bcc1",
  ink: "#2c3242",
  crystal: "#dcd8cf",
  clear: "#e6e2da",
  white: "#f2efe9",
  cream: "#ece4d4",
  multi:
    "conic-gradient(#a63a3a, #c9a24b, #4c6b4f, #3a5f8a, #6d5a8c, #a63a3a)",
}

export function swatchBackground(colorSlug: string): string {
  return COLOR_HEX[colorSlug] ?? "#b0a894"
}
