// Definições dos tipos de bebida: campos específicos, eixos sensoriais,
// aromas sugeridos e quais campos geram estatísticas.

const COUNTRIES = ['Brasil', 'Argentina', 'Chile', 'Uruguai', 'Portugal', 'Espanha', 'França', 'Itália',
  'Alemanha', 'Bélgica', 'Reino Unido', 'Escócia', 'Irlanda', 'Estados Unidos', 'México', 'Japão',
  'África do Sul', 'Austrália', 'Nova Zelândia', 'Colômbia', 'Etiópia', 'Quênia', 'China', 'Índia', 'Cuba'];

export const COUNTRY_SUGGESTIONS = COUNTRIES;

export const DRINK_TYPES = [
  {
    id: 'vinho', label: 'Vinho', icon: '🍷', color: '#8e2043', producer: 'Vinícola', alcoholic: true,
    fields: [
      { k: 'estilo', label: 'Estilo', type: 'select', options: ['Tinto', 'Branco', 'Rosé', 'Espumante', 'Laranja', 'Sobremesa', 'Fortificado'] },
      { k: 'uvas', label: 'Uvas / castas', type: 'tags', suggestions: ['Cabernet Sauvignon', 'Merlot', 'Malbec', 'Pinot Noir', 'Syrah', 'Tannat', 'Tempranillo', 'Sangiovese', 'Nebbiolo', 'Touriga Nacional', 'Carménère', 'Cabernet Franc', 'Grenache', 'Zinfandel', 'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Moscato', 'Alvarinho', 'Pinot Grigio', 'Viognier', 'Glera', 'Gewürztraminer'] },
      { k: 'safra', label: 'Safra', type: 'number', min: 1900, max: 2100 },
      { k: 'classificacao', label: 'Denominação / classificação', type: 'text', placeholder: 'DOC, Reserva, Gran Reserva, Brut…' },
      { k: 'barrica', label: 'Passagem por barrica', type: 'text', placeholder: 'Ex.: 12 meses carvalho francês' },
      { k: 'temperatura', label: 'Temperatura de serviço (°C)', type: 'number' },
      { k: 'decantado', label: 'Decantado?', type: 'select', options: ['Não', 'Sim'] },
      { k: 'cor', label: 'Cor', type: 'select', options: ['Violáceo', 'Rubi', 'Granada', 'Atijolado', 'Amarelo-esverdeado', 'Palha', 'Dourado', 'Âmbar', 'Salmão', 'Rosa'] },
    ],
    sensory: [
      { k: 'intensidade', label: 'Intensidade aromática', low: 'Discreta', high: 'Intensa' },
      { k: 'docura', label: 'Doçura', low: 'Seco', high: 'Doce' },
      { k: 'acidez', label: 'Acidez', low: 'Baixa', high: 'Alta' },
      { k: 'taninos', label: 'Taninos', low: 'Macios', high: 'Marcantes' },
      { k: 'corpo', label: 'Corpo', low: 'Leve', high: 'Encorpado' },
      { k: 'alcool', label: 'Álcool', low: 'Baixo', high: 'Alto' },
      { k: 'persistencia', label: 'Persistência', low: 'Curta', high: 'Longa' },
    ],
    aromas: ['Frutas vermelhas', 'Frutas negras', 'Frutas secas', 'Cítricos', 'Frutas tropicais', 'Maçã/pera', 'Floral', 'Herbáceo', 'Pimentão', 'Especiarias', 'Baunilha', 'Madeira', 'Tostado', 'Chocolate', 'Café', 'Couro', 'Terroso', 'Mineral', 'Mel', 'Brioche', 'Manteiga'],
    stats: ['estilo', 'uvas', 'pais', 'regiao', 'safra'],
  },
  {
    id: 'cerveja', label: 'Cerveja', icon: '🍺', color: '#c98a12', producer: 'Cervejaria', alcoholic: true,
    fields: [
      { k: 'estilo', label: 'Estilo', type: 'combo', options: ['Pilsen', 'American Lager', 'Helles', 'Vienna Lager', 'Märzen', 'Bock', 'Doppelbock', 'Weissbier', 'Witbier', 'APA', 'IPA', 'Session IPA', 'NEIPA', 'Double IPA', 'Red Ale', 'Amber Ale', 'English Bitter', 'Brown Ale', 'Porter', 'Stout', 'Imperial Stout', 'Saison', 'Belgian Blond', 'Dubbel', 'Tripel', 'Quadrupel', 'Sour', 'Catharina Sour', 'Lambic', 'Gose', 'Fruit Beer', 'Barley Wine', 'Kölsch', 'Sem álcool'] },
      { k: 'ibu', label: 'IBU (amargor)', type: 'number' },
      { k: 'aparencia', label: 'Cor', type: 'select', options: ['Palha', 'Dourada', 'Âmbar', 'Cobre', 'Marrom', 'Preta'] },
      { k: 'turbidez', label: 'Turbidez', type: 'select', options: ['Cristalina', 'Levemente turva', 'Turva'] },
      { k: 'espuma', label: 'Espuma', type: 'select', options: ['Pouca / some rápido', 'Média', 'Cremosa e persistente'] },
      { k: 'formato', label: 'Formato', type: 'select', options: ['Garrafa', 'Lata', 'Chope', 'Growler'] },
      { k: 'copo', label: 'Copo', type: 'text', placeholder: 'Pint, tulipa, caldereta…' },
      { k: 'lupulos', label: 'Lúpulos / adjuntos', type: 'tags', suggestions: ['Citra', 'Mosaic', 'Simcoe', 'Galaxy', 'Cascade', 'Centennial', 'Amarillo', 'El Dorado', 'Saaz', 'Hallertau', 'Café', 'Cacau', 'Baunilha', 'Frutas'] },
    ],
    sensory: [
      { k: 'aromaLupulo', label: 'Aroma de lúpulo', low: 'Ausente', high: 'Intenso' },
      { k: 'malte', label: 'Malte / dulçor', low: 'Seco', high: 'Adocicado' },
      { k: 'amargor', label: 'Amargor', low: 'Baixo', high: 'Alto' },
      { k: 'acidez', label: 'Acidez', low: 'Nenhuma', high: 'Azeda' },
      { k: 'corpo', label: 'Corpo', low: 'Leve', high: 'Denso' },
      { k: 'carbonatacao', label: 'Carbonatação', low: 'Baixa', high: 'Alta' },
      { k: 'drinkability', label: 'Drinkability', low: 'Pesada', high: 'Fácil de beber' },
    ],
    aromas: ['Cítrico', 'Tropical', 'Resinoso', 'Herbal', 'Floral', 'Frutado', 'Banana', 'Cravo', 'Pão/biscoito', 'Caramelo', 'Toffee', 'Tostado', 'Café', 'Chocolate', 'Defumado', 'Madeira', 'Ácido/lático', 'Funky', 'Mel', 'Especiarias'],
    stats: ['estilo', 'pais', 'produtor', 'aparencia'],
  },
  {
    id: 'destilado', label: 'Destilado', icon: '🥃', color: '#a0522d', producer: 'Destilaria / marca', alcoholic: true,
    fields: [
      { k: 'categoria', label: 'Categoria', type: 'combo', options: ['Whisky', 'Cachaça', 'Gin', 'Rum', 'Tequila', 'Mezcal', 'Vodka', 'Conhaque', 'Brandy', 'Grappa', 'Pisco', 'Licor', 'Absinto', 'Aguardente'] },
      { k: 'subtipo', label: 'Subtipo', type: 'text', placeholder: 'Single Malt, Bourbon, Prata, Reposado, London Dry…' },
      { k: 'idade', label: 'Idade (anos)', type: 'number' },
      { k: 'madeira', label: 'Madeira / barril', type: 'tags', suggestions: ['Carvalho americano', 'Carvalho europeu', 'Ex-bourbon', 'Ex-sherry', 'Ex-vinho do Porto', 'Amburana', 'Bálsamo', 'Jequitibá', 'Castanheira', 'Ipê', 'Inox (sem madeira)'] },
      { k: 'caskStrength', label: 'Cask strength?', type: 'select', options: ['Não', 'Sim'] },
      { k: 'consumo', label: 'Como bebeu', type: 'select', options: ['Puro', 'Com gelo', 'Com gotas de água', 'Em drink'] },
    ],
    sensory: [
      { k: 'intensidade', label: 'Intensidade', low: 'Suave', high: 'Potente' },
      { k: 'docura', label: 'Doçura', low: 'Seco', high: 'Doce' },
      { k: 'defumado', label: 'Defumado / turfa', low: 'Nenhum', high: 'Muito' },
      { k: 'madeira', label: 'Madeira', low: 'Pouca', high: 'Muita' },
      { k: 'especiarias', label: 'Especiarias', low: 'Poucas', high: 'Muitas' },
      { k: 'ardencia', label: 'Ardência alcoólica', low: 'Macio', high: 'Ardente' },
      { k: 'final', label: 'Final', low: 'Curto', high: 'Longo' },
    ],
    aromas: ['Baunilha', 'Caramelo', 'Mel', 'Frutas secas', 'Frutas frescas', 'Cítrico', 'Floral', 'Herbal', 'Zimbro', 'Turfa', 'Defumado', 'Especiarias', 'Canela', 'Madeira', 'Cana', 'Chocolate', 'Café', 'Couro', 'Nozes', 'Iodo/maresia'],
    stats: ['categoria', 'pais', 'produtor', 'madeira'],
  },
  {
    id: 'coquetel', label: 'Coquetel', icon: '🍸', color: '#2a8a7a', producer: 'Bar / local', alcoholic: true,
    fields: [
      { k: 'base', label: 'Destilado base', type: 'combo', options: ['Gin', 'Vodka', 'Rum', 'Cachaça', 'Whisky', 'Tequila', 'Mezcal', 'Conhaque', 'Vinho/espumante', 'Sem álcool'] },
      { k: 'ingredientes', label: 'Ingredientes', type: 'tags', suggestions: ['Limão', 'Açúcar', 'Xarope simples', 'Angostura', 'Vermute doce', 'Vermute seco', 'Campari', 'Aperol', 'Tônica', 'Club soda', 'Hortelã', 'Gengibre', 'Clara de ovo'] },
      { k: 'metodo', label: 'Método', type: 'select', options: ['Batido', 'Mexido', 'Montado', 'Liquidificador', 'Macerado'] },
      { k: 'copo', label: 'Copo', type: 'text', placeholder: 'Coupe, old fashioned, highball…' },
      { k: 'guarnicao', label: 'Guarnição', type: 'text' },
      { k: 'bartender', label: 'Bartender', type: 'text' },
    ],
    sensory: [
      { k: 'docura', label: 'Doçura', low: 'Seco', high: 'Doce' },
      { k: 'acidez', label: 'Acidez', low: 'Baixa', high: 'Alta' },
      { k: 'amargor', label: 'Amargor', low: 'Nenhum', high: 'Alto' },
      { k: 'forca', label: 'Força alcoólica', low: 'Leve', high: 'Forte' },
      { k: 'refrescancia', label: 'Refrescância', low: 'Pouca', high: 'Muita' },
      { k: 'equilibrio', label: 'Equilíbrio', low: 'Desequilibrado', high: 'Equilibrado' },
    ],
    aromas: ['Cítrico', 'Frutado', 'Tropical', 'Herbal', 'Floral', 'Amargo', 'Especiarias', 'Defumado', 'Doce', 'Café', 'Chocolate'],
    stats: ['base', 'metodo', 'produtor'],
  },
  {
    id: 'sake', label: 'Saquê', icon: '🍶', color: '#5b6fa8', producer: 'Produtor (kura)', alcoholic: true,
    fields: [
      { k: 'classificacao', label: 'Classificação', type: 'select', options: ['Futsu-shu', 'Honjozo', 'Junmai', 'Ginjo', 'Junmai Ginjo', 'Daiginjo', 'Junmai Daiginjo', 'Nigori', 'Espumante', 'Koshu (envelhecido)'] },
      { k: 'polimento', label: 'Polimento do arroz (%)', type: 'number' },
      { k: 'arroz', label: 'Variedade de arroz', type: 'text', placeholder: 'Yamada Nishiki, Omachi…' },
      { k: 'smv', label: 'SMV (nihonshu-do)', type: 'number' },
      { k: 'temperatura', label: 'Temperatura', type: 'select', options: ['Gelado', 'Fresco', 'Ambiente', 'Morno', 'Quente'] },
    ],
    sensory: [
      { k: 'aroma', label: 'Aroma', low: 'Discreto', high: 'Exuberante' },
      { k: 'docura', label: 'Doçura', low: 'Seco', high: 'Doce' },
      { k: 'acidez', label: 'Acidez', low: 'Baixa', high: 'Alta' },
      { k: 'umami', label: 'Umami', low: 'Baixo', high: 'Alto' },
      { k: 'corpo', label: 'Corpo', low: 'Leve', high: 'Encorpado' },
      { k: 'final', label: 'Final', low: 'Curto', high: 'Longo' },
    ],
    aromas: ['Melão', 'Maçã', 'Pera', 'Banana', 'Floral', 'Arroz cozido', 'Cogumelo', 'Nozes', 'Mineral', 'Cítrico', 'Iogurte', 'Anis'],
    stats: ['classificacao', 'temperatura', 'produtor'],
  },
  {
    id: 'cafe', label: 'Café', icon: '☕', color: '#6b4226', producer: 'Torrefação / marca', alcoholic: false,
    fields: [
      { k: 'fazenda', label: 'Fazenda / produtor', type: 'text' },
      { k: 'variedade', label: 'Variedade', type: 'tags', suggestions: ['Bourbon Amarelo', 'Bourbon Vermelho', 'Catuaí', 'Mundo Novo', 'Arara', 'Geisha', 'Typica', 'Catucaí', 'Acaiá', 'Topázio', 'Conilon/Robusta'] },
      { k: 'processo', label: 'Processo', type: 'select', options: ['Natural', 'Lavado', 'Cereja descascado', 'Honey', 'Fermentado', 'Anaeróbico'] },
      { k: 'torra', label: 'Torra', type: 'select', options: ['Clara', 'Média-clara', 'Média', 'Média-escura', 'Escura'] },
      { k: 'metodo', label: 'Método de preparo', type: 'select', options: ['Espresso', 'Coado (V60)', 'Coado (filtro de papel)', 'Chemex', 'Prensa francesa', 'Aeropress', 'Moka', 'Cold brew', 'Hario Switch', 'Kalita'] },
      { k: 'altitude', label: 'Altitude (m)', type: 'number' },
      { k: 'pontuacaoSca', label: 'Pontuação SCA', type: 'number' },
      { k: 'receita', label: 'Receita usada', type: 'text', placeholder: '15 g / 250 ml / 93 °C / 3 min' },
    ],
    sensory: [
      { k: 'aroma', label: 'Aroma', low: 'Fraco', high: 'Intenso' },
      { k: 'acidez', label: 'Acidez', low: 'Baixa', high: 'Alta' },
      { k: 'docura', label: 'Doçura', low: 'Baixa', high: 'Alta' },
      { k: 'corpo', label: 'Corpo', low: 'Leve', high: 'Encorpado' },
      { k: 'amargor', label: 'Amargor', low: 'Baixo', high: 'Alto' },
      { k: 'final', label: 'Finalização', low: 'Curta', high: 'Longa' },
    ],
    aromas: ['Chocolate', 'Cacau', 'Caramelo', 'Mel', 'Rapadura', 'Nozes', 'Castanhas', 'Frutas amarelas', 'Frutas vermelhas', 'Cítrico', 'Floral', 'Especiarias', 'Tostado', 'Vinhoso', 'Fermentado'],
    stats: ['processo', 'torra', 'metodo', 'pais', 'variedade'],
  },
  {
    id: 'cha', label: 'Chá', icon: '🍵', color: '#5a8a3a', producer: 'Marca / produtor', alcoholic: false,
    fields: [
      { k: 'tipo', label: 'Tipo', type: 'select', options: ['Verde', 'Preto', 'Oolong', 'Branco', 'Amarelo', 'Pu-erh', 'Matcha', 'Mate / chimarrão', 'Rooibos', 'Infusão de ervas', 'Infusão de frutas'] },
      { k: 'temperaturaAgua', label: 'Temperatura da água (°C)', type: 'number' },
      { k: 'tempoInfusao', label: 'Tempo de infusão (min)', type: 'number' },
      { k: 'quantidade', label: 'Quantidade', type: 'text', placeholder: '3 g / 200 ml' },
      { k: 'infusoes', label: 'Nº de infusões', type: 'number' },
    ],
    sensory: [
      { k: 'aroma', label: 'Aroma', low: 'Fraco', high: 'Intenso' },
      { k: 'docura', label: 'Doçura', low: 'Baixa', high: 'Alta' },
      { k: 'adstringencia', label: 'Adstringência', low: 'Baixa', high: 'Alta' },
      { k: 'corpo', label: 'Corpo', low: 'Leve', high: 'Encorpado' },
      { k: 'final', label: 'Final', low: 'Curto', high: 'Longo' },
    ],
    aromas: ['Vegetal', 'Grama', 'Algas', 'Floral', 'Jasmim', 'Frutado', 'Cítrico', 'Mel', 'Malte', 'Tostado', 'Defumado', 'Terroso', 'Amadeirado', 'Menta', 'Especiarias'],
    stats: ['tipo', 'pais', 'produtor'],
  },
  {
    id: 'outro', label: 'Outra', icon: '🥤', color: '#7a5aa8', producer: 'Produtor / marca', alcoholic: true,
    fields: [
      { k: 'categoria', label: 'Categoria', type: 'combo', options: ['Sidra', 'Hidromel', 'Kombucha', 'Licor', 'Vermute', 'Refrigerante artesanal', 'Suco', 'Água', 'Destilado de frutas'] },
      { k: 'detalhes', label: 'Detalhes', type: 'text' },
    ],
    sensory: [
      { k: 'aroma', label: 'Aroma', low: 'Fraco', high: 'Intenso' },
      { k: 'docura', label: 'Doçura', low: 'Seco', high: 'Doce' },
      { k: 'acidez', label: 'Acidez', low: 'Baixa', high: 'Alta' },
      { k: 'corpo', label: 'Corpo', low: 'Leve', high: 'Encorpado' },
      { k: 'final', label: 'Final', low: 'Curto', high: 'Longo' },
    ],
    aromas: ['Frutado', 'Cítrico', 'Floral', 'Herbal', 'Mel', 'Especiarias', 'Fermentado', 'Doce', 'Amargo'],
    stats: ['categoria', 'pais', 'produtor'],
  },
];

