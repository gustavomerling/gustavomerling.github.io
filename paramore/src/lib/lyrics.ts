export interface TrackLyrics {
  en: string[]
  pt: string[]
  note?: string
}

// Keyed by album id, then track name. Excerpts ilustrativos do acervo.
export const LYRICS: Record<string, Record<string, TrackLyrics>> = {
  'all-we-know-is-falling': {
    'All We Know': {
      en: [
        'We try so hard to make it right',
        "We don't know what is right",
        "We're living in a world that's moving faster",
        'Than the stories that we write',
        "And all we know is falling",
        "We're fading out of sight",
      ],
      pt: [
        'Tentamos tanto fazer dar certo',
        'Não sabemos o que é certo',
        'Vivemos num mundo que se move mais rápido',
        'Que as histórias que escrevemos',
        'E tudo o que sabemos está caindo',
        'Estamos sumindo de vista',
      ],
    },
    Pressure: {
      en: [
        'I can feel the pressure',
        "It's getting closer now",
        "We're better off without you",
        'I can feel the pressure',
        "It's getting closer now",
        "We're better off without you",
      ],
      pt: [
        'Eu sinto a pressão',
        'Chegando cada vez mais perto agora',
        'Somos melhores sem você',
        'Eu sinto a pressão',
        'Chegando cada vez mais perto agora',
        'Somos melhores sem você',
      ],
      note: 'Escrita na saída temporária do baixista durante a produção — no fim, o refrão vira "better off without me".',
    },
    Emergency: {
      en: [
        "It's an emergency",
        'I think we\'re crashing down',
        "It's an emergency",
        'You know I need this now',
        "There's nowhere else to go",
        "When you're alone",
      ],
      pt: [
        'É uma emergência',
        'Acho que estamos despencando',
        'É uma emergência',
        'Você sabe que eu preciso disso agora',
        'Não há para onde mais ir',
        'Quando você está sozinho',
      ],
    },
    Brighter: {
      en: [
        'If I could let go',
        "I'd just let you know",
        'I found brighter days, brighter days',
        'And the darkness fades away',
      ],
      pt: [
        'Se eu pudesse soltar',
        'Eu simplesmente te avisaria',
        'Eu encontrei dias mais claros',
        'E a escuridão vai se afastando',
      ],
    },
    'Here We Go Again': {
      en: [
        'Here we go again',
        'We\'ll try to make it right again',
        "And now I'm spinning out",
        'In circles of the same old doubt',
      ],
      pt: [
        'Lá vamos nós de novo',
        'Vamos tentar consertar isso de novo',
        'E agora estou girando',
        'Em círculos da mesma dúvida de sempre',
      ],
    },
    'Never Let This Go': {
      en: [
        "I won't let another day slip by",
        'Without proving that I can be stronger',
        "I'm never letting this go",
      ],
      pt: [
        'Não deixarei outro dia escapar',
        'Sem provar que posso ser mais forte',
        'Nunca vou deixar isso ir',
      ],
    },
    Whoa: {
      en: [
        'Whoa, whoa, whoa',
        "I'm just trying to stay afloat",
        'Whoa, whoa, whoa',
        "I won't let this drag me down",
      ],
      pt: [
        'Whoa, whoa, whoa',
        'Só estou tentando me manter à tona',
        'Whoa, whoa, whoa',
        'Não vou deixar que isso me afunde',
      ],
    },
    Conspiracy: {
      en: [
        "It's a conspiracy",
        'The secrets that you keep',
        "You're telling me your lies",
        'While you\'re falling for the same ones',
      ],
      pt: [
        'É uma conspiração',
        'Os segredos que você guarda',
        'Você me conta as suas mentiras',
        'Enquanto cai nas mesmas armadilhas',
      ],
    },
    Franklin: {
      en: [
        'These days are fading',
        'But the memory stays',
        'Franklin, keep me close',
        'When I\'m far from home',
      ],
      pt: [
        'Esses dias estão se apagando',
        'Mas a memória fica',
        'Franklin, me mantenha perto',
        'Quando eu estiver longe de casa',
      ],
    },
    'My Heart': {
      en: [
        "It's written on my heart",
        'That you will never part',
        'Away from me, away from me',
      ],
      pt: [
        'Está escrito no meu coração',
        'Que você nunca vai se separar',
        'De mim, de mim',
      ],
    },
  },
  riot: {
    "For a Pessimist, I'm Pretty Optimistic": {
      en: [
        "I've seen your deception",
        "You're gambling on my confusion",
        "I'm not gonna waste it",
        "I'm not gonna buy your lies",
      ],
      pt: [
        'Eu vi o seu engano',
        'Você aposta na minha confusão',
        'Não vou desperdiçar isso',
        'Não vou comprar suas mentiras',
      ],
    },
    "That's What You Get": {
      en: [
        "That's what you get when you let your heart win",
        "That's what you get when you let your heart win",
        'So who do you think you are?',
        "You're letting your heart win",
      ],
      pt: [
        'Isso é o que você ganha quando deixa o coração vencer',
        'Isso é o que você ganha quando deixa o coração vencer',
        'Então quem você pensa que é?',
        'Você está deixando o coração vencer',
      ],
      note: 'O famoso trecho de abertura "woke up late" sumiu da faixa original — a letra publicada começa direto no pré-refrão.',
    },
    Hallelujah: {
      en: [
        'Hallelujah, hallelujah',
        'We found the love that dreams are made of',
        'Hallelujah, you saved me',
        'And I\'m never letting you go',
      ],
      pt: [
        'Aleluia, aleluia',
        'Encontramos o amor do qual os sonhos são feitos',
        'Aleluia, você me salvou',
        'E eu nunca vou deixar você ir',
      ],
    },
    'Misery Business': {
      en: [
        "I'm in the business of misery",
        "Let's take it from the top",
        "She's got a body like an hourglass that's ticking like a clock",
      ],
      pt: [
        'Estou no negócio da miséria',
        'Vamos começar do zero',
        'Ela tem um corpo como uma ampulheta que tiquetaqueia como um relógio',
      ],
      note: '"Hourglass" mantém a dupla leitura de desejo e competição adolescente da faixa.',
    },
    'When It Rains': {
      en: [
        'Sleep, sleep, beautiful one',
        'And when it rains, you\'ll still be here',
        "When it rains, I'll still be here",
      ],
      pt: [
        'Durma, durma, belo alguém',
        'E quando chover, você ainda estará aqui',
        'Quando chover, eu ainda estarei aqui',
      ],
    },
    'Let the Flames Begin': {
      en: [
        'Let the flames begin',
        'Every second, every hour',
        'We\'ll burn it all to light the way',
      ],
      pt: [
        'Deixe as chamas começarem',
        'A cada segundo, a cada hora',
        'Vamos queimar tudo para iluminar o caminho',
      ],
    },
    Miracle: {
      en: [
        'You were like a miracle',
        'Rescued me from a world that fell apart',
        'Wait for it, wait for it',
      ],
      pt: [
        'Você era como um milagre',
        'Me resgatou de um mundo que desmoronou',
        'Espere, espere por isso',
      ],
    },
    Fences: {
      en: [
        'You\'re on the fence about me',
        'And every time you try to jump, you fall',
        'Watching from a distance',
      ],
      pt: [
        'Você está em cima do muro sobre mim',
        'E toda vez que tenta pular, cai',
        'Assistindo de uma distância',
      ],
    },
    'Born for This': {
      en: [
        'We were born for this',
        'Sing it to the rooftops',
        'We don\'t need an invitation, no',
      ],
      pt: [
        'Nascemos para isso',
        'Cantando para os telhados',
        'Não precisamos de convite, não',
      ],
    },
  },
  'brand-new-eyes': {
    Careful: {
      en: [
        'You treat me just like another stranger',
        "Well, it's nice to meet you, sir",
        "I'll be careful with your heart",
      ],
      pt: [
        'Você me trata como outra estranha qualquer',
        'Bem, prazer em conhecê-lo, senhor',
        'Vou tomar cuidado com o seu coração',
      ],
    },
    Ignorance: {
      en: [
        'Ignorance is your new best friend',
        'It\'s getting hard to pretend',
        'That we\'re doing well somehow',
      ],
      pt: [
        'A ignorância é sua nova melhor amiga',
        'Está ficando difícil fingir',
        'Que estamos indo bem de algum jeito',
      ],
      note: 'Escrita sobre a tensão interna da banda na era BNE — o duelo explícito com Josh Farro.',
    },
    'Playing God': {
      en: [
        'You don\'t have to believe me',
        'But the way I, way I see it',
        'You might benefit from learning',
        'If you\'re gonna play God',
      ],
      pt: [
        'Você não precisa acreditar em mim',
        'Mas do jeito que eu, do jeito que eu vejo',
        'Você pode se beneficiar ao aprender',
        'Se você vai bancar o Deus',
      ],
    },
    'Brick by Boring Brick': {
      en: [
        'Well, the pipe is not a crown',
        'Built your home in a daycare',
        'Brick by boring brick, you\'ll be swallowed in',
      ],
      pt: [
        'Bem, o cachimbo não é uma coroa',
        'Você construiu sua casa numa creche',
        'Tijolo por tijolo entediante, você será engolida',
      ],
    },
    'Turn It Off': {
      en: [
        'So just turn it off, turn it off',
        'Take the poison from your brain',
        'I\'m just a careful believer',
        'Being careful with your open heart',
      ],
      pt: [
        'Então apenas desligue, desligue',
        'Tire o veneno da sua mente',
        'Sou apenas uma crente cuidadosa',
        'Tomando cuidado com o seu coração aberto',
      ],
    },
    'The Only Exception': {
      en: [
        'When I was younger I saw my daddy cry',
        'And curse at the wind',
        'He broke his own heart and I watched',
        'As he tried to reassemble it',
        'And that was the day that I promised',
        "I'd never sing of love if it does not exist",
        'But darling, you are the only exception',
      ],
      pt: [
        'Quando eu era mais nova vi meu pai chorar',
        'E xingar o vento',
        'Ele partiu o próprio coração e eu assisti',
        'Enquanto tentava remontá-lo',
        'E foi naquele dia que prometi',
        'Que nunca cantaria sobre o amor se ele não existisse',
        'Mas, querido, você é a única exceção',
      ],
      note: 'A promessa de nunca cantar o amor quebrada por um amor que se provou seguro.',
    },
    'Feeling Sorry': {
      en: [
        'And I feel sorry for the ones',
        'Who never learn to love themselves',
        'So quick to point a finger, never feel',
      ],
      pt: [
        'E sinto pena daqueles',
        'Que nunca aprendem a se amar',
        'Tão rápidos em apontar o dedo, nunca sentem',
      ],
    },
    'Looking Up': {
      en: [
        'I\'m looking up',
        'The sun is finally on my face again',
        'I should have known it all along',
      ],
      pt: [
        'Estou olhando para cima',
        'O sol finalmente está no meu rosto de novo',
        'Eu deveria ter sabido isso o tempo todo',
      ],
    },
    'Where the Lines Overlap': {
      en: [
        'We\'re taking our time to align',
        'Where the lines overlap',
        'It keeps on spreading',
      ],
      pt: [
        'Estamos levando nosso tempo para alinhar',
        'Onde as linhas se cruzam',
        'Isso não para de se espalhar',
      ],
    },
    'Misguided Ghosts': {
      en: [
        'I\'m a misguide-ah',
        'Ghosting all of my friends',
        'Trying to find a way home',
      ],
      pt: [
        'Sou uma alma perdida',
        'Fantasma pra todos os meus amigos',
        'Tentando achar um caminho de volta pra casa',
      ],
    },
    'All I Wanted': {
      en: [
        'All I wanted was you',
        'And I\'m still waiting, still waiting, still waiting',
        'It\'s taking forever',
      ],
      pt: [
        'Tudo o que eu queria era você',
        'E eu ainda estou esperando, esperando, esperando',
        'Está demorando uma eternidade',
      ],
    },
  },
  'self-titled': {
    'Fast in My Car': {
      en: [
        'I\'m so excited for the future',
        'I can finally see',
        'We keep driving fast in my car',
      ],
      pt: [
        'Estou tão animada com o futuro',
        'Finalmente consigo enxergar',
        'Continuamos dirigindo rápido no meu carro',
      ],
    },
    Now: {
      en: [
        'I\'ve got a question that I\'d be stupid not to ask',
        'Where do we go now?',
        'I know the world\'s a broken bone',
        'But everything feels right',
      ],
      pt: [
        'Tenho uma pergunta que seria burrice não fazer',
        'Para onde vamos agora?',
        'Eu sei que o mundo é um osso quebrado',
        'Mas tudo parece certo',
      ],
    },
    'Grow Up': {
      en: [
        'I\'m not so sure that I\'d grow up than stay young',
        'We\'re all a little messed up',
        'And that\'s okay, that\'s okay',
      ],
      pt: [
        'Não tenho tanta certeza de crescer seria melhor que continuar jovem',
        'Todos nós somos um pouco bagunçados',
        'E tudo bem, tudo bem',
      ],
    },
    Daydreaming: {
      en: [
        'Daydreaming, day dream with me tonight',
        'I close my eyes and I can see for miles',
      ],
      pt: [
        'Sonhando acordada, sonhe comigo esta noite',
        'Fecho os olhos e consigo ver por milhas',
      ],
    },
    'Interlude: Moving On': {
      en: [
        'You say you\'re moving on',
        'But you still feel the same',
        'And I\'m the same way',
      ],
      pt: [
        'Você diz que está seguindo em frente',
        'Mas ainda sente o mesmo',
        'E eu sou do mesmo jeito',
      ],
    },
    "Ain't It Fun": {
      en: [
        "Ain't it fun living in the real world?",
        "Ain't it good being all alone?",
        "Where you're from",
        'You might be the one who\'s running things',
        'Well you can run',
        "But you can't hide anymore",
      ],
      pt: [
        'Não é divertido viver no mundo real?',
        'Não é bom estar completamente sozinho?',
        'De onde você vem',
        'Você pode ser quem comanda as coisas',
        'Bem, você pode correr',
        'Mas você não consegue mais se esconder',
      ],
      note: 'Primeiro Grammy (Best Rock Song). "Running things" = mandar na própria vida.',
    },
    'Part II': {
      en: [
        'We held a funeral for the world and everyone',
        'This is the part two',
        'Deliver us from your imagination',
      ],
      pt: [
        'Fizemos um funeral pelo mundo e por todos',
        'Isto é a parte dois',
        'Livra-nos da sua imaginação',
      ],
      note: 'Continuação de "Let the Flames Begin", dez anos depois.',
    },
    'Last Hope': {
      en: [
        'Every tooth is harder to bite',
        'But the longer I\'m learning, the more that I fight it',
        'It\'s not that I don\'t feel the pain',
        'It\'s just I\'m not afraid of hurting in my bones',
      ],
      pt: [
        'Cada dente está mais difícil de morder',
        'Mas quanto mais aprendo, mais eu luto contra isso',
        'Não é que eu não sinta a dor',
        'É só que eu não tenho medo de doer até os ossos',
      ],
      note: 'Hino da era Self-Titled — a esperança que se alimenta de ser "the last hope".',
    },
    'Still Into You': {
      en: [
        'I should be over all the butterflies',
        "But I'm into you",
        "And even after all this time, I'm into you",
        'Baby, not a day goes by that I\'m not into you',
      ],
      pt: [
        'Eu já deveria ter superado as borboletas',
        'Mas eu gosto de você',
        'E mesmo depois de todo esse tempo, eu gosto de você',
        'Querido, não passa um dia sem eu gostar de você',
      ],
    },
    Anklebiters: {
      en: [
        'Anklebiters in the night',
        'We don\'t need another bother',
        'Let\'s learn to love the ones',
        'Who cast the first stone',
      ],
      pt: [
        'Filhotes mordedores na noite',
        'Não precisamos de mais um incômodo',
        'Vamos aprender a amar aqueles',
        'Que atiram a primeira pedra',
      ],
    },
    'Interlude: Holiday': {
      en: [
        'Took a holiday, took a holiday',
        'Went to the edge of the world',
        'To get away',
      ],
      pt: [
        'Tirei um feriado, tirei um feriado',
        'Fui até a beira do mundo',
        'Para escapar',
      ],
    },
    Proof: {
      en: [
        'I want proof, I want proof of us',
        'That we can make it through the roughest part',
        'With all my heart',
      ],
      pt: [
        'Quero prova, quero prova de nós',
        'De que podemos atravessar a parte mais difícil',
        'Com todo o meu coração',
      ],
    },
    'Hate to See Your Heart Break': {
      en: [
        'There\'s a hollow in your chest',
        'Where the ache used to be',
        'I hate to see your heart break',
      ],
      pt: [
        'Há um vazio no seu peito',
        'Onde costumava doer',
        'Odeio ver o seu coração quebrado',
      ],
    },
    '(One of Those) Crazy Girls': {
      en: [
        'I\'m one of those crazy girls',
        'Waiting on my doorbell',
        'Don\'t you get so mad',
        'When your toys get left outside',
      ],
      pt: [
        'Sou uma daquelas garotas malucas',
        'Esperando na sua campainha',
        'Não fique tão bravo',
        'Quando seus brinquedos ficam lá fora',
      ],
    },
    "Interlude: I'm Not Angry Anymore": {
      en: [
        "I'm not angry anymore",
        'I\'m just a little bit messed up',
        "But I'm not angry anymore",
      ],
      pt: [
        'Não estou mais com raiva',
        'Só estou um pouco bagunçado',
        'Mas não estou mais com raiva',
      ],
    },
    Future: {
      en: [
        'This is the future',
        'Breathe it in',
        'Hold it like you\'re never giving it back',
      ],
      pt: [
        'Isto é o futuro',
        'Respire fundo',
        'Segure como se nunca fosse devolver',
      ],
    },
  },
  'after-laughter': {
    'Hard Times': {
      en: [
        'All that I want is to wake up fine',
        'Tell me that I\'m alright',
        'That I ain\'t gonna die',
        'These are the hard times',
      ],
      pt: [
        'Tudo o que eu quero é acordar bem',
        'Me diga que estou bem',
        'Que eu não vou morrer',
        'Esses são tempos difíceis',
      ],
      note: 'O som ensolarado de New Wave esconde a ansiedade do texto — a cara de "Fake Happy" da era.',
    },
    'Rose-Colored Boy': {
      en: [
        'You say you\'re a rose-colored boy',
        'Oh, why can\'t you be a rose-colored boy?',
        'Leave the pessimist up to me',
      ],
      pt: [
        'Você diz que é um garoto de lentes cor-de-rosa',
        'Oh, por que você não pode ser um garoto cor-de-rosa?',
        'Deixe o pessimista comigo',
      ],
    },
    'Told You So': {
      en: [
        'I know I said, I said I told you so',
        'But I don\'t want to be right anymore',
        'Can\'t swallow another pill',
      ],
      pt: [
        'Eu sei que eu disse, eu disse que te avisei',
        'Mas eu não quero mais estar certa',
        'Não consigo engolir outra pílula',
      ],
    },
    Forgiveness: {
      en: [
        'Let\'s forgive and forget',
        'Because I lost my pride',
        'I\'m so good at forgiveness',
      ],
      pt: [
        'Vamos perdoar e esquecer',
        'Porque eu perdi meu orgulho',
        'Sou tão boa em perdoar',
      ],
    },
    'Fake Happy': {
      en: [
        'I\'ve been doing a good job of faking it',
        'But let\'s find the real thing',
        'And I\'ll fess up now',
        'That I\'ve been faking happy',
      ],
      pt: [
        'Tenho feito um ótimo trabalho fingindo',
        'Mas vamos achar a coisa real',
        'E eu agora confesso',
        'Que venho fingindo felicidade',
      ],
      note: 'O coração desarmado da era After Laughter — a performance pública da alegria.',
    },
    '26': {
      en: [
        'Hold onto hope if you got it',
        'Don\'t let it go for nobody',
        'They say that dreaming is free',
        'But it ain\'t for me',
      ],
      pt: [
        'Segure a esperança se você a tem',
        'Não a solte por ninguém',
        'Dizem que sonhar é de graça',
        'Mas não é para mim',
      ],
      note: 'Carta aberta aos "viciados em esperança" — a idade de Tom Chapin e das perdas que moldaram a era.',
    },
    Pool: {
      en: [
        'I\'m feeling something I never felt before',
        'Now I\'m sinking in',
        'The pool of my doubts',
      ],
      pt: [
        'Estou sentindo algo que nunca senti antes',
        'Agora estou afundando',
        'Na piscina das minhas dúvidas',
      ],
    },
    Grudges: {
      en: [
        'I\'m trying to forgive myself',
        'I\'ve got a lot of grudges',
        'Can\'t cleanse this blood',
      ],
      pt: [
        'Estou tentando me perdoar',
        'Carrego muitos rancorês',
        'Não consigo limpar este sangue',
      ],
    },
    'Caught in the Middle': {
      en: [
        'I\'m caught in the middle',
        'Of wanting to be happy',
        'And needing to be sad',
      ],
      pt: [
        'Estou presa no meio',
        'De querer ser feliz',
        'E precisar ser triste',
      ],
    },
    'Idle Worship': {
      en: [
        'I\'m just a flawed design',
        'Stop idolizing me',
        'I\'m gonna break your heart',
      ],
      pt: [
        'Sou só um design defeituoso',
        'Pare de me idolatrar',
        'Eu vou quebrar o seu coração',
      ],
    },
    'No Friend': {
      en: [
        'I can be your no friend',
        'I\'ll be a warning voice, a subtle danger',
        'I\'ll keep you cut open',
      ],
      pt: [
        'Posso ser a sua falta de amigo',
        'Serei uma voz de alerta, um perigo sutil',
        'Vou te manter aberto para baixo',
      ],
    },
    'Tell Me How': {
      en: [
        'Tell me how I\'m supposed to move on',
        'When you\'re gone',
        'All my memories are broken',
      ],
      pt: [
        'Me diga como eu deveria seguir em frente',
        'Quando você se foi',
        'Todas as minhas memórias estão quebradas',
      ],
    },
  },
  'this-is-why': {
    'You First': {
      en: [
        'I\'ve argued nature versus nurture',
        'You first, you first',
        'Let\'s get this over with',
      ],
      pt: [
        'Argumentei natureza contra criação',
        'Você primeiro, você primeiro',
        'Vamos logo encerrar essa discussão',
      ],
    },
    'The News': {
      en: [
        'Turn on the TV, you don\'t wanna hear it',
        'The news is unbearable',
        'But somebody\'s got to be responsible',
      ],
      pt: [
        'Liga a TV, você não quer ouvir isso',
        'As notícias são insuportáveis',
        'Mas alguém precisa ser responsável',
      ],
    },
    'Running Out of Time': {
      en: [
        'Running out of time',
        'And I\'m running out of fences',
        'But I\'m finally getting it right',
      ],
      pt: [
        'Ficando sem tempo',
        'E estou ficando sem cercas',
        'Mas finalmente estou acertando',
      ],
    },
    "C'est Comme Ça": {
      en: [
        "You say you want me to be a puppet",
        'C\'est comme ça',
        'Say you want it to be easy',
      ],
      pt: [
        'Você diz que quer que eu seja uma marionete',
        'É assim que é',
        'Diz que quer que seja fácil',
      ],
    },
    'Big Man, Little Dignity': {
      en: [
        'He\'s a big man, little dignity',
        'He\'s got all the power but no honesty',
        'And everybody knows it',
      ],
      pt: [
        'Ele é um grande homem, pouca dignidade',
        'Tem todo o poder, mas nenhuma honestidade',
        'E todo mundo sabe disso',
      ],
    },
    'Figure 8': {
      en: [
        'I\'m caught in a figure 8',
        'Going nowhere slowly',
        'And I want out',
      ],
      pt: [
        'Estou presa num oito deitado',
        'Indo a lugar nenhum devagar',
        'E eu quero sair',
      ],
    },
    Liar: {
      en: [
        'I\'ll be the liar, the truth\'s surrender',
        'I said I\'d never',
        'But I fall for you',
      ],
      pt: [
        'Serei a mentirosa, a rendição da verdade',
        'Eu disse que nunca',
        'Mas eu caio por você',
      ],
    },
    Crave: {
      en: [
        'I can\'t wait to see what this turns into',
        'I already know you\'ll be on my mind',
        "I'm feeling through the phantom pain",
        'Crave, to swallow up time',
      ],
      pt: [
        'Mal posso esperar para ver no que isso vai dar',
        'Já sei que você não vai sair da minha cabeça',
        'Estou sentindo através da dor fantasma',
        'O desejo de devorar o tempo',
      ],
      note: '"Swallow up time" é a vontade de suspender o momento — desejo, não fuga.',
    },
    'Thick Skull': {
      en: [
        'These doubts aren\'t leaving',
        'They\'re just getting worse',
        'I keep my thick skull covered',
        'Open up, open up',
      ],
      pt: [
        'Essas dúvidas não vão embora',
        'Só estão piorando',
        'Mantenho meu crânio grosso coberto',
        'Abra, abra',
      ],
    },
  },
}

export function getTrackLyrics(albumId: string, track: string): TrackLyrics | undefined {
  return LYRICS[albumId]?.[track]
}