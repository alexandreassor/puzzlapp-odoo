import type {
  Product,
  StockMove,
  StockQuant,
  StockLocation,
  Warehouse,
  StockLot,
  StockPicking,
  PurchaseOrder,
  PurchaseOrderLine,
  SaleOrder,
  Partner,
  ProductCategory
} from '../types'
import { getApiSettings, getApiUrl, getOdooCredentials, saveApiSettings, type OdooVersion } from '../components/SettingsModal'

// Cache pour la version detectee automatiquement
let detectedVersion: string | null = null
let versionDetectionDone = false

// Fonction pour reinitialiser le cache de detection de version
// A appeler quand les parametres de connexion changent
export function resetVersionDetection(): void {
  detectedVersion = null
  versionDetectionDone = false
  console.log('[resetVersionDetection] Cache de detection reinitialise')
}

// Detecte la version Odoo depuis l'API et la sauvegarde dans les parametres
async function detectAndSaveOdooVersion(): Promise<string | null> {
  if (versionDetectionDone) return detectedVersion

  try {
    const credentials = getOdooCredentials()
    if (!credentials) {
      versionDetectionDone = true
      return null
    }

    const apiUrl = getApiUrl()

    // Appel API pour obtenir la version via ir.module.module
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        odoo: credentials,
        body: {
          model: 'ir.module.module',
          method: 'search_read',
          args: [[['name', '=', 'base']]],
          kwargs: { fields: ['installed_version'], limit: 1 }
        }
      })
    })

    const data = await response.json()
    if (data.success && data.data?.result?.[0]?.installed_version) {
      const versionStr = data.data.result[0].installed_version
      // Extraire le numero majeur (ex: "19.0.1.3.0" -> "19")
      const majorMatch = versionStr.match(/^(\d+)/)
      if (majorMatch) {
        detectedVersion = majorMatch[1]

        // Sauvegarder la version detectee dans les parametres si differente
        const currentSettings = getApiSettings()
        if (currentSettings && currentSettings.odooVersion !== detectedVersion) {
          console.log(`[detectAndSaveOdooVersion] Version detectee: ${detectedVersion} (ancienne: ${currentSettings.odooVersion})`)
          saveApiSettings({
            ...currentSettings,
            odooVersion: detectedVersion as OdooVersion
          })
        }
      }
    }

    versionDetectionDone = true
    return detectedVersion
  } catch (error) {
    console.error('[detectAndSaveOdooVersion] Erreur:', error)
    versionDetectionDone = true
    return null
  }
}

