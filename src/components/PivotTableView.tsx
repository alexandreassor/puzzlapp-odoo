import { useState, useMemo, useEffect } from 'react'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, Download, BarChart3, X, Cloud, HardDrive, RefreshCw, Loader2 } from 'lucide-react'
import stockMovementsData from '../data/stockMovements.json'
import { fetchStockMovesForPivot, PivotData } from '../services/odooService'

interface StaticStockMovement {
  product: string
  paris_receptions: number
  paris_preparation: number
  paris_expeditions: number
  paris_caisse: number
  paris_evenement: number
  satc_receptions: number
  satc_livraisons: number
  aucun: number
  total: number
}

type DataSource = 'excel' | 'odoo'
type SortField = 'product' | 'total' | string
type SortDirection = 'asc' | 'desc' | null

// Colonnes pour les donnees Excel (statiques)
const STATIC_COLUMNS = [
  { key: 'product', label: 'Produit', width: 'w-80' },
  { key: 'paris_receptions', label: 'Paris Receptions', width: 'w-28' },
  { key: 'paris_preparation', label: 'Paris Preparation', width: 'w-28' },
  { key: 'paris_expeditions', label: 'Paris Expeditions', width: 'w-28' },
  { key: 'paris_caisse', label: 'Paris Caisse', width: 'w-28' },
  { key: 'paris_evenement', label: 'Paris Evenement', width: 'w-28' },
  { key: 'satc_receptions', label: 'SATC Receptions', width: 'w-28' },
  { key: 'satc_livraisons', label: 'SATC Livraisons', width: 'w-28' },
  { key: 'aucun', label: 'Autre', width: 'w-24' },
  { key: 'total', label: 'Total', width: 'w-24' },
] as const

