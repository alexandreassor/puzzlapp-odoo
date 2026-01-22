import { useState, useMemo } from 'react'
import { RefreshCw, ArrowUpDown, Search, Filter, Package, AlertTriangle, XCircle } from 'lucide-react'
import type { Product } from '../types'

interface InventoryTableProps {
  products: Product[]
  loading: boolean
  onRefresh: () => void
  onProductClick: (productId: number) => void
}

type SortField = 'name' | 'qty_available' | 'virtual_available' | 'standard_price'
type SortOrder = 'asc' | 'desc'
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

export default function InventoryTable({ products, loading, onRefresh, onProductClick }: InventoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')

  const getStockStatus = (qty: number) => {
    if (qty <= 0) return { label: 'Rupture', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle }
    if (qty < 5) return { label: 'Faible', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle }
    return { label: 'Normal', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Package }
  }

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products]

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.default_code && p.default_code.toLowerCase().includes(query))
      )
    }

    // Filtre par statut de stock
    switch (stockFilter) {
      case 'in_stock':
        result = result.filter(p => p.qty_available >= 5)
        break
      case 'low_stock':
        result = result.filter(p => p.qty_available > 0 && p.qty_available < 5)
        break
      case 'out_of_stock':
        result = result.filter(p => p.qty_available <= 0)
        break
    }

    // Tri
    result.sort((a, b) => {
      let aVal: string | number = a[sortField] ?? 0
      let bVal: string | number = b[sortField] ?? 0

      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [products, searchQuery, stockFilter, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-white transition font-semibold"
    >
      {label}
      <ArrowUpDown className={`w-4 h-4 ${sortField === field ? 'text-blue-400' : 'text-slate-500'}`} />
    </button>
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
      {/* Header avec recherche et filtres */}
      <div className="p-4 border-b border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" />
            Inventaire des Produits
          </h2>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un produit (nom ou code)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Filtre par statut */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">Tous les produits</option>
              <option value="in_stock">En stock</option>
              <option value="low_stock">Stock faible</option>
              <option value="out_of_stock">Rupture</option>
            </select>
          </div>
        </div>

        {/* Compteur de résultats */}
        <div className="text-sm text-slate-400">
          {filteredAndSortedProducts.length} produit{filteredAndSortedProducts.length > 1 ? 's' : ''} trouvé{filteredAndSortedProducts.length > 1 ? 's' : ''}
          {searchQuery && ` pour "${searchQuery}"`}
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700/50">
              <th className="px-4 py-3 text-left text-sm text-slate-300">
                <SortButton field="name" label="Produit" />
              </th>
              <th className="px-4 py-3 text-left text-sm text-slate-300">Code</th>
              <th className="px-4 py-3 text-right text-sm text-slate-300">
                <SortButton field="qty_available" label="Qté Dispo" />
              </th>
              <th className="px-4 py-3 text-right text-sm text-slate-300">
                <SortButton field="virtual_available" label="Qté Virtuelle" />
              </th>
              <th className="px-4 py-3 text-right text-sm text-slate-300">
                <SortButton field="standard_price" label="Coût" />
              </th>
              <th className="px-4 py-3 text-center text-sm text-slate-300">Statut</th>
              <th className="px-4 py-3 text-center text-sm text-slate-300">Catégorie</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    <span className="text-slate-400">Chargement de l'inventaire...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAndSortedProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  Aucun produit trouvé
                </td>
              </tr>
            ) : (
              filteredAndSortedProducts.map((product) => {
                const status = getStockStatus(product.qty_available)
                const StatusIcon = status.icon
                return (
                  <tr
                    key={product.id}
                    onClick={() => onProductClick(product.id)}
                    className="border-t border-slate-700/50 hover:bg-slate-700/30 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="text-white font-medium hover:text-blue-400 transition">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-sm">
                      {product.default_code || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${product.qty_available <= 0 ? 'text-red-400' : product.qty_available < 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {Math.round(product.qty_available)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {Math.round(product.virtual_available)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {formatCurrency(product.standard_price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">
                      {product.categ_id ? product.categ_id[1] : '-'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer avec stats */}
      {!loading && filteredAndSortedProducts.length > 0 && (
        <div className="p-4 border-t border-slate-700 bg-slate-700/30">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-400">Valeur totale : </span>
              <span className="text-white font-bold">
                {formatCurrency(filteredAndSortedProducts.reduce((sum, p) => sum + (p.qty_available * p.standard_price), 0))}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Quantité totale : </span>
              <span className="text-white font-bold">
                {Math.round(filteredAndSortedProducts.reduce((sum, p) => sum + p.qty_available, 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
