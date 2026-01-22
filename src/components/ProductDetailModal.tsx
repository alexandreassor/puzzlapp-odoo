import { useEffect, useState, useMemo } from 'react'
import { X, TrendingUp, TrendingDown, Package, ArrowRightLeft, Clock, DollarSign, Tag, Layers, Calendar, Pencil, Check, Loader2 } from 'lucide-react'
import { fetchProductDetails, fetchProductHistory, calculateCUMP, getMoveType, updateStockMovePrice } from '../services/odooService'
import type { Product, StockMove } from '../types'

interface ProductDetailModalProps {
  productId: number | null
  isOpen: boolean
  onClose: () => void
}

export default function ProductDetailModal({ productId, isOpen, onClose }: ProductDetailModalProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [moves, setMoves] = useState<StockMove[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info')

  // État pour la date historique
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isHistoricalMode, setIsHistoricalMode] = useState(false)

  // État pour l'édition des prix
  const [editingMoveId, setEditingMoveId] = useState<number | null>(null)
  const [editingPrice, setEditingPrice] = useState<string>('')
  const [savingPrice, setSavingPrice] = useState(false)

  useEffect(() => {
    if (isOpen && productId) {
      loadData()
      // Reset la date quand on ouvre une nouvelle fiche
      setSelectedDate('')
      setIsHistoricalMode(false)
    }
  }, [isOpen, productId])

  const loadData = async () => {
    if (!productId) return

    try {
      setLoading(true)
      setError(null)
      setProduct(null)
      setMoves([])

      const [productData, historyData] = await Promise.all([
        fetchProductDetails(productId),
        fetchProductHistory(productId, 500)
      ])

      setProduct(productData)
      setMoves(historyData || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(errorMessage)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculs historiques basés sur la date sélectionnée
  const historicalData = useMemo(() => {
    if (!product || !moves.length) return null

    const targetDate = selectedDate ? new Date(selectedDate) : new Date()
    targetDate.setHours(23, 59, 59, 999)

    // Filtrer les mouvements jusqu'à la date sélectionnée
    const filteredMoves = moves.filter(m => {
      if (m.state !== 'done') return false
      if (selectedDate && new Date(m.date) > targetDate) return false
      return true
    })

    // Calculer le stock à la date
    let stockAtDate = 0
    let totalCost = 0
    let totalInQty = 0
    let totalOutQty = 0

    for (const move of filteredMoves) {
      const qty = move.product_qty || 0
      const price = move.price_unit || 0
      const destId = move.location_dest_id?.[0]
      const srcId = move.location_id?.[0]

      // Location 8 est généralement le stock interne
      if (destId === 8) {
        stockAtDate += qty
        totalCost += qty * price
        totalInQty += qty
      } else if (srcId === 8) {
        stockAtDate -= qty
        totalOutQty += qty
      }
    }

    stockAtDate = Math.max(0, stockAtDate)
    const cump = totalInQty > 0 ? totalCost / totalInQty : product.standard_price
    const stockValue = stockAtDate * cump

    return {
      stockAtDate,
      cump,
      stockValue,
      totalInbound: totalInQty,
      totalOutbound: totalOutQty,
      filteredMoves
    }
  }, [product, moves, selectedDate])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setSelectedDate(newDate)
    setIsHistoricalMode(!!newDate)
  }

  const clearHistoricalMode = () => {
    setSelectedDate('')
    setIsHistoricalMode(false)
  }

  // Fonctions d'édition du prix
  const startEditPrice = (move: StockMove) => {
    setEditingMoveId(move.id)
    setEditingPrice(move.price_unit.toString())
  }

  const cancelEditPrice = () => {
    setEditingMoveId(null)
    setEditingPrice('')
  }

  const savePrice = async () => {
    if (!editingMoveId) return

    const newPrice = parseFloat(editingPrice)
    if (isNaN(newPrice) || newPrice < 0) {
      alert('Prix invalide')
      return
    }

    setSavingPrice(true)
    try {
      const result = await updateStockMovePrice(editingMoveId, newPrice)
      if (result.success) {
        // Mettre à jour le mouvement dans l'état local
        setMoves(prevMoves =>
          prevMoves.map(m =>
            m.id === editingMoveId ? { ...m, price_unit: newPrice } : m
          )
        )
        setEditingMoveId(null)
        setEditingPrice('')

        // Recharger les données du produit pour avoir le nouveau standard_price
        if (productId) {
          const updatedProduct = await fetchProductDetails(productId)
          setProduct(updatedProduct)
        }
      } else {
        alert('Erreur: ' + (result.error || 'Impossible de modifier le prix'))
      }
    } catch (err) {
      console.error('Erreur lors de la modification du prix:', err)
      alert('Erreur lors de la modification')
    } finally {
      setSavingPrice(false)
    }
  }

  if (!isOpen) return null

  const getStateLabel = (state: string) => {
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      confirmed: 'Confirmé',
      assigned: 'Assigné',
      done: 'Effectué',
      cancelled: 'Annulé'
    }
    return labels[state] || state
  }

  const getStateColor = (state: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      assigned: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      done: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return colors[state] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }

  const getMoveTypeInfo = (move: StockMove) => {
    const type = getMoveType(move)
    if (type === 'in') return { label: 'Entrée', icon: TrendingUp, color: 'text-green-400' }
    if (type === 'out') return { label: 'Sortie', icon: TrendingDown, color: 'text-red-400' }
    return { label: 'Transfert', icon: ArrowRightLeft, color: 'text-blue-400' }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    // Odoo stocke les dates en UTC sans suffixe 'Z'
    const utcDateStr = dateStr.includes('Z') || dateStr.includes('+')
      ? dateStr
      : dateStr.replace(' ', 'T') + 'Z'
    return new Date(utcDateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateDisplay = (dateStr: string) => {
    const utcDateStr = dateStr.includes('Z') || dateStr.includes('+')
      ? dateStr
      : dateStr.replace(' ', 'T') + 'Z'
    return new Date(utcDateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Valeurs à afficher (historiques ou actuelles)
  const displayStock = isHistoricalMode && historicalData ? historicalData.stockAtDate : (product?.qty_available || 0)
  const displayCUMP = isHistoricalMode && historicalData ? historicalData.cump : (calculateCUMP(moves) || product?.standard_price || 0)
  const displayValue = isHistoricalMode && historicalData ? historicalData.stockValue : (product ? product.qty_available * (calculateCUMP(moves) || product.standard_price) : 0)
  const displayInbound = isHistoricalMode && historicalData ? historicalData.totalInbound : moves.filter(m => m.state === 'done' && getMoveType(m) === 'in').reduce((sum, m) => sum + m.product_qty, 0)
  const displayOutbound = isHistoricalMode && historicalData ? historicalData.totalOutbound : moves.filter(m => m.state === 'done' && getMoveType(m) === 'out').reduce((sum, m) => sum + m.product_qty, 0)
  const displayMoves = isHistoricalMode && historicalData ? historicalData.filteredMoves : moves.filter(m => m.state === 'done')

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" />
            Fiche Produit
            {isHistoricalMode && (
              <span className="text-sm font-normal text-amber-400 ml-2">(Historique)</span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
            <p className="text-slate-400 mt-4">Chargement des données...</p>
          </div>
        ) : error ? (
          <div className="m-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        ) : product ? (
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Nom du produit */}
            <div className="p-4 bg-slate-700/30 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">{product.name}</h3>
              {product.default_code && (
                <p className="text-slate-400 font-mono mt-1">Code: {product.default_code}</p>
              )}
            </div>

            {/* Sélecteur de date historique */}
            <div className="p-4 bg-slate-700/20 border-b border-slate-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Voir le stock au :</span>
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition text-sm"
                  />
                  {isHistoricalMode && (
                    <button
                      onClick={clearHistoricalMode}
                      className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition text-sm"
                    >
                      <X className="w-4 h-4" />
                      Aujourd'hui
                    </button>
                  )}
                </div>
              </div>

              {/* Indicateur de mode historique */}
              {isHistoricalMode && selectedDate && (
                <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <p className="text-amber-400 text-sm">
                    Données au {formatDateDisplay(selectedDate)}
                  </p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-6 py-3 font-medium transition ${activeTab === 'info' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
              >
                Informations
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 font-medium transition ${activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
              >
                Historique ({displayMoves.length})
              </button>
            </div>

            {activeTab === 'info' ? (
              <div className="p-4 space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`bg-slate-700/50 rounded-lg p-4 border ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-600'}`}>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Package className="w-4 h-4" />
                      Stock {isHistoricalMode ? 'à la date' : 'Disponible'}
                    </div>
                    <p className={`text-2xl font-bold ${displayStock <= 0 ? 'text-red-400' : displayStock < 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {Math.round(displayStock)}
                    </p>
                    {isHistoricalMode && product.qty_available !== displayStock && (
                      <p className="text-xs text-slate-500 mt-1">
                        Actuel: {Math.round(product.qty_available)}
                      </p>
                    )}
                  </div>

                  <div className={`bg-slate-700/50 rounded-lg p-4 border ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-600'}`}>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Layers className="w-4 h-4" />
                      Stock Virtuel
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {isHistoricalMode ? Math.round(displayStock) : Math.round(product.virtual_available)}
                    </p>
                  </div>

                  <div className={`bg-slate-700/50 rounded-lg p-4 border ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-600'}`}>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <DollarSign className="w-4 h-4" />
                      CUMP {isHistoricalMode ? 'à la date' : ''}
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(displayCUMP)}</p>
                  </div>

                  <div className={`bg-slate-700/50 rounded-lg p-4 border ${isHistoricalMode ? 'border-amber-500/30' : 'border-slate-600'}`}>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <DollarSign className="w-4 h-4" />
                      Valeur Stock
                    </div>
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(displayValue)}</p>
                  </div>
                </div>

                {/* Détails */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-400" />
                      Informations Générales
                    </h4>
                    <div className="space-y-2 text-sm">
                      {product.default_code && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Code Interne</span>
                          <span className="text-white font-mono">{product.default_code}</span>
                        </div>
                      )}
                      {product.barcode && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Code-barres</span>
                          <span className="text-white font-mono">{product.barcode}</span>
                        </div>
                      )}
                      {product.categ_id && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Catégorie</span>
                          <span className="text-white">{product.categ_id[1]}</span>
                        </div>
                      )}
                      {product.uom_id && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Unité</span>
                          <span className="text-white">{product.uom_id[1]}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      Prix
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Coût Standard</span>
                        <span className="text-white font-bold">{formatCurrency(product.standard_price)}</span>
                      </div>
                      {product.list_price !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Prix de Vente</span>
                          <span className="text-white font-bold">{formatCurrency(product.list_price)}</span>
                        </div>
                      )}
                      {product.list_price !== undefined && product.standard_price > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Marge</span>
                          <span className="text-green-400 font-bold">
                            {((product.list_price - product.standard_price) / product.standard_price * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Résumé mouvements */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`bg-green-500/10 rounded-lg p-4 border ${isHistoricalMode ? 'border-amber-500/30' : 'border-green-500/30'}`}>
                    <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                      <TrendingUp className="w-4 h-4" />
                      Total Entrées {isHistoricalMode ? '(jusqu\'à la date)' : ''}
                    </div>
                    <p className="text-2xl font-bold text-green-400">{Math.round(displayInbound)}</p>
                  </div>
                  <div className={`bg-red-500/10 rounded-lg p-4 border ${isHistoricalMode ? 'border-amber-500/30' : 'border-red-500/30'}`}>
                    <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                      <TrendingDown className="w-4 h-4" />
                      Total Sorties {isHistoricalMode ? '(jusqu\'à la date)' : ''}
                    </div>
                    <p className="text-2xl font-bold text-red-400">{Math.round(displayOutbound)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {displayMoves.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    {isHistoricalMode ? 'Aucun mouvement avant cette date' : 'Aucun mouvement enregistré'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-3 text-slate-400 font-semibold">Date</th>
                          <th className="text-left py-3 px-3 text-slate-400 font-semibold">Référence</th>
                          <th className="text-left py-3 px-3 text-slate-400 font-semibold">Type</th>
                          <th className="text-right py-3 px-3 text-slate-400 font-semibold">Quantité</th>
                          <th className="text-right py-3 px-3 text-slate-400 font-semibold">Prix Unit.</th>
                          <th className="text-center py-3 px-3 text-slate-400 font-semibold">État</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayMoves.map((move) => {
                          const typeInfo = getMoveTypeInfo(move)
                          const TypeIcon = typeInfo.icon
                          const isEditing = editingMoveId === move.id
                          return (
                            <tr key={move.id} className="group border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                              <td className="py-3 px-3 text-slate-300">{formatDate(move.date)}</td>
                              <td className="py-3 px-3 text-slate-300 font-mono text-xs">
                                {move.reference || move.picking_id?.[1] || '-'}
                              </td>
                              <td className="py-3 px-3">
                                <div className={`flex items-center gap-2 ${typeInfo.color}`}>
                                  <TypeIcon className="w-4 h-4" />
                                  {typeInfo.label}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right text-white font-bold">
                                {Math.round(move.product_qty)}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <input
                                      type="number"
                                      value={editingPrice}
                                      onChange={(e) => setEditingPrice(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') savePrice()
                                        if (e.key === 'Escape') cancelEditPrice()
                                      }}
                                      step="0.01"
                                      min="0"
                                      className="w-24 bg-slate-600 border border-blue-500 rounded px-2 py-1 text-white text-right text-sm focus:outline-none"
                                      autoFocus
                                      disabled={savingPrice}
                                    />
                                    <button
                                      onClick={savePrice}
                                      disabled={savingPrice}
                                      className="p-1 hover:bg-green-500/20 rounded text-green-400 disabled:opacity-50"
                                      title="Valider"
                                    >
                                      {savingPrice ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={cancelEditPrice}
                                      disabled={savingPrice}
                                      className="p-1 hover:bg-red-500/20 rounded text-red-400 disabled:opacity-50"
                                      title="Annuler"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-slate-300">{formatCurrency(move.price_unit)}</span>
                                    <button
                                      onClick={() => startEditPrice(move)}
                                      className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-blue-400 transition opacity-0 group-hover:opacity-100"
                                      title="Modifier le prix"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStateColor(move.state)}`}>
                                  {getStateLabel(move.state)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
