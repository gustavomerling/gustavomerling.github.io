/**
 * Ajustes visuais compartilhados entre o painel (React) e a cena (Three.js).
 * A cena lê estes valores a cada quadro, então mudar aqui surte efeito na hora.
 */
export const visual = {
  /** Intensidade do sol (padrão 2.2). */
  sunIntensity: 2.2,
  /** Altura do sol sobre o horizonte, em graus (padrão 51). */
  sunElevationDeg: 51,
  /** Exposição do tone mapping (padrão 1). */
  exposure: 1,
  /** Bloom (brilho suave em áreas claras) ligado. */
  bloom: true,
  /** Força do bloom (padrão 0.35). */
  bloomStrength: 0.35,
}
