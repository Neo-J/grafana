import { ThemePalette } from './createPalette';

/** @beta */
export interface ThemeShadows {
  z1: string;
  z2: string;
  z3: string;
}

function createDarkShadow(...px: number[]) {
  const shadowKeyUmbraOpacity = 0.7;
  const shadowKeyPenumbraOpacity = 0.6;
  const shadowAmbientShadowOpacity = 0.5;

  return [
    `${px[0]}px ${px[1]}px ${px[2]}px ${px[3]}px rgba(0,0,0,${shadowKeyUmbraOpacity})`,
    `${px[4]}px ${px[5]}px ${px[6]}px ${px[7]}px rgba(0,0,0,${shadowKeyPenumbraOpacity})`,
    `${px[8]}px ${px[9]}px ${px[10]}px ${px[11]}px rgba(0,0,0,${shadowAmbientShadowOpacity})`,
  ].join(',');
}

function createLightShadow(...px: number[]) {
  const shadowKeyUmbraOpacity = 0.2;
  const shadowKeyPenumbraOpacity = 0.14;
  const shadowAmbientShadowOpacity = 0.12;

  return [
    `${px[0]}px ${px[1]}px ${px[2]}px ${px[3]}px rgba(0,0,0,${shadowKeyUmbraOpacity})`,
    `${px[4]}px ${px[5]}px ${px[6]}px ${px[7]}px rgba(0,0,0,${shadowKeyPenumbraOpacity})`,
    `${px[8]}px ${px[9]}px ${px[10]}px ${px[11]}px rgba(0,0,0,${shadowAmbientShadowOpacity})`,
  ].join(',');
}

/** @alpha */
export function createShadows(palette: ThemePalette): ThemeShadows {
  if (palette.mode === 'dark') {
    return {
      z1: createDarkShadow(0, 3, 1, -2, 0, 2, 2, 0, 0, 1, 5, 0),
      z2: createDarkShadow(0, 2, 4, -1, 0, 4, 5, 0, 0, 1, 10, 0),
      z3: createDarkShadow(0, 5, 5, -3, 0, 8, 10, 1, 0, 3, 14, 2),
    };
  }

  return {
    z1: createLightShadow(0, 3, 1, -2, 0, 2, 2, 0, 0, 1, 5, 0),
    z2: createLightShadow(0, 2, 4, -1, 0, 4, 5, 0, 0, 1, 10, 0),
    z3: createLightShadow(0, 5, 5, -3, 0, 8, 10, 1, 0, 3, 14, 2),
  };
}
