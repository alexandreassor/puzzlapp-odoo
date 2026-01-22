import { useEffect, useState, useCallback, useMemo } from 'react'
import { Package, AlertTriangle, XCircle, TrendingUp, DollarSign, Warehouse, RefreshCw, Calendar, Clock, X, Plus, Settings, Coins, BookOpen } from 'lucide-react'
import InventoryTable from './components/InventoryTable'
import ProductDetailModal from './components/ProductDetailModal'
import AddStockModal from './components/AddStockModal'
import SettingsModal from './components/SettingsModal'
import StockValuationView from './components/StockValuationView'
import DocumentationView from './components/DocumentationView'
import { fetchProducts, fetchRecentMoves } from './services/odooService'
import type { Product, StockMove } from './types'

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [allMoves, setAllMoves] = useState<StockMove[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'custom' | 'valuation' | 'documentation'>('valuation')

  // État pour la date historique
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isHistoricalMode, setIsHistoricalMode] = useState(false)
  const [historicalData, setHistoricalData] = useState<Map<number, { qty: number; value: number }>>(new Map())

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchProducts(200)
      setProducts(data)
      setLastUpdate(new Date())
    } catch (err) {
      setError('Erreur de connexion à Odoo. Vérifiez votre connexion.')
      console.error('Error fetching inventory:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger tous les mouvements pour le calcul historique
  const loadAllMoves = useCallback(async () => {
    try {
      const moves = await fetchRecentMoves(1000)
      setAllMoves(moves)
      return moves
    } catch (err) {
      console.error('Error fetching moves:', err)
      return []
    }
  }, [])

  useEffect(() => {
    loadInventory()
    loadAllMoves()
  }, [loadInventory, loadAllMoves])

  // Calculer le stock historique quand une date est sélectionnée
  const calculateHistoricalStock = useCallback(async (dateStr: string) => {
    if (!dateStr) return

    setLoadingHistory(true)
    try {
      // Charger les mouvements si pas encore fait
      let moves = allMoves
      if (moves.length === 0) {
        moves = await loadAllMoves()
      }

      const historicalMap = new Map<number, { qty: number; value: number }>()

      // Pour chaque produit, calculer le stock à la date donnée
      for (const product of products) {
        // Filtrer les mouvements pour ce produit
        const productMoves = moves.filter(m => m.product_id[0] === product.id)

        if (productMoves.length > 0) {
          // Calculer le stock à la date donnée
          const stockAtDate = calculateStockAtDateLocal(productMoves, dateStr)
          const cump = calculateCUMPLocal(productMoves, dateStr)

          historicalMap.set(product.id, {
            qty: stockAtDate,
            value: stockAtDate * (cump || product.standard_price)
          })
        } else {
          // Pas de mouvement, utiliser le stock actuel comme approximation
          // (ou 0 si la date est très ancienne)
          const productDate = new Date(dateStr)
          const now = new Date()
          if (productDate < now) {
            historicalMap.set(product.id, {
              qty: product.qty_available,
              value: product.qty_available * product.standard_price
            })
          }
        }
      }

      setHistoricalData(historicalMap)
      setIsHistoricalMode(true)
    } catch (err) {
      console.error('Error calculating historical stock:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [products, allMoves, loadAllMoves])

  // Fonction locale pour calculer le stock à une date
  const calculateStockAtDateLocal = (moves: StockMove[], untilDate: string): number => {
    let totalQuantity = 0
    const targetDate = new Date(untilDate)
    targetDate.setHours(23, 59, 59, 999)

    for (const move of moves) {
      if (move.state !== 'done') continue
      if (new Date(move.date) > targetDate) continue

      const qty = move.product_qty || 0
      const destId = move.location_dest_id?.[0]
      const srcId = move.location_id?.[0]

      // Location 8 est généralement le stock interne
      if (destId === 8) {
        totalQuantity += qty
      } else if (srcId === 8) {
        totalQuantity -= qty
      }
    }

    return Math.max(0, totalQuantity)
  }

  // Fonction locale pour calculer le CUMP à une date
  const calculateCUMPLocal = (moves: StockMove[], untilDate: string): number => {
    let totalCost = 0
    let totalQuantity = 0
    const targetDate = new Date(untilDate)
    targetDate.setHours(23, 59, 59, 999)

    for (const move of moves) {
      if (move.state !== 'done') continue
      if (new Date(move.date) > targetDate) continue

      const qty = move.product_qty || 0
      const price = move.price_unit || 0
      const destId = move.location_dest_id?.[0]

      if (destId === 8) {
        totalCost += qty * price
        totalQuantity += qty
      }
    }

    return totalQuantity > 0 ? totalCost / totalQuantity : 0
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setSelectedDate(newDate)
    if (newDate) {
      calculateHistoricalStock(newDate)
    } else {
      setIsHistoricalMode(false)
      setHistoricalData(new Map())
    }
  }

  const clearHistoricalMode = () => {
    setSelectedDate('')
    setIsHistoricalMode(false)
    setHistoricalData(new Map())
  }

  const handleProductClick = (productId: number) => {
    setSelectedProductId(productId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProductId(null)
  }

  // Produits avec stock historique si mode activé
  const displayProducts = useMemo(() => {
    if (!isHistoricalMode) return products

    return products.map(product => {
      const historical = historicalData.get(product.id)
      if (historical) {
        return {
          ...product,
          qty_available: historical.qty,
          virtual_available: historical.qty
        }
      }
      return product
    })
  }, [products, isHistoricalMode, historicalData])

  // Calculs des statistiques
  const stats = useMemo(() => {
    const prods = displayProducts
    const totalProducts = prods.length
    const totalQuantity = prods.reduce((sum, p) => sum + p.qty_available, 0)
    const totalValue = prods.reduce((sum, p) => sum + (p.qty_available * p.standard_price), 0)
    const lowStockCount = prods.filter(p => p.qty_available > 0 && p.qty_available < 5).length
    const outOfStockCount = prods.filter(p => p.qty_available <= 0).length
    const inStockCount = prods.filter(p => p.qty_available >= 5).length

    return { totalProducts, totalQuantity, totalValue, lowStockCount, outOfStockCount, inStockCount }
  }, [displayProducts])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value))
  }

  const formatDateDisplay = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Gestion des Stocks</h1>
                <p className="text-sm text-slate-400">Connecté à ODOO</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && !isHistoricalMode && (
                <span className="text-xs text-slate-500">
                  Mis à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
                </span>
              )}
              <button
                onClick={() => setIsAddStockModalOpen(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Mouvement
              </button>
              <button
                onClick={loadInventory}
                disabled={loading}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              {/* View Mode Selector */}
              <div className="flex items-center bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('custom')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    viewMode === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Inventaire
                </button>
                <button
                  onClick={() => setViewMode('valuation')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    viewMode === 'valuation'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  Valorisation
                </button>
                <button
                  onClick={() => setViewMode('documentation')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    viewMode === 'documentation'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Doc
                </button>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg transition"
                title="Paramètres"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Views */}
      {viewMode === 'documentation' ? (
        <DocumentationView />
      ) : viewMode === 'valuation' ? (
        <StockValuationView />
      ) : (
      <>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Sélecteur de date historique */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Visualiser le stock à une date :</span>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={new Date().toISOString().split('T')[0]}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
              />
              {isHistoricalMode && (
                <button
                  onClick={clearHistoricalMode}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition text-sm"
                >
                  <X className="w-4 h-4" />
                  Retour au présent
                </button>
              )}
              {loadingHistory && (
                <div className="flex items-center gap-2 text-blue-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Calcul en cours...</span>
                </div>
              )}
            </div>
          </div>

          {/* Indicateur de mode historique */}
          {isHistoricalMode && selectedDate && (
            <div className="mt-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-amber-400 font-medium">Mode historique actif</p>
                <p className="text-amber-300/70 text-sm">
                  Affichage des stocks au {formatDateDisplay(selectedDate)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3 text-red-400">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={loadInventory}
              className="ml-auto px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded transition text-sm"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* KPIs Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Produits */}
          <div className={`bg-slate-800 rounded-xl p-4 border transition ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-700 hover:border-slate-600'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Produits</span>
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(stats.totalProducts)}</p>
          </div>

          {/* Quantité Totale */}
          <div className={`bg-slate-800 rounded-xl p-4 border transition ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-700 hover:border-slate-600'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Quantité</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(stats.totalQuantity)}</p>
          </div>

          {/* Valeur Totale */}
          <div className={`bg-slate-800 rounded-xl p-4 border transition ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-700 hover:border-slate-600'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Valeur</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white">{formatCurrency(stats.totalValue)}</p>
          </div>

          {/* En Stock */}
          <div className={`bg-slate-800 rounded-xl p-4 border transition ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-700 hover:border-green-500/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">En Stock</span>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <p className="text-2xl font-bold text-green-400">{formatNumber(stats.inStockCount)}</p>
          </div>

          {/* Stock Faible */}
          <div className={`bg-slate-800 rounded-xl p-4 border transition ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-700 hover:border-yellow-500/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Stock Faible</span>
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{formatNumber(stats.lowStockCount)}</p>
          </div>

          {/* Rupture */}
          <div className={`bg-slate-800 rounded-xl p-4 border transition ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-700 hover:border-red-500/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Rupture</span>
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{formatNumber(stats.outOfStockCount)}</p>
          </div>
        </div>

        {/* Alertes rapides */}
        {!isHistoricalMode && (stats.lowStockCount > 0 || stats.outOfStockCount > 0) && (
          <div className="flex flex-wrap gap-3">
            {stats.outOfStockCount > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                <span><strong>{stats.outOfStockCount}</strong> produit{stats.outOfStockCount > 1 ? 's' : ''} en rupture de stock</span>
              </div>
            )}
            {stats.lowStockCount > 0 && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 text-yellow-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span><strong>{stats.lowStockCount}</strong> produit{stats.lowStockCount > 1 ? 's' : ''} avec stock faible</span>
              </div>
            )}
          </div>
        )}

        {/* Tableau d'inventaire */}
        <InventoryTable
          products={displayProducts}
          loading={loading || loadingHistory}
          onRefresh={loadInventory}
          onProductClick={handleProductClick}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-slate-500 text-sm">
            Gestion des Stocks ODOO
            {isHistoricalMode && (
              <span className="ml-2 text-amber-500">| Mode historique</span>
            )}
          </p>
        </div>
      </footer>
      </>
      )}

      {/* Modals - toujours visibles */}
      <ProductDetailModal
        productId={selectedProductId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      <AddStockModal
        isOpen={isAddStockModalOpen}
        onClose={() => setIsAddStockModalOpen(false)}
        onSuccess={() => {
          loadInventory()
          loadAllMoves()
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={() => {
          loadInventory()
          loadAllMoves()
        }}
      />
    </div>
  )
}
