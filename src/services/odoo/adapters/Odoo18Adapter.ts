/**
 * Adaptateur specifique pour Odoo 18
 *
 * Differences avec Odoo 19:
 * - Le champ 'name' peut exister sur stock.move
 * - Le champ 'picked' peut ne pas exister
 * - Les IDs d'emplacements peuvent differer
 *
 * A ADAPTER selon votre instance Odoo 18!
 */

import { BaseOdooAdapter, type StockMoveFilters } from './OdooAdapter'
import type {
  OdooStockMove,
  StockEntryData,
  StockValuationEntry,
  ApiResult,
  VersionConfig
} from '../types'

export class Odoo18Adapter extends BaseOdooAdapter {
  readonly version = '18'

  // IMPORTANT: Adapter ces valeurs a votre instance Odoo 18
  readonly versionConfig: VersionConfig = {
    locations: {
      suppliers: 4,   // A VERIFIER sur votre instance
      stock: 8,       // A VERIFIER sur votre instance
      customers: 5    // A VERIFIER sur votre instance
    },
    fields: {
      stockMoveReference: 'name',  // En v18, utiliser 'name' si 'origin' n'existe pas
      stockMoveDescription: 'name'
    },
    features: {
      hasPickedField: false,  // A VERIFIER - le champ picked peut ne pas exister
      hasQuantityField: false // A VERIFIER - peut n'avoir que product_uom_qty
    }
  }

  async getStockMoves(filters: StockMoveFilters = {}): Promise<OdooStockMove[]> {
    const domain: unknown[][] = []

    if (filters.state) {
      domain.push(['state', '=', filters.state])
    }
    if (filters.productId) {
      domain.push(['product_id', '=', filters.productId])
    }
    if (filters.dateFrom) {
      domain.push(['date', '>=', filters.dateFrom])
    }
    if (filters.dateTo) {
      domain.push(['date', '<=', filters.dateTo])
    }

    // En v18, on peut avoir 'name' au lieu de 'origin'
    const moves = await this.callOdoo<Array<{
      id: number
      date: string
      reference: string
      name?: string  // Peut exister en v18
      product_id: [number, string]
      product_qty: number
      price_unit: number
      location_id: [number, string]
      location_dest_id: [number, string]
      picking_id: [number, string] | false
      origin?: string | false  // Peut ne pas exister
      state: string
    }>>('stock.move', 'search_read', [domain], {
      fields: ['id', 'date', 'reference', 'name', 'product_id', 'product_qty', 'price_unit',
               'location_id', 'location_dest_id', 'picking_id', 'origin', 'state'],
      order: 'date desc',
      limit: filters.limit || 100
    })

    return moves.map(m => ({
      id: m.id,
      date: m.date,
      reference: m.reference || m.name || '',
      productId: m.product_id[0],
      productName: m.product_id[1],
      productQty: m.product_qty,
      priceUnit: m.price_unit,
      locationId: m.location_id[0],
      locationName: m.location_id[1],
      locationDestId: m.location_dest_id[0],
      locationDestName: m.location_dest_id[1],
      pickingName: Array.isArray(m.picking_id) ? m.picking_id[1] : null,
      origin: m.origin !== false && m.origin !== undefined ? m.origin : (m.name || null),
      state: m.state
    }))
  }

  async createStockEntry(data: StockEntryData): Promise<ApiResult<{ moveId: number }>> {
    try {
      const { suppliers, stock } = this.versionConfig.locations

      // En v18, on utilise 'name' si 'origin' n'est pas supporte
      const moveData: Record<string, unknown> = {
        name: data.reference || `Entree stock - ${new Date().toISOString()}`,
        product_id: data.productId,
        product_uom_qty: data.quantity,
        product_uom: 1,
        location_id: suppliers,
        location_dest_id: stock,
        price_unit: data.priceUnit,
        date: data.date ? `${data.date} 12:00:00` : new Date().toISOString(),
        state: 'draft'
      }

      // Ajouter 'quantity' si supporte en v18
      if (this.versionConfig.features.hasQuantityField) {
        moveData.quantity = data.quantity
      }

      const moveId = await this.callOdoo<number>('stock.move', 'create', [moveData])

      // Valider le mouvement - sans 'picked' si non supporte
      const writeData: Record<string, unknown> = {
        state: 'done'
      }
      if (this.versionConfig.features.hasQuantityField) {
        writeData.quantity = data.quantity
      }
      if (this.versionConfig.features.hasPickedField) {
        writeData.picked = true
      }

      await this.callOdoo('stock.move', 'write', [[moveId], writeData])

      return { success: true, data: { moveId } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur creation entree v18'
      }
    }
  }