// Fonction utilitaire pour les appels API
async function callOdoo<T>(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<T> {
  // Detecter automatiquement la version Odoo au premier appel (sauf pour ir.module.module pour eviter boucle infinie)
  if (!versionDetectionDone && model !== 'ir.module.module') {
    await detectAndSaveOdooVersion()
  }

  const settings = getApiSettings()
  const apiUrl = getApiUrl()

  console.log(`[ODOO] Appel ${model}.${method} via ${settings.mode} -> ${apiUrl}`)

  let requestBody: object

  // Mode proxy local - envoyer les credentials avec chaque requête
  const credentials = getOdooCredentials()
  if (!credentials) {
    console.error('[ODOO] Credentials manquants')
    throw new Error('Configuration ODOO incomplète. Vérifiez les paramètres de connexion.')
  }
  requestBody = {
    odoo: credentials,
    body: { model, method, args, kwargs }
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      console.error(`[ODOO] Erreur HTTP ${response.status}: ${response.statusText}`)
      throw new Error(`Erreur serveur ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`[ODOO] Réponse ${model}.${method}:`, data.success ? 'OK' : 'ERREUR', data.error || '')

    if (data.success && data.data?.result !== undefined) {
      return data.data.result as T
    } else {
      throw new Error(data.error || `Erreur lors de l'appel a ${model}.${method}`)
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('[ODOO] Impossible de se connecter au serveur:', apiUrl)
      throw new Error(`Impossible de se connecter au proxy local (${apiUrl}). Vérifiez que le serveur est démarré.`)
    }
    throw error
  }
}

// =====================
// PRODUITS
// =====================

export async function fetchProducts(limit = 100, offset = 0): Promise<Product[]> {
  return callOdoo<Product[]>('product.product', 'search_read', [[]], {
    fields: ['name', 'default_code', 'barcode', 'qty_available', 'virtual_available',
             'incoming_qty', 'outgoing_qty', 'free_qty', 'standard_price', 'list_price',
             'categ_id', 'uom_id', 'type', 'tracking'],
    limit,
    offset
  })
}

export async function searchProducts(query: string): Promise<Product[]> {
  return callOdoo<Product[]>('product.product', 'search_read', [
    ['|', ['name', 'ilike', query], ['default_code', 'ilike', query]]
  ], {
    fields: ['name', 'default_code', 'qty_available', 'virtual_available', 'standard_price', 'list_price', 'categ_id', 'uom_id'],
    limit: 50
  })
}

export async function fetchProductDetails(productId: number): Promise<Product | null> {
  const results = await callOdoo<Product[]>('product.product', 'search_read', [
    [['id', '=', productId]]
  ], {
    fields: ['id', 'name', 'default_code', 'barcode', 'qty_available', 'virtual_available',
             'incoming_qty', 'outgoing_qty', 'free_qty', 'standard_price', 'list_price',
             'categ_id', 'uom_id', 'type', 'tracking']
  })
  return results.length > 0 ? results[0] : null
}

export async function fetchProductsByCategory(categoryId: number): Promise<Product[]> {
  return callOdoo<Product[]>('product.product', 'search_read', [
    [['categ_id', '=', categoryId]]
  ], {
    fields: ['name', 'default_code', 'qty_available', 'virtual_available', 'standard_price', 'categ_id', 'uom_id'],
    limit: 100
  })
}

export async function fetchLowStockProducts(threshold = 5): Promise<Product[]> {
  return callOdoo<Product[]>('product.product', 'search_read', [
    [['qty_available', '>', 0], ['qty_available', '<', threshold]]
  ], {
    fields: ['name', 'default_code', 'qty_available', 'virtual_available', 'standard_price', 'categ_id'],
    limit: 100
  })
}

export async function fetchOutOfStockProducts(): Promise<Product[]> {
  return callOdoo<Product[]>('product.product', 'search_read', [
    [['qty_available', '<=', 0]]
  ], {
    fields: ['name', 'default_code', 'qty_available', 'virtual_available', 'standard_price', 'categ_id'],
    limit: 100
  })
}

// =====================
// MOUVEMENTS DE STOCK
// =====================

export async function fetchProductHistory(productId: number, limit = 100): Promise<StockMove[]> {
  return callOdoo<StockMove[]>('stock.move', 'search_read', [
    [['product_id', '=', productId]]
  ], {
    fields: ['id', 'product_id', 'product_qty', 'product_uom_qty', 'product_uom',
             'location_id', 'location_dest_id', 'date', 'date_deadline', 'state',
             'reference', 'picking_id', 'price_unit', 'origin'],
    order: 'date desc',
    limit
  })
}

export async function fetchRecentMoves(limit = 20): Promise<StockMove[]> {
  return callOdoo<StockMove[]>('stock.move', 'search_read', [
    [['state', '=', 'done']]
  ], {
    fields: ['id', 'product_id', 'product_qty', 'location_id', 'location_dest_id',
             'date', 'state', 'reference', 'picking_id', 'price_unit'],
    order: 'date desc',
    limit
  })
}

export async function fetchMovesByDateRange(dateFrom: string, dateTo: string): Promise<StockMove[]> {
  return callOdoo<StockMove[]>('stock.move', 'search_read', [
    [['date', '>=', dateFrom], ['date', '<=', dateTo], ['state', '=', 'done']]
  ], {
    fields: ['id', 'product_id', 'product_qty', 'location_id', 'location_dest_id',
             'date', 'state', 'reference', 'price_unit'],
    order: 'date desc',
    limit: 500
  })
}

// =====================
// QUANTITÉS EN STOCK (QUANTS)
// =====================

export async function fetchStockQuants(productId?: number): Promise<StockQuant[]> {
  const domain = productId ? [['product_id', '=', productId]] : []
  return callOdoo<StockQuant[]>('stock.quant', 'search_read', [domain], {
    fields: ['product_id', 'location_id', 'lot_id', 'package_id', 'owner_id',
             'quantity', 'reserved_quantity', 'available_quantity'],
    limit: 500
  })
}

export async function fetchStockByLocation(locationId: number): Promise<StockQuant[]> {
  return callOdoo<StockQuant[]>('stock.quant', 'search_read', [
    [['location_id', '=', locationId], ['quantity', '>', 0]]
  ], {
    fields: ['product_id', 'location_id', 'lot_id', 'quantity', 'reserved_quantity'],
    limit: 500
  })
}

// =====================
// EMPLACEMENTS
// =====================

export async function fetchLocations(): Promise<StockLocation[]> {
  return callOdoo<StockLocation[]>('stock.location', 'search_read', [
    [['usage', 'in', ['internal', 'transit']]]
  ], {
    fields: ['id', 'name', 'complete_name', 'usage', 'location_id', 'warehouse_id', 'active'],
    limit: 200
  })
}

export async function fetchLocationDetails(locationId: number): Promise<StockLocation | null> {
  const results = await callOdoo<StockLocation[]>('stock.location', 'search_read', [
    [['id', '=', locationId]]
  ], {
    fields: ['id', 'name', 'complete_name', 'usage', 'location_id', 'warehouse_id', 'active']
  })
  return results.length > 0 ? results[0] : null
}

// =====================
// ENTREPÔTS
// =====================

export async function fetchWarehouses(): Promise<Warehouse[]> {
  return callOdoo<Warehouse[]>('stock.warehouse', 'search_read', [[]], {
    fields: ['id', 'name', 'code', 'lot_stock_id', 'view_location_id', 'active'],
    limit: 50
  })
}

// =====================
// LOTS / NUMÉROS DE SÉRIE
// =====================

export async function fetchLots(productId?: number): Promise<StockLot[]> {
  const domain = productId ? [['product_id', '=', productId]] : []
  return callOdoo<StockLot[]>('stock.lot', 'search_read', [domain], {
    fields: ['id', 'name', 'product_id', 'product_qty', 'expiration_date', 'use_date', 'removal_date', 'alert_date'],
    limit: 200
  })
}

export async function fetchExpiringLots(daysUntilExpiration = 30): Promise<StockLot[]> {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysUntilExpiration)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  return callOdoo<StockLot[]>('stock.lot', 'search_read', [
    [['expiration_date', '<=', futureDateStr], ['expiration_date', '>=', new Date().toISOString().split('T')[0]]]
  ], {
    fields: ['id', 'name', 'product_id', 'product_qty', 'expiration_date'],
    order: 'expiration_date asc',
    limit: 100
  })
}

// =====================
// BONS DE TRANSFERT (PICKING)
// =====================

export async function fetchPickings(state?: string): Promise<StockPicking[]> {
  const domain = state ? [['state', '=', state]] : []
  return callOdoo<StockPicking[]>('stock.picking', 'search_read', [domain], {
    fields: ['id', 'name', 'partner_id', 'picking_type_id', 'location_id', 'location_dest_id',
             'scheduled_date', 'date_done', 'state', 'origin', 'move_ids'],
    order: 'scheduled_date desc',
    limit: 100
  })
}

export async function fetchPickingDetails(pickingId: number): Promise<StockPicking | null> {
  const results = await callOdoo<StockPicking[]>('stock.picking', 'search_read', [
    [['id', '=', pickingId]]
  ], {
    fields: ['id', 'name', 'partner_id', 'picking_type_id', 'location_id', 'location_dest_id',
             'scheduled_date', 'date_done', 'state', 'origin', 'move_ids']
  })
  return results.length > 0 ? results[0] : null
}

// =====================
// COMMANDES D'ACHAT
// =====================

export async function fetchPurchaseOrders(state?: string): Promise<PurchaseOrder[]> {
  const domain = state ? [['state', '=', state]] : []
  return callOdoo<PurchaseOrder[]>('purchase.order', 'search_read', [domain], {
    fields: ['id', 'name', 'partner_id', 'date_order', 'date_planned', 'state',
             'amount_total', 'amount_untaxed', 'currency_id', 'order_line'],
    order: 'date_order desc',
    limit: 100
  })
}

export async function fetchPurchaseOrderDetails(orderId: number): Promise<PurchaseOrder | null> {
  const results = await callOdoo<PurchaseOrder[]>('purchase.order', 'search_read', [
    [['id', '=', orderId]]
  ], {
    fields: ['id', 'name', 'partner_id', 'date_order', 'date_planned', 'state',
             'amount_total', 'amount_untaxed', 'currency_id', 'order_line']
  })
  return results.length > 0 ? results[0] : null
}

