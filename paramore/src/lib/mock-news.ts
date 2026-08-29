import bandHero from '@/assets/a-banda/band-o2-2023.jpg'
import hayleyPhoto from '@/assets/a-banda/hayley.jpg'
import taylorPhoto from '@/assets/a-banda/taylor.jpg'
import zacPhoto from '@/assets/a-banda/zac.jpg'
import rupturaRio from '@/assets/a-banda/ruptura-rio-2011.jpg'

export interface NewsItem {
  title: string
  excerpt: string
  body: string[]
  date: string
  category: string
  readTime: string
  tag: string
  image: string
  slug: string
}

export const NEWS: NewsItem[] = [
  {
    title: 'Paramore confirma gravações em estúdio para novo projeto',
    excerpt:
      'O trio se reuniu em Nashville para trabalhar nas primeiras faixas do que pode ser o sexto álbum de estúdio da banda.',
    body: [
      'Por mais que tenha sido uma edição de fã-clube descobrir os registros de estúdio na agenda da banda, desta vez foi a própria banda quem trouxe a confirmação: Paramore está em um estúdio de Nashville gravando as primeiras faixas de um projeto inédito.',
      'A sessão reuniu Hayley Williams, Taylor York e Zac Farro com o produtor Carlos de la Garza, parceiro de longa data do trio em After Laughter e This Is Why. Pelos bastidores compartilhados nas redes, a vibe é a mesma de sempre: violões, teclados analógicos e uma bateria que Zac insiste em registrar em fita.',
      'Não há data de lançamento, título ou tracklist. Fontes próximas à equipe dizem que a banda está "sem pressa, mas muito animada" — e que as novas canções seguem a linha de This Is Why, com mais sintetizadores e letras pessoais.',
      'O fã-clube brasileiro já pode marcar o calendário: se tudo correr como planejado, as primeiras novidades devem chegar ainda neste ciclo de turnê.',
    ],
    date: '28 de agosto de 2026',
    category: 'Lançamentos',
    readTime: '4 min',
    tag: 'TURNÊ 2026',
    image: bandHero,
    slug: 'novo-projeto-estudio',
  },
  {
    title: 'Hayley Williams regrava CEILING, do Turnstile, em NEVERTHELESS: VERSIONS',
    excerpt:
      'A versão "reimaginada" do álbum NEVER ENOUGH foi lançada em todas as plataformas digitais com a voz de Hayley.',
    body: [
      'O projeto NEVERTHELESS: VERSIONS trouxe convidados para reinterpretar faixas de NEVER ENOUGH, do Turnstile, e a versão de Hayley Williams para CEILING chegou às plataformas na madrugada de sexta-feira.',
      'Na releitura, Hayley troca a fúria hardcore original por um andamento mais lento e dramático, com pianos e vocais em camadas — um registro que os fãs mais atentos reconhecem como uma antipa preferida das sessões solo da fase Petals for Armor.',
      '"CEILING sempre me pegou pela letra — é sobre exaurir o ressentimento até sobrar só o alívio", comentou Hayley em um story, sem dar mais contexto. Como de costume, é a gente quem digere as camadas.',
      'A faixa já está disponível no Spotify, Apple Music e demais serviços. Para o Brasil, ainda não há previsão de versão física.',
    ],
    date: '28 de agosto de 2026',
    category: 'Hayley',
    readTime: '3 min',
    tag: 'LANÇAMENTO',
    image: hayleyPhoto,
    slug: 'hayley-regrava-ceiling',
  },
  {
    title: 'Zac Farro produz novo single de Liam Kazar, "Brain Dry"',
    excerpt:
      'O baterista do Paramore produziu e tocou no novo single do artista, lançado pela Congrats Records.',
    body: [
      'A Congrats Records segue firme como casa dos sons preferidos da própria banda: desta vez quem ganha o selo da nossa atenção é o single Brain Dry, de Liam Kazar, produzido e tocado por Zac Farro.',
      'A faixa tem exatamente o DNA que o fã de Zac aprendeu a amar: baixo melódico, bateria com pegada retroativa dos anos 70 e uma camada de teclado que soa meio halfnoise, meio power pop clássico.',
      '"Eu chamo isso de disco de verão para o outono", brincou Zac nas redes, num post com o take gravado no estúdio de casa. Liam Kazar, que já circulou pelo circuito de Chicago, encontrou em Zac um parceiro de estúdio e de gosto musical apurado.',
      'Brain Dry já está em todas as plataformas digitais, e há rumores de mais colaborações saída da Congrats neste semestre.',
    ],
    date: '27 de agosto de 2026',
    category: 'Zac',
    readTime: '3 min',
    tag: 'PRODUÇÃO',
    image: zacPhoto,
    slug: 'zac-produz-liam-kazar',
  },
  {
    title: 'Hayley Williams lança série de pop-up shops de tatuagem com a The Ally Coalition',
    excerpt:
      'A série celebra o início da turnê solo de Hayley e convida tatuadores do mundo todo — inclusive brasileiros.',
    body: [
      'Ativismo, arte e música em um só movimento: Hayley Williams anuncia uma série de pop-up shops de tatuagem em parceria com a The Ally Coalition, organização sem fins lucrativos fundada por lendas do pop-punk para apoiar jovens LGBTQIA+.',
      'A ideia é simples e bonita: em cada cidade da turnê solo, um estúdio recebe tatuadores locais para desenhar símbolos da série "sim/sim/não" — grafismos que Hayley usa desde os tempos de ri/double dare. Parte da renda vai para a organização.',
      'E o Brasil não ficou de fora: a lista de cidades incluía São Paulo e Rio de Janeiro, com nomes de tatuadores brasileiros já confirmados no calendário.',
      '"Tatuagem é história contada na pele", escreveu Hayley. "Não conheço melhor maneira de celebrar uma turnê do que deixar um pedaço dela com quem vier cantar comigo."',
    ],
    date: '27 de agosto de 2026',
    category: 'Hayley',
    readTime: '5 min',
    tag: 'ATIVISMO',
    image: hayleyPhoto,
    slug: 'hayley-tatuagens-ally-coalition',
  },
  {
    title: 'Paramore no Allianz Parque: tudo o que se sabe sobre a passagem pelo Brasil',
    excerpt:
      'Datas, ingressos e a expectativa do público brasileiro para o show em São Paulo. Reunimos o que há de real até agora.',
    body: [
      'Depois de anos de espera, o retorno do Paramore ao Brasil: a passagem pelo Allianz Parque, em São Paulo, aparece bloqueada na agenda da turnê mundial da banda desde o início do ano.',
      'A informação que circula entre produtoras é de que o show deve marcar a volta da turnê de This Is Why à América do Sul, com uma setlist dedicada a 20 anos de carreira — do sofá vermelho de All We Know Is Falling às faixas novas.',
      'Os ingressos ainda não foram colocados à venda oficialmente, mas o público já organiza caravanas de todo o país. O nosso rastreador de agenda (disponível na página de Shows & Turnê) vai monitorar cada atualização.',
      'Até lá, vale registrar: a última vez que a banda esteve no Brasil, o grito da plateia quase cobriu o som. Desta vez, prometemos cobrir de verdade.',
    ],
    date: '21 de agosto de 2026',
    category: 'Shows',
    readTime: '6 min',
    tag: 'BRASIL',
    image: rupturaRio,
    slug: 'show-allianz-parque',
  },
  {
    title: 'Taylor York fala sobre produção e o futuro do som do Paramore',
    excerpt:
      'Em entrevista, o guitarrista reflete sobre a independência artística do trio e a liberdade criativa conquistada.',
    body: [
      'Taylor York não costuma dar entrevistas longas. Quando dá, é porque tem algo a dizer — e o papo com a imprensa independente sobre produção de discos rendeu uma aula.',
      'Falando sobre o processo de This Is Why, Taylor detalhou como a banda hoje entra em estúdio praticamente sem roteiro: "a gente grava a casa, depois o caos, depois o que sobrar de senso de humor".',
      'Ele também comentou a liberdade conquistada após anos de contrato: "ter controle sobre o próprio som é o maior prêmio que a gente pode ter. A gente faz música que quero ouvir quando estiver no carro — a parte boa é que o público gosta de ouvir junto."',
      'Para o futuro, Taylor não confirma nada — mas deixou no ar que há "coisas novas chegando" e que o fôlego criativo do trio nunca esteve tão alto.',
    ],
    date: '19 de agosto de 2026',
    category: 'Taylor',
    readTime: '7 min',
    tag: 'ENTREVISTA',
    image: taylorPhoto,
    slug: 'taylor-entrevista-futuro',
  },
]

export function getNewsBySlug(slug: string): NewsItem | undefined {
  return NEWS.find((n) => n.slug === slug)
}