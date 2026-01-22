/**
 * Configuration des connexions Odoo
 *
 * Ce fichier centralise toutes les connexions aux instances Odoo.
 * NE PAS COMMITER ce fichier avec des credentials sensibles!
 *
 * Pour la production, utiliser des variables d'environnement:
 * - VITE_ODOO_URL
 * - VITE_ODOO_DB
 * - VITE_ODOO_API_KEY
 * - VITE_ODOO_VERSION
 */

import type { OdooConnectionConfig } from '../services/odoo/types'

// Connexion par defaut (peut etre surchargee par localStorage ou .env)
export const DEFAULT_CONNECTIONS: OdooConnectionConfig[] = [
  {
    id: 'default-v19',
    name: 'Ma connexion Odoo',
    url: import.meta.env.VITE_ODOO_URL || '',
    database: import.meta.env.VITE_ODOO_DB || '',
    username: import.meta.env.VITE_ODOO_USERNAME || '',
    apiKey: import.meta.env.VITE_ODOO_API_KEY || '',
    version: '19',
    isActive: true
  }
  // Ajouter d'autres connexions ici:
  // {
  //   id: 'autre-instance-v18',
  //   name: 'Autre Instance (Odoo 18)',
  //   url: 'https://autre.odoo.com',
  //   database: 'autre_db',
  //   username: '',
  //   apiKey: '',
  //   version: '18',
  //   isActive: false
  // }
]

/**
 * Charge les connexions depuis localStorage + config par defaut
 */
export function loadConnections(): OdooConnectionConfig[] {
  try {
    const stored = localStorage.getItem('odoo_connections')
    if (stored) {
      const parsed = JSON.parse(stored) as OdooConnectionConfig[]
      // Merge avec les connexions par defaut
      const merged = [...DEFAULT_CONNECTIONS]
      for (const conn of parsed) {
        const existingIndex = merged.findIndex(c => c.id === conn.id)
        if (existingIndex >= 0) {
          merged[existingIndex] = { ...merged[existingIndex], ...conn }
        } else {
          merged.push(conn)
        }
      }
      return merged
    }
  } catch (e) {
    console.error('Erreur chargement connexions:', e)
  }
  return DEFAULT_CONNECTIONS
}

/**
 * Sauvegarde les connexions dans localStorage
 */
export function saveConnections(connections: OdooConnectionConfig[]): void {
  try {
    // Ne pas sauvegarder les API keys en localStorage pour la securite
    const sanitized = connections.map(c => ({
      ...c,
      apiKey: '' // Ne pas sauvegarder la cle API
    }))
    localStorage.setItem('odoo_connections', JSON.stringify(sanitized))
  } catch (e) {
    console.error('Erreur sauvegarde connexions:', e)
  }
}

/**
 * Obtient la connexion active
 */
export function getActiveConnection(): OdooConnectionConfig | undefined {
  const connections = loadConnections()
  return connections.find(c => c.isActive) || connections[0]
}

/**
 * Change la connexion active
 */
export function setActiveConnection(connectionId: string): void {
  const connections = loadConnections()
  const updated = connections.map(c => ({
    ...c,
    isActive: c.id === connectionId
  }))
  saveConnections(updated)
}
