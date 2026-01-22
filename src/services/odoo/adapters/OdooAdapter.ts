/**
 * Interface commune pour tous les adaptateurs Odoo
 * Chaque version d'Odoo implemente cette interface
 */

import type {
  OdooConnectionConfig,
  OdooProduct,
  OdooStockMove,
  OdooLocation,
  StockEntryData,
  StockValuationEntry,
  ApiResult,
  VersionConfig
} from '../types'

export interface IOdooAdapter {
  // Configuration
  readonly version: string
  readonly config: OdooConnectionConfig
  readonly versionConfig: VersionConfig

  // Connexion
  testConnection(): Promise<ApiResult<{ uid: number; serverVersion: string }>>

  // Produits
  searchProducts(query: string, limit?: number): Promise<OdooProduct[]>
  getProduct(productId: number): Promise<OdooProduct | null>
  updateProductPrice(productId: number, newPrice: number): Promise<ApiResult<void>>

  // Emplacements
  getLocations(): Promise<OdooLocation[]>

  // Mouvements de stock
  getStockMoves(filters?: StockMoveFilters): Promise<OdooStockMove[]>
  createStockEntry(data: StockEntryData): Promise<ApiResult<{ moveId: number }>>
  createStockExit(data: StockEntryData): Promise<ApiResult<{ moveId: number }>>
  updateStockMovePrice(moveId: number, newPrice: number): Promise<ApiResult<void>>

  // Valorisation
  fetchStockValuation(limit?: number, dateFilter?: string): Promise<StockValuationEntry[]>

  // Utilitaires
  callOdoo<T>(model: string, method: string, args: unknown[], kwargs?: Record<string, unknown>): Promise<T>
}

export interface StockMoveFilters {
  state?: 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done' | 'cancel'
  productId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
}

/**
 * Classe abstraite avec les implementations communes
 */
export abstract class BaseOdooAdapter implements IOdooAdapter {
  abstract readonly version: string
  abstract readonly versionConfig: VersionConfig

  constructor(public readonly config: OdooConnectionConfig) {}

  /**
   * Appel JSON-RPC generique vers Odoo
   */
  async callOdoo<T>(
    model: string,
    method: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await fetch(`${this.config.url}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            this.config.database,
            2, // uid - a determiner dynamiquement si necessaire
            this.config.apiKey,
            model,
            method,
            args,
            kwargs
          ]
        },
        id: Date.now()
      })
    })

    const data = await response.json()

    if (data.error) {
      console.error(`Odoo ${this.version} error:`, data.error)
      throw new Error(data.error.data?.message || data.error.message || 'Erreur Odoo')
    }

    return data.result as T
  }

  async testConnection(): Promise<ApiResult<{ uid: number; serverVersion: string }>> {
    try {
      // Verification de la connexion via un appel simple
      await this.callOdoo<{ server_version: string }>('ir.module.module', 'search_read', [[['name', '=', 'base']]], { fields: ['name'], limit: 1 })
      return {
        success: true,
        data: { uid: 2, serverVersion: this.version }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion'
      }
    }
  }

  async getLocations(): Promise<OdooLocation[]> {
    const locations = await this.callOdoo<Array<{
      id: number
      name: string
      usage: string
      complete_name: string
    }>>('stock.location', 'search_read', [[]], {
      fields: ['id', 'name', 'usage', 'complete_name'],
      limit: 100
    })

    return locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      usage: loc.usage as OdooLocation['usage'],
      completeName: loc.complete_name
    }))
  }

  async searchProducts(query: string, limit = 20): Promise<OdooProduct[]> {
    const domain = query
      ? ['|', ['name', 'ilike', query], ['default_code', 'ilike', query]]
      : []

    const products = await this.callOdoo<Array<{
      id: number
      name: string
      default_code: string | false
      standard_price: number
      qty_available: number
      is_storable?: boolean
      type?: string
    }>>('product.product', 'search_read', [domain], {
      fields: ['id', 'name', 'default_code', 'standard_price', 'qty_available', 'is_storable', 'type'],
      limit
    })

    return products.map(p => ({
      id: p.id,
      name: p.name,
      defaultCode: p.default_code || null,
      standardPrice: p.standard_price,
      qtyAvailable: p.qty_available,
      isStorable: p.is_storable ?? p.type === 'product'
    }))
  }

  async getProduct(productId: number): Promise<OdooProduct | null> {
    const products = await this.searchProducts('')
    return products.find(p => p.id === productId) || null
  }

  async updateProductPrice(productId: number, newPrice: number): Promise<ApiResult<void>> {
    try {
      await this.callOdoo('product.product', 'write', [[productId], { standard_price: newPrice }])
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur mise a jour prix'
      }
    }
  }

  // Methodes abstraites a implementer par chaque version
  abstract getStockMoves(filters?: StockMoveFilters): Promise<OdooStockMove[]>
  abstract createStockEntry(data: StockEntryData): Promise<ApiResult<{ moveId: number }>>
  abstract createStockExit(data: StockEntryData): Promise<ApiResult<{ moveId: number }>>
  abstract updateStockMovePrice(moveId: number, newPrice: number): Promise<ApiResult<void>>
  abstract fetchStockValuation(limit?: number, dateFilter?: string): Promise<StockValuationEntry[]>
}
