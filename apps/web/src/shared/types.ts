export const STEPS = [
  { n: 1, label: 'Escolha o tipo de QR', done: true },
  { n: 2, label: 'Criar conteúdo', done: true },
  { n: 3, label: 'Personalizar e baixar', done: false },
] as const;

export type QrType = 'site' | 'whatsapp' | 'vcard' | 'pix' | 'texto' | 'wifi' | 'email';

export const READY_TYPES = new Set<QrType>(['site', 'whatsapp']);

export const TYPE_LABELS: Record<QrType, string> = {
  site: 'Site / URL',
  whatsapp: 'WhatsApp',
  vcard: 'vCard',
  pix: 'PIX',
  texto: 'Texto',
  wifi: 'Wi-Fi',
  email: 'E-mail',
};

export const TYPE_CARDS: Array<{
  type: QrType;
  label: string;
  sublabel: string;
  ready: boolean;
  icon: string;
}> = [
  { type: 'site', label: TYPE_LABELS.site, sublabel: 'Abra um link ao escanear', ready: true, icon: 'globe' },
  {
    type: 'whatsapp',
    label: TYPE_LABELS.whatsapp,
    sublabel: 'Inicie uma conversa',
    ready: true,
    icon: 'smartphone',
  },
  { type: 'vcard', label: TYPE_LABELS.vcard, sublabel: 'Salve um contato na agenda', ready: true, icon: 'mail' },
  { type: 'pix', label: TYPE_LABELS.pix, sublabel: 'Pague com chave Pix', ready: true, icon: 'eye' },
  { type: 'texto', label: TYPE_LABELS.texto, sublabel: 'Mostre qualquer texto curto', ready: true, icon: 'download' },
  { type: 'wifi', label: TYPE_LABELS.wifi, sublabel: 'Conecte à rede Wi-Fi', ready: true, icon: 'message-circle' },
  { type: 'email', label: TYPE_LABELS.email, sublabel: 'Abra um e-mail pronto', ready: true, icon: 'arrow-left' },
];

export type Level1Tab = {
  key: 'custom' | 'brand' | 'ai';
  label: string;
  disabled: boolean;
  soon: boolean;
};

export const LEVEL1_TABS: Level1Tab[] = [
  { key: 'custom', label: 'Designs pessoais', disabled: false, soon: false },
  { key: 'brand', label: 'Designs com sua marca', disabled: false, soon: false },
  { key: 'ai', label: 'Designs com IA', disabled: true, soon: true },
];

export type Level2Tab = {
  key: 'geral' | 'personalizacao' | 'senha' | 'agendamento';
  label: string;
  disabled: boolean;
  soon: boolean;
};

export const LEVEL2_TABS: Level2Tab[] = [
  { key: 'geral', label: 'Geral', disabled: false, soon: false },
  { key: 'personalizacao', label: 'Personalização', disabled: false, soon: false },
  { key: 'senha', label: 'Senha', disabled: true, soon: true },
  { key: 'agendamento', label: 'Agendamento', disabled: true, soon: true },
];

export const SHAPE_LABELS: Record<string, string> = {
  square: 'Quadrado',
  rounded: 'Arredondado',
  circle: 'Circular',
  dots: 'Pontos',
  classy: 'Clássico',
  'classy-rounded': 'Clássico arredondado',
  'extra-rounded': 'Extra arredondado',
  'top-left-rounded': 'Topo esquerda',
  'bottom-right-rounded': 'Bottom direita',
};

export type ShapeOption = 'square' | 'rounded' | 'circle' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';