export default function PivotTableView() {
  const [dataSource, setDataSource] = useState<DataSource>('excel')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(STATIC_COLUMNS.map(c => c.key)))
  const [showColumnFilter, setShowColumnFilter] = useState(false)
  const [minTotal, setMinTotal] = useState(0)

  // ODOO data state
  const [odooData, setOdooData] = useState<PivotData[]>([])
  const [odooLoading, setOdooLoading] = useState(false)
  const [odooError, setOdooError] = useState<string | null>(null)

  const staticData: StaticStockMovement[] = stockMovementsData as StaticStockMovement[]

  // Charger les donnees ODOO
  const loadOdooData = async () => {
    setOdooLoading(true)
    setOdooError(null)
    try {
      const data = await fetchStockMovesForPivot()
      setOdooData(data)
    } catch (err) {
      setOdooError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setOdooLoading(false)
    }
  }

  // Charger ODOO data au switch
  useEffect(() => {
    if (dataSource === 'odoo' && odooData.length === 0 && !odooLoading) {
      loadOdooData()
    }
  }, [dataSource])

  // Extraire les colonnes dynamiques depuis les donnees ODOO
  const odooColumns = useMemo(() => {
    if (odooData.length === 0) return []

    const allLocations = new Set<string>()
    odooData.forEach(item => {
      Object.keys(item.locations).forEach(loc => allLocations.add(loc))
    })

    return [
      { key: 'product', label: 'Produit', width: 'w-80' },
      ...Array.from(allLocations).sort().map(loc => ({
        key: loc,
        label: loc.length > 25 ? loc.substring(0, 25) + '...' : loc,
        width: 'w-32'
      })),
      { key: 'total', label: 'Total', width: 'w-24' }
    ]
  }, [odooData])

  // Colonnes actuelles selon la source
  const currentColumns = dataSource === 'excel' ? STATIC_COLUMNS : odooColumns

  // Filtrage et tri des donnees
  const filteredAndSortedData = useMemo(() => {
    let result: Array<{ product: string; total: number; [key: string]: unknown }>

    if (dataSource === 'excel') {
      result = staticData.map(item => ({ ...item }))
    } else {
      result = odooData.map(item => ({
        product: item.product,
        total: item.total,
        ...item.locations
      }))
    }

    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.product.toLowerCase().includes(query)
      )
    }

    // Filtrer par total minimum
    if (minTotal > 0) {
      result = result.filter(item => item.total >= minTotal)
    }

    // Trier
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }

        const aNum = typeof aVal === 'number' ? aVal : 0
        const bNum = typeof bVal === 'number' ? bVal : 0

        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
      })
    }

    return result
  }, [dataSource, staticData, odooData, searchQuery, sortField, sortDirection, minTotal])

  // Calcul des totaux
  const totals = useMemo(() => {
    const result: { [key: string]: number } = { total: 0 }

    currentColumns.forEach(col => {
      if (col.key !== 'product') {
        result[col.key] = 0
      }
    })

    filteredAndSortedData.forEach(item => {
      currentColumns.forEach(col => {
        if (col.key !== 'product') {
          const val = item[col.key]
          result[col.key] = (result[col.key] || 0) + (typeof val === 'number' ? val : 0)
        }
      })
    })

    return result
  }, [filteredAndSortedData, currentColumns])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev =>
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
      )
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const exportToCSV = () => {
    const headers = currentColumns.filter(c => visibleColumns.has(c.key)).map(c => c.label)
    const rows = filteredAndSortedData.map(item =>
      currentColumns.filter(c => visibleColumns.has(c.key)).map(c => {
        const val = item[c.key]
        return typeof val === 'string' ? `"${val}"` : (val || 0)
      })
    )

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `mouvements_stock_${dataSource}.csv`
    link.click()
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-30" />
    if (sortDirection === 'asc') return <ArrowUp className="w-4 h-4 text-blue-400" />
    if (sortDirection === 'desc') return <ArrowDown className="w-4 h-4 text-blue-400" />
    return <ArrowUpDown className="w-4 h-4 opacity-30" />
  }

  const formatNumber = (n: unknown) => {
    if (typeof n !== 'number' || n === 0) return '-'
    return n.toLocaleString('fr-FR')
  }

  // Reset columns when switching data source
  useEffect(() => {
    setVisibleColumns(new Set(currentColumns.map(c => c.key)))
  }, [dataSource, odooData.length])

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 mb-6">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Tableau Croise Dynamique</h1>
                  <p className="text-slate-400">Analyse des mouvements de stock par emplacement</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm">
                  {filteredAndSortedData.length.toLocaleString()} produits
                </span>
                <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                  {totals.total.toLocaleString()} mouvements
                </span>
              </div>
            </div>

            {/* Data Source Toggle */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-slate-700/50 rounded-lg">
              <span className="text-sm text-slate-400">Source des donnees :</span>
              <div className="flex items-center bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setDataSource('excel')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                    dataSource === 'excel'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  Fichier Excel
                </button>
                <button
                  onClick={() => setDataSource('odoo')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                    dataSource === 'odoo'
                      ? 'bg-green-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cloud className="w-4 h-4" />
                  ODOO Live
                </button>
              </div>
              {dataSource === 'odoo' && (
                <button
                  onClick={loadOdooData}
                  disabled={odooLoading}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${odooLoading ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
              )}
            </div>

            {/* ODOO Error */}
            {dataSource === 'odoo' && odooError && (
              <div className="mb-4 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                <X className="w-5 h-5" />
                <span>{odooError}</span>
                <button
                  onClick={loadOdooData}
                  className="ml-auto px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded transition text-sm"
                >
                  Reessayer
                </button>
              </div>
            )}

            {/* ODOO Loading */}
            {dataSource === 'odoo' && odooLoading && (
              <div className="mb-4 flex items-center justify-center gap-3 bg-slate-700/50 rounded-lg p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <span className="text-slate-300">Chargement des donnees ODOO...</span>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Min Total Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Total min:</span>
                <input
                  type="number"
                  value={minTotal}
                  onChange={(e) => setMinTotal(parseInt(e.target.value) || 0)}
                  className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Column Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowColumnFilter(!showColumnFilter)}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
                >
                  <Filter className="w-4 h-4" />
                  Colonnes ({visibleColumns.size}/{currentColumns.length})
                </button>
                {showColumnFilter && (
                  <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg p-3 z-50 min-w-[250px] max-h-[400px] overflow-y-auto shadow-xl">
                    {currentColumns.map(col => (
                      <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-700 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-300 truncate">{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Export */}
              <button
                onClick={exportToCSV}
                disabled={filteredAndSortedData.length === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Exporter CSV
              </button>
            </div>
          </div>

          {/* Table */}
          {(dataSource === 'excel' || (dataSource === 'odoo' && !odooLoading && odooData.length > 0)) && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50">
                    {currentColumns.filter(col => visibleColumns.has(col.key)).map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key as SortField)}
                        className={`px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-700 ${col.width} whitespace-nowrap`}
                        title={col.label}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[120px]">{col.label}</span>
                          {getSortIcon(col.key)}
                        </div>
                      </th>
                    ))}
                  </tr>
                  {/* Totals row */}
                  <tr className="bg-purple-500/10 border-b border-slate-700">
                    {currentColumns.filter(col => visibleColumns.has(col.key)).map(col => (
                      <td key={col.key} className="px-4 py-2 text-sm font-bold text-purple-300">
                        {col.key === 'product'
                          ? 'TOTAL'
                          : formatNumber(totals[col.key])}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredAndSortedData.slice(0, 500).map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-700/30 transition"
                    >
                      {currentColumns.filter(col => visibleColumns.has(col.key)).map(col => (
                        <td
                          key={col.key}
                          className={`px-4 py-2 text-sm ${
                            col.key === 'product'
                              ? 'text-white font-medium'
                              : col.key === 'total'
                                ? 'text-purple-300 font-semibold'
                                : 'text-slate-300'
                          }`}
                          title={col.key === 'product' ? String(item.product) : undefined}
                        >
                          {col.key === 'product'
                            ? <span className="truncate block max-w-[300px]">{item.product}</span>
                            : formatNumber(item[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* No data */}
          {dataSource === 'odoo' && !odooLoading && odooData.length === 0 && !odooError && (
            <div className="p-12 text-center text-slate-400">
              <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnee chargee.</p>
              <p className="text-sm mt-2">Cliquez sur "Actualiser" pour charger les donnees ODOO.</p>
            </div>
          )}

          {/* Footer */}
          {filteredAndSortedData.length > 500 && (
            <div className="p-4 border-t border-slate-700 text-center text-slate-400 text-sm">
              Affichage limite a 500 lignes. Utilisez la recherche pour filtrer les resultats.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
