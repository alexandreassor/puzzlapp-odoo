import { useState, useCallback } from 'react'
import {
  RefreshCw, Loader2, AlertTriangle, CheckCircle, XCircle,
  ArrowUpCircle, ArrowDownCircle, PlayCircle, Package,
  FileSpreadsheet, Download
} from 'lucide-react'
import {
  analyzeStockDiscrepancies,
  createAdjustmentMoves,
  type StockDiscrepancy
} from '../services/odooService'

export default function StockAdjustmentView() {
  const [discrepancies, setDiscrepancies] = useState<StockDiscrepancy[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const loadDiscrepancies = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await analyzeStockDiscrepancies(30)
      setDiscrepancies(data)
      // Pre-selectionner ceux avec des ecarts
      const withDiff = new Set(data.filter(d => Math.abs(d.difference) > 0.01).map(d => d.productId))
      setSelectedIds(withDiff)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectAll = () => {
    setSelectedIds(new Set(discrepancies.filter(d => Math.abs(d.difference) > 0.01).map(d => d.productId)))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
  }

  const executeAdjustments = async () => {
    const toAdjust = discrepancies.filter(d => selectedIds.has(d.productId) && Math.abs(d.difference) > 0.01)

    if (toAdjust.length === 0) {
      setError('Aucun produit avec ecart selectionne')
      return
    }

    if (!confirm(`Vous allez creer ${toAdjust.length} mouvements de stock dans ODOO. Continuer ?`)) {
      return
    }

    setProcessing(true)
    setError(null)
    setResult(null)

    try {
      const adjustments = toAdjust.map(d => ({
        productId: d.productId,
        quantity: d.difference, // positif = entree, negatif = sortie
        priceUnit: d.standardPrice,
        description: `Ajustement inventaire - Ecart: ${d.difference > 0 ? '+' : ''}${d.difference.toFixed(2)}`
      }))

      const res = await createAdjustmentMoves(adjustments)
      setResult(res)

      // Recharger les donnees
      await loadDiscrepancies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation')
    } finally {
      setProcessing(false)
    }
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const exportCSV = () => {
    const headers = ['Produit', 'Code', 'Stock Actuel', 'Stock Calcule', 'Ecart', 'Prix Unitaire', 'Valeur Ecart']
    const rows = discrepancies.map(d => [
      d.productName,
      d.productCode,
      d.currentQty,
      d.calculatedQty,
      d.difference,
      d.standardPrice,
      d.difference * d.standardPrice
    ])

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'analyse_ecarts_stock.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedWithDiff = discrepancies.filter(d => selectedIds.has(d.productId) && Math.abs(d.difference) > 0.01)
  const totalPositive = selectedWithDiff.filter(d => d.difference > 0).reduce((acc, d) => acc + d.difference, 0)
  const totalNegative = selectedWithDiff.filter(d => d.difference < 0).reduce((acc, d) => acc + d.difference, 0)
  const totalValue = selectedWithDiff.reduce((acc, d) => acc + d.difference * d.standardPrice, 0)

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-orange-600 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-white font-bold text-lg">Ajustement de Stock</h2>
              <p className="text-orange-200 text-sm">Analyse et correction des ecarts entre stock reel et mouvements</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDiscrepancies}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Analyser les 30 premiers
            </button>
            {discrepancies.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400 flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Resultat */}
      {result && (
        <div className={`rounded-lg p-4 flex items-center gap-4 ${
          result.failed === 0 ? 'bg-green-500/20 border border-green-500/30' : 'bg-yellow-500/20 border border-yellow-500/30'
        }`}>
          <CheckCircle className={`w-6 h-6 ${result.failed === 0 ? 'text-green-400' : 'text-yellow-400'}`} />
          <div>
            <p className="text-white font-medium">
              {result.success} mouvement{result.success > 1 ? 's' : ''} cree{result.success > 1 ? 's' : ''} avec succes
              {result.failed > 0 && `, ${result.failed} echec${result.failed > 1 ? 's' : ''}`}
            </p>
            {result.errors.length > 0 && (
              <ul className="text-red-400 text-sm mt-1">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 5 && <li>... et {result.errors.length - 5} autres erreurs</li>}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Resume selection */}
      {selectedWithDiff.length > 0 && (
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-blue-400 font-medium">
                {selectedWithDiff.length} produit{selectedWithDiff.length > 1 ? 's' : ''} a ajuster
              </span>
              <span className="flex items-center gap-1 text-green-400">
                <ArrowUpCircle className="w-4 h-4" />
                Entrees: +{formatNumber(totalPositive)}
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <ArrowDownCircle className="w-4 h-4" />
                Sorties: {formatNumber(totalNegative)}
              </span>
              <span className="text-white">
                Valeur: {formatCurrency(totalValue)}
              </span>
            </div>
            <button
              onClick={executeAdjustments}
              disabled={processing || selectedWithDiff.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition font-medium"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              Creer les mouvements dans ODOO
            </button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            <span className="ml-3 text-slate-400">Analyse en cours...</span>
          </div>
        ) : discrepancies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <FileSpreadsheet className="w-12 h-12 mb-3" />
            <p>Cliquez sur "Analyser les 30 premiers" pour commencer</p>
          </div>
        ) : (
          <>
            <div className="p-3 bg-slate-700/50 border-b border-slate-600 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={selectAll}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Tout selectionner (avec ecart)
                </button>
                <button
                  onClick={selectNone}
                  className="text-slate-400 hover:text-slate-300 text-sm"
                >
                  Tout deselectionner
                </button>
              </div>
              <span className="text-slate-400 text-sm">
                {discrepancies.filter(d => Math.abs(d.difference) > 0.01).length} produits avec ecart
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700/30 border-b border-slate-600">
                    <th className="py-3 px-3 w-10"></th>
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold">Produit</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Stock Actuel</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Stock Calcule</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Ecart</th>
                    <th className="text-center py-3 px-3 text-slate-300 font-semibold">Type</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Prix Unit.</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Valeur Ecart</th>
                  </tr>
                </thead>
                <tbody>
                  {discrepancies.map(d => {
                    const hasDiff = Math.abs(d.difference) > 0.01
                    const isSelected = selectedIds.has(d.productId)
                    return (
                      <tr
                        key={d.productId}
                        onClick={() => hasDiff && toggleSelect(d.productId)}
                        className={`border-b border-slate-700/50 transition ${
                          hasDiff ? 'hover:bg-slate-700/30 cursor-pointer' : 'opacity-50'
                        } ${isSelected ? 'bg-blue-600/10' : ''}`}
                      >
                        <td className="py-2.5 px-3">
                          {hasDiff && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(d.productId)}
                              className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500"
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div>
                            {d.productCode && (
                              <span className="text-slate-400 font-mono text-xs mr-2">[{d.productCode}]</span>
                            )}
                            <span className="text-white">{d.productName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-white font-medium">
                          {formatNumber(d.currentQty)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {formatNumber(d.calculatedQty)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${
                          d.difference > 0.01 ? 'text-green-400' :
                          d.difference < -0.01 ? 'text-red-400' : 'text-slate-500'
                        }`}>
                          {d.difference > 0 ? '+' : ''}{formatNumber(d.difference)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {d.difference > 0.01 ? (
                            <span className="flex items-center justify-center gap-1 text-green-400">
                              <ArrowUpCircle className="w-4 h-4" />
                              Entree
                            </span>
                          ) : d.difference < -0.01 ? (
                            <span className="flex items-center justify-center gap-1 text-red-400">
                              <ArrowDownCircle className="w-4 h-4" />
                              Sortie
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {formatCurrency(d.standardPrice)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-medium ${
                          d.difference * d.standardPrice > 0 ? 'text-green-400' :
                          d.difference * d.standardPrice < 0 ? 'text-red-400' : 'text-slate-500'
                        }`}>
                          {formatCurrency(d.difference * d.standardPrice)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Explication */}
      <div className="bg-slate-700/30 rounded-lg p-4 text-sm text-slate-400">
        <h3 className="font-medium text-slate-300 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Comment ca fonctionne
        </h3>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>Stock Actuel</strong> : Quantite dans ODOO (stock.quant / qty_available)</li>
          <li><strong>Stock Calcule</strong> : Somme des mouvements (entrees - sorties)</li>
          <li><strong>Ecart</strong> : Difference entre les deux (positif = manque en mouvements)</li>
          <li><strong>Entree</strong> : Cree un mouvement Ajustement → Stock (augmente le stock)</li>
          <li><strong>Sortie</strong> : Cree un mouvement Stock → Ajustement (diminue le stock)</li>
        </ul>
      </div>
    </div>
  )
}
