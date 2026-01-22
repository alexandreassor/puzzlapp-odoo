/**
 * ODOO Proxy Server
 *
 * Ce proxy permet de connecter une application frontend à ODOO
 * en contournant les restrictions CORS.
 *
 * MODES DE FONCTIONNEMENT:
 * 1. Mode statique: credentials dans .env (pour déploiement dédié)
 * 2. Mode dynamique: credentials dans chaque requête (pour multi-client)
 */

const express = require('express')
const cors = require('cors')
const axios = require('axios')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Configuration ODOO depuis les variables d'environnement (optionnel)
const ENV_CONFIG = {
  url: process.env.ODOO_URL,
  db: process.env.ODOO_DB,
  username: process.env.ODOO_USERNAME,
  apiKey: process.env.ODOO_API_KEY
}

// Cache UID par configuration (clé = url+db+username)
const uidCache = new Map()

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

/**
 * Authentification ODOO
 * Récupère l'UID utilisateur nécessaire pour les appels API
 */
async function authenticate(config) {
  const cacheKey = `${config.url}:${config.db}:${config.username}`
  const cached = uidCache.get(cacheKey)

  // Utiliser le cache si valide (1 heure)
  if (cached && Date.now() < cached.expiry) {
    return cached.uid
  }

  try {
    const response = await axios.post(`${config.url}/jsonrpc`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'authenticate',
        args: [config.db, config.username, config.apiKey, {}]
      },
      id: Date.now()
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    })

    if (response.data.result) {
      const uid = response.data.result
      uidCache.set(cacheKey, {
        uid,
        expiry: Date.now() + (60 * 60 * 1000) // Cache 1 heure
      })
      console.log(`✅ Auth OK [${config.db}] UID: ${uid}`)
      return uid
    } else {
      throw new Error(response.data.error?.message || 'Authentification échouée')
    }
  } catch (error) {
    console.error('❌ Auth error:', error.message)
    throw error
  }
}

/**
 * Récupère la config ODOO depuis la requête ou l'environnement
 */
function getConfig(req) {
  // Priorité 1: credentials dans le body de la requête
  if (req.body.odoo) {
    return {
      url: req.body.odoo.url,
      db: req.body.odoo.db,
      username: req.body.odoo.username,
      apiKey: req.body.odoo.apiKey || req.body.odoo.password
    }
  }

  // Priorité 2: variables d'environnement
  if (ENV_CONFIG.url && ENV_CONFIG.db && ENV_CONFIG.username && ENV_CONFIG.apiKey) {
    return ENV_CONFIG
  }

  return null
}

/**
 * Endpoint principal - Compatible HelloLeo + mode dynamique
 * POST /api/odoo
 *
 * Body (mode HelloLeo):
 * {
 *   body: { model, method, args, kwargs }
 * }
 *
 * Body (mode dynamique):
 * {
 *   odoo: { url, db, username, apiKey },
 *   body: { model, method, args, kwargs }
 * }
 */
app.post('/api/odoo', async (req, res) => {
  try {
    const { body } = req.body

    if (!body || !body.model || !body.method) {
      return res.status(400).json({
        success: false,
        error: 'Requête invalide: model et method requis'
      })
    }

    const config = getConfig(req)

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration ODOO manquante. Fournissez odoo.url, odoo.db, odoo.username, odoo.apiKey dans la requête ou configurez .env'
      })
    }

    const uid = await authenticate(config)

    const response = await axios.post(`${config.url}/jsonrpc`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          config.db,
          uid,
          config.apiKey,
          body.model,
          body.method,
          body.args || [],
          body.kwargs || {}
        ]
      },
      id: Date.now()
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    })

    if (response.data.error) {
      const odooError = response.data.error
      const errorMessage = odooError.data?.message || odooError.message || 'Erreur ODOO'
      const errorName = odooError.data?.name || odooError.code || 'Error'
      console.error(`❌ ODOO Error [${body.model}.${body.method}]:`, errorName, '-', errorMessage)
      return res.json({
        success: false,
        error: `${errorName}: ${errorMessage}`,
        details: response.data.error
      })
    }

    res.json({
      success: true,
      data: { result: response.data.result }
    })

  } catch (error) {
    console.error('Proxy error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Test de connexion
 * POST /api/test
 */
app.post('/api/test', async (req, res) => {
  try {
    const config = getConfig(req)

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration ODOO manquante'
      })
    }

    const uid = await authenticate(config)

    // Test: compter les produits
    const response = await axios.post(`${config.url}/jsonrpc`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          config.db,
          uid,
          config.apiKey,
          'product.product',
          'search_count',
          [[['type', '=', 'product']]]
        ]
      },
      id: Date.now()
    })

    const productCount = response.data.result

    res.json({
      success: true,
      message: `Connexion réussie! ${productCount} produits stockables trouvés.`,
      data: {
        uid,
        productCount,
        database: config.db,
        url: config.url
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Health check (mode statique uniquement)
 */
app.get('/health', async (req, res) => {
  const hasEnvConfig = ENV_CONFIG.url && ENV_CONFIG.db && ENV_CONFIG.username && ENV_CONFIG.apiKey

  if (!hasEnvConfig) {
    return res.json({
      status: 'ok',
      mode: 'dynamic',
      message: 'Proxy en mode dynamique - envoyez les credentials avec chaque requête'
    })
  }

  try {
    await authenticate(ENV_CONFIG)
    res.json({
      status: 'ok',
      mode: 'static',
      odoo: ENV_CONFIG.url,
      database: ENV_CONFIG.db,
      user: ENV_CONFIG.username
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    })
  }
})

/**
 * Info endpoint
 */
app.get('/', (req, res) => {
  const hasEnvConfig = ENV_CONFIG.url && ENV_CONFIG.db

  res.json({
    name: 'ODOO Proxy Server',
    version: '1.1.0',
    mode: hasEnvConfig ? 'static' : 'dynamic',
    endpoints: {
      'POST /api/odoo': 'Proxy vers ODOO JSON-RPC',
      'POST /api/test': 'Test de connexion ODOO',
      'GET /health': 'Vérification du statut'
    },
    usage: {
      static: 'Configurez .env avec vos credentials ODOO',
      dynamic: 'Envoyez { odoo: { url, db, username, apiKey }, body: {...} }'
    }
  })
})

// Démarrage
app.listen(PORT, () => {
  const hasEnvConfig = ENV_CONFIG.url && ENV_CONFIG.db

  console.log(`
╔══════════════════════════════════════════════════════╗
║           ODOO Proxy Server v1.1.0                   ║
╠══════════════════════════════════════════════════════╣
║  🚀 Port: ${PORT}                                        ║
║  📦 Mode: ${hasEnvConfig ? 'STATIQUE (credentials .env)' : 'DYNAMIQUE (credentials par requête)'}
${hasEnvConfig ? `║  🔗 ODOO: ${ENV_CONFIG.url}
║  📂 Base: ${ENV_CONFIG.db}` : '║  ℹ️  Envoyez les credentials dans chaque requête'}
╚══════════════════════════════════════════════════════╝
  `)
})
