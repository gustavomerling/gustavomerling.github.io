export type Grupo =
  | 'peito'
  | 'costas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'posterior'
  | 'gluteos'
  | 'panturrilha'
  | 'core'
  | 'cardio';

export type Equip = 'maquina' | 'polia' | 'halteres' | 'barra' | 'kettlebell' | 'elastico' | 'corporal';

export interface Exercise {
  id: string;
  nome: string;
  grupo: Grupo;
  equip: Equip;
  /** Multiarticular (puxa vários grupos). Vem primeiro no treino. */
  composto: boolean;
  /** 1 = iniciante, 2 = intermediário, 3 = avançado */
  nivel: 1 | 2 | 3;
  /** Exercício isométrico, medido em segundos */
  tempo?: boolean;
  instrucoes: string;
  /** Não é sorteado no treino (ex.: caminhada até a academia, adicionada pelo checkin) */
  extra?: boolean;
}

export const GRUPO_LABEL: Record<Grupo, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombro',
  biceps: 'Braço',
  triceps: 'Braço',
  quadriceps: 'Perna',
  posterior: 'Perna',
  gluteos: 'Glúteo',
  panturrilha: 'Perna',
  core: 'Abdômen',
  cardio: 'Cardio',
};

export const GRUPO_NOME: Record<Grupo, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  posterior: 'Posterior de coxa',
  gluteos: 'Glúteos',
  panturrilha: 'Panturrilha',
  core: 'Abdômen',
  cardio: 'Cardio',
};

export const EQUIP_LABEL: Record<Equip, string> = {
  maquina: 'Máquina',
  polia: 'Polia',
  halteres: 'Halteres',
  barra: 'Barra',
  kettlebell: 'Kettlebell',
  elastico: 'Elástico',
  corporal: 'Peso do corpo',
};

export const EQUIP_ORDER: Equip[] = ['maquina', 'polia', 'halteres', 'barra', 'kettlebell', 'elastico', 'corporal'];

/** Músculos que também trabalham nos multiarticulares (por grupo; exceções por id). */
const SECUNDARIOS_GRUPO: Partial<Record<Grupo, Grupo[]>> = {
  peito: ['triceps', 'ombros'],
  costas: ['biceps'],
  ombros: ['triceps'],
  triceps: ['peito'],
  quadriceps: ['gluteos'],
  posterior: ['gluteos'],
  gluteos: ['quadriceps'],
};
const SECUNDARIOS_ID: Record<string, Grupo[]> = {
  'levantamento-terra': ['gluteos', 'costas'],
  'kettlebell-swing': ['gluteos', 'core'],
  'elevacao-pelvica': ['posterior'],
  'elevacao-pelvica-maquina': ['posterior'],
  'pike-pushup': ['triceps'],
  'barra-fixa': ['biceps', 'core'],
  'bulgaro': ['gluteos', 'posterior'],
  'afundo': ['gluteos', 'posterior'],
  'passada': ['quadriceps', 'posterior'],
};

export function secondaryOf(ex: Exercise): Grupo[] {
  if (!ex.composto || ex.grupo === 'cardio') return [];
  return SECUNDARIOS_ID[ex.id] ?? SECUNDARIOS_GRUPO[ex.grupo] ?? [];
}

export type Tag = { label: string; kind: 'main' | 'sec' | 'equip' };

/** Tags do card: músculo principal, músculos auxiliares e equipamento (+ "Livre" para pesos livres). */
export function tagsOf(ex: Exercise): Tag[] {
  if (ex.grupo === 'cardio')
    return [
      { label: 'Cardio', kind: 'main' },
      { label: ex.equip === 'maquina' ? 'Máquina' : 'Livre', kind: 'equip' },
    ];
  const tags: Tag[] = [{ label: GRUPO_NOME[ex.grupo], kind: 'main' }];
  for (const g of secondaryOf(ex)) tags.push({ label: GRUPO_NOME[g], kind: 'sec' });
  if (ex.equip === 'halteres' || ex.equip === 'barra' || ex.equip === 'kettlebell') tags.push({ label: 'Livre', kind: 'equip' });
  tags.push({ label: EQUIP_LABEL[ex.equip], kind: 'equip' });
  return tags;
}

