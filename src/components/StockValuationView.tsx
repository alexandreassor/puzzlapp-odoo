import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search, Calendar, RefreshCw, Download, ChevronLeft, ChevronRight,
  Loader2, DollarSign, TrendingUp, TrendingDown, Pencil, Check, X,
  CheckSquare, Square, MinusSquare, Trash2, FileSpreadsheet, Package,
  Calculator, ChevronDown, Filter, ArrowUpDown, ArrowUp, ArrowDown,
  Columns, Eye, EyeOff, Bug
} from 'lucide-react'

// Definition des colonnes configurables
type ColumnKey = 'date' | 'reference' | 'type' | 'productCode' | 'product' | 'lot' | 'quantity' | 'remainingQty' | 'unitValue' | 'cump' | 'unit' | 'totalValue' | 'description' | 'remainingValue'

interface ColumnConfig {
  key: ColumnKey
  label: string
  defaultVisible: boolean
  minWidth: number
  defaultWidth: number
}

const DEFAULT_COLUMNS_CONFIG: ColumnConfig[] = [
  { key: 'date', label: 'Date', defaultVisible: true, minWidth: 100, defaultWidth: 140 },
  { key: 'reference', label: 'Reference', defaultVisible: true, minWidth: 80, defaultWidth: 120 },
  { key: 'type', label: 'Type', defaultVisible: true, minWidth: 60, defaultWidth: 80 },
  { key: 'productCode', label: 'Code Article', defaultVisible: true, minWidth: 100, defaultWidth: 140 },
  { key: 'product', label: 'Nom Produit', defaultVisible: true, minWidth: 150, defaultWidth: 250 },
  { key: 'lot', label: 'Lot/numero', defaultVisible: true, minWidth: 80, defaultWidth: 100 },
  { key: 'quantity', label: 'Quantite', defaultVisible: true, minWidth: 70, defaultWidth: 90 },
  { key: 'remainingQty', label: 'Qte restante', defaultVisible: false, minWidth: 80, defaultWidth: 100 },
  { key: 'unitValue', label: 'Prix unitaire', defaultVisible: true, minWidth: 100, defaultWidth: 140 },
  { key: 'cump', label: 'CUMP', defaultVisible: true, minWidth: 80, defaultWidth: 100 },
  { key: 'unit', label: 'Unite', defaultVisible: false, minWidth: 60, defaultWidth: 80 },
  { key: 'totalValue', label: 'Valeur totale', defaultVisible: true, minWidth: 90, defaultWidth: 110 },
  { key: 'description', label: 'Description', defaultVisible: false, minWidth: 100, defaultWidth: 150 },
  { key: 'remainingValue', label: 'Valeur restante', defaultVisible: false, minWidth: 100, defaultWidth: 120 },
]

// Charger les colonnes visibles depuis localStorage
const loadVisibleColumns = (): Set<ColumnKey> => {
  try {
    const stored = localStorage.getItem('stock_visible_columns')
    if (stored) {
      return new Set(JSON.parse(stored) as ColumnKey[])
    }
  } catch (e) {
    console.error('Erreur chargement colonnes:', e)
  }
  return new Set(DEFAULT_COLUMNS_CONFIG.filter(c => c.defaultVisible).map(c => c.key))
}

// Sauvegarder les colonnes visibles
const saveVisibleColumns = (columns: Set<ColumnKey>) => {
  try {
    localStorage.setItem('stock_visible_columns', JSON.stringify(Array.from(columns)))
  } catch (e) {
    console.error('Erreur sauvegarde colonnes:', e)
  }
}

// Charger l'ordre des colonnes
const loadColumnOrder = (): ColumnKey[] => {
  try {
    const stored = localStorage.getItem('stock_column_order')
    if (stored) {
      const order = JSON.parse(stored) as ColumnKey[]
      // S'assurer que toutes les colonnes sont presentes
      const allKeys = DEFAULT_COLUMNS_CONFIG.map(c => c.key)
      const missingKeys = allKeys.filter(k => !order.includes(k))
      return [...order.filter(k => allKeys.includes(k)), ...missingKeys]
    }
  } catch (e) {
    console.error('Erreur chargement ordre colonnes:', e)
  }
  return DEFAULT_COLUMNS_CONFIG.map(c => c.key)
}

// Sauvegarder l'ordre des colonnes
const saveColumnOrder = (order: ColumnKey[]) => {
  try {
    localStorage.setItem('stock_column_order', JSON.stringify(order))
  } catch (e) {
    console.error('Erreur sauvegarde ordre colonnes:', e)
  }
}

// Charger les largeurs des colonnes
const loadColumnWidths = (): Record<ColumnKey, number> => {
  try {
    const stored = localStorage.getItem('stock_column_widths')
    if (stored) {
      return JSON.parse(stored) as Record<ColumnKey, number>
    }
  } catch (e) {
    console.error('Erreur chargement largeurs colonnes:', e)
  }
  const defaults: Record<string, number> = {}
  DEFAULT_COLUMNS_CONFIG.forEach(c => { defaults[c.key] = c.defaultWidth })
  return defaults as Record<ColumnKey, number>
}

// Sauvegarder les largeurs des colonnes
const saveColumnWidths = (widths: Record<ColumnKey, number>) => {
  try {
    localStorage.setItem('stock_column_widths', JSON.stringify(widths))
  } catch (e) {
    console.error('Erreur sauvegarde largeurs colonnes:', e)
  }
}
import { fetchStockValuation, updateStockMovePrice, getCompanyValuationInfo, runDiagnostic, type StockValuationEntry, type CompanyValuationInfo } from '../services/odooService'

interface ProductCUMP {
  productId: number
  productName: string
  productCode: string
  totalQtyIn: number
  totalValueIn: number
  totalQtyOut: number
  totalValueOut: number
  netQty: number
  cump: number
  firstEntryDate: string | null
}

