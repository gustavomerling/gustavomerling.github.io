import DsSection from '@/components/design-system/DsSection'

const PILLARS = [
  {
    title: '1. Apaixonado e Vibrante',
    faca: '"Preparem a voz: o Paramore acaba de subir ao palco em São Paulo abrindo com Running Out Of Time!"',
    evite: '"Banda entra no palco e toca música nova."',
  },
  {
    title: '2. Confiável e Preciso',
    faca: '"A Billboard confirmou hoje em entrevista que o trio está gravando de forma independente."',
    evite: '"BOMBA: Paramore pode ter assinado com gravadora secreta!"',
  },
  {
    title: '3. Inclusivo e Acolhedor',
    faca: '"Se você está ouvindo Brand New Eyes pela primeira vez hoje, separamos 5 detalhes que tornam esse álbum lendário."',
    evite: '"Fãs raiz sabem que os novos fãs só conhecem Misery Business..."',
  },
  {
    title: '4. Fiel e Expressivo',
    faca: 'Preservar a cadência e as nuances das letras e declarações de Hayley.',
    evite: 'Tradução literal robótica sem revisão contextual.',
  },
]

const CHANNELS = [
  ['Portal / Artigos', 'Jornalístico-cultural, analítico e detalhado — a enciclopédia definitiva.'],
  ['X (Twitter)', 'Cobertura em tempo real: [SHOW], [SETLIST] e threads limpas com mídia boa.'],
  ['Instagram & Threads', 'Visual e emocional; carrosséis com tipografia forte das eras.'],
  ['TikTok & Reels', 'Curto e musical: teorias de letras, vocais isolados e viradas de bateria.'],
  ['Comunidade & Discord', 'Amigável, colaborativo, seguro. Tolerância zero a qualquer assédio.'],
] as const

const ETHICS = [
  'Privacidade: não cobrimos a vida íntima, paparazzi em momentos privados ou especulações sobre saúde dos integrantes. Foco em arte, shows, música, ativismo e projetos oficiais.',
  'Fake news: rumores só viram notícia após confirmação com produtores oficiais. Enquanto for boato: "entenda o que há de real até o momento".',
  'Ex-integrantes: rigor histórico e respeito profissional, sem guerras de fãs com formações passadas.',
]

const GLOSSARY = [
  ['Paramore Brasil', 'Com "B" maiúsculo, sem hífen. Abreviação: PBR.'],
  ['Paramore', 'Nome singular: "O Paramore anunciou...", nunca "Os Paramore..."'],
  ['Paralovers', 'Termo preferido para a comunidade contemporânea.'],
  ['A Tríade / Trio', 'Hayley (vocal), Taylor (guitarra/produção), Zac (bateria).'],
  ['Setlist', 'Lista de músicas de um concerto — evite "repertório musical".'],
  ['halfnoise', 'Projeto musical e cinematográfico de Zac Farro.'],
  ['Petals for Armor', 'Álbum solo de Hayley Williams (também Flowers for Vases).'],
  ['Good Dye Young (GDY)', 'Marca vegana de coloração capilar de Hayley.'],
]

export default function DsVoice() {
  return (
    <DsSection id="tom-de-voz" index="08" label="Comunicação" title="Manual de tom de voz e comunicação">
      <div className="grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-lg border border-line-1 bg-surface-1 p-5">
            <h3 className="font-display text-base font-bold text-content-primary">{p.title}</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-md border border-status-success/30 bg-status-success/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-status-success">Faça</p>
                <p className="mt-1 text-content-secondary">{p.faca}</p>
              </div>
              <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-status-danger">Evite</p>
                <p className="mt-1 text-content-muted line-through decoration-status-danger/60">{p.evite}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt-10 mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
        Adaptação por canal
      </h3>
      <div className="overflow-hidden rounded-lg border border-line-1 bg-surface-1">
        {CHANNELS.map(([canal, desc]) => (
          <div key={canal} className="flex flex-col gap-1 border-b border-line-1 px-5 py-4 last:border-0 sm:flex-row sm:items-baseline sm:gap-6">
            <p className="w-44 shrink-0 font-semibold text-content-primary">{canal}</p>
            <p className="text-sm text-content-secondary">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
            Ética e cobertura responsável
          </h3>
          <ul className="space-y-3">
            {ETHICS.map((e, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-line-1 bg-surface-1 p-4 text-sm text-content-secondary">
                <span className="font-mono text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
            Glossário oficial
          </h3>
          <div className="overflow-hidden rounded-lg border border-line-1 bg-surface-1">
            {GLOSSARY.map(([term, def]) => (
              <div key={term} className="flex flex-col gap-0.5 border-b border-line-1 px-5 py-3 last:border-0 sm:flex-row sm:gap-4">
                <p className="w-44 shrink-0 font-semibold text-content-primary">{term}</p>
                <p className="text-sm text-content-secondary">{def}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DsSection>
  )
}