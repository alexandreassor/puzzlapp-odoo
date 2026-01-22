import { useState, useEffect } from 'react'
import { X, Settings, Key, Server, Save, TestTube, CheckCircle, XCircle, Loader2, Info, GitBranch, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { resetVersionDetection } from '../services/odooService'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export type ConnectionMode = 'local-proxy'
export type OdooVersion = '17' | '18' | '19' | '20'

export interface ApiSettings {
  mode: ConnectionMode
  // Local proxy settings
  proxyUrl: string
  odooUrl: string
  odooDb: string
  odooUsername: string
  odooApiKey: string
  odooVersion: OdooVersion
}

const DEFAULT_SETTINGS: ApiSettings = {
  mode: 'local-proxy',
  proxyUrl: 'http://localhost:3001',
  odooUrl: '',
  odooDb: '',
  odooUsername: '',
  odooApiKey: '',
  odooVersion: '19'
}

// Differences entre versions Odoo
const VERSION_INFO: Record<OdooVersion, { label: string; description: string; features: string[] }> = {
  '17': {
    label: 'Odoo 17',
    description: 'Version stable precedente',
    features: ['Champ "name" sur stock.move', 'Pas de champ "picked"', 'product_uom_qty uniquement']
  },
  '18': {
    label: 'Odoo 18',
    description: 'Version intermediaire',
    features: ['Champ "name" sur stock.move', 'Champ "picked" optionnel', 'IDs emplacements variables']
  },
  '19': {
    label: 'Odoo 19',
    description: 'Version actuelle (recommandee)',
    features: ['Champ "origin" sur stock.move', 'Champ "picked" requis', 'Champ "quantity" disponible']
  },
  '20': {
    label: 'Odoo 20',
    description: 'Version future (fallback v19)',
    features: ['A documenter lors de la sortie']
  }
}

// Fonctions pour gérer les settings dans localStorage
export function getApiSettings(): ApiSettings {
  try {
    const saved = localStorage.getItem('odoo-api-settings')
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('Error loading settings:', e)
  }
  return DEFAULT_SETTINGS
}

export function saveApiSettings(settings: ApiSettings): void {
  try {
    localStorage.setItem('odoo-api-settings', JSON.stringify(settings))
  } catch (e) {
    console.error('Error saving settings:', e)
  }
}

// Fonction utilitaire pour obtenir l'URL de l'API
export function getApiUrl(): string {
  const settings = getApiSettings()
  return `${settings.proxyUrl}/api/odoo`
}

// Fonction pour obtenir les credentials ODOO
export function getOdooCredentials(): { url: string; db: string; username: string; apiKey: string } | null {
  const settings = getApiSettings()
  if (settings.odooUrl && settings.odooDb && settings.odooUsername && settings.odooApiKey) {
    return {
      url: settings.odooUrl,
      db: settings.odooDb,
      username: settings.odooUsername,
      apiKey: settings.odooApiKey
    }
  }
  return null
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [settings, setSettings] = useState<ApiSettings>(DEFAULT_SETTINGS)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [showArchitecture, setShowArchitecture] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSettings(getApiSettings())
      setTestResult(null)
    }
  }, [isOpen])

  const handleChange = (field: keyof ApiSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const odooCredentials = {
        url: settings.odooUrl,
        db: settings.odooDb,
        username: settings.odooUsername,
        apiKey: settings.odooApiKey
      }

      // 1. Test de connexion basique
      const testUrl = `${settings.proxyUrl}/api/test`
      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ odoo: odooCredentials })
      })

      const testData = await testResponse.json()

      if (!testData.success) {
        setTestResult({
          success: false,
          message: testData.error || 'Erreur de connexion'
        })
        return
      }

      // 2. Detection automatique de la version Odoo
      let detectedVersion: OdooVersion | null = null
      try {
        const versionUrl = `${settings.proxyUrl}/api/odoo`
        const versionResponse = await fetch(versionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            odoo: odooCredentials,
            body: {
              model: 'ir.module.module',
              method: 'search_read',
              args: [[['name', '=', 'base']]],
              kwargs: { fields: ['installed_version'], limit: 1 }
            }
          })
        })

        const versionData = await versionResponse.json()
        if (versionData.success && versionData.data?.result?.[0]?.installed_version) {
          const versionStr = versionData.data.result[0].installed_version
          const majorMatch = versionStr.match(/^(\d+)/)
          if (majorMatch) {
            const major = majorMatch[1]
            if (['17', '18', '19', '20'].includes(major)) {
              detectedVersion = major as OdooVersion
              // Mettre a jour automatiquement la version dans les settings
              setSettings(prev => ({ ...prev, odooVersion: detectedVersion! }))
            }
          }
        }
      } catch (versionError) {
        console.warn('Impossible de detecter la version Odoo:', versionError)
      }

      const count = testData.data?.result ?? testData.data?.productCount ?? 0
      const versionMsg = detectedVersion
        ? ` Version detectee: v${detectedVersion} (mise a jour automatique)`
        : ' Version non detectee (conservee: v' + settings.odooVersion + ')'

      setTestResult({
        success: true,
        message: `Connexion reussie ! ${count} produits stockables.${versionMsg}`
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de connexion'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    setSaving(true)
    saveApiSettings(settings)
    // Reinitialiser le cache de detection de version pour forcer une nouvelle detection
    resetVersionDetection()
    setTimeout(() => {
      setSaving(false)
      onSave()
      onClose()
    }, 500)
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
    setTestResult(null)
  }

  const isConfigValid = () => {
    return settings.proxyUrl && settings.odooUrl && settings.odooDb && settings.odooUsername && settings.odooApiKey
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="bg-slate-700/50 border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            Parametres de connexion
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Proxy Configuration */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <Info className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-300">
                <p className="font-medium mb-1">Connexion ODOO via Proxy Local</p>
                <p className="text-green-300/80">
                  Vos credentials restent sur votre machine. Lancez le proxy avec <code className="bg-slate-700 px-1 rounded">npm run dev</code> dans le dossier proxy-server.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Server className="w-4 h-4 inline mr-2" />
                URL du proxy local
              </label>
              <input
                type="url"
                value={settings.proxyUrl}
                onChange={(e) => handleChange('proxyUrl', e.target.value)}
                placeholder="http://localhost:3001"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-green-500 transition font-mono text-sm"
              />
            </div>

            <div className="border-t border-slate-700 pt-4">
              <p className="text-sm font-medium text-slate-300 mb-4">
                Configuration ODOO
              </p>
            </div>

            {/* Version Selector - Auto-detectee */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <GitBranch className="w-4 h-4 inline mr-2" />
                Version ODOO
                <span className="ml-2 text-xs text-blue-400">(detectee automatiquement lors du test)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(VERSION_INFO) as OdooVersion[]).map((version) => (
                  <div
                    key={version}
                    className={`p-3 rounded-lg border text-center ${
                      settings.odooVersion === version
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-700/50 border-slate-600 text-slate-500'
                    }`}
                  >
                    <div className="font-medium">{VERSION_INFO[version].label}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {settings.odooVersion === version ? '✓ Detectee' : VERSION_INFO[version].description}
                    </div>
                  </div>
                ))}
              </div>
              {settings.odooVersion && (
                <div className="mt-2 bg-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Specificites {VERSION_INFO[settings.odooVersion].label} :</p>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {VERSION_INFO[settings.odooVersion].features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  URL ODOO
                </label>
                <input
                  type="url"
                  value={settings.odooUrl}
                  onChange={(e) => handleChange('odooUrl', e.target.value)}
                  placeholder="https://votre-instance.odoo.com"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-green-500 transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Base de donnees
                </label>
                <input
                  type="text"
                  value={settings.odooDb}
                  onChange={(e) => handleChange('odooDb', e.target.value)}
                  placeholder="nom_base"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-green-500 transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Utilisateur (email)
                </label>
                <input
                  type="email"
                  value={settings.odooUsername}
                  onChange={(e) => handleChange('odooUsername', e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-green-500 transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  API Key ODOO
                </label>
                <input
                  type="password"
                  value={settings.odooApiKey}
                  onChange={(e) => handleChange('odooApiKey', e.target.value)}
                  placeholder="Votre cle API ODOO"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-green-500 transition text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  ODOO → Parametres → Utilisateurs → Profil → Cles API
                </p>
              </div>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`flex items-center gap-3 rounded-lg p-4 ${
              testResult.success
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
              <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                {testResult.message}
              </span>
            </div>
          )}

          {/* Architecture Documentation */}
          <div className="border-t border-slate-700 pt-4">
            <button
              onClick={() => setShowArchitecture(!showArchitecture)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Architecture Multi-Versions
              </span>
              {showArchitecture ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showArchitecture && (
              <div className="mt-4 space-y-4">
                {/* Explication generale */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-300 font-medium mb-2">Pourquoi plusieurs versions ?</h4>
                  <p className="text-sm text-slate-300">
                    Chaque version d'Odoo a des differences dans l'API (noms de champs, methodes disponibles, IDs d'emplacements).
                    L'application utilise un <strong className="text-white">systeme d'adaptateurs</strong> pour gerer ces differences automatiquement.
                  </p>
                </div>

                {/* Structure des fichiers */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                    Structure des adaptateurs
                  </h4>
                  <pre className="text-xs text-slate-300 font-mono bg-slate-800 rounded p-3 overflow-x-auto">
{`src/services/odoo/
├── index.ts              # Point d'entree
├── types.ts              # Types communs
├── OdooAdapterFactory.ts # Factory + Manager
└── adapters/
    ├── OdooAdapter.ts    # Interface commune
    ├── Odoo18Adapter.ts  # Specifique v18
    └── Odoo19Adapter.ts  # Specifique v19`}
                  </pre>
                </div>

                {/* Comment ca fonctionne */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-slate-200 font-medium mb-3">Comment ca fonctionne ?</h4>
                  <ol className="text-sm text-slate-300 space-y-2">
                    <li className="flex gap-2">
                      <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</span>
                      <span>Vous selectionnez la version Odoo ci-dessus</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</span>
                      <span>La Factory cree l'adaptateur correspondant (Odoo18Adapter ou Odoo19Adapter)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</span>
                      <span>L'adaptateur traduit les appels API selon les specificites de la version</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">4</span>
                      <span>L'interface reste identique quel que soit la version</span>
                    </li>
                  </ol>
                </div>

                {/* Tableau des differences */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-slate-200 font-medium mb-3">Differences cles entre versions</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-left py-2 px-2 text-slate-400">Aspect</th>
                          <th className="text-center py-2 px-2 text-orange-400">v17/v18</th>
                          <th className="text-center py-2 px-2 text-green-400">v19</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        <tr className="border-b border-slate-700">
                          <td className="py-2 px-2">Champ reference</td>
                          <td className="py-2 px-2 text-center font-mono">name</td>
                          <td className="py-2 px-2 text-center font-mono">origin</td>
                        </tr>
                        <tr className="border-b border-slate-700">
                          <td className="py-2 px-2">Champ picked</td>
                          <td className="py-2 px-2 text-center text-orange-400">Non</td>
                          <td className="py-2 px-2 text-center text-green-400">Oui</td>
                        </tr>
                        <tr className="border-b border-slate-700">
                          <td className="py-2 px-2">Champ quantity</td>
                          <td className="py-2 px-2 text-center text-orange-400">Non</td>
                          <td className="py-2 px-2 text-center text-green-400">Oui</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2">Location IDs</td>
                          <td className="py-2 px-2 text-center">Variables</td>
                          <td className="py-2 px-2 text-center">1/5/2</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ajouter une nouvelle version */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <h4 className="text-amber-300 font-medium mb-2">Ajouter une nouvelle version ?</h4>
                  <p className="text-sm text-slate-300 mb-2">
                    Pour supporter une nouvelle version d'Odoo :
                  </p>
                  <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                    <li>Creer <code className="bg-slate-700 px-1 rounded">Odoo20Adapter.ts</code> en copiant un adaptateur existant</li>
                    <li>Adapter les noms de champs et IDs d'emplacements</li>
                    <li>Ajouter la version dans <code className="bg-slate-700 px-1 rounded">OdooAdapterFactory.ts</code></li>
                    <li>Tester avec une instance Odoo 20</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 bg-slate-700/30 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-slate-400 hover:text-white transition text-sm"
          >
            Reinitialiser
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={testing || !isConfigValid()}
              className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              Tester
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm font-medium"
            >
              Annuler
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !isConfigValid()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
