// Types pour les produits
export interface Product {
  id: number
  name: string
  default_code?: string
  barcode?: string
  qty_available: number
  virtual_available: number
  incoming_qty?: number
  outgoing_qty?: number
  free_qty?: number
  standard_price: number
  list_price?: number
  categ_id?: [number, string]
  uom_id?: [number, string]
  type?: string
  tracking?: 'none' | 'lot' | 'serial'
}

// Types pour les mouvements de stock
export interface StockMove {
  id: number
  product_id: [number, string]
  product_qty: number
  product_uom_qty?: number
  product_uom?: [number, string]
  location_id: [number, string]
  location_dest_id: [number, string]
  date: string
  date_deadline?: string
  state: 'draft' | 'confirmed' | 'assigned' | 'done' | 'cancelled'
  reference?: string
  picking_id?: [number, string]
  price_unit: number
  origin?: string
}

// Types pour les quantités en stock (par emplacement)
export interface StockQuant {
  id: number
  product_id: [number, string]
  location_id: [number, string]
  lot_id?: [number, string]
  package_id?: [number, string]
  owner_id?: [number, string]
  quantity: number
  reserved_quantity: number
  available_quantity?: number
  inventory_date?: string
  inventory_quantity?: number
}

// Types pour les emplacements
export interface StockLocation {
  id: number
  name: string
  complete_name: string
  usage: 'supplier' | 'view' | 'internal' | 'customer' | 'inventory' | 'production' | 'transit'
  location_id?: [number, string]
  warehouse_id?: [number, string]
  active: boolean
}

// Types pour les entrepôts
export interface Warehouse {
  id: number
  name: string
  code: string
  lot_stock_id: [number, string]
  view_location_id: [number, string]
  active: boolean
}

// Types pour les lots
export interface StockLot {
  id: number
  name: string
  product_id: [number, string]
  product_qty: number
  expiration_date?: string
  use_date?: string
  removal_date?: string
  alert_date?: string
}

// Types pour les bons de transfert (picking)
export interface StockPicking {
  id: number
  name: string
  partner_id?: [number, string]
  picking_type_id: [number, string]
  location_id: [number, string]
  location_dest_id: [number, string]
  scheduled_date: string
  date_done?: string
  state: 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done' | 'cancelled'
  origin?: string
  move_ids: number[]
}

// Types pour les commandes d'achat
export interface PurchaseOrder {
  id: number
  name: string
  partner_id: [number, string]
  date_order: string
  date_planned?: string
  state: 'draft' | 'sent' | 'to approve' | 'purchase' | 'done' | 'cancelled'
  amount_total: number
  amount_untaxed: number
  currency_id: [number, string]
  order_line: number[]
}

export interface PurchaseOrderLine {
  id: number
  order_id: [number, string]
  product_id: [number, string]
  name: string
  product_qty: number
  qty_received: number
  product_uom: [number, string]
  price_unit: number
  price_subtotal: number
  date_planned: string
}

// Types pour les commandes de vente
export interface SaleOrder {
  id: number
  name: string
  partner_id: [number, string]
  date_order: string
  state: 'draft' | 'sent' | 'sale' | 'done' | 'cancelled'
  amount_total: number
  amount_untaxed: number
  currency_id: [number, string]
  order_line: number[]
}

// Types pour les partenaires (fournisseurs/clients)
export interface Partner {
  id: number
  name: string
  email?: string
  phone?: string
  mobile?: string
  street?: string
  city?: string
  country_id?: [number, string]
  supplier_rank: number
  customer_rank: number
  is_company: boolean
}

// Types pour les catégories de produits
export interface ProductCategory {
  id: number
  name: string
  complete_name: string
  parent_id?: [number, string]
}

// Types pour les statistiques du dashboard
export interface DashboardStats {
  totalProducts: number
  totalQuantity: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
  pendingPurchaseOrders: number
  pendingSaleOrders: number
}

// Types pour les alertes
export interface StockAlert {
  id: number
  type: 'out_of_stock' | 'low_stock' | 'expiring' | 'expired'
  product: Product
  message: string
  severity: 'error' | 'warning' | 'info'
}

// Type pour les filtres de recherche
export interface SearchFilters {
  query?: string
  categoryId?: number
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  locationId?: number
}

// Type pour la pagination
export interface PaginationParams {
  page: number
  limit: number
  total?: number
}