export const typeById = id => DRINK_TYPES.find(t => t.id === id) || DRINK_TYPES[DRINK_TYPES.length - 1];

// Rótulos para campos comuns usados nas estatísticas
export const COMMON_LABELS = { pais: 'País', regiao: 'Região', produtor: 'Produtor' };

export const RECIPE_CATEGORIES = ['Entrada', 'Prato principal', 'Acompanhamento', 'Salada', 'Sopa', 'Massa', 'Carne', 'Peixe / frutos do mar', 'Vegetariano', 'Sobremesa', 'Pão / confeitaria', 'Café da manhã', 'Lanche', 'Molho', 'Drink', 'Conserva', 'Outro'];

export const DIFFICULTIES = ['Fácil', 'Média', 'Difícil'];

export const UTENSILS = ['Panela', 'Panela de pressão', 'Frigideira', 'Wok', 'Caçarola de ferro', 'Assadeira', 'Forma de bolo', 'Forma de pudim', 'Refratário', 'Forno', 'Air fryer', 'Micro-ondas', 'Liquidificador', 'Batedeira', 'Processador', 'Mixer', 'Balança', 'Termômetro', 'Fouet', 'Espátula', 'Peneira', 'Rolo de massa', 'Tábua', 'Faca do chef', 'Ralador', 'Mandoline', 'Coqueteleira', 'Dosador', 'Socador', 'Coador', 'Grelha / churrasqueira', 'Sous vide'];

