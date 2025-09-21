import type {
  CartLine,
  CartSelection,
  CartStorageRecord,
  Product,
  ProductOptionGroup,
} from '../types/menu';

const STORAGE_SEPARATOR = '::';

type NodeBufferLike = {
  from: (input: string, encoding: string) => { toString: (encoding: string) => string };
};

const resolveBuffer = (): NodeBufferLike | undefined => {
  const candidate = (globalThis as { Buffer?: NodeBufferLike }).Buffer;
  return candidate;
};

const encodeBase64 = (value: string): string => {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }

  const buffer = resolveBuffer();
  if (buffer) {
    return buffer.from(value, 'utf8').toString('base64');
  }

  return value;
};

const decodeBase64 = (value: string): string => {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(value);
  }

  const buffer = resolveBuffer();
  if (buffer) {
    return buffer.from(value, 'base64').toString('utf8');
  }

  return value;
};

const sortSelection = (selection: CartSelection): CartSelection => {
  const sorted: CartSelection = {};
  Object.keys(selection)
    .sort()
    .forEach((key: string) => {
      const value = selection[key];
      sorted[key] = Array.isArray(value) ? [...value].sort() : value;
    });
  return sorted;
};

export const createDefaultSelection = (product: Product): CartSelection => {
  const selection: CartSelection = {};
  if (!product.opts) {
    return selection;
  }

  product.opts.groups.forEach((group: ProductOptionGroup): void => {
    if (group.type === 'radio') {
      const fallback = group.options.find((option) => option.default) ?? group.options[0];
      if (fallback) {
        selection[group.key] = fallback.k;
      }
    } else {
      selection[group.key] = [];
    }
  });

  return selection;
};

export const createCartKey = (productId: string, selection: CartSelection | undefined): string => {
  if (!selection || Object.keys(selection).length === 0) {
    return productId;
  }

  const normalized = sortSelection(selection);
  const payload = JSON.stringify(normalized);
  return `${productId}${STORAGE_SEPARATOR}${encodeBase64(payload)}`;
};

export const parseCartKey = (key: string): { productId: string; selection: CartSelection } => {
  const [productId, encodedSelection] = key.split(STORAGE_SEPARATOR);
  if (!encodedSelection) {
    return { productId, selection: {} };
  }

  try {
    const json = decodeBase64(encodedSelection);
    const parsed = JSON.parse(json) as CartSelection;
    return { productId, selection: parsed };
  } catch (error) {
    console.warn('Falha ao decodificar seleção do carrinho', error);
    return { productId, selection: {} };
  }
};

export const calculateUnitPrice = (product: Product, selection: CartSelection): number => {
  let total = product.price;
  if (!product.opts) {
    return total;
  }

  product.opts.groups.forEach((group: ProductOptionGroup): void => {
    const picked = selection[group.key];
    if (group.type === 'radio' && typeof picked === 'string') {
      const choice = group.options.find((option) => option.k === picked);
      if (choice) {
        total += choice.delta;
      }
    }

    if (group.type === 'check' && Array.isArray(picked)) {
      picked.forEach((value: string): void => {
        const choice = group.options.find((option) => option.k === value);
        if (choice) {
          total += choice.delta;
        }
      });
    }
  });

  return total;
};

export const buildCartLines = (cartMap: CartStorageRecord, products: Product[]): CartLine[] => {
  return Object.entries(cartMap).flatMap(([key, quantity]): CartLine[] => {
    const { productId, selection } = parseCartKey(key);
    const product = products.find((item) => item.id === productId);
    if (!product || quantity <= 0) {
      return [];
    }

    const unitPrice = calculateUnitPrice(product, selection);
    return [
      {
        key,
        product,
        quantity,
        selection,
        unitPrice,
      },
    ];
  });
};

export const summarizeSelection = (product: Product, selection: CartSelection): string => {
  if (!product.opts) {
    return product.desc;
  }

  const segments: string[] = [];
  product.opts.groups.forEach((group: ProductOptionGroup): void => {
    const picked = selection[group.key];
    if (group.type === 'radio' && typeof picked === 'string') {
      const option = group.options.find((item) => item.k === picked);
      if (option) {
        segments.push(option.label);
      }
    }

    if (group.type === 'check' && Array.isArray(picked) && picked.length > 0) {
      const labels = picked
        .map((value) => group.options.find((option) => option.k === value)?.label)
        .filter((label): label is string => Boolean(label));
      if (labels.length > 0) {
        segments.push(labels.join(', '));
      }
    }
  });

  return segments.join(' • ') || product.desc;
};
