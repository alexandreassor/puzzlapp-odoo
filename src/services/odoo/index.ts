/**
 * Point d'entree pour tous les services Odoo
 *
 * Usage:
 *   import { odooManager, createOdooAdapter } from '@/services/odoo'
 *
 * Ou pour les types:
 *   import type { OdooConnectionConfig, OdooProduct } from '@/services/odoo'
 */

// Types
export * from './types'

// Adapters
export { type IOdooAdapter, BaseOdooAdapter } from './adapters/OdooAdapter'
export { Odoo18Adapter } from './adapters/Odoo18Adapter'
export { Odoo19Adapter } from './adapters/Odoo19Adapter'

// Factory & Manager
export {
  createOdooAdapter,
  detectOdooVersion,
  odooManager
} from './OdooAdapterFactory'
