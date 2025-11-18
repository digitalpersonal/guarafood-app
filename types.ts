


export interface Banner {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  targetType: 'restaurant' | 'category';
  targetValue: string; // Restaurant name or Category name
  active?: boolean; // Added active state
}

export interface RestaurantCategory {
  id: number;
  name: string;
}

// New interface for detailed operating hours
export interface OperatingHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  opens: string;     // "HH:MM"
  closes: string;    // "HH:MM"
  isOpen: boolean;
}

export interface Restaurant {
  id: number;
  name: string;
  category: string;
  description?: string; // Added short description
  deliveryTime: string;
  rating: number;
  imageUrl: string;
  paymentGateways: string[];
  address: string;
  phone: string;
  openingHours: string; // Can be a summary like "18:00 - 23:00"
  closingHours: string; // Kept for simple cases/backwards compatibility
  deliveryFee: number;
  mercado_pago_credentials?: { accessToken: string };
  operatingHours?: OperatingHours[]; // The new detailed structure
}

export interface Addon {
  id: number;
  name: string;
  price: number;
  restaurantId: number;
}

// New SizeOption interface for menu items
export interface SizeOption {
  name: string;
  price: number;
  freeAddonCount?: number;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number; // Will represent the base/default price
  originalPrice?: number;
  imageUrl: string;
  restaurantId: number;
  categoryId?: number; // Added for DB-driven categories
  activePromotion?: Promotion;
  isPizza?: boolean;
  isAcai?: boolean;
  isMarmita?: boolean; // For daily specials like lunch boxes
  marmitaOptions?: string[]; // Editable daily text options for marmitas
  freeAddonCount?: number; // Kept for simple items, but sizes will override
  availableAddonIds?: number[];
  sizes?: SizeOption[]; // Array for different sizes
  isDailySpecial?: boolean; // For "Destaque do Dia"
  isWeeklySpecial?: boolean; // For supermarket "Promoções da Semana"
  availableDays?: number[]; // For "Prato do Dia". 0=Sun, 1=Mon, etc.
}

export interface Combo {
  id: number;
  name:string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  restaurantId: number;
  menuItemIds: number[];
  activePromotion?: Promotion;
  categoryId?: number; // Added for DB interaction
}

export interface MenuCategory {
  id: number; // Added for DB interaction
  name: string;
  items: MenuItem[];
  combos?: Combo[];
  restaurantId: number;
  displayOrder?: number; // Added for reordering
  iconUrl?: string; // NEW FIELD
}

// New Promotion interface
export interface Promotion {
  id: number;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  targetType: 'ITEM' | 'COMBO' | 'CATEGORY';
  targetIds: (number | string)[]; // Can be item IDs, combo IDs, or category names
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
  restaurantId: number;
}

export interface Coupon {
  id: number;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue?: number; // Optional minimum order value
  expirationDate: string; // ISO 8601 format
  isActive: boolean;
  restaurantId: number;
}

// Refactored CartItem to support custom pizzas and addons
export interface CartItem {
  id: string; // Composite key like 'item-101' or 'pizza-201-202-addon-1'
  name: string;
  price: number; // Final price including addons and half-pizza logic
  basePrice: number; // Price before addons
  imageUrl: string;
  quantity: number;
  description: string;
  originalPrice?: number;
  promotionName?: string;
  halves?: { name: string; price: number }[]; // For half-and-half pizzas
  selectedAddons?: Addon[]; // For addons
  sizeName?: string; // To display selected size, e.g., "Grande"
}

export type OrderStatus = 'Aguardando Pagamento' | 'Novo Pedido' | 'Preparando' | 'A Caminho' | 'Entregue' | 'Cancelado';

export interface Order {
  id: string;
  timestamp: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerAddress?: {
    zipCode: string;
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
  };
  items: CartItem[];
  totalPrice: number;
  restaurantId: number;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  paymentMethod: string;
  couponCode?: string;
  discountAmount?: number;
  subtotal?: number;
  deliveryFee?: number;
  payment_id?: string;
  payment_details?: any;
}

export type Role = 'admin' | 'merchant';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  restaurantId?: number;
}