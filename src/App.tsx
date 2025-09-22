import type { FC } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import CartSheet from './components/CartSheet';
import CategoryTabs from './components/CategoryTabs';
import Header from './components/Header';
import MenuList from './components/MenuList';
import ProductModal from './components/ProductModal';
import { getMessagingConfig } from './config/messaging';
import { CATEGORIES, PRODUCTS } from './data/menu';
import { useGeolocation } from './hooks/useGeolocation';
import { useLocalStorageCart } from './hooks/useLocalStorageCart';
import type { CartSelection, CartTotals, Product } from './types/menu';
import type { OrderRequest } from './types/order';
import { mapCartLineToOrderItem } from './types/order';
import { OrderRepository } from './services/OrderRepository';
import { buildCartLines, createCartKey } from './utils/cart';
import { formatCurrency } from './utils/format';
import styles from './styles/App.module.css';

const { whatsappNumber } = getMessagingConfig();

const App: FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]?.name ?? '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);
  const orderRepository = useMemo<OrderRepository>(() => new OrderRepository(), []);

  const { cartMap, increment, clear } = useLocalStorageCart();
  const geolocation = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000,
  });

  const geolocationStatus = geolocation.status;
  const geolocationError = geolocation.error;
  const geolocationPosition = geolocation.coords;
  const geolocationOptions = geolocation.options;

  const cartLines = useMemo(() => buildCartLines(cartMap, PRODUCTS), [cartMap]);

  const totals: CartTotals = useMemo(() => {
    const total = cartLines.reduce((accumulator, line) => accumulator + line.unitPrice * line.quantity, 0);
    const count = cartLines.reduce((accumulator, line) => accumulator + line.quantity, 0);
    return { total, count };
  }, [cartLines]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return PRODUCTS.filter((product) => {
      if (product.cat !== activeCategory) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        product.name.toLowerCase().includes(query) || product.desc.toLowerCase().includes(query)
      );
    });
  }, [activeCategory, searchTerm]);

  useEffect((): void => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  useEffect((): void => {
    if (!cartButtonRef.current || totals.count === 0) {
      return;
    }
    cartButtonRef.current.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.04)' },
        { transform: 'scale(1)' },
      ],
      { duration: 260 },
    );
  }, [totals.count]);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const handleSelectCategory = (category: string): void => {
    setActiveCategory(category);
  };

  const handleSearchChange = (value: string): void => {
    setSearchTerm(value);
  };

  const handleAddressChange = (value: string): void => {
    setAddress(value);
  };

  const handleRequestLocation = (): void => {
    const requestOptions =
      typeof geolocationOptions.maximumAge === 'number'
        ? { maximumAge: geolocationOptions.maximumAge }
        : undefined;
    geolocation.requestCurrentPosition(requestOptions);
  };

  useEffect((): void => {
    if (geolocationStatus === 'idle') {
      return;
    }

    if (geolocationStatus === 'loading') {
      setAddress('Obtendo localização...');
      return;
    }

    if (geolocationStatus === 'unsupported') {
      setAddress('Geolocalização indisponível');
      return;
    }

    if (geolocationStatus === 'error') {
      const fallbackMessage = geolocationError?.message?.trim()
        ? geolocationError.message
        : 'Falha ao obter localização';
      setAddress(fallbackMessage);
      return;
    }

    if (geolocationStatus === 'success' && geolocationPosition) {
      const { latitude, longitude } = geolocationPosition.coords;
      let message = `Coordenadas: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      if (typeof geolocationOptions.maximumAge === 'number' && geolocationOptions.maximumAge > 0) {
        const maxAgeSeconds = Math.round(geolocationOptions.maximumAge / 1000);
        const ageSeconds = Math.max(
          0,
          Math.round((Date.now() - geolocationPosition.timestamp) / 1000),
        );
        const remainingSeconds = Math.max(0, maxAgeSeconds - ageSeconds);
        message += ` • cache ${remainingSeconds}s`;
      }

      setAddress(message);
    }
  }, [
    geolocationStatus,
    geolocationError,
    geolocationPosition,
    geolocationOptions.maximumAge,
  ]);

  const handleOpenProduct = (product: Product): void => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleAddToCart = (product: Product, selection: CartSelection): void => {
    const key = createCartKey(product.id, selection);
    increment(key, 1);
    setIsModalOpen(false);
    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  const handleOpenCart = (): void => {
    if (totals.count > 0) {
      setIsCartOpen(true);
    }
  };

  const handleCloseCart = (): void => {
    setIsCartOpen(false);
  };

  const handleIncrementLine = (key: string): void => {
    increment(key, 1);
  };

  const handleDecrementLine = (key: string): void => {
    increment(key, -1);
  };

  const handleCheckout = async (): Promise<void> => {
    if (totals.count === 0 || isSubmittingOrder) {
      return;
    }

    const orderRequest: OrderRequest = {
      customer: {
        name: 'Cliente via aplicativo web',
        phone: '',
      },
      items: cartLines.map(mapCartLineToOrderItem),
      totals,
      address: {
        label: address || 'Endereço pendente',
      },
      status: 'pending',
      metadata: {
        addressText: address,
        channel: 'web',
      },
    };

    const linesSummary = cartLines
      .map((line) => {
        const selectionValues = Object.values(line.selection)
          .map((value) => (Array.isArray(value) ? value.join(', ') : value))
          .filter((value) => Boolean(value))
          .join(' | ');
        const selectionText = selectionValues ? ` (${selectionValues})` : '';
        const lineTotal = formatCurrency(line.unitPrice * line.quantity);
        return `• ${line.product.name} x${line.quantity}${selectionText} — ${lineTotal}`;
      })
      .join('%0A');

    const encodedAddress = encodeURIComponent(address || 'endereço pendente');
    const totalText = formatCurrency(totals.total);
    setIsSubmittingOrder(true);

    try {
      const orderResponse = await orderRepository.create(orderRequest);
      const orderReference = orderResponse.id ? `Pedido #${orderResponse.id}%0A%0A` : '';
      const message = `Pizzaria Minutu's - novo pedido%0A%0A${orderReference}${linesSummary}%0A%0ATotal: ${totalText}%0AEntrega: ${encodedAddress}%0A`;
      const checkoutUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
      window.open(checkoutUrl, '_blank');
      clear();
      setIsCartOpen(false);
    } catch (error) {
      console.error('Erro ao registrar pedido', error);
      window.alert('Não foi possível registrar o pedido. Tente novamente em instantes.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleToggleTheme = (): void => {
    setIsDarkMode((previous) => !previous);
  };

  return (
    <div className={styles.app}>
      <Header
        address={address}
        onAddressChange={handleAddressChange}
        onRequestLocation={handleRequestLocation}
        onToggleTheme={handleToggleTheme}
        locationStatus={geolocationStatus}
        isLocationSupported={geolocation.isSupported}
      />
      <CategoryTabs
        categories={CATEGORIES}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
      />
      <MenuList
        products={filteredProducts}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onProductClick={handleOpenProduct}
      />
      <div className={styles.fab}>
        <button
          ref={cartButtonRef}
          type="button"
          className={styles.cartButton}
          disabled={totals.count === 0}
          onClick={handleOpenCart}
        >
          <strong>{totals.count}</strong> itens • <strong>{formatCurrency(totals.total)}</strong>
          <small className={styles.cartHint}>ver sacola</small>
        </button>
      </div>
      <CartSheet
        isOpen={isCartOpen}
        lines={cartLines}
        totals={totals}
        onClose={handleCloseCart}
        onIncrement={handleIncrementLine}
        onDecrement={handleDecrementLine}
        onCheckout={handleCheckout}
        isProcessingCheckout={isSubmittingOrder}
      />
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAdd={handleAddToCart}
      />
    </div>
  );
};

export default App;
