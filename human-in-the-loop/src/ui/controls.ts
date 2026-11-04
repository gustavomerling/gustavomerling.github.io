/**
 * Tabela de controles mostrada em "Controles" (menu inicial e pausa).
 * Para um novo atalho, basta acrescentar um item aqui (ou um grupo novo).
 *
 * `keys`: cada item vira uma tecla desenhada; use os nomes especiais
 * abaixo para o mouse. `alt` separa as teclas por "/" em vez de juntá-las.
 */
export interface Binding {
  keys: string[]
  action: string
  note?: string
  /** Teclas são alternativas ("1–9 / roda") em vez de um conjunto (WASD). */
  alt?: boolean
}

export interface BindingGroup {
  id: string
  title: string
  bindings: Binding[]
}

/** Nomes especiais de `keys` e como aparecem. */
export const KEY_LABELS: Record<string, string> = {
  LMB: 'Botão esq.',
  RMB: 'Botão dir.',
  Wheel: 'Roda',
  Mouse: 'Mouse',
  Space: 'Espaço',
  Shift: 'Shift',
  Esc: 'Esc',
}

export const CONTROL_GROUPS: BindingGroup[] = [
  {
    id: 'move',
    title: 'Movimento',
    bindings: [
      { keys: ['W', 'A', 'S', 'D'], action: 'Andar' },
      { keys: ['Shift'], action: 'Correr', note: 'segurar' },
      { keys: ['C', 'Ctrl'], action: 'Agachar', note: 'cuidado: Ctrl+W fecha a aba' },
      { keys: ['Space'], action: 'Pular' },
      { keys: ['Mouse'], action: 'Olhar' },
    ],
  },
  {
    id: 'combat',
    title: 'Armas e mãos',
    bindings: [
      { keys: ['LMB'], action: 'Atirar / golpear', note: 'rifle: segurar · taco e mãos: segure para golpe forte' },
      { keys: ['RMB'], action: 'Mirar pela alça', note: 'com arma de fogo' },
      { keys: ['RMB'], action: 'Agarrar / arremessar', note: 'com as mãos' },
      { keys: ['LMB'], action: 'Arremessar o que segura', note: 'com as mãos, segurando o botão dir.' },
      { keys: ['1–9', 'Wheel'], action: 'Trocar de arma', alt: true },
      { keys: ['E'], action: 'Pegar arma do chão' },
    ],
  },
  {
    id: 'sandbox',
    title: 'Sandbox',
    bindings: [
      { keys: ['B'], action: 'Modo construção', note: 'clique coloca · botão dir. remove · Q/E gira' },
      { keys: ['Q'], action: 'Menu de spawn', note: 'objetos e armas na mira' },
      { keys: ['X'], action: 'Apagar o item na mira' },
      { keys: ['Tab'], action: 'Ferramentas', note: 'corda, mola, congelar, ímã · Tab troca' },
      { keys: ['R'], action: 'Resetar a cena' },
      { keys: ['T'], action: 'Soltar o NPC à frente' },
      { keys: ['F'], action: 'Empurrão médio no NPC', note: 'na direção do olhar' },
      { keys: ['G'], action: 'Empurrão forte no NPC' },
      { keys: ['M'], action: 'Mandar o NPC ao ponto na mira', note: 'Shift+M: correndo' },
    ],
  },
  {
    id: 'system',
    title: 'Sistema e debug',
    bindings: [
      { keys: ['Esc'], action: 'Pausar / soltar o mouse' },
      { keys: ['`'], action: 'Painel de debug' },
      { keys: ['P'], action: 'Pausar a física', note: 'com o painel aberto' },
      { keys: ['.'], action: 'Avançar 1 passo', note: 'física pausada' },
      { keys: ['V'], action: 'Mostrar colisores' },
      { keys: ['[', ']'], action: 'Força do NPC', alt: true },
      { keys: ['N'], action: 'Trocar pose-alvo' },
      { keys: ['K', 'L', 'O'], action: 'Equilíbrio · levantar · olhar', alt: true },
      { keys: ['I'], action: 'Ligar/desligar a IA do NPC', note: 'com o painel aberto' },
    ],
  },
]