export async function fetchPurchaseOrderLines(orderId: number): Promise<PurchaseOrderLine[]> {
  return callOdoo<PurchaseOrderLine[]>('purchase.order.line', 'search_read', [
    [['order_id', '=', orderId]]
  ], {
    fields: ['id', 'order_id', 'product_id', 'name', 'product_qty', 'qty_received',
             'product_uom', 'price_unit', 'price_subtotal', 'date_planned']
  })
}

export async function createPurchaseOrder(partnerId: number, lines: { productId: number; quantity: number; priceUnit?: number }[]): Promise<number> {
  const orderLines = lines.map(line => [0, 0, {
    product_id: line.productId,
    product_qty: line.quantity,
    price_unit: line.priceUnit || 0
  }])

  return callOdoo<number>('purchase.order', 'create', [{
    partner_id: partnerId,
    order_line: orderLines
  }])
}

export async function confirmPurchaseOrder(orderId: number): Promise<boolean> {
  return callOdoo<boolean>('purchase.order', 'button_confirm', [[orderId]])
}

// =====================
// COMMANDES DE VENTE
// =====================

export async function fetchSaleOrders(state?: string): Promise<SaleOrder[]> {
  const domain = state ? [['state', '=', state]] : []
  return callOdoo<SaleOrder[]>('sale.order', 'search_read', [domain], {
    fields: ['id', 'name', 'partner_id', 'date_order', 'state',
             'amount_total', 'amount_untaxed', 'currency_id', 'order_line'],
    order: 'date_order desc',
    limit: 100
  })
}

// =====================
// PARTENAIRES (FOURNISSEURS / CLIENTS)
// =====================

export async function fetchSuppliers(): Promise<Partner[]> {
  return callOdoo<Partner[]>('res.partner', 'search_read', [
    [['supplier_rank', '>', 0]]
  ], {
    fields: ['id', 'name', 'email', 'phone', 'mobile', 'street', 'city', 'country_id', 'supplier_rank', 'is_company'],
    limit: 200
  })
}

export async function fetchCustomers(): Promise<Partner[]> {
  return callOdoo<Partner[]>('res.partner', 'search_read', [
    [['customer_rank', '>', 0]]
  ], {
    fields: ['id', 'name', 'email', 'phone', 'mobile', 'street', 'city', 'country_id', 'customer_rank', 'is_company'],
    limit: 200
  })
}

// =====================
// CATÉGORIES DE PRODUITS
// =====================

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  return callOdoo<ProductCategory[]>('product.category', 'search_read', [[]], {
    fields: ['id', 'name', 'complete_name', 'parent_id'],
    limit: 200
  })
}

// =====================
// CALCULS ET UTILITAIRES
// =====================

export function calculateCUMP(moves: StockMove[], locationId = 8): number {
  let totalCost = 0
  let totalQuantity = 0

  const validMoves = moves.filter(m => m.state === 'done')

  for (const move of validMoves) {
    const qty = move.product_qty || 0
    const price = move.price_unit || 0
    const destId = move.location_dest_id?.[0]

    if (destId === locationId) {
      totalCost += qty * price
      totalQuantity += qty
    }
  }

  return totalQuantity > 0 ? totalCost / totalQuantity : 0
}

export function calculateStockAtDate(moves: StockMove[], untilDate?: string, locationId = 8): number {
  let totalQuantity = 0

  const validMoves = moves.filter(m => m.state === 'done')

  for (const move of validMoves) {
    if (untilDate && new Date(move.date) > new Date(untilDate)) {
      continue
    }

    const qty = move.product_qty || 0
    const destId = move.location_dest_id?.[0]
    const srcId = move.location_id?.[0]

    if (destId === locationId) {
      totalQuantity += qty
    } else if (srcId === locationId) {
      totalQuantity -= qty
    }
  }

  return Math.max(0, totalQuantity)
}

export function getMoveType(move: StockMove, internalLocationId = 8): 'in' | 'out' | 'transfer' {
  const destId = move.location_dest_id?.[0]
  const srcId = move.location_id?.[0]

  if (destId === internalLocationId && srcId !== internalLocationId) return 'in'
  if (srcId === internalLocationId && destId !== internalLocationId) return 'out'
  return 'transfer'
}

// =====================
// CRÉATION D'ENTRÉES DE STOCK
// =====================

export interface StockEntryData {
  productId: number
  quantity: number
  priceUnit: number
  date?: string
  reference?: string
}