  async createStockExit(data: StockEntryData): Promise<ApiResult<{ moveId: number }>> {
    try {
      const { stock, customers } = this.versionConfig.locations

      const moveData: Record<string, unknown> = {
        name: data.reference || `Sortie stock - ${new Date().toISOString()}`,
        product_id: data.productId,
        product_uom_qty: data.quantity,
        product_uom: 1,
        location_id: stock,
        location_dest_id: customers,
        price_unit: data.priceUnit,
        date: data.date ? `${data.date} 12:00:00` : new Date().toISOString(),
        state: 'draft'
      }

      if (this.versionConfig.features.hasQuantityField) {
        moveData.quantity = data.quantity
      }

      const moveId = await this.callOdoo<number>('stock.move', 'create', [moveData])

      const writeData: Record<string, unknown> = { state: 'done' }
      if (this.versionConfig.features.hasQuantityField) {
        writeData.quantity = data.quantity
      }
      if (this.versionConfig.features.hasPickedField) {
        writeData.picked = true
      }

      await this.callOdoo('stock.move', 'write', [[moveId], writeData])

      return { success: true, data: { moveId } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur creation sortie v18'
      }
    }
  }

  async updateStockMovePrice(moveId: number, newPrice: number): Promise<ApiResult<void>> {
    try {
      // 1. Recuperer les infos du mouvement
      const moves = await this.callOdoo<Array<{
        id: number
        product_id: [number, string]
        product_qty: number
      }>>('stock.move', 'search_read', [[['id', '=', moveId]]], {
        fields: ['id', 'product_id', 'product_qty'],
        limit: 1
      })

      if (moves.length === 0) {
        throw new Error('Mouvement non trouve')
      }

      const productId = moves[0].product_id[0]

      // 2. Recuperer les infos de valorisation du produit via sa categorie
      const products = await this.callOdoo<Array<{
        categ_id: [number, string]
      }>>('product.product', 'search_read', [[['id', '=', productId]]], {
        fields: ['categ_id'],
        limit: 1
      })

      let costMethod = 'standard'
      let valuation = 'manual_periodic'

      if (products.length > 0) {
        const categories = await this.callOdoo<Array<{
          property_cost_method: string
          property_valuation: string
        }>>('product.category', 'search_read', [[['id', '=', products[0].categ_id[0]]]], {
          fields: ['property_cost_method', 'property_valuation'],
          limit: 1
        })
        if (categories.length > 0) {
          costMethod = categories[0].property_cost_method || 'standard'
          valuation = categories[0].property_valuation || 'manual_periodic'
        }
      }

      console.log(`[Odoo18Adapter] Produit ${productId} - Methode: ${costMethod}, Valorisation: ${valuation}`)

      // 3. Trouver la couche de valorisation associee
      const layers = await this.callOdoo<Array<{
        id: number
        quantity: number
        unit_cost: number
        value: number
      }>>('stock.valuation.layer', 'search_read', [[['stock_move_id', '=', moveId]]], {
        fields: ['id', 'quantity', 'unit_cost', 'value'],
        limit: 1
      })

      if (layers.length > 0) {
        const layer = layers[0]
        const newValue = Math.abs(layer.quantity) * newPrice

        await this.callOdoo('stock.valuation.layer', 'write', [[layer.id], {
          unit_cost: newPrice,
          value: layer.quantity >= 0 ? newValue : -newValue
        }])
      } else {
        await this.callOdoo('stock.move', 'write', [[moveId], { price_unit: newPrice }])
      }

      // 4. Mettre a jour standard_price selon le mode de valorisation
      const isAutoValuation = valuation === 'real_time'
      const isAVCO = costMethod === 'average'
      const shouldSkipCumpUpdate = isAutoValuation && isAVCO

      if (!shouldSkipCumpUpdate) {
        // En mode standard ou valorisation manuelle, on peut mettre a jour standard_price
        const allLayers = await this.callOdoo<Array<{
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
          const newCUMP = totalValue / totalQty
          await this.callOdoo('product.product', 'write', [[productId], {
            standard_price: newCUMP
          }])
          console.log(`[Odoo18Adapter] CUMP mis a jour: ${newCUMP.toFixed(2)}`)
        }
      } else {
        console.log(`[Odoo18Adapter] Mode AVCO + temps reel - standard_price NON modifie`)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur mise a jour prix v18'
      }
    }
  }

