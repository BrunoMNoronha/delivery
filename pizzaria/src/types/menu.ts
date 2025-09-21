export type OptionType = 'radio' | 'check';

export interface ProductOption {
  k: string;
  label: string;
  delta: number;
  default?: boolean;
}

export interface ProductOptionGroup {
  key: string;
  title: string;
  required: boolean;
  type: OptionType;
  options: ProductOption[];
}

export interface ProductOptions {
  groups: ProductOptionGroup[];
}

export interface Product {
  id: string;
  cat: string;
  name: string;
  desc: string;
  price: number;
  img: string;
  opts?: ProductOptions | null;
}

export interface Category {
  name: string;
  icon: string;
}

export type RadioSelection = string;
export type CheckSelection = string[];

export type CartSelection = Record<string, RadioSelection | CheckSelection>;

export interface CartStorageRecord {
  [key: string]: number;
}

export interface CartLine {
  key: string;
  product: Product;
  quantity: number;
  selection: CartSelection;
  unitPrice: number;
}

export interface CartTotals {
  total: number;
  count: number;
}

export interface CheckoutPayload {
  lines: CartLine[];
  totals: CartTotals;
  address: string;
}
