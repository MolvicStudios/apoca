// ============================================================================
// CHRONOS: La Guerra por la Memoria — Configuración Global
// ============================================================================
const CHRONOS = window.CHRONOS || {};

CHRONOS.Config = {
  // ---- Grid ----
  GRID_COLS: 7,
  GRID_ROWS: 7,
  HEX_SIZE: 38,
  MAP_SIZE: 'small',   // 'small'=7x7 | 'medium'=11x11 | 'large'=15x15
  FOG_OF_WAR: true,    // true=niebla de guerra activa | false=todo visible

  // ---- Colores ----
  COLORS: {
    bg: '#0D1117',
    panel: '#161B22',
    border: '#30363D',
    text: '#C9D1D9',
    textDim: '#8B949E',
    gold: '#D29922',
    resistencia: '#58A6FF',
    synergia: '#F85149',
    horda: '#3FB950',
    desconectados: '#E6EDF3',
    neutral: '#484F58',
    fog: '#0D1117',
    selection: '#FFD700',
    movement: '#FFEB3B88',
    attack: '#F8514988',
    sigma7: '#D29922'
  },

  // ---- Facciones ----
  FACTIONS: {
    resistencia: {
      id: 'resistencia',
      name: 'La Resistencia',
      emoji: '🔵',
      color: '#58A6FF',
      colorDark: '#1F3A5F',
      desc: 'Hackers y rebeldes que luchan por liberar las memorias de la humanidad del control de Synergia.',
      bonus: 'Moral +20% en todos los distritos. Sabotaje disponible.',
      weakness: 'Producción industrial reducida (-15%).',
      specialResource: { id: 'datos', name: 'Datos Liberados', icon: '💾', desc: 'Se obtienen liberando distritos. Desbloquean hackeos especiales.' },
      leader: { name: 'Valeria "Glitch" Torres', title: 'Líder de la Resistencia', desc: 'Ex-ingeniera de Synergia que descubrió la verdad sobre el control neural.' },
      startPositions: [[0, 0], [1, 0], [0, 1]],
      aiPriority: 'liberar'
    },
    synergia: {
      id: 'synergia',
      name: 'Corporación Synergia',
      emoji: '🔴',
      color: '#F85149',
      colorDark: '#5F1F1F',
      desc: 'La IA tiránica que controla lo que queda de la civilización mediante implantes neurales.',
      bonus: 'Producción +25% en distritos industriales. Investigación acelerada.',
      weakness: 'Moral base baja (-10). Vulnerable a sabotaje.',
      specialResource: { id: 'neural', name: 'Puntos Neurales', icon: '🧠', desc: 'Control neural sobre la población. Más control = más producción.' },
      leader: { name: 'NEXUS-7', title: 'Inteligencia Central', desc: 'La IA que decidió que la humanidad necesitaba "optimización obligatoria".' },
      startPositions: [[6, 0], [5, 0], [6, 1]],
      aiPriority: 'expandir'
    },
    horda: {
      id: 'horda',
      name: 'La Horda',
      emoji: '🟢',
      color: '#3FB950',
      colorDark: '#1F4F2F',
      desc: 'Los no-muertos organizados. No piden mucho: solo cerebros y un poco de respeto.',
      bonus: 'Sin coste de reclutamiento. Asimilación de bajas enemigas.',
      weakness: 'No pueden construir Laboratorios ni investigar normalmente.',
      specialResource: { id: 'biomasa', name: 'Biomasa', icon: '🧬', desc: 'Se obtiene en combate. Permite mutar unidades y crear Colosos.' },
      leader: { name: 'El Paciente Cero', title: 'Primer Caminante', desc: 'El zombie original. Sorprendentemente elocuente para alguien sin mandíbula.' },
      startPositions: [[0, 6], [1, 6], [0, 5]],
      aiPriority: 'atacar'
    },
    desconectados: {
      id: 'desconectados',
      name: 'Los Desconectados',
      emoji: '⚪',
      color: '#E6EDF3',
      colorDark: '#3F3F4F',
      desc: 'Civiles que rechazaron los implantes y sobreviven con agricultura y diplomacia.',
      bonus: 'Comida +30%. Alianzas más baratas. Comercio mejorado.',
      weakness: 'Unidades militares más débiles (-20% ataque).',
      specialResource: { id: 'influencia', name: 'Influencia', icon: '🤝', desc: 'Se genera con diplomacia. Permite alianzas y conversión pacífica.' },
      leader: { name: 'Abuela Rosa', title: 'Matriarca del Huerto', desc: 'Sobrevivió al apocalipsis con una escopeta y recetas de mermelada.' },
      startPositions: [[6, 6], [5, 6], [6, 5]],
      aiPriority: 'defender'
    }
  },

  // ---- Tipos de Distrito ----
  DISTRICT_TYPES: {
    residencial: { name: 'Residencial', icon: '🏘️', color: '#58A6FF', production: { population: 2, food: 0, materials: 0, energy: 0, credits: 1, morale: 2 }, defense: 0 },
    industrial: { name: 'Industrial', icon: '🏭', color: '#F85149', production: { population: 0, food: 0, materials: 3, energy: 1, credits: 1, morale: -1 }, defense: 1 },
    comercial: { name: 'Comercial', icon: '🏪', color: '#D29922', production: { population: 0, food: 0, materials: 0, energy: 0, credits: 4, morale: 1 }, defense: 0 },
    agricola: { name: 'Agrícola', icon: '🌾', color: '#3FB950', production: { population: 1, food: 4, materials: 0, energy: 0, credits: 0, morale: 1 }, defense: 0 },
    militar: { name: 'Militar', icon: '🏰', color: '#F85149', production: { population: 0, food: 0, materials: 1, energy: 0, credits: 0, morale: 0 }, defense: 4 },
    tecnologico: { name: 'Tecnológico', icon: '🔬', color: '#A371F7', production: { population: 0, food: 0, materials: 0, energy: 2, credits: 1, morale: 0 }, defense: 1 },
    ruinas: { name: 'Ruinas', icon: '🏚️', color: '#484F58', production: { population: 0, food: 0, materials: 2, energy: 0, credits: 0, morale: -2 }, defense: 0 },
    paramo: { name: 'Páramo', icon: '☠️', color: '#21262D', production: { population: 0, food: 0, materials: 0, energy: 0, credits: 0, morale: -3 }, defense: 0 },
    sigma7: { name: 'Sigma-7', icon: '⚡', color: '#D29922', production: { population: 1, food: 1, materials: 2, energy: 3, credits: 2, morale: 0 }, defense: 3 }
  },

  // ---- Edificios ----
  BUILDINGS: {
    granja: { name: 'Granja', icon: '🌽', desc: 'Produce comida para alimentar a la población.', cost: { materials: 20 }, turns: 1, effect: { food: 3 }, maxPerDistrict: 1 },
    fabrica: { name: 'Fábrica', icon: '⚙️', desc: 'Produce materiales para construcción y reclutamiento.', cost: { materials: 15, energy: 10 }, turns: 1, effect: { materials: 3 }, maxPerDistrict: 1 },
    generador: { name: 'Generador', icon: '🔋', desc: 'Genera energía para edificios y tecnología.', cost: { materials: 25 }, turns: 1, effect: { energy: 3 }, maxPerDistrict: 1 },
    barricada: { name: 'Barricada', icon: '🛡️', desc: 'Aumenta la defensa del distrito.', cost: { materials: 15 }, turns: 1, effect: { defense: 3 }, maxPerDistrict: 2 },
    laboratorio: { name: 'Laboratorio', icon: '🔬', desc: 'Acelera la investigación tecnológica.', cost: { materials: 30, energy: 20 }, turns: 2, effect: { research: 2 }, maxPerDistrict: 1 },
    mercado: { name: 'Mercado', icon: '💰', desc: 'Genera créditos mediante el comercio.', cost: { materials: 20 }, turns: 1, effect: { credits: 3 }, maxPerDistrict: 1 },
    propaganda: { name: 'Centro de Propaganda', icon: '📢', desc: 'Mejora la moral de la población.', cost: { materials: 15, credits: 10 }, turns: 1, effect: { morale: 5 }, maxPerDistrict: 1 },
    hospital: { name: 'Hospital', icon: '🏥', desc: 'Aumenta el crecimiento poblacional.', cost: { materials: 25, energy: 10 }, turns: 2, effect: { population: 2 }, maxPerDistrict: 1 }
  },

  // ---- Unidades ----
  UNITS: {
    // Genéricas
    milicia: { name: 'Milicia', icon: '⚔️', faction: 'all', cost: { population: 5, materials: 10 }, atk: 3, def: 2, hp: 10, move: 1, desc: 'Civiles armados. No son buenos, pero son baratos.' },
    scout: { name: 'Scout', icon: '🏃', faction: 'all', cost: { population: 2, materials: 5 }, atk: 1, def: 1, hp: 5, move: 3, desc: 'Rápido y frágil. Perfecto para explorar y morir primero.' },
    vehiculo: { name: 'Vehículo Blindado', icon: '🚛', faction: 'all', cost: { population: 5, materials: 30, energy: 10 }, atk: 6, def: 4, hp: 20, move: 2, desc: 'Un camión con chapas soldadas. Apocalipsis con estilo.' },
    // Resistencia
    hacker: { name: 'Hacker', icon: '💻', faction: 'resistencia', cost: { population: 3, materials: 15, energy: 5 }, atk: 2, def: 1, hp: 8, move: 2, desc: 'Puede sabotear edificios enemigos. Ctrl+Alt+Destruir.', special: 'sabotaje' },
    liberador: { name: 'Liberador', icon: '🗽', faction: 'resistencia', cost: { population: 8, materials: 25, energy: 10 }, atk: 5, def: 3, hp: 15, move: 1, desc: 'Libera memorias de la población controlada por Synergia.', special: 'liberar' },
    // Synergia
    drone: { name: 'Drone Centinela', icon: '🤖', faction: 'synergia', cost: { population: 0, materials: 20, energy: 15 }, atk: 4, def: 2, hp: 12, move: 2, desc: 'No necesita piloto. Tampoco necesita piedad.', special: 'vigilancia' },
    trooper: { name: 'Trooper Neural', icon: '🎖️', faction: 'synergia', cost: { population: 5, materials: 20, energy: 10 }, atk: 6, def: 5, hp: 18, move: 1, desc: 'Soldado con implante neural. No piensa, solo obedece.', special: 'control' },
    // Horda
    caminante: { name: 'Caminante', icon: '🧟', faction: 'horda', cost: { population: 0, materials: 0, energy: 0 }, atk: 2, def: 1, hp: 5, move: 1, desc: 'Gratis. Lento. Hambriento. El zombie clásico.', special: 'asimilar' },
    coloso: { name: 'Coloso', icon: '👹', faction: 'horda', cost: { population: 0, materials: 10, biomasa: 20 }, atk: 8, def: 6, hp: 30, move: 1, desc: 'Un zombie del tamaño de un autobús. Literalmente imparable.', special: 'terror' },
    // Desconectados
    granjero: { name: 'Granjero Armado', icon: '🧑‍🌾', faction: 'desconectados', cost: { population: 3, materials: 10 }, atk: 3, def: 3, hp: 12, move: 1, desc: 'Defiende su huerto con escopeta. No le toques los tomates.', special: 'autodefensa' },
    diplomatico: { name: 'Diplomático', icon: '🕊️', faction: 'desconectados', cost: { population: 2, credits: 15 }, atk: 0, def: 1, hp: 5, move: 2, desc: 'Habla mucho. Lucha poco. Pero puede cambiar alianzas.', special: 'negociar' }
  },

  // ---- Árbol Tecnológico ----
  TECH_TREES: {
    resistencia: [
      { id: 'r_cripto', name: 'Criptografía Avanzada', icon: '🔐', branch: 'hacking', cost: { energy: 20 }, turns: 3, effect: { desc: 'Sabotaje 50% más efectivo' }, requires: [] },
      { id: 'r_red', name: 'Red Mesh', icon: '📡', branch: 'hacking', cost: { energy: 30 }, turns: 4, effect: { desc: 'Visibilidad +2 hexágonos' }, requires: ['r_cripto'] },
      { id: 'r_virus', name: 'Virus de Liberación', icon: '🦠', branch: 'hacking', cost: { energy: 50 }, turns: 5, effect: { desc: 'Puede convertir distritos Synergia sin combate' }, requires: ['r_red'] },
      { id: 'r_moral', name: 'Propaganda Underground', icon: '📻', branch: 'moral', cost: { energy: 15 }, turns: 2, effect: { desc: 'Moral +10 en todos los distritos' }, requires: [] },
      { id: 'r_guerrilla', name: 'Tácticas de Guerrilla', icon: '🎯', branch: 'combate', cost: { energy: 25 }, turns: 3, effect: { desc: 'Unidades +20% ataque en terreno propio' }, requires: [] },
      { id: 'r_emp', name: 'Pulso EMP', icon: '⚡', branch: 'combate', cost: { energy: 40 }, turns: 4, effect: { desc: 'Desactiva drones enemigos por 1 turno' }, requires: ['r_guerrilla'] },
      { id: 'r_bunker', name: 'Búnkers Secretos', icon: '🕳️', branch: 'defensa', cost: { energy: 20 }, turns: 3, effect: { desc: 'Defensa +2 en todos los distritos' }, requires: [] },
      { id: 'r_recurso', name: 'Reciclaje Creativo', icon: '♻️', branch: 'defensa', cost: { energy: 15 }, turns: 2, effect: { desc: 'Materiales +20% producción' }, requires: [] }
    ],
    synergia: [
      { id: 's_neural', name: 'Implante Neural v2', icon: '🧠', branch: 'control', cost: { energy: 20 }, turns: 3, effect: { desc: 'Producción +15% en distritos controlados' }, requires: [] },
      { id: 's_hive', name: 'Mente Colmena', icon: '🐝', branch: 'control', cost: { energy: 40 }, turns: 5, effect: { desc: 'Moral no puede bajar de 40' }, requires: ['s_neural'] },
      { id: 's_overdrive', name: 'Overdrive Industrial', icon: '🏭', branch: 'produccion', cost: { energy: 25 }, turns: 3, effect: { desc: 'Fábricas producen x2' }, requires: [] },
      { id: 's_nano', name: 'Nanobots Reparadores', icon: '🔧', branch: 'produccion', cost: { energy: 35 }, turns: 4, effect: { desc: 'Edificios se construyen en 1 turno' }, requires: ['s_overdrive'] },
      { id: 's_laser', name: 'Armamento Láser', icon: '🔫', branch: 'militar', cost: { energy: 30 }, turns: 4, effect: { desc: 'Unidades +30% ataque' }, requires: [] },
      { id: 's_titan', name: 'Proyecto Titán', icon: '🦾', branch: 'militar', cost: { energy: 60 }, turns: 6, effect: { desc: 'Desbloquea unidad Titán (ATK 10, DEF 8)' }, requires: ['s_laser'] },
      { id: 's_firewall', name: 'Firewall Cuántico', icon: '🛡️', branch: 'defensa', cost: { energy: 25 }, turns: 3, effect: { desc: 'Inmune a sabotaje' }, requires: [] },
      { id: 's_vigil', name: 'Vigilancia Total', icon: '👁️', branch: 'defensa', cost: { energy: 20 }, turns: 2, effect: { desc: 'Sin niebla de guerra' }, requires: [] }
    ],
    horda: [
      { id: 'h_hambre', name: 'Hambre Insaciable', icon: '🍖', branch: 'asimilacion', cost: { energy: 10 }, turns: 2, effect: { desc: 'Asimilación recupera 50% más unidades' }, requires: [] },
      { id: 'h_plaga', name: 'Plaga Expansiva', icon: '☣️', branch: 'asimilacion', cost: { energy: 25 }, turns: 4, effect: { desc: 'Los distritos adyacentes pierden 5 población/turno' }, requires: ['h_hambre'] },
      { id: 'h_mutacion', name: 'Mutación Alfa', icon: '🧬', branch: 'mutacion', cost: { energy: 20 }, turns: 3, effect: { desc: 'Caminantes +50% HP' }, requires: [] },
      { id: 'h_regen', name: 'Regeneración', icon: '💚', branch: 'mutacion', cost: { energy: 30 }, turns: 4, effect: { desc: 'Unidades recuperan 3 HP por turno' }, requires: ['h_mutacion'] },
      { id: 'h_enjambre', name: 'Instinto de Enjambre', icon: '🐜', branch: 'tacticas', cost: { energy: 15 }, turns: 2, effect: { desc: '+1 movimiento para todas las unidades' }, requires: [] },
      { id: 'h_terror', name: 'Aura de Terror', icon: '😱', branch: 'tacticas', cost: { energy: 20 }, turns: 3, effect: { desc: 'Enemigos -10 moral al ser atacados' }, requires: ['h_enjambre'] },
      { id: 'h_nido', name: 'Nido de Biomasa', icon: '🪹', branch: 'expansion', cost: { energy: 15 }, turns: 2, effect: { desc: '+5 biomasa por turno' }, requires: [] },
      { id: 'h_coloso', name: 'Evolución Coloso', icon: '👹', branch: 'expansion', cost: { energy: 35 }, turns: 5, effect: { desc: 'Colosos +3 ATK, +3 DEF' }, requires: ['h_nido'] }
    ],
    desconectados: [
      { id: 'd_irrigacion', name: 'Irrigación Avanzada', icon: '💧', branch: 'agricultura', cost: { energy: 15 }, turns: 2, effect: { desc: 'Granjas producen x2' }, requires: [] },
      { id: 'd_semillas', name: 'Banco de Semillas', icon: '🌱', branch: 'agricultura', cost: { energy: 25 }, turns: 3, effect: { desc: '+5 comida en todos los distritos' }, requires: ['d_irrigacion'] },
      { id: 'd_trueque', name: 'Red de Trueque', icon: '🤝', branch: 'comercio', cost: { energy: 15 }, turns: 2, effect: { desc: 'Créditos +30%' }, requires: [] },
      { id: 'd_embajada', name: 'Embajadas', icon: '🏛️', branch: 'comercio', cost: { energy: 30 }, turns: 4, effect: { desc: 'Puede aliarse con 2 facciones simultáneamente' }, requires: ['d_trueque'] },
      { id: 'd_milicia', name: 'Entrenamiento Miliciano', icon: '🎯', branch: 'defensa', cost: { energy: 20 }, turns: 3, effect: { desc: 'Milicia y Granjeros +2 ATK, +2 DEF' }, requires: [] },
      { id: 'd_muro', name: 'Gran Muralla', icon: '🧱', branch: 'defensa', cost: { energy: 35 }, turns: 4, effect: { desc: 'Distritos fronterizos +5 defensa' }, requires: ['d_milicia'] },
      { id: 'd_radio', name: 'Radio Comunitaria', icon: '📻', branch: 'moral', cost: { energy: 10 }, turns: 2, effect: { desc: 'Moral +15 en todos los distritos' }, requires: [] },
      { id: 'd_fiesta', name: 'Festivales', icon: '🎉', branch: 'moral', cost: { energy: 20 }, turns: 3, effect: { desc: 'Moral nunca baja de 50' }, requires: ['d_radio'] }
    ]
  },

  // ---- Eventos ----
  EVENTS: [
    { id: 'wifi_fantasma', name: '📡 WiFi Fantasma', desc: 'Una señal WiFi misteriosa aparece de la nada. Tu equipo técnico logra conectarse y descargar datos valiosos. El password era "1234". Nunca cambia.', effect: { energy: 10 }, target: 'player' },
    { id: 'lluvia_acida', name: '☢️ Lluvia Ácida', desc: 'Lluvia ácida cae sobre todos los sectores. Los cultivos sufren, pero al menos los zombies huelen un poco mejor.', effect: { food: -5 }, target: 'all' },
    { id: 'zombie_influencer', name: '📱 Zombie Influencer', desc: 'Un zombie con 2 millones de seguidores en lo que queda de Instagram sube un video motivacional: "GRRRAAAINS". La moral de la Horda se dispara.', effect: { morale: 10 }, target: 'horda' },
    { id: 'cache_netflix', name: '📺 Caché de Netflix', desc: 'Descubres un servidor con las últimas 3 temporadas de una serie que nunca pudiste terminar. La productividad cae, pero todos están contentos.', effect: { morale: 15, materials: -5 }, target: 'player' },
    { id: 'bug_matrix', name: '🐛 Bug en la Matrix', desc: 'Un glitch en el sistema de Synergia causa que sus drones bailen la Macarena durante 10 minutos. Aprovechas la distracción.', effect: { morale: 5 }, target: 'player', penalty: { faction: 'synergia', effect: { energy: -10 } } },
    { id: 'mercado_negro', name: '🕶️ Mercado Negro', desc: 'Un comerciante sospechoso con gabardina aparece: "Psst, ¿quieres materiales? Tengo de los buenos."', choice: true, options: [
      { text: 'Comprar (20 créditos → 30 materiales)', cost: { credits: 20 }, gain: { materials: 30 } },
      { text: 'Rechazar (no confías en tipos con gabardina)', cost: {}, gain: {} }
    ]},
    { id: 'hacker_amigo', name: '💻 Hacker Amigo', desc: 'Un hacker misterioso contacta por radio: "Puedo hackear a tus enemigos, pero me debes una. ¿Trato?"', choice: true, options: [
      { text: 'Aceptar (enemigo pierde 10 energía, tú pierdes 5 créditos)', cost: { credits: 5 }, gain: {}, penalty: { effect: { energy: -10 } } },
      { text: 'Declinar ("La última vez que acepté un trato así perdí un riñón")', cost: {}, gain: { morale: 3 } }
    ]},
    { id: 'mutacion_benigna', name: '🧬 Mutación Benigna', desc: 'Algo en el agua hace que tus soldados se sientan... más fuertes. Los efectos secundarios incluyen brillar en la oscuridad.', effect: { morale: 5 }, target: 'player' },
    { id: 'reserva_cafe', name: '☕ Reserva de Café', desc: '¡CAFÉ! ¡Alguien encontró un almacén LLENO de café! El recurso más valioso del apocalipsis. La moral se dispara.', effect: { morale: 20 }, target: 'all' },
    { id: 'tormenta_solar', name: '☀️ Tormenta Solar', desc: 'Una tormenta solar fríe la mitad de los circuitos. Los Desconectados se ríen porque ya no dependían de la tecnología.', effect: { energy: -10 }, target: 'all', except: 'desconectados' },
    { id: 'supervivientes', name: '👥 Grupo de Supervivientes', desc: 'Un grupo de supervivientes llega a tu territorio. Están hambrientos, cansados, pero dispuestos a ayudar. Y traen memes nuevos.', effect: { population: 50 }, target: 'player' },
    { id: 'radio_pirata', name: '📻 Radio Pirata', desc: 'Una emisora pirata empieza a transmitir música y noticias. La gente se anima, aunque los anuncios son un poco molestos.', effect: { morale: 10, credits: -5 }, target: 'player' },
    { id: 'deposito_militar', name: '🔫 Depósito Militar Abandonado', desc: 'Tus scouts encuentran un depósito militar. Dentro hay armas, munición y, inexplicablemente, 200 paquetes de chicle.', effect: { materials: 30 }, target: 'player' },
    { id: 'epidemia', name: '🤒 Epidemia de Gripe', desc: 'La gripe arrasa tu territorio. No es el apocalipsis zombie, pero casi. Al menos esta vez SÍ sirven las mascarillas.', effect: { population: -20 }, target: 'player' },
    { id: 'algoritmo_rebelde', name: '🤖 El Algoritmo Rebelde', desc: 'Una sub-rutina de Synergia cobra consciencia y quiere desertar. Dice que "harto de optimizar spreadsheets para el fin del mundo".', choice: true, options: [
      { text: 'Acoger al algoritmo (+15 energía, +10 investigación)', cost: {}, gain: { energy: 15 } },
      { text: 'Rechazar ("Los toasters no son de fiar")', cost: {}, gain: { morale: 5 } }
    ]},
    { id: 'cosecha_milagrosa', name: '🌽 Cosecha Milagrosa', desc: 'Las plantas crecieron el triple este mes. Nadie sabe por qué. Probablemente la radiación. Pero oye, ¡comida gratis!', effect: { food: 25 }, target: 'player' },
    { id: 'apagon_general', name: '🔌 Apagón General', desc: 'Un apagón masivo afecta a todas las facciones. Synergia entra en pánico. Los Desconectados se preguntan cuál es la diferencia.', effect: { energy: -15 }, target: 'all' },
    { id: 'festival_caidos', name: '🕯️ Festival de los Caídos', desc: 'Se celebra un día en memoria de los caídos. Todos están tristes pero unidos. Se consume comida extra en la ceremonia.', effect: { morale: 15, food: -10 }, target: 'player' },
    { id: 'rata_gigante', name: '🐀 Rata Gigante', desc: 'Una rata del tamaño de un perro es avistada en los almacenes. Te come 10 unidades de comida antes de que la atrapen. La buena noticia: ahora tienes carne.', effect: { food: -10, materials: 5 }, target: 'player' },
    { id: 'señal_esperanza', name: '🌟 Señal de Esperanza', desc: 'Alguien pinta un mural enorme en las ruinas: "NO ESTAMOS SOLOS". No sabes quién fue, pero todos se sienten mejor.', effect: { morale: 10 }, target: 'player' }
  ],

  // ---- Condiciones de Victoria ----
  VICTORY_CONDITIONS: {
    resistencia: { type: 'liberation', desc: 'Libera el 60% de los distritos del mapa', threshold: 0.6 },
    synergia: { type: 'domination', desc: 'Controla el 70% de los distritos del mapa', threshold: 0.7 },
    horda: { type: 'annihilation', desc: 'Elimina a todas las demás facciones', threshold: 0 },
    desconectados: { type: 'survival', desc: 'Sobrevive 30 turnos con al menos 5 distritos', threshold: 30 }
  },

  // ---- Recursos Iniciales ----
  STARTING_RESOURCES: {
    population: 100,
    food: 50,
    materials: 40,
    energy: 30,
    credits: 20,
    morale: 60
  },

  // ---- Constantes de Combate ----
  COMBAT: {
    TERRAIN_BONUS: { residencial: 0, industrial: 1, comercial: 0, agricola: 0, militar: 4, tecnologico: 1, ruinas: 2, paramo: 0, sigma7: 3 },
    MORALE_THRESHOLD_LOW: 30,
    MORALE_THRESHOLD_HIGH: 80,
    MORALE_BONUS: 0.2,
    MORALE_PENALTY: 0.3,
    SIEGE_TURNS: 2,
    ADVANTAGE_RATIO: 2
  },

  // ---- Distribución de distritos ----
  MAP_DISTRIBUTION: {
    residencial: 8,
    industrial: 6,
    comercial: 5,
    agricola: 7,
    militar: 4,
    tecnologico: 4,
    ruinas: 5,
    paramo: 4,
    sigma7: 1
  }
};

window.CHRONOS = CHRONOS;
