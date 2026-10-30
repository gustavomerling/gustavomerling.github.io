import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Ferramentas do editor, na ordem em que normalmente são usadas.
const TOOLS: [string, string][] = [
  ['Torso', 'Clique para criar juntas; arraste para criar uma junta ligada por um osso. Clique numa junta para ligar com a selecionada. Use diagonais para o torso não desmontar.'],
  ['Membro', 'Arraste a partir de uma junta do torso para desenhar uma perna ou braço. Arraste da ponta de um membro para continuar. Cada membro existe em dois exemplares: um na frente e um atrás (apagado).'],
  ['Subdividir', 'Clique num segmento de membro para criar uma junta no meio (joelho, tornozelo...).'],
  ['Rotacionar', 'Arraste uma junta de membro para girar o resto do membro e escolher para onde ele dobra.'],
  ['Pé', 'Clique numa junta para marcar ou desmarcar como pé (anel verde). Só os pés podem tocar o chão: joelho, torso ou cabeça encostando conta como queda no treino. Sem marcação, as pontas dos membros são os pés.'],
  ['Músculo', 'Clique em duas juntas para ligar com um músculo. Força e contração valem para os próximos músculos. Músculos de membro também existem nos dois exemplares.'],
]

const STEPS: [string, string][] = [
  ['Simular', 'Liga um cérebro aleatório para ver a criatura se mexer.'],
  ['Treinar', 'Evolui 60 cérebros por geração e mostra o melhor. A criatura ganha pontos andando para a direita e perde se cair, capotar (mais de 30°) ou gastar esforço demais.'],
  ['Aparência', 'Pele mostra o animal; Esqueleto mostra ossos e músculos (vermelho = contraído, azul = esticado).'],
  ['Frente e trás', 'Cada exemplar de membro tem o próprio sinal do cérebro, então as patas da frente e de trás podem alternar o passo.'],
  ['Terreno', 'Plano, morros, escada ou irregular. O treino evolui a criatura no terreno escolhido.'],
  ['Salvar', 'A criatura e o último cérebro treinado ficam salvos neste navegador: Simular usa esse cérebro e Treinar continua de onde parou (Recomeçar zera). Exportar baixa um JSON; Importar abre um salvo.'],
]

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative mb-2 grid gap-4 rounded-lg border bg-card p-4 text-sm sm:grid-cols-2">
      <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={onClose} aria-label="Fechar ajuda">
        <X />
      </Button>
      <dl className="grid content-start gap-1.5">
        <dt className="font-semibold">Montar a criatura</dt>
        {TOOLS.map(([name, text]) => (
          <dd key={name}>
            <strong>{name}:</strong> <span className="text-muted-foreground">{text}</span>
          </dd>
        ))}
        <dd className="text-muted-foreground">
          Atalhos: <kbd>1</kbd>–<kbd>6</kbd> ferramentas, <kbd>Ctrl</kbd>+<kbd>Z</kbd> desfaz, <kbd>S</kbd> simula,{' '}
          <kbd>T</kbd> treina, <kbd>Esc</kbd> cancela o membro em desenho.
        </dd>
      </dl>
      <dl className="grid content-start gap-1.5 pr-8">
        <dt className="font-semibold">Ver aprender</dt>
        {STEPS.map(([name, text]) => (
          <dd key={name}>
            <strong>{name}:</strong> <span className="text-muted-foreground">{text}</span>
          </dd>
        ))}
      </dl>
    </div>
  )
}
