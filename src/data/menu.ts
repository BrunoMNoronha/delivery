import type { Category, Product, ProductOptions } from '../types/menu';

export const WHATSAPP_NUMBER = '5561985007483';

const createEmojiImage = (emoji: string, background: string): string => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='100%' height='100%' rx='24' fill='${background}'/><text x='50%' y='52%' text-anchor='middle' font-family='system-ui' font-size='20'>${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const PIZZA_OPTIONS: ProductOptions = {
  groups: [
    {
      key: 'size',
      title: 'Escolher tamanho',
      required: true,
      type: 'radio',
      options: [
        { k: 'S', label: 'Pequena - 6"', delta: -6 },
        { k: 'M', label: 'Média - 10"', delta: 0, default: true },
        { k: 'L', label: 'Grande - 14"', delta: 6 },
      ],
    },
    {
      key: 'crust',
      title: 'Escolher borda',
      required: true,
      type: 'radio',
      options: [
        { k: 'classic', label: 'Clássica', delta: 0, default: true },
        { k: 'thin', label: 'Massa fina', delta: 0 },
        { k: 'cheese', label: 'Borda recheada', delta: 1.5 },
      ],
    },
    {
      key: 'addons',
      title: 'Adicionais',
      required: false,
      type: 'check',
      options: [
        { k: 'extra_cheese', label: 'Extra queijo', delta: 2.5 },
        { k: 'mushroom', label: 'Cogumelos', delta: 2.5 },
      ],
    },
  ],
};

export const PRODUCTS: Product[] = [
  {
    id: 'pz1',
    cat: 'Pizza',
    name: 'Margherita',
    desc: 'Média | mussarela, tomate, manjericão',
    price: 34.9,
    img: createEmojiImage('🍅', '#ffe4d6'),
    opts: PIZZA_OPTIONS,
  },
  {
    id: 'pz2',
    cat: 'Pizza',
    name: 'Pepperoni',
    desc: 'Média | pepperoni, queijo',
    price: 39.9,
    img: createEmojiImage('🧀', '#fff3c4'),
    opts: PIZZA_OPTIONS,
  },
  {
    id: 'pz3',
    cat: 'Pizza',
    name: 'Frango Supreme',
    desc: 'Média | frango, cebola, milho',
    price: 42.5,
    img: createEmojiImage('🌽', '#fde68a'),
    opts: PIZZA_OPTIONS,
  },
  {
    id: 'sl1',
    cat: 'Salada',
    name: 'Cesar',
    desc: 'Frango, alface, parmesão',
    price: 27,
    img: createEmojiImage('🥗', '#dcfce7'),
  },
  {
    id: 'sd1',
    cat: 'Sobremesa',
    name: 'Brownie',
    desc: 'Chocolate meio amargo',
    price: 16.5,
    img: createEmojiImage('🍫', '#ede9fe'),
  },
  {
    id: 'sd2',
    cat: 'Acompanhamentos',
    name: 'Batata rústica',
    desc: 'Páprica e ervas',
    price: 18.9,
    img: createEmojiImage('🥔', '#fef9c3'),
  },
  {
    id: 'bk1',
    cat: 'Bebidas',
    name: 'Refrigerante',
    desc: 'Lata 350ml',
    price: 7.9,
    img: createEmojiImage('🥤', '#cffafe'),
  },
];

export const CATEGORIES: Category[] = [
  { name: 'Pizza', icon: '🍕' },
  { name: 'Salada', icon: '🥗' },
  { name: 'Sobremesa', icon: '🍰' },
  { name: 'Acompanhamentos', icon: '🍟' },
  { name: 'Bebidas', icon: '🥤' },
];
