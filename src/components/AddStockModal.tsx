import { useState, useEffect } from 'react'
import { X, Plus, Minus, Package, Calendar, DollarSign, Hash, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { searchProducts, createStockEntry, createStockExit } from '../services/odooService'
import type { Product } from '../types'

interface AddStockModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedProduct?: Product | null
}

type OperationType = 'entry' | 'exit'

export default function AddStockModal({ isOpen, onClose, onSuccess, preselectedProduct }: AddStockModalProps) {
  const [operationType, setOperationType] = useState<OperationType>('entry')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [priceUnit, setPriceUnit] = useState<number>(0)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Pré-remplir avec le produit sélectionné
  useEffect(() => {
    if (preselectedProduct && isOpen) {
      setSelectedProduct(preselectedProduct)
      setPriceUnit(preselectedProduct.standard_price || 0)
      setSearchQuery(preselectedProduct.name)
    }
  }, [preselectedProduct, isOpen])

  // Reset à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
      setSelectedProduct(preselectedProduct || null)
      setQuantity(1)
      setPriceUnit(preselectedProduct?.standard_price || 0)
      setDate(new Date().toISOString().split('T')[0])
      setReference('')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, preselectedProduct])

  // Recherche de produits
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.length >= 2 && !selectedProduct) {
        setSearching(true)
        try {
          const results = await searchProducts(searchQuery)
          setSearchResults(results)
        } catch (err) {
          console.error('Search error:', err)
        } finally {
          setSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchQuery, selectedProduct])

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    setSearchQuery(product.name)
    setPriceUnit(product.standard_price || 0)
    setSearchResults([])
  }

  const handleClearProduct = () => {
    setSelectedProduct(null)
    setSearchQuery('')
    setPriceUnit(0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) {
      setError('Veuillez sélectionner un produit')
      return
    }
    if (quantity <= 0) {
      setError('La quantité doit être supérieure à 0')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = {
        productId: selectedProduct.id,
        quantity,
        priceUnit,
        date,
        reference: reference || `${operationType === 'entry' ? 'Entrée' : 'Sortie'} manuelle`
      }

      const result = operationType === 'entry'
        ? await createStockEntry(data)
        : await createStockExit(data)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Une erreur est survenue')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const totalValue = quantity * priceUnit

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="bg-slate-700/50 border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {operationType === 'entry' ? (
              <Plus className="w-6 h-6 text-green-400" />
            ) : (
              <Minus className="w-6 h-6 text-red-400" />
            )}
            {operationType === 'entry' ? 'Entrée de Stock' : 'Sortie de Stock'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-xl font-bold text-white">
              {operationType === 'entry' ? 'Entrée enregistrée !' : 'Sortie enregistrée !'}
            </p>
            <p className="text-slate-400 mt-2">
              {quantity} x {selectedProduct?.name}
            </p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type d'opération */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOperationType('entry')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  operationType === 'entry'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                Entrée
              </button>
              <button
                type="button"
                onClick={() => setOperationType('exit')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  operationType === 'exit'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Minus className="w-4 h-4" />
                Sortie
              </button>
            </div>

            {/* Sélection produit */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                <Package className="w-4 h-4 inline mr-1" />
                Produit *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (selectedProduct) setSelectedProduct(null)
                  }}
                  placeholder="Rechercher un produit..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
                {selectedProduct && (
                  <button
                    type="button"
                    onClick={handleClearProduct}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-600 rounded"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                {searching && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  </div>
                )}

                {/* Résultats de recherche */}
                {searchResults.length > 0 && !selectedProduct && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductSelect(product)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-600 transition flex justify-between items-center"
                      >
                        <span className="text-white">{product.name}</span>
                        <span className="text-slate-400 text-sm">
                          Stock: {Math.round(product.qty_available)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct && (
                <p className="text-sm text-green-400 mt-1">
                  Stock actuel: {Math.round(selectedProduct.qty_available)}
                </p>
              )}
            </div>

            {/* Quantité et Prix */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  <Hash className="w-4 h-4 inline mr-1" />
                  Quantité *
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Prix unitaire (€)
                </label>
                <input
                  type="number"
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                  min="0"
                  step="0.01"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Référence */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Référence (optionnel)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: Achat fournisseur, Vente client..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Résumé */}
            {selectedProduct && (
              <div className={`rounded-lg p-4 border ${operationType === 'entry' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <p className={`text-sm font-medium ${operationType === 'entry' ? 'text-green-400' : 'text-red-400'}`}>
                  Résumé de l'opération
                </p>
                <p className="text-white mt-1">
                  {operationType === 'entry' ? '+' : '-'} {quantity} x {selectedProduct.name}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Valeur totale: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalValue)}
                </p>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !selectedProduct}
                className={`flex-1 py-2 px-4 rounded-lg transition font-medium flex items-center justify-center gap-2 ${
                  operationType === 'entry'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/50'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-600/50'
                } text-white disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {operationType === 'entry' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                    Valider
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