// ---------- Restaurantes ----------

export const CUISINES = ['Brasileira', 'Mineira', 'Nordestina', 'Gaúcha / churrascaria', 'Italiana', 'Pizzaria', 'Japonesa', 'Chinesa', 'Coreana', 'Tailandesa', 'Indiana', 'Árabe / libanesa', 'Mexicana', 'Peruana', 'Argentina', 'Portuguesa', 'Espanhola', 'Francesa', 'Hamburgueria', 'Frutos do mar', 'Vegetariana / vegana', 'Contemporânea', 'Bistrô', 'Boteco / bar', 'Cervejaria', 'Bar de vinhos', 'Café / padaria', 'Doceria / sorveteria', 'Steakhouse', 'Self-service / por quilo'];

export const PRICE_LEVELS = ['$', '$$', '$$$', '$$$$'];

export const RESTAURANT_TAGS = ['Romântico', 'Família', 'Crianças', 'Pet friendly', 'Ao ar livre', 'Música ao vivo', 'Vista bonita', 'Rodízio', 'Delivery', 'Reserva recomendada', 'Fila', 'Estacionamento', 'Carta de vinhos', 'Chope artesanal', 'Drinks autorais', 'Opções veganas', 'Sem glúten', 'Almoço executivo'];

export const VISIT_TYPES = ['Almoço', 'Jantar', 'Café da manhã', 'Brunch', 'Lanche', 'Happy hour', 'Delivery'];

export const VISIT_CRITERIA = [
  { k: 'comida', label: 'Comida', low: 'Ruim', high: 'Excelente' },
  { k: 'bebidas', label: 'Bebidas', low: 'Ruins', high: 'Excelentes' },
  { k: 'atendimento', label: 'Atendimento', low: 'Ruim', high: 'Excelente' },
  { k: 'ambiente', label: 'Ambiente', low: 'Ruim', high: 'Excelente' },
  { k: 'custoBeneficio', label: 'Custo-benefício', low: 'Caro', high: 'Vale muito' },
];

export const SIDE_SUGGESTIONS =['Arroz', 'Salada', 'Farofa', 'Purê', 'Batata', 'Pão', 'Legumes', 'Feijão', 'Molho', 'Massa', 'Polenta'];