  async fetchStockValuation(limit = 100, dateFilter?: string): Promise<StockValuationEntry[]> {
    const domain: unknown[][] = [['state', '=', 'done']]
    if (dateFilter) {
      domain.push(['date', '<=', dateFilter + ' 23:59:59'])
    }

    const moves = await this.callOdoo<Array<{
      id: number
      date: string
      reference: string
      name?: string
      product_id: [number, string]
      product_qty: number
      product_uom: [number, string]
      price_unit: number
      location_id: [number, string]
      location_dest_id: [number, string]
      picking_id: [number, string] | false
      origin?: string | false
    }>>('stock.move', 'search_read', [domain], {
      fields: ['id', 'date', 'reference', 'name', 'product_id', 'product_qty', 'product_uom',
               'price_unit', 'location_id', 'location_dest_id', 'picking_id', 'origin'],
      order: 'date asc',
      limit
    })

    const movesByProduct = new Map<number, typeof moves>()
    for (const move of moves) {
      const productId = move.product_id[0]
      if (!movesByProduct.has(productId)) {
        movesByProduct.set(productId, [])
      }
      movesByProduct.get(productId)!.push(move)
    }

    const result: StockValuationEntry[] = []
    const { stock } = this.versionConfig.locations

    for (const [productId, productMoves] of movesByProduct) {
      let cumulQtyIn = 0
      let cumulValueIn = 0
      let currentCUMP = 0
      let cumulQtyNet = 0
      let cumulValueNet = 0

      for (const move of productMoves) {
        const isInbound = move.location_dest_id[0] === stock ||
                         move.location_dest_id[1].toLowerCase().includes('stock')

        const productName = move.product_id[1]
        const codeMatch = productName.match(/^\[([^\]]+)\]/)
        const productCode = codeMatch ? codeMatch[1] : ''
        const cleanProductName = codeMatch ? productName.replace(/^\[[^\]]+\]\s*/, '') : productName

        const pickingName = Array.isArray(move.picking_id) ? move.picking_id[1] : ''
        const originText = move.origin !== false ? (move.origin || move.name || '') : (move.name || '')

        let unitValue: number
        let totalValue: number
        let signedQty: number

        if (isInbound) {
          unitValue = move.price_unit
          signedQty = move.product_qty
          totalValue = move.product_qty * move.price_unit

          cumulQtyIn += move.product_qty
          cumulValueIn += move.product_qty * move.price_unit
          currentCUMP = cumulQtyIn > 0 ? cumulValueIn / cumulQtyIn : 0

          cumulQtyNet += move.product_qty
          cumulValueNet += totalValue
        } else {
          unitValue = currentCUMP
          signedQty = -move.product_qty
          totalValue = -(move.product_qty * currentCUMP)

          cumulQtyNet -= move.product_qty
          cumulValueNet += totalValue
        }

        result.push({
          id: move.id,
          date: move.date,
          reference: move.reference || move.name || pickingName || '-',
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

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return result
  }
}
