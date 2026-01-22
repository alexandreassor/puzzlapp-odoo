/**
 * Factory pour creer le bon adaptateur selon la version d'Odoo
 */

import type { IOdooAdapter } from './adapters/OdooAdapter'
import { Odoo18Adapter } from './adapters/Odoo18Adapter'
import { Odoo19Adapter } from './adapters/Odoo19Adapter'
import type { OdooConnectionConfig, OdooVersion } from './types'

// Map des adaptateurs disponibles
const adapters: Record<OdooVersion, new (config: OdooConnectionConfig) => IOdooAdapter> = {
  '17': Odoo18Adapter,  // Fallback vers v18 pour v17
  '18': Odoo18Adapter,
  '19': Odoo19Adapter,
  '20': Odoo19Adapter   // Fallback vers v19 pour v20 (a creer quand disponible)
}

/**
 * Cree un adaptateur pour la version specifiee
 */
export function createOdooAdapter(config: OdooConnectionConfig): IOdooAdapter {
  const AdapterClass = adapters[config.version]

  if (!AdapterClass) {
    console.warn(`Adaptateur non trouve pour Odoo ${config.version}, utilisation de v19`)
    return new Odoo19Adapter(config)
  }

  return new AdapterClass(config)
}

/**
 * Detecte automatiquement la version d'Odoo
 */
export async function detectOdooVersion(
  url: string,
  _database: string,
  _apiKey: string
): Promise<OdooVersion | null> {
  try {
    const response = await fetch(`${url}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'version',
          args: []
        },
        id: Date.now()
      })
    })

    const data = await response.json()
    if (data.result?.server_version) {
      const versionStr = data.result.server_version
      // Extraire le numero majeur (ex: "19.0" -> "19")
      const majorMatch = versionStr.match(/^(\d+)/)
      if (majorMatch) {
        const major = majorMatch[1]
        if (['17', '18', '19', '20'].includes(major)) {
          return major as OdooVersion
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Singleton pour gerer l'adaptateur actif
 */
class OdooAdapterManager {
  private static instance: OdooAdapterManager
  private adapters: Map<string, IOdooAdapter> = new Map()
  private activeConnectionId: string | null = null

  private constructor() {}

  static getInstance(): OdooAdapterManager {
    if (!OdooAdapterManager.instance) {
      OdooAdapterManager.instance = new OdooAdapterManager()
    }
    return OdooAdapterManager.instance
  }

  /**
   * Ajoute ou met a jour une connexion
   */
  setConnection(config: OdooConnectionConfig): IOdooAdapter {
    const adapter = createOdooAdapter(config)
    this.adapters.set(config.id, adapter)

    if (config.isActive) {
      this.activeConnectionId = config.id
    }

    return adapter
  }

  /**
   * Obtient l'adaptateur actif
   */
  getActiveAdapter(): IOdooAdapter | null {
    if (!this.activeConnectionId) return null
    return this.adapters.get(this.activeConnectionId) || null
  }

  /**
   * Obtient un adaptateur par ID
   */
  getAdapter(connectionId: string): IOdooAdapter | null {
    return this.adapters.get(connectionId) || null
  }

  /**
   * Change la connexion active
   */
  setActiveConnection(connectionId: string): boolean {
    if (this.adapters.has(connectionId)) {
      this.activeConnectionId = connectionId
      return true
    }
    return false
  }

  /**
   * Supprime une connexion
   */
  removeConnection(connectionId: string): void {
    this.adapters.delete(connectionId)
    if (this.activeConnectionId === connectionId) {
      this.activeConnectionId = null
    }
  }

  /**
   * Liste toutes les connexions
   */
  getAllConnections(): Array<{ id: string; config: OdooConnectionConfig; isActive: boolean }> {
    return Array.from(this.adapters.entries()).map(([id, adapter]) => ({
      id,
      config: adapter.config,
      isActive: id === this.activeConnectionId
    }))
  }
}

export const odooManager = OdooAdapterManager.getInstance()