// Créer une entrée de stock (réception)
export async function createStockEntry(data: StockEntryData): Promise<{ success: boolean; moveId?: number; error?: string }> {
  try {
    // Location 4 = Suppliers/Vendors (source)
    // Location 8 = WH/Stock (destination - stock interne)
    const sourceLocationId = 1  // Fournisseurs
    const destLocationId = 5    // Stock interne

    // Créer le mouvement de stock directement en état "done"
    // Les méthodes privées (_action_confirm, etc.) ne sont pas accessibles via API
    const moveData = {
      origin: data.reference || `Entrée stock - ${new Date().toISOString()}`,
      product_id: data.productId,
      product_uom_qty: data.quantity,
      quantity: data.quantity,
      product_uom: 1, // Unités par défaut
      location_id: sourceLocationId,
      location_dest_id: destLocationId,
      price_unit: data.priceUnit,
      date: data.date ? `${data.date} 12:00:00` : new Date().toISOString(),
      state: 'draft'
    }

    // Créer le mouvement
    const moveId = await callOdoo<number>('stock.move', 'create', [moveData])

    if (!moveId) {
      throw new Error('Échec de la création du mouvement')
    }

    // Valider directement via write (contourne les méthodes privées)
    await callOdoo<boolean>('stock.move', 'write', [[moveId], {
      state: 'done',
      quantity: data.quantity,
      picked: true
    }])

    return { success: true, moveId }
  } catch (error) {
    console.error('Erreur création entrée stock:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

// Créer une sortie de stock
export async function createStockExit(data: StockEntryData): Promise<{ success: boolean; moveId?: number; error?: string }> {
  try {
    // Location 8 = WH/Stock (source - stock interne)
    // Location 5 = Customers (destination)
    const sourceLocationId = 8  // Stock interne
    const destLocationId = 5    // Clients

    const moveData = {
      origin: data.reference || `Sortie stock - ${new Date().toISOString()}`,
      product_id: data.productId,
      product_uom_qty: data.quantity,
      quantity: data.quantity,
      product_uom: 1,
      location_id: sourceLocationId,
      location_dest_id: destLocationId,
      price_unit: data.priceUnit,
      date: data.date ? `${data.date} 12:00:00` : new Date().toISOString(),
      state: 'draft'
    }

    const moveId = await callOdoo<number>('stock.move', 'create', [moveData])

    if (!moveId) {
      throw new Error('Échec de la création du mouvement')
    }

    // Valider directement via write (contourne les méthodes privées)
    await callOdoo<boolean>('stock.move', 'write', [[moveId], {
      state: 'done',
      quantity: data.quantity,
      picked: true
    }])

    return { success: true, moveId }
  } catch (error) {
    console.error('Erreur création sortie stock:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

// Ajuster l'inventaire (correction de stock)
export async function adjustInventory(
  productId: number,
  newQuantity: number,
  locationId = 8
): Promise<{ success: boolean; error?: string }> {
  try {
    // Trouver ou créer le quant
    const quants = await callOdoo<StockQuant[]>('stock.quant', 'search_read', [
      [['product_id', '=', productId], ['location_id', '=', locationId]]
    ], {
      fields: ['id', 'quantity'],
      limit: 1
    })

    if (quants.length > 0) {
      // Mettre à jour le quant existant
      await callOdoo<boolean>('stock.quant', 'write', [[quants[0].id], {
        inventory_quantity: newQuantity,
        inventory_date: new Date().toISOString().split('T')[0]
      }])
      // Appliquer l'ajustement
      await callOdoo<boolean>('stock.quant', 'action_apply_inventory', [[quants[0].id]])
    } else {
      // Créer un nouveau quant
      await callOdoo<number>('stock.quant', 'create', [{
        product_id: productId,
        location_id: locationId,
        inventory_quantity: newQuantity,
        inventory_date: new Date().toISOString().split('T')[0]
      }])
    }

    return { success: true }
  } catch (error) {
    console.error('Erreur ajustement inventaire:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

// =====================
// VALORISATION DU STOCK
// =====================

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

// Recuperer la valorisation du stock avec CUMP calcule chronologiquement
export async function fetchStockValuation(limit = 100, dateFilter?: string): Promise<StockValuationEntry[]> {
  // 1. D'abord, detecter dynamiquement l'emplacement Stock interne
  const locations = await callOdoo<Array<{
    id: number
    name: string
    usage: string
  }>>('stock.location', 'search_read', [
    [['usage', '=', 'internal']]
  ], {
    fields: ['id', 'name', 'usage'],
    limit: 20
  })

  // Trouver l'emplacement stock (cherche "stock" dans le nom, ou prend le premier interne)
  const stockLocation = locations.find(l => l.name.toLowerCase().includes('stock')) || locations[0]
  const stockLocationId = stockLocation?.id || 0

  console.log(`[fetchStockValuation] Emplacement stock detecte: ID=${stockLocationId}, Nom=${stockLocation?.name}`)

  // 2. Construire le filtre pour les mouvements
  const domain: unknown[][] = [['state', '=', 'done']]
  if (dateFilter) {
    domain.push(['date', '<=', dateFilter + ' 23:59:59'])
  }

  const moves = await callOdoo<Array<{
    id: number
    date: string
    reference: string | false
    product_id: [number, string]
    product_qty: number
    product_uom: [number, string]
    price_unit: number
    location_id: [number, string]
    location_dest_id: [number, string]
    picking_id: [number, string] | false
    origin: string | false
    move_line_ids: number[]
  }>>('stock.move', 'search_read', [domain], {
    fields: ['id', 'date', 'reference', 'product_id', 'product_qty', 'product_uom',
             'price_unit', 'location_id', 'location_dest_id', 'picking_id', 'origin', 'move_line_ids'],
    order: 'date asc', // IMPORTANT: ordre chronologique pour le calcul CUMP
    limit
  })

  // Recuperer les infos produit (default_code, name) depuis product.product
  const productIds = [...new Set(moves.map(m => m.product_id[0]))]
  const productsInfo = await callOdoo<Array<{
    id: number
    name: string
    default_code: string | false
  }>>('product.product', 'read', [productIds], {
    fields: ['id', 'name', 'default_code']
  })

  // Map pour lookup rapide: productId -> { name, code }
  const productInfoMap = new Map<number, { name: string; code: string }>()
  for (const p of productsInfo) {
    productInfoMap.set(p.id, {
      name: p.name || '',
      code: p.default_code || ''
    })
  }

  console.log(`[fetchStockValuation] ${productIds.length} produits uniques, infos recuperees`)

  // Grouper par produit pour calculer le CUMP progressif
  const movesByProduct = new Map<number, typeof moves>()
  for (const move of moves) {
    const productId = move.product_id[0]
    if (!movesByProduct.has(productId)) {
      movesByProduct.set(productId, [])
    }
    movesByProduct.get(productId)!.push(move)
  }

  const result: StockValuationEntry[] = []

  // Pour chaque produit, calculer le CUMP progressif
  for (const [productId, productMoves] of movesByProduct) {
    let cumulQtyIn = 0      // Quantite cumulee des ENTREES
    let cumulValueIn = 0    // Valeur cumulee des ENTREES
    let currentCUMP = 0     // CUMP actuel
    let cumulQtyNet = 0     // Quantite nette (entrees - sorties)
    let cumulValueNet = 0   // Valeur nette

    // Recuperer les infos produit depuis le map
    const productInfo = productInfoMap.get(productId)
    const productCode = productInfo?.code || ''
    const cleanProductName = productInfo?.name || productMoves[0]?.product_id[1] || ''

    for (const move of productMoves) {
      const destId = move.location_dest_id?.[0]
      const destName = (move.location_dest_id?.[1] || '').toLowerCase()
      // ENTREE = destination vers le stock interne (detecte dynamiquement)
      const isInbound = destId === stockLocationId || destName.includes('stock')

      const pickingName = Array.isArray(move.picking_id) ? move.picking_id[1] : ''
      const originText = move.origin !== false ? move.origin : ''

      let unitValue: number
      let totalValue: number
      let signedQty: number

      if (isInbound) {
        // ENTREE: utiliser le prix d achat reel
        unitValue = move.price_unit
        signedQty = move.product_qty
        totalValue = move.product_qty * move.price_unit

        // Mettre a jour le CUMP
        cumulQtyIn += move.product_qty
        cumulValueIn += move.product_qty * move.price_unit
        currentCUMP = cumulQtyIn > 0 ? cumulValueIn / cumulQtyIn : 0

        // Mettre a jour les cumuls nets
        cumulQtyNet += move.product_qty
        cumulValueNet += totalValue
      } else {
        // SORTIE: valoriser au CUMP actuel
        unitValue = currentCUMP
        signedQty = -move.product_qty
        totalValue = -(move.product_qty * currentCUMP)

        cumulQtyNet -= move.product_qty
        cumulValueNet += totalValue
      }

      result.push({
        id: move.id,
        date: move.date,
        reference: move.reference || pickingName || '-',
        product: cleanProductName,
        productCode: productCode,
        productId: productId,
        lotNumber: null,
        quantity: signedQty,
        remainingQty: cumulQtyNet,
        unitValue: unitValue,
        unit: move.product_uom?.[1] || 'Unite(s)',
        totalValue: totalValue,
        description: originText || pickingName || '-',
        remainingValue: cumulValueNet
      })
    }
  }

  // Retrier par date decroissante pour l affichage
  result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return result
}

// =====================
// ANALYSE DES MOUVEMENTS (POUR TABLEAU CROISE)
// =====================

export interface StockMoveAnalysis {
  product_id: number
  product_name: string
  product_code: string
  location_name: string
  picking_type: string
  quantity: number
}

export interface PivotData {
  product: string
  productId: number
  locations: { [locationName: string]: number }
  total: number
}

// Recuperer les mouvements pour analyse pivot
export async function fetchStockMovesForPivot(): Promise<PivotData[]> {
  // 1. Recuperer tous les mouvements done
  const moves = await callOdoo<Array<{
    id: number
    product_id: [number, string]
    product_qty: number
    location_id: [number, string]
    location_dest_id: [number, string]
    picking_type_id: [number, string] | false
    state: string
  }>>('stock.move', 'search_read', [
    [['state', '=', 'done']]
  ], {
    fields: ['product_id', 'product_qty', 'location_id', 'location_dest_id', 'picking_type_id'],
    limit: 10000
  })

  // 2. Agreger par produit et type d'operation
  const aggregated = new Map<number, {
    name: string
    locations: Map<string, number>
    total: number
  }>()

  for (const move of moves) {
    const productId = move.product_id[0]
    const productName = move.product_id[1]
    const destLocation = move.location_dest_id[1]
    const pickingType = move.picking_type_id ? move.picking_type_id[1] : 'Autre'
    const locationKey = `${destLocation}: ${pickingType}`

    if (!aggregated.has(productId)) {
      aggregated.set(productId, {
        name: productName,
        locations: new Map(),
        total: 0
      })
    }

    const product = aggregated.get(productId)!
    const currentQty = product.locations.get(locationKey) || 0
    product.locations.set(locationKey, currentQty + move.product_qty)
    product.total += move.product_qty
  }

  // 3. Convertir en tableau
  const result: PivotData[] = []
  aggregated.forEach((data, productId) => {
    const locations: { [key: string]: number } = {}
    data.locations.forEach((qty, loc) => {
      locations[loc] = qty
    })
    result.push({
      product: data.name,
      productId,
      locations,
      total: data.total
    })
  })

  // Trier par total decroissant
  result.sort((a, b) => b.total - a.total)

  return result
}

// =====================
// INFORMATIONS DE VALORISATION DOSSIER (GLOBALE)
// =====================

export interface CompanyValuationInfo {
  categoryId: number
  categoryName: string
  costMethod: 'standard' | 'fifo' | 'average' | string
  valuation: 'manual_periodic' | 'real_time' | string
  odooVersion: string
  odooUrl: string
  odooDb: string
}

// Recuperer la version Odoo directement depuis l'API
async function fetchOdooVersionFromApi(): Promise<string> {
  try {
    const credentials = getOdooCredentials()
    if (!credentials) return 'N/A'

    const apiUrl = getApiUrl()

    // Appel via le proxy local pour obtenir la version
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        odoo: credentials,
        body: {
          model: 'ir.module.module',
          method: 'search_read',
          args: [[['name', '=', 'base']]],
          kwargs: { fields: ['installed_version'], limit: 1 }
        }
      })
    })

    const data = await response.json()
    if (data.success && data.data?.result?.[0]?.installed_version) {
      const versionStr = data.data.result[0].installed_version
      // Extraire le numero majeur (ex: "19.0.1.3.0" -> "19")
      const majorMatch = versionStr.match(/^(\d+)/)
      return majorMatch ? majorMatch[1] : versionStr
    }

    return 'N/A'
  } catch (error) {
    console.error('[fetchOdooVersionFromApi] Erreur:', error)
    return 'N/A'
  }
}

// Recuperer les infos de valorisation globales du dossier (categorie racine Odoo)
export async function getCompanyValuationInfo(): Promise<CompanyValuationInfo | null> {
  try {
    const credentials = getOdooCredentials()
    console.log('[getCompanyValuationInfo] Debut - Connexion:', credentials?.url, credentials?.db)

    // Recuperer la version Odoo depuis l'API
    const odooVersion = await fetchOdooVersionFromApi()
    console.log('[getCompanyValuationInfo] Version Odoo detectee:', odooVersion)

    // Recuperer TOUTES les categories pour trouver la racine
    const allCategories = await callOdoo<Array<{
      id: number
      name: string
      parent_id: [number, string] | false
      property_cost_method: string
      property_valuation: string
    }>>('product.category', 'search_read', [[]], {
      fields: ['id', 'name', 'parent_id', 'property_cost_method', 'property_valuation']
    })

    console.log('[getCompanyValuationInfo] Categories trouvees:', allCategories.length)
    allCategories.forEach(cat => {
      console.log(`  - ID=${cat.id}, Name="${cat.name}", Parent=${cat.parent_id ? cat.parent_id[1] : 'RACINE'}, CostMethod=${cat.property_cost_method}, Valuation=${cat.property_valuation}`)
    })

    // Trouver la categorie racine (parent_id = false)
    const rootCategories = allCategories.filter(c => c.parent_id === false)
    console.log('[getCompanyValuationInfo] Categories RACINE:', rootCategories.length)

    let category = rootCategories[0]
    if (!category && allCategories.length > 0) {
      category = allCategories[0]
      console.log('[getCompanyValuationInfo] Fallback: premiere categorie disponible')
    }

    if (!category) {
      console.log('[getCompanyValuationInfo] AUCUNE categorie trouvee!')
      return null
    }

    console.log('[getCompanyValuationInfo] Categorie selectionnee:', {
      id: category.id,
      name: category.name,
      costMethod: category.property_cost_method,
      valuation: category.property_valuation
    })

    const result = {
      categoryId: category.id,
      categoryName: category.name,
      costMethod: category.property_cost_method || 'standard',
      valuation: category.property_valuation || 'manual_periodic',
      odooVersion: odooVersion,
      odooUrl: credentials?.url || 'N/A',
      odooDb: credentials?.db || 'N/A'
    }

    console.log('[getCompanyValuationInfo] RESULTAT FINAL (depuis API Odoo):', result)
    return result
  } catch (error) {
    console.error('[getCompanyValuationInfo] ERREUR:', error)
    return null
  }
}

// =====================
// INFORMATIONS DE VALORISATION PRODUIT
// =====================

export interface ProductCostingInfo {
  productId: number
  productName: string
  categoryId: number
  categoryName: string
  costMethod: 'standard' | 'fifo' | 'average' | string  // standard, fifo, average (AVCO)
  valuation: 'manual_periodic' | 'real_time' | string   // manual ou automatique
  standardPrice: number
}

// Recuperer les infos de valorisation d'un produit
export async function getProductCostingInfo(productId: number): Promise<ProductCostingInfo | null> {
  try {
    // 1. Recuperer le produit avec sa categorie
    const products = await callOdoo<Array<{
      id: number
      name: string
      categ_id: [number, string]
      standard_price: number
    }>>('product.product', 'search_read', [
      [['id', '=', productId]]
    ], {
      fields: ['id', 'name', 'categ_id', 'standard_price'],
      limit: 1
    })

    if (products.length === 0) return null

    const product = products[0]
    const categoryId = product.categ_id[0]

    // 2. Recuperer la categorie avec ses proprietes de valorisation
    const categories = await callOdoo<Array<{
      id: number
      name: string
      property_cost_method: string  // 'standard', 'fifo', 'average'
      property_valuation: string    // 'manual_periodic', 'real_time'
    }>>('product.category', 'search_read', [
      [['id', '=', categoryId]]
    ], {
      fields: ['id', 'name', 'property_cost_method', 'property_valuation'],
      limit: 1
    })

    const category = categories[0]

    return {
      productId: product.id,
      productName: product.name,
      categoryId: category?.id || categoryId,
      categoryName: category?.name || product.categ_id[1],
      costMethod: category?.property_cost_method || 'standard',
      valuation: category?.property_valuation || 'manual_periodic',
      standardPrice: product.standard_price
    }
  } catch (error) {
    console.error('Erreur recuperation infos costing:', error)
    return null
  }
}

// Modifier le prix unitaire d'un mouvement de stock
// Adapte le comportement selon le mode de valorisation du produit
export async function updateStockMovePrice(
  moveId: number,
  newPrice: number
): Promise<{
  success: boolean
  error?: string
  costingInfo?: ProductCostingInfo
  cumpUpdated?: boolean
  newCump?: number
}> {
  try {
    // 1. Recuperer les infos du mouvement
    const moves = await callOdoo<Array<{
      id: number
      product_id: [number, string]
      product_qty: number
      state: string
    }>>('stock.move', 'search_read', [
      [['id', '=', moveId]]
    ], {
      fields: ['id', 'product_id', 'product_qty', 'state'],
      limit: 1
    })

    if (moves.length === 0) {
      throw new Error('Mouvement non trouve')
    }

    const move = moves[0]
    const productId = move.product_id[0]

    // 2. Recuperer les infos de valorisation du produit
    const costingInfo = await getProductCostingInfo(productId)
    console.log(`[updateStockMovePrice] Produit ${productId} - Methode: ${costingInfo?.costMethod}, Valorisation: ${costingInfo?.valuation}`)

    // 3. Essayer de trouver la couche de valorisation (si stock.valuation.layer existe)
    let hasValuationLayer = false
    let layerUpdated = false

    try {
      const layers = await callOdoo<Array<{
        id: number
        quantity: number
        unit_cost: number
        value: number
      }>>('stock.valuation.layer', 'search_read', [
        [['stock_move_id', '=', moveId]]
      ], {
        fields: ['id', 'quantity', 'unit_cost', 'value'],
        limit: 1
      })

      hasValuationLayer = true

      if (layers.length > 0) {
        // 4a. Modifier directement la couche de valorisation
        const layer = layers[0]
        const newValue = Math.abs(layer.quantity) * newPrice

        await callOdoo<boolean>('stock.valuation.layer', 'write', [[layer.id], {
          unit_cost: newPrice,
          value: layer.quantity >= 0 ? newValue : -newValue
        }])

        layerUpdated = true
        console.log(`[updateStockMovePrice] Couche ${layer.id} mise a jour: unit_cost=${newPrice}, value=${newValue}`)
      }
    } catch (layerError) {
      // stock.valuation.layer n'existe pas sur cette instance
      console.warn(`[updateStockMovePrice] stock.valuation.layer non disponible:`, layerError)
      hasValuationLayer = false
    }

    if (!layerUpdated) {
      // 4b. Pas de couche de valorisation ou modele inexistant, mettre a jour stock.move
      console.log(`[updateStockMovePrice] Mise a jour directe de stock.move.price_unit`)
      await callOdoo<boolean>('stock.move', 'write', [[moveId], {
        price_unit: newPrice
      }])
    }

    // 5. Decider si on met a jour standard_price selon le mode de valorisation
    //
    // - 'standard' : Prix fixe, on peut le mettre a jour sans creer d'ecritures
    // - 'average' (AVCO) + 'real_time' : Odoo cree des ecritures de revalorisation automatiquement
    // - 'fifo' : Le standard_price n'est pas vraiment utilise
    // - 'manual_periodic' : Pas de valorisation automatique
    //
    const isAutoValuation = costingInfo?.valuation === 'real_time'
    const isAVCO = costingInfo?.costMethod === 'average'
    const shouldSkipCumpUpdate = isAutoValuation && isAVCO

    let cumpUpdated = false
    let newCump: number | undefined

    if (shouldSkipCumpUpdate) {
      // En AVCO + temps reel, ne PAS mettre a jour standard_price
      // car Odoo creerait des ecritures de correction automatiques
      console.log(`[updateStockMovePrice] Mode AVCO + temps reel detecte. standard_price NON modifie pour eviter les ecritures de correction.`)
    } else if (hasValuationLayer) {
      // En mode standard ou valorisation manuelle, on peut mettre a jour standard_price
      // sans risque d'ecritures parasites (seulement si stock.valuation.layer existe)
      const allLayers = await callOdoo<Array<{
        quantity: number
        unit_cost: number
      }>>('stock.valuation.layer', 'search_read', [
        [['product_id', '=', productId], ['quantity', '>', 0]]
      ], {
        fields: ['quantity', 'unit_cost']
      })

      let totalQty = 0
      let totalValue = 0

      for (const layer of allLayers) {
        if (layer.quantity > 0 && layer.unit_cost > 0) {
          totalQty += layer.quantity
          totalValue += layer.quantity * layer.unit_cost
        }
      }

      if (totalQty > 0) {
        newCump = totalValue / totalQty

        await callOdoo<boolean>('product.product', 'write', [[productId], {
          standard_price: newCump
        }])

        cumpUpdated = true
        console.log(`[updateStockMovePrice] Mode ${costingInfo?.costMethod}/${costingInfo?.valuation}. standard_price mis a jour: ${newCump.toFixed(2)}`)
      }
    } else {
      // stock.valuation.layer n'existe pas - mettre a jour standard_price directement avec le nouveau prix
      console.log(`[updateStockMovePrice] stock.valuation.layer non disponible. Mise a jour directe de standard_price: ${newPrice}`)
      await callOdoo<boolean>('product.product', 'write', [[productId], {
        standard_price: newPrice
      }])
      cumpUpdated = true
      newCump = newPrice
    }

    return {
      success: true,
      costingInfo: costingInfo || undefined,
      cumpUpdated,
      newCump
    }
  } catch (error) {
    console.error('Erreur modification prix mouvement:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

// =====================
// CREATION DE MOUVEMENTS DE STOCK
// =====================

export interface StockDiscrepancy {
  productId: number
  productName: string
  productCode: string
  currentQty: number // Quantite dans stock.quant
  calculatedQty: number // Quantite calculee depuis les mouvements
  difference: number // Ecart a corriger
  standardPrice: number
}

// Recuperer les emplacements de stock
export async function fetchStockLocations(): Promise<Array<{ id: number; name: string; usage: string }>> {
  return callOdoo<Array<{ id: number; name: string; usage: string }>>('stock.location', 'search_read', [
    []
  ], {
    fields: ['id', 'name', 'usage'],
    limit: 100
  })
}

// Analyser les ecarts de stock pour les N premiers produits
export async function analyzeStockDiscrepancies(limit = 30): Promise<StockDiscrepancy[]> {
  // 1. Recuperer les produits avec leur stock actuel
  const products = await callOdoo<Array<{
    id: number
    name: string
    default_code: string | false
    qty_available: number
    standard_price: number
  }>>('product.product', 'search_read', [
    [['type', '=', 'product']]
  ], {
    fields: ['id', 'name', 'default_code', 'qty_available', 'standard_price'],
    limit,
    order: 'id asc'
  })

  const discrepancies: StockDiscrepancy[] = []

  // 2. Pour chaque produit, calculer la quantite basee sur les mouvements
  for (const product of products) {
    const moves = await callOdoo<Array<{
      product_qty: number
      location_id: [number, string]
      location_dest_id: [number, string]
    }>>('stock.move', 'search_read', [
      [['product_id', '=', product.id], ['state', '=', 'done']]
    ], {
      fields: ['product_qty', 'location_id', 'location_dest_id']
    })

    // Calculer le stock net depuis les mouvements
    let calculatedQty = 0
    for (const move of moves) {
      const destId = move.location_dest_id[0]
      const srcId = move.location_id[0]
      const destName = move.location_dest_id[1].toLowerCase()
      const srcName = move.location_id[1].toLowerCase()

      // Entree si destination = stock interne
      const isInbound = destId === 8 || destName.includes('stock')
      // Sortie si source = stock interne
      const isOutbound = srcId === 8 || srcName.includes('stock')

      if (isInbound && !isOutbound) {
        calculatedQty += move.product_qty
      } else if (isOutbound && !isInbound) {
        calculatedQty -= move.product_qty
      }
    }

    const difference = product.qty_available - calculatedQty

    discrepancies.push({
      productId: product.id,
      productName: product.name,
      productCode: product.default_code || '',
      currentQty: product.qty_available,
      calculatedQty,
      difference,
      standardPrice: product.standard_price
    })
  }

  return discrepancies
}

// Creer un mouvement de stock (entree ou sortie)
export async function createStockMove(
  productId: number,
  quantity: number, // positif = entree, negatif = sortie
  priceUnit: number,
  description = 'Ajustement inventaire'
): Promise<{ success: boolean; moveId?: number; error?: string }> {
  try {
    // Recuperer les emplacements
    const locations = await fetchStockLocations()

    // Trouver l'emplacement stock interne (ID 8 ou usage='internal')
    const stockLocation = locations.find(l => l.id === 8 || l.usage === 'internal')
    // Trouver l'emplacement d'ajustement d'inventaire (usage='inventory')
    const inventoryLocation = locations.find(l => l.usage === 'inventory')

    if (!stockLocation) {
      return { success: false, error: 'Emplacement stock interne non trouve' }
    }
    if (!inventoryLocation) {
      return { success: false, error: 'Emplacement ajustement inventaire non trouve' }
    }

    // Recuperer l'unite du produit
    const product = await callOdoo<Array<{ uom_id: [number, string] }>>('product.product', 'search_read', [
      [['id', '=', productId]]
    ], {
      fields: ['uom_id'],
      limit: 1
    })

    if (!product.length) {
      return { success: false, error: 'Produit non trouve' }
    }

    const uomId = product[0].uom_id[0]
    const absQty = Math.abs(quantity)

    // Determiner source et destination selon le sens
    let locationId: number
    let locationDestId: number

    if (quantity > 0) {
      // Entree: ajustement -> stock
      locationId = inventoryLocation.id
      locationDestId = stockLocation.id
    } else {
      // Sortie: stock -> ajustement
      locationId = stockLocation.id
      locationDestId = inventoryLocation.id
    }

    // Creer le mouvement
    const moveId = await callOdoo<number>('stock.move', 'create', [{
      name: description,
      product_id: productId,
      product_uom_qty: absQty,
      product_uom: uomId,
      location_id: locationId,
      location_dest_id: locationDestId,
      price_unit: priceUnit
    }])

    // Confirmer et valider le mouvement
    await callOdoo<boolean>('stock.move', 'action_confirm', [[moveId]])
    await callOdoo<boolean>('stock.move', 'action_assign', [[moveId]])
    await callOdoo<boolean>('stock.move', 'action_done', [[moveId]])

    return { success: true, moveId }
  } catch (error) {
    console.error('Erreur creation mouvement stock:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

// Creer des mouvements d'ajustement en masse
export async function createAdjustmentMoves(
  adjustments: Array<{
    productId: number
    quantity: number
    priceUnit: number
    description?: string
  }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const adj of adjustments) {
    const result = await createStockMove(
      adj.productId,
      adj.quantity,
      adj.priceUnit,
      adj.description || 'Ajustement inventaire automatique'
    )

    if (result.success) {
      success++
    } else {
      failed++
      errors.push(`Produit ${adj.productId}: ${result.error}`)
    }
  }

  return { success, failed, errors }
}

// =====================
// DIAGNOSTIC - Analyse des mouvements recents
// =====================
export interface DiagnosticResult {
  connection: {
    url: string
    db: string
    user: string
    version: string
  }
  locations: Array<{
    id: number
    name: string
    usage: string
  }>
  recentMoves: Array<{
    id: number
    date: string
    product: string
    qty: number
    locationFrom: string
    locationFromId: number
    locationTo: string
    locationToId: number
    state: string
    isClassifiedAsInbound: boolean
  }>
}

export async function runDiagnostic(searchProductName?: string): Promise<DiagnosticResult> {
  const settings = getApiSettings()
  const credentials = getOdooCredentials()

  console.log('=== DIAGNOSTIC ODOO ===')
  console.log('URL:', credentials?.url)
  console.log('DB:', credentials?.db)
  console.log('User:', credentials?.username)
  console.log('Version:', settings?.odooVersion)

  // 1. Recuperer les emplacements
  const locations = await callOdoo<Array<{
    id: number
    name: string
    complete_name: string
    usage: string
  }>>('stock.location', 'search_read', [[]], {
    fields: ['id', 'name', 'complete_name', 'usage'],
    limit: 50
  })

  console.log('\n=== EMPLACEMENTS ===')
  for (const loc of locations) {
    const marker = loc.usage === 'internal' ? ' ★' : ''
    console.log(`  [${loc.id}] ${loc.complete_name} (${loc.usage})${marker}`)
  }

  // Identifier l'emplacement stock interne
  const stockLocation = locations.find(l => l.usage === 'internal' && l.name.toLowerCase().includes('stock'))
  const stockLocationId = stockLocation?.id || 0

  console.log(`\n=== EMPLACEMENT STOCK DETECTE ===`)
  if (stockLocation) {
    console.log(`  ★ ID REEL: ${stockLocation.id}, Nom: ${stockLocation.complete_name}`)
    console.log(`  L'application utilise ID=5 en dur`)
    if (stockLocation.id !== 5) {
      console.log(`  ⚠️ PROBLEME: L'ID reel (${stockLocation.id}) != 5 !`)
      console.log(`  → Il faut mettre a jour la detection des entrees/sorties !`)
    }
  } else {
    console.log(`  ⚠️ Aucun emplacement "stock" interne trouve !`)
  }

  // 2. Recherche specifique d'un produit si demande
  if (searchProductName) {
    console.log(`\n=== RECHERCHE PRODUIT: "${searchProductName}" ===`)

    // Chercher le produit
    const products = await callOdoo<Array<{
      id: number
      name: string
      default_code: string | false
    }>>('product.product', 'search_read', [
      [['name', 'ilike', searchProductName]]
    ], {
      fields: ['id', 'name', 'default_code'],
      limit: 5
    })

    if (products.length === 0) {
      console.log(`  Aucun produit trouve avec "${searchProductName}"`)
    } else {
      for (const prod of products) {
        console.log(`  Produit trouve: [${prod.id}] ${prod.name}`)

        // Chercher tous les mouvements de ce produit
        const prodMoves = await callOdoo<Array<{
          id: number
          date: string
          product_qty: number
          location_id: [number, string]
          location_dest_id: [number, string]
          state: string
          picking_id: [number, string] | false
        }>>('stock.move', 'search_read', [
          [['product_id', '=', prod.id]]
        ], {
          fields: ['id', 'date', 'product_qty', 'location_id', 'location_dest_id', 'state', 'picking_id'],
          order: 'date desc',
          limit: 10
        })

        console.log(`  ${prodMoves.length} mouvements trouves:`)
        for (const m of prodMoves) {
          const destId = m.location_dest_id[0]
          const destName = m.location_dest_id[1].toLowerCase()
          const isInbound = destId === stockLocationId || destId === 5 || destName.includes('stock')
          const picking = Array.isArray(m.picking_id) ? m.picking_id[1] : '-'
          const type = isInbound ? 'ENTREE' : 'SORTIE'
          console.log(`    [${m.id}] ${m.date} | ${m.product_qty} | ${m.location_id[1]} -> ${m.location_dest_id[1]} | ${m.state} | ${type} | picking=${picking}`)
        }
      }
    }
  }

  // 3. Recuperer les 20 derniers mouvements (tous produits)
  const moves = await callOdoo<Array<{
    id: number
    date: string
    product_id: [number, string]
    product_qty: number
    location_id: [number, string]
    location_dest_id: [number, string]
    state: string
  }>>('stock.move', 'search_read', [[]], {
    fields: ['id', 'date', 'product_id', 'product_qty', 'location_id', 'location_dest_id', 'state'],
    order: 'date desc',
    limit: 20
  })

  console.log('\n=== 20 DERNIERS MOUVEMENTS (tous produits) ===')
  const recentMoves = moves.map(m => {
    const destId = m.location_dest_id?.[0]
    const destName = (m.location_dest_id?.[1] || '').toLowerCase()
    // Utiliser l'ID reel du stock OU l'ID 5 OU le nom contient "stock"
    const isClassifiedAsInbound = destId === stockLocationId || destId === 5 || destName.includes('stock')

    const marker = m.state === 'done' ? '✓' : '○'
    console.log(`  ${marker} [${m.id}] ${m.date} | ${m.product_id[1].substring(0, 20)} | ${m.product_qty} | ${m.location_id[1]} -> ${m.location_dest_id[1]} | ${m.state} | ${isClassifiedAsInbound ? 'ENTREE' : 'SORTIE'}`)

    return {
      id: m.id,
      date: m.date,
      product: m.product_id[1],
      qty: m.product_qty,
      locationFrom: m.location_id[1],
      locationFromId: m.location_id[0],
      locationTo: m.location_dest_id[1],
      locationToId: m.location_dest_id[0],
      state: m.state,
      isClassifiedAsInbound
    }
  })

  return {
    connection: {
      url: credentials?.url || 'N/A',
      db: credentials?.db || 'N/A',
      user: credentials?.username || 'N/A',
      version: settings?.odooVersion || 'N/A'
    },
    locations: locations.map(l => ({ id: l.id, name: l.complete_name, usage: l.usage })),
    recentMoves
  }
}