const E = (
  id: string,
  nome: string,
  grupo: Grupo,
  equip: Equip,
  composto: boolean,
  nivel: 1 | 2 | 3,
  instrucoes: string,
  tempo?: boolean,
): Exercise => ({ id, nome, grupo, equip, composto, nivel, instrucoes, tempo });

export const EXERCISES: Exercise[] = [
  // Peito
  E('supino-reto-halteres', 'Supino reto com halteres', 'peito', 'halteres', true, 1, 'Deitado no banco, desça os halteres até a linha do peito com os cotovelos a ~45° do tronco e empurre de volta.'),
  E('supino-reto-barra', 'Supino reto com barra', 'peito', 'barra', true, 2, 'Pegada um pouco mais larga que os ombros. Desça a barra controlada até tocar o meio do peito e empurre. Use um parceiro ou travas.'),
  E('supino-inclinado-halteres', 'Supino inclinado com halteres', 'peito', 'halteres', true, 1, 'Banco a 30–45°. Desça os halteres ao lado da parte alta do peito e empurre para cima, sem bater um no outro.'),
  E('supino-inclinado-barra', 'Supino inclinado com barra', 'peito', 'barra', true, 2, 'Banco inclinado a 30–45°. Desça a barra até a parte alta do peito, mantendo as escápulas encaixadas no banco.'),
  E('supino-maquina', 'Supino na máquina', 'peito', 'maquina', true, 1, 'Ajuste o banco para as pegadas ficarem na altura do meio do peito. Empurre sem travar os cotovelos e volte devagar.'),
  E('crucifixo-halteres', 'Crucifixo com halteres', 'peito', 'halteres', false, 1, 'Deitado, braços abertos com cotovelos levemente flexionados. Abra até sentir alongar o peito e feche num arco.'),
  E('voador', 'Voador (peck deck)', 'peito', 'maquina', false, 1, 'Costas apoiadas, cotovelos na altura dos ombros. Feche os braços à frente contraindo o peito e abra devagar.'),
  E('crossover', 'Crossover na polia', 'peito', 'polia', false, 2, 'Polias no alto, um passo à frente. Traga as mãos para baixo e à frente do quadril, cotovelos levemente dobrados.'),
  E('flexao', 'Flexão de braços', 'peito', 'corporal', true, 1, 'Mãos um pouco além da largura dos ombros, corpo em linha reta. Desça o peito até perto do chão e empurre. Pode apoiar os joelhos.'),
  E('mergulho-paralelas', 'Mergulho nas paralelas', 'peito', 'corporal', true, 3, 'Incline o tronco levemente à frente e desça até os ombros ficarem na altura dos cotovelos. Suba empurrando.'),
  E('supino-elastico', 'Supino com elástico', 'peito', 'elastico', true, 1, 'Elástico preso atrás de você na altura do peito. Empurre as mãos à frente e volte controlando a tensão.'),

  // Costas
  E('puxada-frontal', 'Puxada frontal na polia', 'costas', 'polia', true, 1, 'Pegada aberta, tronco levemente inclinado para trás. Puxe a barra até a parte alta do peito levando os cotovelos para baixo.'),
  E('remada-baixa', 'Remada baixa na polia', 'costas', 'polia', true, 1, 'Sentado, coluna neutra. Puxe o triângulo até o abdômen, juntando as escápulas, e estenda os braços devagar.'),
  E('remada-curvada', 'Remada curvada com barra', 'costas', 'barra', true, 2, 'Joelhos levemente flexionados, tronco inclinado a ~45° com coluna neutra. Puxe a barra até o umbigo.'),
  E('serrote', 'Remada unilateral com halter (serrote)', 'costas', 'halteres', true, 1, 'Joelho e mão apoiados no banco. Puxe o halter em direção ao quadril, mantendo o tronco parado.'),
  E('remada-maquina', 'Remada na máquina', 'costas', 'maquina', true, 1, 'Peito apoiado no suporte. Puxe as pegadas para trás juntando as escápulas e volte sem perder a postura.'),
  E('barra-fixa', 'Barra fixa', 'costas', 'corporal', true, 3, 'Pegada pronada, um pouco além dos ombros. Suba até o queixo passar a barra e desça até estender os braços.'),
  E('remada-invertida', 'Remada invertida', 'costas', 'corporal', true, 2, 'Deitado sob uma barra baixa ou Smith, corpo reto. Puxe o peito até a barra e desça controlado.'),
  E('pulldown-bracos-estendidos', 'Pulldown com braços estendidos', 'costas', 'polia', false, 2, 'De pé, polia alta. Com braços quase retos, leve a barra até as coxas usando as costas.'),
  E('remada-cavalinho', 'Remada cavalinho', 'costas', 'barra', true, 2, 'Em pé sobre a barra (ou no aparelho), tronco inclinado. Puxe a pegada até o peito mantendo a coluna neutra.'),
  E('remada-elastico', 'Remada com elástico', 'costas', 'elastico', true, 1, 'Elástico preso à frente na altura do peito. Puxe os cotovelos para trás juntando as escápulas.'),

  // Ombros
  E('desenvolvimento-halteres', 'Desenvolvimento com halteres', 'ombros', 'halteres', true, 1, 'Sentado com costas apoiadas. Empurre os halteres da altura das orelhas até em cima, sem arquear a lombar.'),
  E('desenvolvimento-maquina', 'Desenvolvimento na máquina', 'ombros', 'maquina', true, 1, 'Ajuste o banco para as pegadas ficarem na altura dos ombros. Empurre para cima e volte devagar.'),
  E('desenvolvimento-barra', 'Desenvolvimento militar com barra', 'ombros', 'barra', true, 3, 'Em pé, abdômen e glúteos contraídos. Empurre a barra da clavícula até acima da cabeça.'),
  E('elevacao-lateral', 'Elevação lateral com halteres', 'ombros', 'halteres', false, 1, 'Braços ao lado do corpo, cotovelos levemente dobrados. Eleve até a altura dos ombros e desça devagar.'),
  E('elevacao-lateral-polia', 'Elevação lateral na polia', 'ombros', 'polia', false, 2, 'Polia baixa do lado oposto. Eleve o braço lateralmente até a altura do ombro, um lado por vez.'),
  E('elevacao-frontal', 'Elevação frontal com halteres', 'ombros', 'halteres', false, 1, 'Eleve os halteres à frente até a altura dos olhos, sem balançar o tronco.'),
  E('crucifixo-invertido', 'Crucifixo invertido', 'ombros', 'halteres', false, 1, 'Tronco inclinado à frente. Abra os braços para os lados trabalhando a parte de trás do ombro.'),
  E('face-pull', 'Face pull na polia', 'ombros', 'polia', false, 2, 'Corda na polia alta. Puxe em direção ao rosto abrindo as mãos e levando os cotovelos para trás.'),
  E('elevacao-lateral-elastico', 'Elevação lateral com elástico', 'ombros', 'elastico', false, 1, 'Pise no elástico e eleve os braços lateralmente até a altura dos ombros.'),
  E('pike-pushup', 'Flexão pike', 'ombros', 'corporal', true, 2, 'Quadril alto, corpo em "V" invertido. Dobre os cotovelos levando a cabeça em direção ao chão e empurre.'),

  // Bíceps
  E('rosca-direta', 'Rosca direta com barra', 'biceps', 'barra', false, 1, 'Cotovelos colados ao corpo. Suba a barra até a altura do peito sem balançar o tronco e desça devagar.'),
  E('rosca-alternada', 'Rosca alternada com halteres', 'biceps', 'halteres', false, 1, 'Suba um halter de cada vez girando a palma para cima. Cotovelos parados ao lado do corpo.'),
  E('rosca-martelo', 'Rosca martelo', 'biceps', 'halteres', false, 1, 'Palmas viradas uma para a outra o tempo todo. Suba os halteres sem mover os cotovelos.'),
  E('rosca-polia', 'Rosca na polia', 'biceps', 'polia', false, 1, 'Polia baixa com barra reta. Flexione os cotovelos mantendo-os ao lado do corpo.'),
  E('rosca-scott', 'Rosca Scott na máquina', 'biceps', 'maquina', false, 1, 'Braços apoiados no banco Scott. Suba controlado e desça até quase estender o cotovelo.'),
  E('rosca-concentrada', 'Rosca concentrada', 'biceps', 'halteres', false, 2, 'Sentado, cotovelo apoiado na parte interna da coxa. Suba o halter devagar, sem mexer o braço.'),
  E('rosca-elastico', 'Rosca com elástico', 'biceps', 'elastico', false, 1, 'Pise no elástico e flexione os cotovelos, mantendo-os junto ao corpo.'),

  // Tríceps
  E('triceps-corda', 'Tríceps na polia com corda', 'triceps', 'polia', false, 1, 'Cotovelos colados ao corpo. Estenda os braços abrindo a corda no final e volte até 90°.'),
  E('triceps-testa', 'Tríceps testa', 'triceps', 'barra', false, 2, 'Deitado, barra acima do peito. Dobre só os cotovelos levando a barra até perto da testa e estenda.'),
  E('triceps-frances', 'Tríceps francês com halter', 'triceps', 'halteres', false, 1, 'Segure um halter com as duas mãos acima da cabeça. Desça atrás da nuca e estenda os braços.'),
  E('mergulho-banco', 'Mergulho no banco', 'triceps', 'corporal', false, 1, 'Mãos na borda do banco, pernas à frente. Desça dobrando os cotovelos até 90° e empurre.'),
  E('triceps-coice', 'Tríceps coice com halter', 'triceps', 'halteres', false, 1, 'Tronco inclinado, braço colado ao corpo. Estenda o cotovelo levando o halter para trás.'),
  E('triceps-maquina', 'Tríceps na máquina', 'triceps', 'maquina', false, 1, 'Sentado, empurre as pegadas para baixo estendendo os cotovelos e volte controlado.'),
  E('supino-fechado', 'Supino fechado', 'triceps', 'barra', true, 2, 'Pegada na largura dos ombros, cotovelos perto do corpo. Desça a barra até a parte baixa do peito e empurre.'),
  E('triceps-elastico', 'Tríceps com elástico', 'triceps', 'elastico', false, 1, 'Elástico preso no alto. Estenda os cotovelos para baixo mantendo-os junto ao corpo.'),

  // Quadríceps
  E('agachamento-goblet', 'Agachamento goblet', 'quadriceps', 'halteres', true, 1, 'Segure um halter junto ao peito. Agache com o peito aberto até as coxas ficarem paralelas ao chão.'),
  E('agachamento-livre', 'Agachamento livre com barra', 'quadriceps', 'barra', true, 3, 'Barra apoiada no trapézio, pés na largura dos ombros. Agache mantendo os joelhos na direção dos pés e suba firme.'),
  E('leg-press', 'Leg press', 'quadriceps', 'maquina', true, 1, 'Pés no meio da plataforma na largura dos ombros. Desça até 90° nos joelhos sem tirar a lombar do encosto.'),
  E('cadeira-extensora', 'Cadeira extensora', 'quadriceps', 'maquina', false, 1, 'Ajuste o rolo no tornozelo. Estenda os joelhos até em cima, segure um instante e desça devagar.'),
  E('hack', 'Agachamento no hack', 'quadriceps', 'maquina', true, 2, 'Costas apoiadas, pés à frente na plataforma. Desça controlado até 90° e empurre.'),
  E('agachamento-smith', 'Agachamento no Smith', 'quadriceps', 'maquina', true, 1, 'Barra guiada no trapézio, pés levemente à frente. Agache até as coxas ficarem paralelas ao chão.'),
  E('afundo', 'Afundo com halteres', 'quadriceps', 'halteres', true, 2, 'Dê um passo à frente e desça até os dois joelhos formarem 90°. Volte e alterne as pernas.'),
  E('bulgaro', 'Agachamento búlgaro', 'quadriceps', 'halteres', true, 3, 'Pé de trás apoiado no banco. Desça na perna da frente mantendo o tronco firme.'),
  E('agachamento-corporal', 'Agachamento livre (peso do corpo)', 'quadriceps', 'corporal', true, 1, 'Pés na largura dos ombros, braços à frente. Agache levando o quadril para trás e suba.'),
  E('agachamento-elastico', 'Agachamento com elástico', 'quadriceps', 'elastico', true, 1, 'Pise no elástico e segure as pontas na altura dos ombros. Agache e suba vencendo a tensão.'),

  // Posterior
  E('stiff-halteres', 'Stiff com halteres', 'posterior', 'halteres', true, 1, 'Joelhos levemente dobrados. Leve o quadril para trás descendo os halteres rente às pernas, coluna neutra.'),
  E('stiff-barra', 'Stiff com barra', 'posterior', 'barra', true, 2, 'Barra rente às coxas. Desça empurrando o quadril para trás até sentir alongar o posterior e suba.'),
  E('mesa-flexora', 'Mesa flexora', 'posterior', 'maquina', false, 1, 'Deitado de bruços, rolo acima do calcanhar. Flexione os joelhos sem tirar o quadril do banco.'),
  E('cadeira-flexora', 'Cadeira flexora', 'posterior', 'maquina', false, 1, 'Sentado, rolo atrás do tornozelo. Flexione os joelhos puxando para baixo e volte devagar.'),
  E('levantamento-terra', 'Levantamento terra', 'posterior', 'barra', true, 3, 'Barra junto às canelas, coluna neutra. Levante estendendo quadril e joelhos juntos, sem arredondar as costas.'),
  E('kettlebell-swing', 'Kettlebell swing', 'posterior', 'kettlebell', true, 2, 'Balance o kettlebell entre as pernas e projete o quadril à frente para levá-lo até a altura do peito.'),
  E('flexao-nordica', 'Flexão nórdica', 'posterior', 'corporal', false, 3, 'Ajoelhado com os tornozelos presos. Desça o tronco à frente o mais devagar possível.'),
  E('flexora-elastico', 'Flexora com elástico', 'posterior', 'elastico', false, 1, 'Deitado de bruços, elástico no tornozelo preso à frente. Flexione o joelho trazendo o calcanhar ao glúteo.'),

  // Glúteos
  E('elevacao-pelvica', 'Elevação pélvica com barra', 'gluteos', 'barra', true, 2, 'Costas apoiadas no banco, barra no quadril. Suba o quadril até o tronco ficar alinhado e contraia os glúteos.'),
  E('elevacao-pelvica-maquina', 'Elevação pélvica na máquina', 'gluteos', 'maquina', true, 1, 'Ajuste o apoio no quadril. Empurre para cima contraindo os glúteos no topo.'),
  E('ponte-gluteo', 'Ponte de glúteo', 'gluteos', 'corporal', false, 1, 'Deitado, joelhos dobrados. Suba o quadril contraindo os glúteos, segure 1 s e desça.'),
  E('cadeira-abdutora', 'Cadeira abdutora', 'gluteos', 'maquina', false, 1, 'Sentado, abra as pernas contra a resistência e volte devagar, sem deixar o peso bater.'),
  E('coice-polia', 'Coice na polia', 'gluteos', 'polia', false, 1, 'Caneleira no tornozelo, polia baixa. Leve a perna para trás estendendo o quadril sem arquear a lombar.'),
  E('passada', 'Passada caminhando', 'gluteos', 'halteres', true, 2, 'Com halteres nas mãos, dê passos longos à frente descendo o joelho de trás perto do chão.'),
  E('caminhada-lateral', 'Caminhada lateral com elástico', 'gluteos', 'elastico', false, 1, 'Elástico acima dos joelhos, semiagachado. Dê passos laterais mantendo a tensão no elástico.'),
  E('kettlebell-sumo', 'Agachamento sumô com kettlebell', 'gluteos', 'kettlebell', true, 1, 'Pés afastados e virados para fora. Agache segurando o kettlebell entre as pernas.'),

  // Panturrilha
  E('panturrilha-pe', 'Panturrilha em pé na máquina', 'panturrilha', 'maquina', false, 1, 'Ponta dos pés na plataforma. Suba o máximo, segure 1 s e desça alongando bem.'),
  E('panturrilha-sentado', 'Panturrilha sentado', 'panturrilha', 'maquina', false, 1, 'Apoio sobre os joelhos. Suba os calcanhares o máximo e desça devagar.'),
  E('panturrilha-leg', 'Panturrilha no leg press', 'panturrilha', 'maquina', false, 1, 'Ponta dos pés na borda da plataforma, joelhos estendidos. Empurre com os tornozelos.'),
  E('panturrilha-degrau', 'Panturrilha no degrau', 'panturrilha', 'corporal', false, 1, 'Ponta dos pés num degrau, segurando em algo para equilíbrio. Suba e desça com amplitude total.'),

  // Core
  E('prancha', 'Prancha', 'core', 'corporal', false, 1, 'Antebraços no chão, corpo reto da cabeça aos pés. Contraia abdômen e glúteos e segure.', true),
  E('prancha-lateral', 'Prancha lateral', 'core', 'corporal', false, 1, 'Apoiado em um antebraço, corpo de lado e em linha reta. Segure sem deixar o quadril cair. Troque o lado.', true),
  E('abdominal-supra', 'Abdominal supra', 'core', 'corporal', false, 1, 'Deitado, joelhos dobrados. Tire as escápulas do chão contraindo o abdômen, sem puxar o pescoço.'),
  E('elevacao-pernas', 'Elevação de pernas', 'core', 'corporal', false, 2, 'Deitado, pernas estendidas. Eleve até 90° e desça devagar sem tirar a lombar do chão.'),
  E('dead-bug', 'Dead bug', 'core', 'corporal', false, 1, 'Deitado, braços e joelhos para cima. Estenda braço e perna opostos devagar, lombar colada ao chão.'),
  E('abdominal-polia', 'Abdominal na polia', 'core', 'polia', false, 2, 'Ajoelhado com a corda atrás da cabeça. Flexione o tronco levando os cotovelos aos joelhos.'),
  E('giro-russo', 'Giro russo', 'core', 'corporal', false, 1, 'Sentado, tronco inclinado e pés no ar (ou apoiados). Gire o tronco de um lado para o outro.'),
  E('escalador', 'Escalador', 'core', 'corporal', false, 1, 'Em posição de flexão, traga os joelhos ao peito alternadamente em ritmo constante.'),
  E('pallof', 'Pallof press', 'core', 'polia', false, 2, 'De lado para a polia, segure a pegada no peito e estenda os braços à frente sem deixar o tronco girar.'),
  E('roda-abdominal', 'Roda abdominal', 'core', 'corporal', false, 3, 'Ajoelhado, role a roda à frente até onde conseguir sem arquear a lombar e volte.'),

  // Cardio (a duração vem do checkin)
  E('esteira-inclinada', 'Caminhada inclinada na esteira', 'cardio', 'maquina', false, 1, 'Inclinação de 8–12% e velocidade em que dá para conversar. Evite se segurar no apoio.'),
  E('esteira-corrida', 'Corrida na esteira', 'cardio', 'maquina', false, 1, 'Comece caminhando 2 min, depois suba para um trote confortável. Passadas curtas e postura alta.'),
  E('bike', 'Bicicleta ergométrica', 'cardio', 'maquina', false, 1, 'Banco na altura do quadril, joelho quase estendido embaixo. Ajuste a carga para manter umas 80–90 pedaladas por minuto.'),
  E('eliptico', 'Elíptico (transport)', 'cardio', 'maquina', false, 1, 'Postura ereta, use os braços junto com as pernas. Aumente a resistência em vez de só a velocidade.'),
  E('escada', 'Simulador de escada', 'cardio', 'maquina', false, 2, 'Pise com o pé inteiro em cada degrau e apoie as mãos só de leve no corrimão.'),
  E('remo', 'Remo ergômetro', 'cardio', 'maquina', false, 2, 'Empurre primeiro com as pernas, depois incline o tronco e puxe com os braços. Volte na ordem inversa.'),
  E('corrida-rua', 'Corrida ou caminhada ao ar livre', 'cardio', 'corporal', false, 1, 'Alterne trote e caminhada se precisar. O importante é manter o tempo em movimento.'),
  E('pular-corda', 'Pular corda', 'cardio', 'corporal', false, 2, 'Saltos baixos na ponta dos pés, girando a corda com os punhos. Descanse caminhando quando precisar.'),
  E('circuito-aerobico', 'Circuito aeróbico', 'cardio', 'corporal', false, 1, 'Alterne 40 s de polichinelo, corrida parada e agachamento com 20 s de pausa, sem parar até o fim do tempo.'),
  { id: 'caminhada-academia', nome: 'Caminhada até a academia', grupo: 'cardio', equip: 'corporal', composto: false, nivel: 1, extra: true, instrucoes: 'Ida e volta a pé. Passo firme, em ritmo de quem está com um pouco de pressa.' },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
