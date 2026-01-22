import { useState } from 'react'
import { Search, Plus, Download, Upload, RefreshCw, ChevronDown, ChevronRight, Package, AlertTriangle, CheckCircle, XCircle, MoreVertical, Eye } from 'lucide-react'
import type { Product } from '../types'

interface OdooStyleViewProps {
  products: Product[]
  loading: boolean
  onRefresh: () => void
  onProductClick: (productId: number) => void
}

type ViewMode = 'list' | 'kanban'
type FilterType = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

export default function OdooStyleView({ products, loading, onRefresh, onProductClick }: OdooStyleViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['all'])

  // Filtrer les produits
  const filteredProducts = products.filter(product => {
    // Filtre de recherche
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.default_code && product.default_code.toLowerCase().includes(searchQuery.toLowerCase()))

    // Filtre de stock
    let matchesFilter = true
    if (activeFilter === 'in_stock') {
      matchesFilter = product.qty_available > 5
    } else if (activeFilter === 'low_stock') {
      matchesFilter = product.qty_available > 0 && product.qty_available <= 5
    } else if (activeFilter === 'out_of_stock') {
      matchesFilter = product.qty_available <= 0
    }

    return matchesSearch && matchesFilter
  })

  // Grouper par categorie
  const groupedByCategory = filteredProducts.reduce((acc, product) => {
    const categoryName = product.categ_id?.[1] || 'Sans categorie'
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id))
    }
  }

  const toggleSelectProduct = (productId: number) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const getStockStatus = (qty: number) => {
    if (qty <= 0) return { label: 'Rupture', color: 'text-red-600 bg-red-100', icon: XCircle }
    if (qty <= 5) return { label: 'Faible', color: 'text-orange-600 bg-orange-100', icon: AlertTriangle }
    return { label: 'En stock', color: 'text-green-600 bg-green-100', icon: CheckCircle }
  }

  // Stats
  const stats = {
    total: products.length,
    inStock: products.filter(p => p.qty_available > 5).length,
    lowStock: products.filter(p => p.qty_available > 0 && p.qty_available <= 5).length,
    outOfStock: products.filter(p => p.qty_available <= 0).length
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Odoo Style */}
      <header className="bg-[#714B67] text-white shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Inventaire</h1>
              <span className="text-white/70 text-sm">/ Produits</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                className="p-2 hover:bg-white/10 rounded transition"
                title="Actualiser"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Action Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 bg-[#714B67] hover:bg-[#5d3d55] text-white px-4 py-2 rounded transition text-sm font-medium">
              <Plus className="w-4 h-4" />
              Nouveau
            </button>
            <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded transition text-sm">
              <Upload className="w-4 h-4" />
              Importer
            </button>
            <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded transition text-sm">
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67] focus:border-transparent w-64"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-gray-300 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-[#714B67] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                title="Vue liste"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 ${viewMode === 'kanban' ? 'bg-[#714B67] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                title="Vue Kanban"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Filters */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-120px)] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filtres</h3>

          <div className="space-y-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition ${
                activeFilter === 'all' ? 'bg-[#714B67] text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Tous les produits
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === 'all' ? 'bg-white/20' : 'bg-gray-200'}`}>
                {stats.total}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('in_stock')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition ${
                activeFilter === 'in_stock' ? 'bg-[#714B67] text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                En stock
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === 'in_stock' ? 'bg-white/20' : 'bg-green-100 text-green-700'}`}>
                {stats.inStock}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('low_stock')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition ${
                activeFilter === 'low_stock' ? 'bg-[#714B67] text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Stock faible
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === 'low_stock' ? 'bg-white/20' : 'bg-orange-100 text-orange-700'}`}>
                {stats.lowStock}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('out_of_stock')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition ${
                activeFilter === 'out_of_stock' ? 'bg-[#714B67] text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Rupture
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === 'out_of_stock' ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>
                {stats.outOfStock}
              </span>
            </button>
          </div>

          {/* Categories */}
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-6">Categories</h3>
          <div className="space-y-1">
            {Object.keys(groupedByCategory).map(category => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100 transition"
              >
                <span className="flex items-center gap-2">
                  {expandedCategories.includes(category) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  {category}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200">
                  {groupedByCategory[category].length}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3 text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>Chargement...</span>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            /* List View */
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67]"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Categorie
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      En stock
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Previsionnel
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cout
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="w-10 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product.qty_available)
                    const StatusIcon = status.icon
                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-50 transition cursor-pointer"
                        onClick={() => onProductClick(product.id)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => toggleSelectProduct(product.id)}
                            className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-gray-600">
                            {product.default_code || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900">
                            {product.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {product.categ_id?.[1] || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${product.qty_available <= 0 ? 'text-red-600' : product.qty_available <= 5 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {Math.round(product.qty_available)}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">
                            {product.uom_id?.[1] || 'Unit'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-600">
                            {Math.round(product.virtual_available || 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-900">
                            {(product.standard_price || 0).toFixed(2)} EUR
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button className="p-1 hover:bg-gray-200 rounded transition">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucun produit trouve</p>
                </div>
              )}
            </div>
          ) : (
            /* Kanban View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const status = getStockStatus(product.qty_available)
                const StatusIcon = status.icon
                return (
                  <div
                    key={product.id}
                    onClick={() => onProductClick(product.id)}
                    className="bg-white rounded-lg shadow hover:shadow-md transition cursor-pointer overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-500">
                        {product.default_code || `#${product.id}`}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {product.categ_id?.[1] || 'Sans categorie'}
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">En stock</p>
                          <p className={`text-lg font-bold ${product.qty_available <= 0 ? 'text-red-600' : product.qty_available <= 5 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {Math.round(product.qty_available)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Cout unitaire</p>
                          <p className="text-lg font-bold text-gray-900">
                            {(product.standard_price || 0).toFixed(2)} EUR
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="bg-gray-50 px-4 py-2 border-t flex justify-end">
                      <button className="flex items-center gap-1 text-[#714B67] hover:text-[#5d3d55] text-sm font-medium transition">
                        <Eye className="w-4 h-4" />
                        Voir details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer Stats */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} affiche{filteredProducts.length > 1 ? 's' : ''}
              {selectedProducts.length > 0 && ` (${selectedProducts.length} selectionne${selectedProducts.length > 1 ? 's' : ''})`}
            </span>
            <span>
              Valeur totale: {filteredProducts.reduce((sum, p) => sum + (p.qty_available * (p.standard_price || 0)), 0).toFixed(2)} EUR
            </span>
          </div>
        </main>
      </div>
    </div>
  )
}
