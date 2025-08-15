export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) || 
                 /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);

  if (!result) {
    throw new Error('Invalid hex color format');
  }

  // Handle both 3-digit (#rgb) and 6-digit (#rrggbb) hex formats
  const r = parseInt(result[1].length === 1 ? result[1] + result[1] : result[1], 16);
  const g = parseInt(result[2].length === 1 ? result[2] + result[2] : result[2], 16);
  const b = parseInt(result[3].length === 1 ? result[3] + result[3] : result[3], 16);

  return { r, g, b };
}

export function darkenColor(hex: string, percentage: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - (percentage / 100);

  const newR = Math.max(0, Math.floor(r * factor));
  const newG = Math.max(0, Math.floor(g * factor));
  const newB = Math.max(0, Math.floor(b * factor));

  return rgbaToHex(newR, newG, newB);
}

export function lightenColor(hex: string, percentage: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percentage / 100;

  const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
  const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
  const newB = Math.min(255, Math.floor(b + (255 - b) * factor));

  return rgbaToHex(newR, newG, newB);
}

export function blendColors(color1: string, color2: string, ratio: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);

  return rgbaToHex(r, g, b);
}

export function rgbaToHex(r: number, g: number, b: number, a?: number): string {
  const toHex = (value: number): string => {
    const hex = Math.round(value).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  const red = toHex(r);
  const green = toHex(g);
  const blue = toHex(b);
  
  if (a !== undefined) {
    const alpha = toHex(Math.round(a * 255));
    return `#${red}${green}${blue}${alpha}`;
  }
  
  return `#${red}${green}${blue}`;
}

export function rgbaStringToHex(rgbaString: string): string {
  const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  
  if (!match) {
    throw new Error('Invalid RGBA string format');
  }
  
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  const a = match[4] ? parseFloat(match[4]) : undefined;
  
  return rgbaToHex(r, g, b, a);
}