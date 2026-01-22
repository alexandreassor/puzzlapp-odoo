import { ShoppingCart, FileText, Truck, Warehouse, Calculator, ArrowRight, CheckCircle, AlertTriangle, Info } from 'lucide-react'

export default function PurchaseFlowGuide() {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-teal-500/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-600 rounded-xl">
          <ShoppingCart className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">De la Commande au Stock</h2>
          <p className="text-teal-400">Le parcours complet d'un achat dans ODOO</p>
        </div>
      </div>

      {/* Intro engageante */}
      <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4 mb-8">
        <p className="text-teal-300 text-sm">
          Vous commandez des <strong className="text-white">trottinettes</strong> chez votre fournisseur.
          Suivons ensemble leur parcours depuis la commande jusqu'à votre stock !
        </p>
      </div>

      {/* Exemple concret */}
      <div className="bg-slate-700/50 rounded-lg p-4 mb-8">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          Notre exemple
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Produit</p>
            <p className="text-white font-bold">Trottinette Pro</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Quantite</p>
            <p className="text-white font-bold">10 unites</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Prix d'achat</p>
            <p className="text-white font-bold">150 EUR/unite</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Total</p>
            <p className="text-green-400 font-bold">1 500 EUR</p>
          </div>
        </div>
      </div>

      {/* Les 5 etapes */}
      <div className="space-y-6">
        {/* Etape 1 */}
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="w-0.5 h-16 bg-blue-600/30 mx-auto mt-2"></div>
            </div>
            <div className="flex-grow bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">ETAPE 1</span>
                <h4 className="text-white font-medium">Creer le Bon de Commande</h4>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                Vous creez une commande fournisseur avec les produits souhaites.
              </p>
              <div className="bg-slate-800 rounded p-3 text-sm">
                <p className="text-slate-400 mb-1">Dans ODOO :</p>
                <p className="text-white"><strong>Achats</strong> → <strong>Bons de commande</strong> → <strong>Creer</strong></p>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="text-slate-500">Modele ODOO :</span>
                <code className="bg-slate-800 text-blue-400 px-2 py-0.5 rounded">purchase.order</code>
              </div>
            </div>
          </div>
        </div>

        {/* Etape 2 */}
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="w-0.5 h-16 bg-purple-600/30 mx-auto mt-2"></div>
            </div>
            <div className="flex-grow bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded">ETAPE 2</span>
                <h4 className="text-white font-medium">Confirmer la Commande</h4>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                La commande passe en statut "Bon de commande". ODOO cree automatiquement une reception en attente.
              </p>
              <div className="bg-slate-800 rounded p-3 text-sm">
                <p className="text-slate-400 mb-1">Action :</p>
                <p className="text-white">Cliquer sur <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">Confirmer la commande</span></p>
              </div>
              <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded p-2">
                <p className="text-green-400 text-xs flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  ODOO cree automatiquement : Bon de reception (stock.picking)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Etape 3 */}
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div className="w-0.5 h-16 bg-orange-600/30 mx-auto mt-2"></div>
            </div>
            <div className="flex-grow bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded">ETAPE 3</span>
                <h4 className="text-white font-medium">Recevoir les Produits</h4>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                Les trottinettes arrivent ! Vous allez valider la reception dans ODOO.
              </p>
              <div className="bg-slate-800 rounded p-3 text-sm">
                <p className="text-slate-400 mb-1">Dans ODOO :</p>
                <p className="text-white"><strong>Inventaire</strong> → <strong>Operations</strong> → <strong>Receptions</strong></p>
                <p className="text-white mt-1">Ou cliquer sur <span className="bg-slate-600 px-2 py-0.5 rounded text-xs">Reception</span> depuis le bon de commande</p>
              </div>
            </div>
          </div>
        </div>

        {/* Etape 4 */}
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
              <div className="w-0.5 h-16 bg-green-600/30 mx-auto mt-2"></div>
            </div>
            <div className="flex-grow bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">ETAPE 4</span>
                <h4 className="text-white font-medium">Valider la Reception</h4>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                C'est l'etape cle ! La validation met a jour votre stock.
              </p>
              <div className="bg-slate-800 rounded p-3 text-sm mb-3">
                <p className="text-slate-400 mb-1">Action :</p>
                <p className="text-white">Cliquer sur <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs">Valider</span></p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                <p className="text-green-400 text-sm font-medium mb-2">Ce qui se passe automatiquement :</p>
                <ul className="text-green-300/80 text-sm space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Le mouvement de stock (stock.move) passe en statut "Fait"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>La quantite disponible du produit augmente (+10 unites)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Le prix d'achat (150 EUR) est enregistre sur le mouvement</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Etape 5 */}
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-grow bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-cyan-600 text-white text-xs font-bold px-2 py-0.5 rounded">ETAPE 5</span>
                <h4 className="text-white font-medium">Calcul du CUMP</h4>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                Le Cout Unitaire Moyen Pondere est recalcule automatiquement.
              </p>
              <div className="bg-slate-800 rounded p-4 font-mono text-sm">
                <p className="text-slate-400 mb-2">// Exemple de calcul</p>
                <p className="text-slate-300">Stock avant : <span className="text-yellow-400">0 unites a 0 EUR</span></p>
                <p className="text-slate-300">+ Entree : <span className="text-green-400">10 unites a 150 EUR = 1 500 EUR</span></p>
                <p className="text-slate-300 mt-2 pt-2 border-t border-slate-600">
                  CUMP = 1 500 / 10 = <span className="text-cyan-400 font-bold">150 EUR/unite</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resume visuel */}
      <div className="mt-8 bg-slate-700/30 rounded-lg p-6">
        <h3 className="text-white font-medium mb-4 text-center">Resume du Flux</h3>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg px-3 py-2 text-center">
            <FileText className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-blue-300 text-xs">Bon de commande</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500" />
          <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg px-3 py-2 text-center">
            <CheckCircle className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-purple-300 text-xs">Confirmation</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500" />
          <div className="bg-orange-600/20 border border-orange-600/30 rounded-lg px-3 py-2 text-center">
            <Truck className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <p className="text-orange-300 text-xs">Reception</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500" />
          <div className="bg-green-600/20 border border-green-600/30 rounded-lg px-3 py-2 text-center">
            <Warehouse className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-green-300 text-xs">Validation</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500" />
          <div className="bg-cyan-600/20 border border-cyan-600/30 rounded-lg px-3 py-2 text-center">
            <Calculator className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-cyan-300 text-xs">CUMP</p>
          </div>
        </div>
      </div>

      {/* Point important */}
      <div className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-amber-300 text-sm">
            <p className="font-bold mb-2">Point important : Le champ "Cout" sur la fiche produit</p>
            <p className="text-amber-300/80">
              Le champ <code className="bg-slate-700 px-1 rounded">Cout</code> (standard_price) affiche dans ODOO n'est
              <strong> PAS toujours mis a jour automatiquement</strong> apres une reception.
              Notre application calcule le CUMP reel a partir de tous les mouvements pour vous donner la valeur exacte.
            </p>
          </div>
        </div>
      </div>

      {/* Donnees techniques */}
      <div className="mt-6 bg-slate-700/30 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Donnees techniques enregistrees</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-600">
                <th className="pb-2 pr-4">Champ</th>
                <th className="pb-2 pr-4">Modele</th>
                <th className="pb-2">Valeur (exemple)</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-700/50">
                <td className="py-2 pr-4">Prix d'achat</td>
                <td className="py-2 pr-4 font-mono text-xs text-green-400">stock.move.price_unit</td>
                <td className="py-2">150,00 EUR</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-2 pr-4">Quantite recue</td>
                <td className="py-2 pr-4 font-mono text-xs text-green-400">stock.move.quantity</td>
                <td className="py-2">10,00</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-2 pr-4">Cout produit (CUMP)</td>
                <td className="py-2 pr-4 font-mono text-xs text-cyan-400">product.product.standard_price</td>
                <td className="py-2">150,00 EUR</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Stock disponible</td>
                <td className="py-2 pr-4 font-mono text-xs text-cyan-400">product.product.qty_available</td>
                <td className="py-2">10,00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
