/**
 * Types communs pour tous les adaptateurs Odoo
 * Ces types sont independants de la version d'Odoo
 */

export type OdooVersion = '17' | '18' | '19' | '20'

export interface OdooConnectionConfig {
  id: string
  name: string
  url: string
  database: string
  username: string
  apiKey: string
  version: OdooVersion
  isActive: boolean
}

export interface OdooLocation {
  id: number
  name: string
  usage: 'supplier' | 'internal' | 'customer' | 'inventory' | 'production' | 'transit'
  completeName: string
}

export interface OdooProduct {
  id: number
  name: string
  defaultCode: string | null
  standardPrice: number
  qtyAvailable: number
  isStorable: boolean
}

export interface OdooStockMove {
  id: number
  date: string
  reference: string
  productId: number
  productName: string
  productQty: number
  priceUnit: number
  locationId: number
  locationName: string
  locationDestId: number
  locationDestName: string
  pickingName: string | null
  origin: string | null
  state: string
}

export interface StockEntryData {
  productId: number
  quantity: number
  priceUnit: number
  date?: string
  reference?: string
}

export interface StockValuationEntry {
  id: number
  date: string
  reference: string
  product: string
  productCode: string
  productId: number
  lotNumber: string | null
  quantity: number
  remainingQty: number
  unitValue: number
  unit: string
  totalValue: number
  description: string
  remainingValue: number
}

export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

// Configuration specifique par version
export interface VersionConfig {
  // IDs des emplacements (peuvent varier selon l'instance)
  locations: {
    suppliers: number
    stock: number
    customers: number
  }
  // Noms des champs (peuvent varier selon la version)
  fields: {
    stockMoveReference: string  // 'name' en v17, 'origin' en v19
    stockMoveDescription: string
  }
  // Fonctionnalites disponibles
  features: {
    hasPickedField: boolean  // Champ 'picked' sur stock.move
    hasQuantityField: boolean  // Champ 'quantity' vs 'product_uom_qty'
  }
}