export default function StockValuationView() {
  const [data, setData] = useState<StockValuationEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Filtre par produit
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')

  // Filtre par date de premiere ecriture
  const [firstEntryDateFilter, setFirstEntryDateFilter] = useState<string>('')

  // Filtre par type d'operation
  const [operationTypeFilter, setOperationTypeFilter] = useState<'all' | 'entry' | 'exit'>('all')

  // Tri
  const [sortColumn, setSortColumn] = useState<'date' | 'reference' | null>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Edition du prix
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingPrice, setEditingPrice] = useState<string>('')
  const [savingPrice, setSavingPrice] = useState(false)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Affichage CUMP
  const [showCUMPDetails, setShowCUMPDetails] = useState(false)

  // Infos valorisation globales du dossier
  const [companyInfo, setCompanyInfo] = useState<CompanyValuationInfo | null>(null)

  // Colonnes visibles, ordre et largeurs
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => loadVisibleColumns())
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => loadColumnOrder())
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => loadColumnWidths())
  const [showColumnSelector, setShowColumnSelector] = useState(false)

  // Pour une future implementation du drag & drop et redimensionnement
  // const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null)
  // const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null)
  // const [dragOverColumn, setDragOverColumn] = useState<ColumnKey | null>(null)

  // Pour reference future: colonnes ordonnees
  // const orderedColumns = useMemo(() => {
  //   return columnOrder.map(key => DEFAULT_COLUMNS_CONFIG.find(c => c.key === key)).filter((c): c is ColumnConfig => c !== undefined)
  // }, [columnOrder])

  // Utiliser les variables pour eviter les warnings
  void columnOrder
  void columnWidths

  // Toggle une colonne
  const toggleColumn = (key: ColumnKey) => {
    const newSet = new Set(visibleColumns)
    if (newSet.has(key)) {
      if (newSet.size > 3) {
        newSet.delete(key)
      }
    } else {
      newSet.add(key)
    }
    setVisibleColumns(newSet)
    saveVisibleColumns(newSet)
  }

  // Afficher toutes les colonnes
  const showAllColumns = () => {
    const allColumns = new Set(DEFAULT_COLUMNS_CONFIG.map(c => c.key))
    setVisibleColumns(allColumns)
    saveVisibleColumns(allColumns)
  }

  // Reset aux colonnes par defaut
  const resetColumns = () => {
    const defaultColumns = new Set(DEFAULT_COLUMNS_CONFIG.filter(c => c.defaultVisible).map(c => c.key))
    setVisibleColumns(defaultColumns)
    saveVisibleColumns(defaultColumns)
    const defaultOrder = DEFAULT_COLUMNS_CONFIG.map(c => c.key)
    setColumnOrder(defaultOrder)
    saveColumnOrder(defaultOrder)
    const defaultWidths: Record<string, number> = {}
    DEFAULT_COLUMNS_CONFIG.forEach(c => { defaultWidths[c.key] = c.defaultWidth })
    setColumnWidths(defaultWidths as Record<ColumnKey, number>)
    saveColumnWidths(defaultWidths as Record<ColumnKey, number>)
  }

  // Helper pour verifier si une colonne est visible
  const isColumnVisible = (key: ColumnKey) => visibleColumns.has(key)

  // Future implementation: Drag & Drop et Redimensionnement colonnes
  // Ces fonctionnalites seront ajoutees dans une prochaine version
  // Voir les commentaires ci-dessus pour les variables d'etat correspondantes

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Charger les donnees et les infos du dossier en parallele
      const [result, companyValuation] = await Promise.all([
        fetchStockValuation(1000, dateFilter || undefined),
        getCompanyValuationInfo()
      ])
      setData(result)
      setCompanyInfo(companyValuation)
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
      console.error('Error loading stock valuation:', err)
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Liste des produits uniques pour le dropdown
  const uniqueProducts = useMemo(() => {
    const productMap = new Map<number, { id: number; name: string; code: string }>()
    for (const entry of data) {
      if (!productMap.has(entry.productId)) {
        productMap.set(entry.productId, {
          id: entry.productId,
          name: entry.product,
          code: entry.productCode
        })
      }
    }
    return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  // Produits filtres pour le dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery) return uniqueProducts
    const query = productSearchQuery.toLowerCase()
    return uniqueProducts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query)
    )
  }, [uniqueProducts, productSearchQuery])

  // Calcul du CUMP par produit
  const productCUMPs = useMemo((): ProductCUMP[] => {
    const cumpMap = new Map<number, ProductCUMP>()

    for (const entry of data) {
      if (!cumpMap.has(entry.productId)) {
        cumpMap.set(entry.productId, {
          productId: entry.productId,
          productName: entry.product,
          productCode: entry.productCode,
          totalQtyIn: 0,
          totalValueIn: 0,
          totalQtyOut: 0,
          totalValueOut: 0,
          netQty: 0,
          cump: 0,
          firstEntryDate: null
        })
      }

      const product = cumpMap.get(entry.productId)!
      if (entry.quantity > 0) {
        // Entree
        product.totalQtyIn += entry.quantity
        product.totalValueIn += Math.abs(entry.totalValue)
        // Mettre a jour la date de premiere entree (garder la plus ancienne)
        if (!product.firstEntryDate || new Date(entry.date) < new Date(product.firstEntryDate)) {
          product.firstEntryDate = entry.date
        }
      } else {
        // Sortie
        product.totalQtyOut += Math.abs(entry.quantity)
        product.totalValueOut += Math.abs(entry.totalValue)
      }
      product.netQty = product.totalQtyIn - product.totalQtyOut
    }

    // Calculer le CUMP pour chaque produit
    cumpMap.forEach(product => {
      if (product.totalQtyIn > 0) {
        product.cump = product.totalValueIn / product.totalQtyIn
      }
    })

    return Array.from(cumpMap.values()).sort((a, b) => b.totalValueIn - a.totalValueIn)
  }, [data])

  // Filtrer les produits par date de premiere ecriture
  const filteredProductCUMPs = useMemo(() => {
    if (!firstEntryDateFilter) return productCUMPs

    const filterDate = new Date(firstEntryDateFilter)
    filterDate.setHours(23, 59, 59, 999)

    return productCUMPs.filter(product => {
      if (!product.firstEntryDate) return false
      const entryDate = new Date(product.firstEntryDate)
      return entryDate <= filterDate
    })
  }, [productCUMPs, firstEntryDateFilter])

  // CUMP global
  const globalCUMP = useMemo(() => {
    let totalQtyIn = 0
    let totalValueIn = 0
    let totalQtyOut = 0
    let totalValueOut = 0

    for (const entry of data) {
      if (entry.quantity > 0) {
        totalQtyIn += entry.quantity
        totalValueIn += Math.abs(entry.totalValue)
      } else {
        totalQtyOut += Math.abs(entry.quantity)
        totalValueOut += Math.abs(entry.totalValue)
      }
    }

    const cump = totalQtyIn > 0 ? totalValueIn / totalQtyIn : 0

    return {
      totalQtyIn,
      totalValueIn,
      totalQtyOut,
      totalValueOut,
      netQty: totalQtyIn - totalQtyOut,
      netValue: totalValueIn - totalValueOut,
      cump
    }
  }, [data])

  // CUMP du produit selectionne
  const selectedProductCUMP = useMemo(() => {
    if (!selectedProductId) return null
    return productCUMPs.find(p => p.productId === selectedProductId) || null
  }, [selectedProductId, productCUMPs])

  // Filtrer par recherche ET par produit ET par type, puis trier
  const filteredData = useMemo(() => {
    let result = data

    // Filtre par produit
    if (selectedProductId) {
      result = result.filter(entry => entry.productId === selectedProductId)
    }

    // Filtre par type d'operation
    if (operationTypeFilter === 'entry') {
      result = result.filter(entry => entry.quantity > 0)
    } else if (operationTypeFilter === 'exit') {
      result = result.filter(entry => entry.quantity < 0)
    }

    // Filtre par recherche texte
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(entry =>
        entry.product.toLowerCase().includes(query) ||
        entry.productCode.toLowerCase().includes(query) ||
        entry.reference.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query)
      )
    }

    // Tri
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let comparison = 0
        if (sortColumn === 'date') {
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        } else if (sortColumn === 'reference') {
          comparison = a.reference.localeCompare(b.reference)
        }
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, searchQuery, selectedProductId, operationTypeFilter, sortColumn, sortDirection])

  // Fonction pour changer le tri
  const handleSort = (column: 'date' | 'reference') => {
    if (sortColumn === column) {
      // Si on clique sur la meme colonne, inverser la direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // Sinon, trier par la nouvelle colonne en ordre decroissant
      setSortColumn(column)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

  // Calcul des totaux (valeur reelle du stock = quantite nette x CUMP)
  const totals = useMemo(() => {
    // Si un produit est selectionne, utiliser ses valeurs
    if (selectedProductId && selectedProductCUMP) {
      return {
        totalValue: selectedProductCUMP.netQty * selectedProductCUMP.cump,
        totalQty: selectedProductCUMP.netQty
      }
    }

    // Sinon, calculer pour tous les produits
    let stockValue = 0
    let netQty = 0

    for (const product of productCUMPs) {
      stockValue += product.netQty * product.cump
      netQty += product.netQty
    }

    return { totalValue: stockValue, totalQty: netQty }
  }, [productCUMPs, selectedProductId, selectedProductCUMP])

  // Calcul des totaux de la selection
  const selectionTotals = useMemo(() => {
    if (selectedIds.size === 0) return null
    const selected = filteredData.filter(e => selectedIds.has(e.id))
    return selected.reduce((acc, entry) => ({
      count: acc.count + 1,
      totalValue: acc.totalValue + entry.totalValue,
      totalQty: acc.totalQty + entry.quantity
    }), { count: 0, totalValue: 0, totalQty: 0 })
  }, [filteredData, selectedIds])

  // Selection helpers
  const pageIds = useMemo(() => new Set(paginatedData.map(e => e.id)), [paginatedData])
  const allPageSelected = paginatedData.length > 0 && paginatedData.every(e => selectedIds.has(e.id))
  const somePageSelected = paginatedData.some(e => selectedIds.has(e.id))

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const newSet = new Set(selectedIds)
      pageIds.forEach(id => newSet.delete(id))
      setSelectedIds(newSet)
    } else {
      const newSet = new Set(selectedIds)
      pageIds.forEach(id => newSet.add(id))
      setSelectedIds(newSet)
    }
  }

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredData.map(e => e.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Edition du prix (simplifie - les infos de valorisation sont au niveau global)
  const startEdit = (entry: StockValuationEntry) => {
    setEditingId(entry.id)
    setEditingPrice(entry.unitValue.toString())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingPrice('')
  }

  // Message d'info apres modification de prix
  const [priceUpdateInfo, setPriceUpdateInfo] = useState<{
    show: boolean
    costMethod?: string
    valuation?: string
    cumpUpdated?: boolean
    newCump?: number
  }>({ show: false })

  // Trouver la prochaine ligne editable (entree = quantity > 0)
  const findNextEditableEntry = (currentId: number, direction: 'next' | 'prev' = 'next'): StockValuationEntry | null => {
    const currentIndex = paginatedData.findIndex(e => e.id === currentId)
    if (currentIndex === -1) return null

    const step = direction === 'next' ? 1 : -1
    let index = currentIndex + step

    while (index >= 0 && index < paginatedData.length) {
      const entry = paginatedData[index]
      if (entry.quantity > 0) { // Seules les entrees sont editables
        return entry
      }
      index += step
    }
    return null
  }

  // Map CUMP par produit pour affichage dans le tableau
  const productCUMPMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of productCUMPs) {
      map.set(p.productId, p.cump)
    }
    return map
  }, [productCUMPs])

  const savePrice = async (goToNext: 'next' | 'prev' | null = null) => {
    if (!editingId) return
    const newPrice = parseFloat(editingPrice)
    if (isNaN(newPrice) || newPrice < 0) {
      setError('Prix invalide')
      return
    }

    const currentEditingId = editingId
    setSavingPrice(true)
    setError(null)
    setPriceUpdateInfo({ show: false })
    try {
      const result = await updateStockMovePrice(currentEditingId, newPrice)
      if (result.success) {
        setData(prev => prev.map(entry => {
          if (entry.id === currentEditingId) {
            const newTotalValue = Math.abs(entry.quantity) * newPrice * (entry.quantity >= 0 ? 1 : -1)
            return { ...entry, unitValue: newPrice, totalValue: newTotalValue }
          }
          return entry
        }))

        // Navigation vers la prochaine/precedente ligne si demande
        if (goToNext) {
          const nextEntry = findNextEditableEntry(currentEditingId, goToNext)
          if (nextEntry) {
            // Passer a la ligne suivante/precedente
            setEditingId(nextEntry.id)
            setEditingPrice(nextEntry.unitValue.toString())
          } else {
            // Plus de ligne editable, terminer l'edition
            setEditingId(null)
            setEditingPrice('')
          }
        } else {
          setEditingId(null)
          setEditingPrice('')
        }

        // Afficher les infos de costing (bref, sans bloquer)
        if (result.costingInfo) {
          setPriceUpdateInfo({
            show: true,
            costMethod: result.costingInfo.costMethod,
            valuation: result.costingInfo.valuation,
            cumpUpdated: result.cumpUpdated,
            newCump: result.newCump
          })
          setTimeout(() => setPriceUpdateInfo({ show: false }), 3000)
        }
      } else {
        setError(result.error || 'Erreur lors de la sauvegarde')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSavingPrice(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    // Odoo stocke les dates en UTC sans suffixe 'Z'
    // On ajoute 'Z' pour que JavaScript l'interprete correctement comme UTC
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const exportCSV = (onlySelected = false) => {
    const dataToExport = onlySelected
      ? filteredData.filter(e => selectedIds.has(e.id))
      : filteredData

    if (dataToExport.length === 0) {
      setError('Aucune donnee a exporter')
      return
    }

    const headers = ['Date', 'Reference', 'Type', 'Code Article', 'Nom Produit', 'Quantite', 'Qte Restante', 'Valeur Unitaire', 'Unite', 'Valeur Totale', 'Description', 'Valeur Restante']
    const rows = dataToExport.map(entry => [
      formatDate(entry.date),
      entry.reference,
      entry.quantity > 0 ? 'Entree' : 'Sortie',
      entry.productCode,
      entry.product,
      entry.quantity,
      entry.remainingQty,
      entry.unitValue,
      entry.unit,
      entry.totalValue,
      entry.description,
      entry.remainingValue
    ])

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `valorisation_stock_${onlySelected ? 'selection_' : ''}${dateFilter || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCUMPCSV = () => {
    const headers = ['Code Article', 'Nom Produit', '1ere Ecriture', 'Qte Entree', 'Valeur Entree', 'Qte Sortie', 'Valeur Sortie', 'Qte Nette', 'CUMP', 'Valeur Stock']
    const rows = filteredProductCUMPs.map(p => [
      p.productCode,
      p.productName,
      p.firstEntryDate ? new Date(p.firstEntryDate).toLocaleDateString('fr-FR') : '',
      p.totalQtyIn,
      p.totalValueIn,
      p.totalQtyOut,
      p.totalValueOut,
      p.netQty,
      p.cump,
      p.netQty * p.cump
    ])

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cump_produits_${dateFilter || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedProduct = uniqueProducts.find(p => p.id === selectedProductId)

  return (
    <div className="p-4 space-y-4">
      {/* Header avec filtres style ODOO */}
      <div className="bg-[#714B67] rounded-lg p-4 relative z-50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <button className={`px-4 py-2 rounded-l-md font-medium transition flex items-center gap-2 ${
                dateFilter
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}>
                <Calendar className="w-4 h-4" />
                {dateFilter
                  ? `Au ${new Date(dateFilter).toLocaleDateString('fr-FR')}`
                  : 'Valorisation a la date'
                }
              </button>
              {dateFilter && (
                <button
                  onClick={() => {
                    setDateFilter('')
                    setCurrentPage(1)
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-r-md font-medium transition flex items-center gap-1 border-l border-amber-400/30"
                  title="Revenir a aujourd'hui"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <span className="text-white/80 text-sm">
              {dateFilter ? 'Mode historique' : 'Valorisation de stock'}
              {firstEntryDateFilter && (
                <span className="ml-2 text-cyan-300">
                  | 1ere ecriture ≤ {new Date(firstEntryDateFilter).toLocaleDateString('fr-FR')}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filtre par type d'operation */}
            <div className="flex items-center bg-white rounded-md overflow-hidden">
              <button
                onClick={() => {
                  setOperationTypeFilter('all')
                  setCurrentPage(1)
                }}
                className={`px-3 py-2 text-sm font-medium transition ${
                  operationTypeFilter === 'all'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => {
                  setOperationTypeFilter('entry')
                  setCurrentPage(1)
                }}
                className={`px-3 py-2 text-sm font-medium transition flex items-center gap-1 ${
                  operationTypeFilter === 'entry'
                    ? 'bg-green-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Entrees
              </button>
              <button
                onClick={() => {
                  setOperationTypeFilter('exit')
                  setCurrentPage(1)
                }}
                className={`px-3 py-2 text-sm font-medium transition flex items-center gap-1 ${
                  operationTypeFilter === 'exit'
                    ? 'bg-red-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                Sorties
              </button>
            </div>

            {/* Filtre par produit */}
            <div className="relative">
              <button
                onClick={() => setShowProductDropdown(!showProductDropdown)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                  selectedProductId
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700'
                }`}
              >
                <Package className="w-4 h-4" />
                {selectedProduct ? (
                  <span className="max-w-[150px] truncate">
                    {selectedProduct.code ? `[${selectedProduct.code}] ` : ''}{selectedProduct.name}
                  </span>
                ) : (
                  <span>Tous les produits</span>
                )}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showProductDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 w-80 max-h-96 overflow-hidden">
                  <div className="p-2 border-b border-slate-200">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedProductId(null)
                        setShowProductDropdown(false)
                        setProductSearchQuery('')
                        setCurrentPage(1)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
                        !selectedProductId ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Tous les produits ({uniqueProducts.length})
                    </button>
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedProductId(product.id)
                          setShowProductDropdown(false)
                          setProductSearchQuery('')
                          setCurrentPage(1)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                          selectedProductId === product.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {product.code && (
                            <span className="text-slate-400 font-mono text-xs">[{product.code}]</span>
                          )}
                          <span className="truncate">{product.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recherche texte */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9 pr-4 py-2 bg-white border-0 rounded-md w-48 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>

            {/* Filtre date valorisation */}
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-xs font-medium">Valorisation au :</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 bg-white border-0 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                title="Affiche le stock et CUMP a cette date"
              />
            </div>

            {/* Filtre date premiere ecriture */}
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-xs font-medium">1ere entree avant :</span>
              <div className="flex items-center">
                <input
                  type="date"
                  value={firstEntryDateFilter}
                  onChange={(e) => {
                    setFirstEntryDateFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-2 border-0 rounded-l-md text-sm focus:outline-none focus:ring-2 focus:ring-white/50 ${
                    firstEntryDateFilter ? 'bg-cyan-500 text-white' : 'bg-white'
                  }`}
                  title="Filtre les produits dont la 1ere entree est avant cette date"
                />
                {firstEntryDateFilter && (
                  <button
                    onClick={() => {
                      setFirstEntryDateFilter('')
                      setCurrentPage(1)
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-2 py-2 rounded-r-md text-sm transition"
                    title="Effacer le filtre"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Pagination info */}
            <span className="text-white/80 text-sm">
              {filteredData.length > 0 ? (
                <>
                  {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} / {filteredData.length}
                </>
              ) : '0'}
            </span>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Selecteur de colonnes */}
            <div className="relative">
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className={`p-2 rounded transition ${
                  showColumnSelector
                    ? 'bg-white text-slate-700'
                    : 'text-white/80 hover:text-white'
                }`}
                title="Configurer les colonnes"
              >
                <Columns className="w-4 h-4" />
              </button>

              {showColumnSelector && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 w-64 overflow-hidden">
                  <div className="p-2 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Colonnes visibles</span>
                      <span className="text-xs text-slate-500">{visibleColumns.size}/{DEFAULT_COLUMNS_CONFIG.length}</span>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                    {DEFAULT_COLUMNS_CONFIG.map(col => (
                      <button
                        key={col.key}
                        onClick={() => toggleColumn(col.key)}
                        className={`w-full px-3 py-2 text-left text-sm rounded flex items-center justify-between transition ${
                          visibleColumns.has(col.key)
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span>{col.label}</span>
                        {visibleColumns.has(col.key) ? (
                          <Eye className="w-4 h-4 text-blue-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                    <button
                      onClick={showAllColumns}
                      className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium transition"
                    >
                      Tout afficher
                    </button>
                    <button
                      onClick={resetColumns}
                      className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium transition"
                    >
                      Par defaut
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <button
              onClick={async () => {
                const searchTerm = prompt('Rechercher un produit specifique ? (laisser vide pour diagnostic general)', 'yaourt')
                console.log('Lancement du diagnostic...')
                const result = await runDiagnostic(searchTerm || undefined)
                console.log('=== RESULTAT DIAGNOSTIC ===', result)

                // Trouver l'emplacement stock reel
                const stockLoc = result.locations.find(l => l.usage === 'internal' && l.name.toLowerCase().includes('stock'))
                const stockInfo = stockLoc ? `Stock ID reel: ${stockLoc.id} (${stockLoc.name})` : 'Stock non trouve'

                alert(`Diagnostic termine - voir console (F12)\n\nConnexion: ${result.connection.url}\n${stockInfo}\nMouvements recents: ${result.recentMoves.length}\n\nOuvrez la console (F12) pour les details !`)
              }}
              className="p-2 text-yellow-400 hover:text-yellow-300"
              title="Diagnostic YAOURT (voir console F12)"
            >
              <Bug className="w-4 h-4" />
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-white/80 hover:text-white"
              title="Rafraichir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => exportCSV(false)}
              className="p-2 text-white/80 hover:text-white"
              title="Exporter tout en CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay pour fermer les dropdowns */}
      {(showProductDropdown || showColumnSelector) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowProductDropdown(false)
            setProductSearchQuery('')
            setShowColumnSelector(false)
          }}
        />
      )}

      {/* Barre d'info globale du dossier */}
      {companyInfo && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Odoo</span>
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-sm font-medium">
                v{companyInfo.odooVersion}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-600" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Methode</span>
              <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                companyInfo.costMethod === 'average'
                  ? 'bg-blue-500/20 text-blue-400'
                  : companyInfo.costMethod === 'fifo'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-slate-500/20 text-slate-400'
              }`}>
                {companyInfo.costMethod === 'average' ? 'AVCO (Cout moyen)' :
                 companyInfo.costMethod === 'fifo' ? 'FIFO' : 'Prix standard'}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-600" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Valorisation</span>
              <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                companyInfo.valuation === 'real_time'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-green-500/20 text-green-400'
              }`}>
                {companyInfo.valuation === 'real_time' ? 'Temps reel (Auto)' : 'Manuelle'}
              </span>
              {companyInfo.costMethod === 'average' && companyInfo.valuation === 'real_time' && (
                <span className="text-amber-500 text-xs" title="En mode AVCO temps reel, le CUMP Odoo n'est pas modifie lors des corrections de prix">
                  (CUMP Odoo non modifie)
                </span>
              )}
            </div>
          </div>
          <div className="text-slate-500 text-xs">
            {companyInfo.odooDb}
          </div>
        </div>
      )}

      {/* Barre de selection */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-blue-400 font-medium">
              {selectedIds.size} element{selectedIds.size > 1 ? 's' : ''} selectionne{selectedIds.size > 1 ? 's' : ''}
            </span>
            {selectionTotals && (
              <>
                <span className="text-slate-400">|</span>
                <span className="text-slate-300">
                  Qte: <span className={selectionTotals.totalQty >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatNumber(selectionTotals.totalQty)}
                  </span>
                </span>
                <span className="text-slate-300">
                  Valeur: <span className={selectionTotals.totalValue >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatCurrency(selectionTotals.totalValue)}
                  </span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllFiltered}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm flex items-center gap-1"
            >
              <CheckSquare className="w-4 h-4" />
              Tout selectionner ({filteredData.length})
            </button>
            <button
              onClick={() => exportCSV(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm flex items-center gap-1"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exporter selection
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Effacer
            </button>
          </div>
        </div>
      )}

      {/* Cartes CUMP et totaux */}
      <div className="grid grid-cols-4 gap-4">
        {/* CUMP du produit selectionne OU Valeur Stock totale */}
        <div className={`rounded-lg p-4 border col-span-1 ${
          selectedProductId
            ? 'bg-gradient-to-br from-purple-600 to-purple-800 border-purple-500/30'
            : 'bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${selectedProductId ? 'text-purple-200' : 'text-emerald-200'}`}>
              {selectedProductId ? 'CUMP Produit' : 'Valeur Stock'}
            </span>
            <Calculator className={`w-5 h-5 ${selectedProductId ? 'text-purple-300' : 'text-emerald-300'}`} />
          </div>
          <p className="text-3xl font-bold text-white">
            {selectedProductId && selectedProductCUMP
              ? formatCurrency(selectedProductCUMP.cump)
              : formatCurrency(totals.totalValue)
            }
          </p>
          <p className={`text-xs mt-1 ${selectedProductId ? 'text-purple-200' : 'text-emerald-200'}`}>
            {selectedProductId ? 'Cout Unitaire Moyen Pondere' : 'Somme (Qte Nette x CUMP)'}
          </p>
          {selectedProductId && selectedProductCUMP && (
            <p className="text-purple-300 text-xs mt-2 truncate" title={selectedProductCUMP.productName}>
              {selectedProductCUMP.productCode ? `[${selectedProductCUMP.productCode}] ` : ''}
              {selectedProductCUMP.productName}
            </p>
          )}
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Mouvements</span>
            <DollarSign className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{filteredData.length}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Valeur Totale</span>
            {totals.totalValue >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
          <p className={`text-2xl font-bold ${totals.totalValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(totals.totalValue)}
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Quantite Nette</span>
            {totals.totalQty >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
          <p className={`text-2xl font-bold ${totals.totalQty >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatNumber(totals.totalQty)}
          </p>
        </div>
      </div>

      {/* Bouton pour afficher les details CUMP */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowCUMPDetails(!showCUMPDetails)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            showCUMPDetails
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Calculator className="w-4 h-4" />
          {showCUMPDetails ? 'Masquer' : 'Afficher'} CUMP par produit ({filteredProductCUMPs.length})
        </button>
        {showCUMPDetails && (
          <button
            onClick={exportCUMPCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition"
          >
            <Download className="w-4 h-4" />
            Exporter CUMP
          </button>
        )}
      </div>

      {/* Tableau CUMP par produit */}
      {showCUMPDetails && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-700">
                <tr className="border-b border-slate-600">
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold">Produit</th>
                  <th className="text-center py-3 px-3 text-cyan-300 font-semibold whitespace-nowrap">1ere Ecriture</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Qte Entree</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Valeur Entree</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Qte Sortie</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Valeur Sortie</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Qte Nette</th>
                  <th className="text-right py-3 px-3 text-purple-300 font-semibold">CUMP</th>
                  <th className="text-right py-3 px-3 text-emerald-300 font-semibold">Valeur Stock</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductCUMPs.map(product => {
                  const stockValue = product.netQty * product.cump
                  return (
                    <tr
                      key={product.productId}
                      onClick={() => {
                        setSelectedProductId(product.productId)
                        setCurrentPage(1)
                      }}
                      className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition ${
                        selectedProductId === product.productId ? 'bg-purple-600/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div>
                          {product.productCode && (
                            <span className="text-slate-400 font-mono text-xs mr-2">[{product.productCode}]</span>
                          )}
                          <span className="text-white">{product.productName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-cyan-400 whitespace-nowrap">
                        {product.firstEntryDate
                          ? new Date(product.firstEntryDate).toLocaleDateString('fr-FR')
                          : '-'
                        }
                      </td>
                      <td className="py-2.5 px-3 text-right text-green-400 font-medium">
                        {formatNumber(product.totalQtyIn)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-green-400">
                        {formatCurrency(product.totalValueIn)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-400 font-medium">
                        {formatNumber(product.totalQtyOut)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-400">
                        {formatCurrency(product.totalValueOut)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-medium ${
                        product.netQty >= 0 ? 'text-white' : 'text-red-400'
                      }`}>
                        {formatNumber(product.netQty)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-400 font-bold">
                        {formatCurrency(product.cump)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${
                        stockValue >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(stockValue)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-700">
                <tr className="border-t-2 border-slate-500">
                  <td className="py-3 px-3 text-white font-bold">TOTAL ({filteredProductCUMPs.length} produits)</td>
                  <td className="py-3 px-3 text-center text-slate-500">-</td>
                  <td className="py-3 px-3 text-right text-green-400 font-bold">
                    {formatNumber(globalCUMP.totalQtyIn)}
                  </td>
                  <td className="py-3 px-3 text-right text-green-400 font-bold">
                    {formatCurrency(globalCUMP.totalValueIn)}
                  </td>
                  <td className="py-3 px-3 text-right text-red-400 font-bold">
                    {formatNumber(globalCUMP.totalQtyOut)}
                  </td>
                  <td className="py-3 px-3 text-right text-red-400 font-bold">
                    {formatCurrency(globalCUMP.totalValueOut)}
                  </td>
                  <td className={`py-3 px-3 text-right font-bold ${
                    globalCUMP.netQty >= 0 ? 'text-white' : 'text-red-400'
                  }`}>
                    {formatNumber(globalCUMP.netQty)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">
                    -
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-bold text-lg">
                    {formatCurrency(totals.totalValue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info modification prix */}
      {priceUpdateInfo.show && (
        <div className={`rounded-lg p-4 flex items-center justify-between ${
          priceUpdateInfo.cumpUpdated
            ? 'bg-green-500/20 border border-green-500/30'
            : 'bg-amber-500/20 border border-amber-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              priceUpdateInfo.cumpUpdated ? 'bg-green-500/30' : 'bg-amber-500/30'
            }`}>
              <Calculator className={`w-4 h-4 ${
                priceUpdateInfo.cumpUpdated ? 'text-green-400' : 'text-amber-400'
              }`} />
            </div>
            <div>
              <p className={`font-medium ${
                priceUpdateInfo.cumpUpdated ? 'text-green-400' : 'text-amber-400'
              }`}>
                Prix mis a jour
              </p>
              <p className="text-xs text-slate-400">
                Mode: <span className="font-mono text-slate-300">
                  {priceUpdateInfo.costMethod === 'average' ? 'AVCO (cout moyen)' :
                   priceUpdateInfo.costMethod === 'fifo' ? 'FIFO' :
                   priceUpdateInfo.costMethod === 'standard' ? 'Prix standard' :
                   priceUpdateInfo.costMethod}
                </span>
                {' | '}
                Valorisation: <span className="font-mono text-slate-300">
                  {priceUpdateInfo.valuation === 'real_time' ? 'Temps reel' : 'Manuelle'}
                </span>
              </p>
              {priceUpdateInfo.cumpUpdated ? (
                <p className="text-xs text-green-400 mt-1">
                  ✓ CUMP Odoo mis a jour: {priceUpdateInfo.newCump?.toFixed(2)} €
                </p>
              ) : (
                <p className="text-xs text-amber-400 mt-1">
                  ⚠ CUMP Odoo NON modifie (mode AVCO temps reel = ecritures auto)
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setPriceUpdateInfo({ show: false })}
            className={priceUpdateInfo.cumpUpdated ? 'text-green-400 hover:text-green-300' : 'text-amber-400 hover:text-amber-300'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tableau principal */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700/50 border-b border-slate-600">
                  <th className="py-3 px-2 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-white transition"
                    >
                      {allPageSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-400" />
                      ) : somePageSelected ? (
                        <MinusSquare className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  {isColumnVisible('date') && (
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">
                      <button
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-1 hover:text-white transition"
                      >
                        Date
                        {sortColumn === 'date' ? (
                          sortDirection === 'desc' ? (
                            <ArrowDown className="w-4 h-4 text-blue-400" />
                          ) : (
                            <ArrowUp className="w-4 h-4 text-blue-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </th>
                  )}
                  {isColumnVisible('reference') && (
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">
                      <button
                        onClick={() => handleSort('reference')}
                        className="flex items-center gap-1 hover:text-white transition"
                      >
                        Reference
                        {sortColumn === 'reference' ? (
                          sortDirection === 'desc' ? (
                            <ArrowDown className="w-4 h-4 text-blue-400" />
                          ) : (
                            <ArrowUp className="w-4 h-4 text-blue-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </th>
                  )}
                  {isColumnVisible('type') && (
                    <th className="text-center py-3 px-2 text-slate-300 font-semibold whitespace-nowrap">Type</th>
                  )}
                  {isColumnVisible('productCode') && (
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">Code Article</th>
                  )}
                  {isColumnVisible('product') && (
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">Nom Produit</th>
                  )}
                  {isColumnVisible('lot') && (
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">Lot/numero</th>
                  )}
                  {isColumnVisible('quantity') && (
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">Quantite</th>
                  )}
                  {isColumnVisible('remainingQty') && (
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">Qte restante</th>
                  )}
                  {isColumnVisible('unitValue') && (
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">
                      Prix unitaire
                      <span className="ml-1 text-xs text-blue-400">(double-clic)</span>
                    </th>
                  )}
                  {isColumnVisible('cump') && (
                    <th className="text-right py-3 px-3 text-purple-300 font-semibold whitespace-nowrap">
                      CUMP
                    </th>
                  )}
                  {isColumnVisible('unit') && (
                    <th className="text-center py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">Unite</th>
                  )}
                  {isColumnVisible('totalValue') && (
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">Valeur totale</th>
                  )}
                  {isColumnVisible('description') && (
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">Description</th>
                  )}
                  {isColumnVisible('remainingValue') && (
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">Valeur restante</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={1 + visibleColumns.size} className="py-12 text-center text-slate-500">
                      Aucune donnee trouvee
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((entry) => {
                    const isSelected = selectedIds.has(entry.id)
                    const isEditing = editingId === entry.id
                    const isEditable = entry.quantity > 0 // Entrees sont editables
                    return (
                      <tr
                        key={entry.id}
                        className={`group border-b border-slate-700/50 hover:bg-slate-700/30 transition ${
                          isSelected ? 'bg-blue-600/10' : ''
                        } ${isEditable ? 'border-l-2 border-l-green-500/50' : 'border-l-2 border-l-transparent'}`}
                      >
                        <td className="py-2.5 px-2">
                          <button
                            onClick={() => toggleSelect(entry.id)}
                            className="text-slate-400 hover:text-white transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-400" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        {isColumnVisible('date') && (
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                            {formatDate(entry.date)}
                          </td>
                        )}
                        {isColumnVisible('reference') && (
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                            {entry.reference}
                          </td>
                        )}
                        {isColumnVisible('type') && (
                          <td className="py-2.5 px-2 text-center">
                            {entry.quantity > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                <TrendingUp className="w-3 h-3" />
                                Entree
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                                <TrendingDown className="w-3 h-3" />
                                Sortie
                              </span>
                            )}
                          </td>
                        )}
                        {isColumnVisible('productCode') && (
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-sm">
                            {entry.productCode || '-'}
                          </td>
                        )}
                        {isColumnVisible('product') && (
                          <td className="py-2.5 px-3 text-white">
                            {entry.product}
                          </td>
                        )}
                        {isColumnVisible('lot') && (
                          <td className="py-2.5 px-3 text-slate-400">
                            {entry.lotNumber || '-'}
                          </td>
                        )}
                        {isColumnVisible('quantity') && (
                          <td className={`py-2.5 px-3 text-right font-medium ${
                            entry.quantity >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatNumber(entry.quantity)}
                          </td>
                        )}
                        {isColumnVisible('remainingQty') && (
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {formatNumber(entry.remainingQty)}
                          </td>
                        )}
                        {isColumnVisible('unitValue') && (
                          <td className="py-2.5 px-3 text-right">
                            {isEditing ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editingPrice}
                                    onChange={(e) => setEditingPrice(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        savePrice(null)
                                      } else if (e.key === 'Tab') {
                                        e.preventDefault()
                                        savePrice(e.shiftKey ? 'prev' : 'next')
                                      } else if (e.key === 'Escape') {
                                        cancelEdit()
                                      }
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    step="0.01"
                                    min="0"
                                    className="w-24 px-2 py-1 bg-slate-700 border border-blue-500 rounded text-white text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                    disabled={savingPrice}
                                  />
                                  <button
                                    onClick={() => savePrice('next')}
                                    disabled={savingPrice}
                                    className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                                    title="Valider et suivant (Tab)"
                                  >
                                    {savingPrice ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    disabled={savingPrice}
                                    className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                                    title="Annuler (Echap)"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : entry.quantity > 0 ? (
                              <div
                                className="flex items-center justify-end gap-1 cursor-pointer hover:bg-blue-500/10 rounded px-1 -mx-1 transition"
                                onDoubleClick={() => startEdit(entry)}
                                title="Double-cliquez pour modifier"
                              >
                                <span className="text-slate-300 font-medium">{formatCurrency(entry.unitValue)}</span>
                                <Pencil className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ) : (
                              <span className="text-slate-400" title="Prix au CUMP (non modifiable)">
                                {formatCurrency(entry.unitValue)}
                              </span>
                            )}
                          </td>
                        )}
                        {/* Colonne CUMP */}
                        {isColumnVisible('cump') && (
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-purple-400 font-medium">
                              {formatCurrency(productCUMPMap.get(entry.productId) || 0)}
                            </span>
                          </td>
                        )}
                        {isColumnVisible('unit') && (
                          <td className="py-2.5 px-3 text-center text-slate-400 text-xs">
                            {entry.unit}
                          </td>
                        )}
                        {isColumnVisible('totalValue') && (
                          <td className={`py-2.5 px-3 text-right font-medium ${
                            entry.totalValue >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatCurrency(entry.totalValue)}
                          </td>
                        )}
                        {isColumnVisible('description') && (
                          <td className="py-2.5 px-3 text-slate-400 max-w-[200px] truncate" title={entry.description}>
                            {entry.description}
                          </td>
                        )}
                        {isColumnVisible('remainingValue') && (
                          <td className={`py-2.5 px-3 text-right font-medium ${
                            entry.remainingValue >= 0 ? 'text-white' : 'text-red-400'
                          }`}>
                            {formatCurrency(entry.remainingValue)}
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination bas */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded text-sm"
          >
            Debut
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded text-sm"
          >
            Precedent
          </button>
          <span className="text-slate-400 text-sm px-4">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded text-sm"
          >
            Suivant
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded text-sm"
          >
            Fin
          </button>
        </div>
      )}

      {/* Raccourcis clavier */}
      <div className="text-center text-slate-500 text-xs space-x-2">
        <span className="bg-slate-700/50 px-2 py-0.5 rounded">Double-clic</span> = Editer
        <span className="bg-slate-700/50 px-2 py-0.5 rounded">Tab</span> = Valider + Suivant
        <span className="bg-slate-700/50 px-2 py-0.5 rounded">Shift+Tab</span> = Valider + Precedent
        <span className="bg-slate-700/50 px-2 py-0.5 rounded">Entree</span> = Valider
        <span className="bg-slate-700/50 px-2 py-0.5 rounded">Echap</span> = Annuler
        <span className="inline-flex items-center gap-1 ml-2 text-green-400">
          <span className="w-2 h-2 bg-green-500/50 rounded-sm"></span> = Ligne modifiable
        </span>
      </div>
    </div>
  )
}
