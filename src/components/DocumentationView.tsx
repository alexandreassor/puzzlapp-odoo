import { BookOpen, Server, Database, Package, ArrowRight, Code, CheckCircle, Info, AlertTriangle, Pencil, Lock, Unlock, RefreshCw, List, Lightbulb, Zap } from 'lucide-react'
import PurchaseFlowGuide from './PurchaseFlowGuide'

export default function DocumentationView() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Documentation API ODOO</h1>
            <p className="text-slate-400">Intégration stock et valorisation CUMP</p>
          </div>
        </div>

        {/* Table des matières */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <List className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm font-medium">Sommaire</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <button onClick={() => scrollToSection('pourquoi')} className="text-left text-sm text-amber-400 hover:text-amber-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              0. Pourquoi cette app
            </button>
            <button onClick={() => scrollToSection('architecture')} className="text-left text-sm text-blue-400 hover:text-blue-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              1. Architecture
            </button>
            <button onClick={() => scrollToSection('modeles')} className="text-left text-sm text-emerald-400 hover:text-emerald-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              2. Modèles ODOO
            </button>
            <button onClick={() => scrollToSection('workflow')} className="text-left text-sm text-purple-400 hover:text-purple-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              3. Workflow mouvement
            </button>
            <button onClick={() => scrollToSection('impact-cump')} className="text-left text-sm text-yellow-400 hover:text-yellow-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              4. Impact sur le CUMP
            </button>
            <button onClick={() => scrollToSection('standard-price')} className="text-left text-sm text-cyan-400 hover:text-cyan-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              5. Mise à jour standard_price
            </button>
            <button onClick={() => scrollToSection('modification-prix')} className="text-left text-sm text-red-400 hover:text-red-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              6. Modifier prix à posteriori
            </button>
            <button onClick={() => scrollToSection('actions-techniques')} className="text-left text-sm text-pink-400 hover:text-pink-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              7. Actions techniques
            </button>
            <button onClick={() => scrollToSection('calcul-local')} className="text-left text-sm text-cyan-400 hover:text-cyan-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              8. Calcul CUMP local
            </button>
            <button onClick={() => scrollToSection('odoo17')} className="text-left text-sm text-orange-400 hover:text-orange-300 hover:bg-slate-700/50 px-3 py-1.5 rounded transition">
              9. Versions et modèles ODOO
            </button>
          </div>
        </div>
      </div>

      {/* Guide Flux d'Achat */}
      <PurchaseFlowGuide />

      {/* Pourquoi cette application */}
      <div id="pourquoi" className="bg-slate-800 rounded-xl p-6 border border-amber-500/50 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          0. Pourquoi cette application ?
        </h2>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-amber-300 text-sm">
              <p className="font-bold mb-2">Problème rencontré : Erreurs sur le stock initial</p>
              <p className="text-amber-300/80">
                Lors de la saisie du <strong>stock initial</strong> dans ODOO, des erreurs de prix unitaire ont été commises.
                Une fois les mouvements de stock <strong>validés</strong> (state = 'done'), il devient <strong>impossible</strong> de
                modifier le prix unitaire via l'interface ODOO standard.
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-white font-medium mb-3">Les limitations d'ODOO</h3>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
            <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Ce qu'on NE PEUT PAS faire dans ODOO
            </h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>• Modifier le <code className="bg-slate-700 px-1 rounded">price_unit</code> d'un mouvement validé</li>
              <li>• Corriger une erreur de prix sur une entrée de stock passée</li>
              <li>• Recalculer le CUMP après correction rétroactive</li>
              <li>• Annuler un mouvement ancien sans impact sur l'historique</li>
            </ul>
          </div>

          <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
            <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
              <Unlock className="w-4 h-4" />
              Ce qu'on PEUT faire via l'API
            </h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>• Écrire directement sur <code className="bg-slate-700 px-1 rounded">price_unit</code></li>
              <li>• Corriger n'importe quel mouvement, même ancien</li>
              <li>• Recalculer le CUMP localement après modification</li>
              <li>• Conserver l'historique ODOO intact (même ID, même date)</li>
            </ul>
          </div>
        </div>

        <h3 className="text-white font-medium mb-3">La solution : cette application</h3>
        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <p className="text-slate-300 text-sm mb-3">
            Cette application a été créée pour <strong className="text-white">contourner les limitations d'ODOO</strong> en utilisant
            l'API JSON-RPC. Elle permet de :
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-slate-600/50 rounded-lg p-3 text-center">
              <Pencil className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-slate-300 text-sm font-medium">Modifier les prix</p>
              <p className="text-slate-400 text-xs">Sur les mouvements validés</p>
            </div>
            <div className="bg-slate-600/50 rounded-lg p-3 text-center">
              <RefreshCw className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-slate-300 text-sm font-medium">Recalculer le CUMP</p>
              <p className="text-slate-400 text-xs">En temps réel</p>
            </div>
            <div className="bg-slate-600/50 rounded-lg p-3 text-center">
              <Database className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-slate-300 text-sm font-medium">Valoriser le stock</p>
              <p className="text-slate-400 text-xs">À n'importe quelle date</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-blue-300 text-sm">
              <p className="font-medium mb-1">Cas d'usage typique</p>
              <p className="text-blue-300/80">
                Vous avez saisi un stock initial de 100 unités à <strong>10 €</strong> au lieu de <strong>15 €</strong>.
                Le mouvement est validé depuis 3 mois. ODOO ne vous laisse pas corriger.
                Avec cette application, vous modifiez le prix en un clic et le CUMP est recalculé correctement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture */}
      <div id="architecture" className="bg-slate-800 rounded-xl p-6 border border-slate-700 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400" />
          1. Architecture de connexion
        </h2>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="bg-slate-700 rounded-lg px-4 py-3 text-center">
            <p className="text-slate-400 text-xs mb-1">Frontend</p>
            <p className="text-white font-medium">React App</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500" />
          <div className="bg-green-600/20 border border-green-600/30 rounded-lg px-4 py-3 text-center">
            <p className="text-green-400 text-xs mb-1">Local</p>
            <p className="text-green-300 font-medium">Proxy Server</p>
            <p className="text-green-400/70 text-xs">localhost:3001</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500" />
          <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg px-4 py-3 text-center">
            <p className="text-purple-400 text-xs mb-1">API</p>
            <p className="text-purple-300 font-medium">ODOO JSON-RPC</p>
            <p className="text-purple-400/70 text-xs">votre-instance.odoo.com</p>
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-slate-300 text-sm">
            <strong className="text-white">Pourquoi un proxy ?</strong> ODOO n'autorise pas les appels directs depuis un navigateur (CORS).
            Le proxy local reçoit les requêtes du frontend et les transmet à ODOO avec les credentials stockés localement.
          </p>
        </div>
      </div>

      {/* Modèles ODOO */}
      <div id="modeles" className="bg-slate-800 rounded-xl p-6 border border-slate-700 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          2. Modèles ODOO utilisés
        </h2>

        <div className="space-y-6">
          {/* product.product */}
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
              <code className="text-blue-400 font-mono">product.product</code>
              <span className="text-slate-400 ml-2 text-sm">- Produits stockables</span>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-2">Champ</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr><td className="py-1 font-mono text-xs text-green-400">id</td><td>Integer</td><td>ID unique du produit</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">name</td><td>String</td><td>Nom du produit</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">default_code</td><td>String</td><td>Référence interne</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">is_storable</td><td>Boolean</td><td>Produit stockable (ODOO 17+)</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">standard_price</td><td>Float</td><td>Coût unitaire (CUMP)</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">qty_available</td><td>Float</td><td>Quantité en stock (calculé)</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* stock.picking */}
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
              <code className="text-blue-400 font-mono">stock.picking</code>
              <span className="text-slate-400 ml-2 text-sm">- Bon de transfert (conteneur)</span>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-2">Champ</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr><td className="py-1 font-mono text-xs text-green-400">picking_type_id</td><td>Many2one</td><td>Type: Réception / Livraison</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">location_id</td><td>Many2one</td><td>Emplacement source</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">location_dest_id</td><td>Many2one</td><td>Emplacement destination</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">origin</td><td>String</td><td>Document d'origine</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">scheduled_date</td><td>Datetime</td><td>Date prévue</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">state</td><td>Selection</td><td>draft, waiting, confirmed, assigned, done</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* stock.move */}
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
              <code className="text-blue-400 font-mono">stock.move</code>
              <span className="text-slate-400 ml-2 text-sm">- Mouvement de stock (ligne)</span>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-2">Champ</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr><td className="py-1 font-mono text-xs text-green-400">reference</td><td>String</td><td>Référence du mouvement</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">product_id</td><td>Many2one</td><td>Produit concerné</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">product_uom_qty</td><td>Float</td><td>Quantité demandée</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">quantity</td><td>Float</td><td>Quantité faite (ODOO 17+)</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">product_uom</td><td>Many2one</td><td>Unité de mesure</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">location_id</td><td>Many2one</td><td>Emplacement source</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">location_dest_id</td><td>Many2one</td><td>Emplacement destination</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">picking_id</td><td>Many2one</td><td>Bon de transfert parent</td></tr>
                  <tr className="bg-yellow-500/10"><td className="py-1 font-mono text-xs text-yellow-400">price_unit</td><td>Float</td><td className="text-yellow-300">Prix unitaire (impact CUMP)</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">procure_method</td><td>Selection</td><td>make_to_stock / make_to_order</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">date</td><td>Datetime</td><td>Date du mouvement</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">state</td><td>Selection</td><td>draft, waiting, confirmed, assigned, done, cancel</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* stock.location */}
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
              <code className="text-blue-400 font-mono">stock.location</code>
              <span className="text-slate-400 ml-2 text-sm">- Emplacements de stock</span>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-2">Champ</th>
                    <th className="pb-2">Valeur</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr><td className="py-1 font-mono text-xs text-green-400">usage</td><td className="text-cyan-400">supplier</td><td>Emplacement fournisseur (virtuel)</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">usage</td><td className="text-cyan-400">internal</td><td>Stock interne (physique)</td></tr>
                  <tr><td className="py-1 font-mono text-xs text-green-400">usage</td><td className="text-cyan-400">customer</td><td>Emplacement client (virtuel)</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow */}
      <div id="workflow" className="bg-slate-800 rounded-xl p-6 border border-slate-700 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-400" />
          3. Workflow de création d'un mouvement
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
            <div>
              <p className="text-white font-medium">Créer le bon de transfert (stock.picking)</p>
              <code className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded mt-1 inline-block">
                stock.picking.create({`{picking_type_id, location_id, location_dest_id}`})
              </code>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
            <div>
              <p className="text-white font-medium">Créer le mouvement (stock.move)</p>
              <code className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded mt-1 inline-block">
                stock.move.create({`{product_id, product_uom_qty, picking_id, price_unit}`})
              </code>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
            <div>
              <p className="text-white font-medium">Confirmer le picking</p>
              <code className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded mt-1 inline-block">
                stock.picking.action_confirm([picking_id])
              </code>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">4</div>
            <div>
              <p className="text-white font-medium">Assigner (réserver le stock)</p>
              <code className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded mt-1 inline-block">
                stock.picking.action_assign([picking_id])
              </code>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">5</div>
            <div>
              <p className="text-white font-medium">Mettre la quantité faite</p>
              <code className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded mt-1 inline-block">
                stock.move.write([move_id], {`{quantity: qty}`})
              </code>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">6</div>
            <div>
              <p className="text-white font-medium">Valider le transfert</p>
              <code className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded mt-1 inline-block">
                stock.picking.button_validate([picking_id])
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Impact sur le CUMP */}
      <div id="impact-cump" className="bg-slate-800 rounded-xl p-6 border border-slate-700 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-yellow-400" />
          4. Impact API sur le CUMP
        </h2>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-yellow-300 text-sm">
              <p className="font-medium mb-2">Champ clé pour le CUMP : <code className="bg-slate-700 px-1 rounded">price_unit</code> sur stock.move</p>
              <p className="text-yellow-300/80">
                Lors d'une entrée en stock (supplier → internal), le <code className="bg-slate-700 px-1 rounded">price_unit</code> du mouvement
                est utilisé par ODOO pour recalculer le <code className="bg-slate-700 px-1 rounded">standard_price</code> du produit.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
            <h3 className="text-green-400 font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Entrée en stock
            </h3>
            <p className="text-slate-300 text-sm mb-2">
              Fournisseur → Stock interne
            </p>
            <ul className="text-slate-400 text-xs space-y-1">
              <li>• <code className="text-green-400">location_id</code> = supplier</li>
              <li>• <code className="text-green-400">location_dest_id</code> = internal (Stock)</li>
              <li>• <code className="text-yellow-400">price_unit</code> = prix d'achat</li>
            </ul>
          </div>

          <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
            <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Sortie de stock
            </h3>
            <p className="text-slate-300 text-sm mb-2">
              Stock interne → Client
            </p>
            <ul className="text-slate-400 text-xs space-y-1">
              <li>• <code className="text-green-400">location_id</code> = internal (Stock)</li>
              <li>• <code className="text-green-400">location_dest_id</code> = customer</li>
              <li>• <code className="text-slate-500">price_unit</code> = (non utilisé pour CUMP)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mise à jour du standard_price */}
      <div id="standard-price" className="bg-slate-800 rounded-xl p-6 border border-cyan-500/50 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-cyan-400" />
          5. Mise à jour du standard_price (fiche produit)
        </h2>

        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-cyan-300 text-sm">
              <p className="font-bold mb-2">Le champ standard_price sur product.product = CUMP officiel ODOO</p>
              <p className="text-cyan-300/80">
                C'est le "Coût" affiché sur la fiche produit. ODOO le recalcule automatiquement à chaque entrée en stock
                selon la méthode de valorisation configurée (généralement CUMP).
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-white font-medium mb-4">Comportement automatique ODOO (méthode CUMP)</h3>

        <div className="bg-slate-700 rounded-lg p-4 mb-6 font-mono text-sm overflow-x-auto">
          <p className="text-slate-400 mb-2">// Quand un mouvement d'entrée est validé (state = 'done'):</p>
          <pre className="text-slate-300">
{`// Ancien stock: 100 unités à 10 EUR = 1 000 EUR
// Nouvelle entrée: 50 unités à 14 EUR = 700 EUR

nouveau_standard_price = (ancien_stock_valeur + nouvelle_entree_valeur)
                       / (ancien_stock_qty + nouvelle_entree_qty)

nouveau_standard_price = (1000 + 700) / (100 + 50)
                       = 1700 / 150
                       = 11.33 EUR

// ODOO met à jour automatiquement:
product.product.standard_price = 11.33`}
          </pre>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
            <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Quand ODOO recalcule automatiquement
            </h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>• À chaque validation d'entrée en stock</li>
              <li>• Le price_unit du stock.move est pris en compte</li>
              <li>• Formule: moyenne pondérée des entrées</li>
              <li>• Mise à jour instantanée sur la fiche produit</li>
            </ul>
          </div>

          <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-4">
            <h4 className="text-amber-400 font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Ce qui n'est PAS recalcule
            </h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>• Modification d'un price_unit existant via API</li>
              <li>• Le standard_price reste à son ancienne valeur</li>
              <li>• Il faut le recalculer manuellement</li>
              <li>• Ou forcer une mise à jour via API</li>
            </ul>
          </div>
        </div>

        <h3 className="text-white font-medium mb-4">Forcer la mise à jour via API</h3>

        <div className="space-y-4">
          {/* Option 1 */}
          <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
            <h4 className="text-green-400 font-medium mb-2">Option 1: Écriture directe (recommandé)</h4>
            <p className="text-slate-400 text-sm mb-3">
              Calculer le nouveau CUMP et l'écrire directement sur la fiche produit.
            </p>
            <div className="bg-slate-700 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              <pre className="text-slate-300">
{`// 1. Récupérer tous les mouvements d'entrée du produit
const moves = stock.move.search_read([
  ['product_id', '=', product_id],
  ['state', '=', 'done'],
  ['location_dest_id.usage', '=', 'internal']
], { fields: ['product_qty', 'price_unit'] })

// 2. Calculer le nouveau CUMP
let totalQty = 0, totalValue = 0
for (const move of moves) {
  totalQty += move.product_qty
  totalValue += move.product_qty * move.price_unit
}
const nouveau_cump = totalQty > 0 ? totalValue / totalQty : 0

// 3. Mettre à jour la fiche produit
product.product.write([product_id], {
  standard_price: nouveau_cump
})`}
              </pre>
            </div>
          </div>

          {/* Option 2 */}
          <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
            <h4 className="text-purple-400 font-medium mb-2">Option 2: Via stock.valuation.layer (ODOO 13+)</h4>
            <p className="text-slate-400 text-sm mb-3">
              ODOO 13+ utilise des "couches de valorisation" (stock.valuation.layer) qui tracent chaque entrée.
              Modifier un price_unit sur stock.move devrait théoriquement créer/modifier une couche.
            </p>
            <div className="bg-slate-700 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              <pre className="text-slate-300">
{`// Vérifier les couches de valorisation
const layers = stock.valuation.layer.search_read([
  ['product_id', '=', product_id]
], { fields: ['quantity', 'unit_cost', 'value', 'remaining_qty'] })

// La valeur totale du stock selon ODOO
const total_value = layers.reduce((sum, l) => sum + l.value, 0)
const total_qty = layers.reduce((sum, l) => sum + l.remaining_qty, 0)

// Note: Modifier price_unit sur stock.move ne met PAS a jour
// automatiquement les layers existantes - il faut intervenir manuellement`}
              </pre>
            </div>
          </div>

          {/* Option 3 */}
          <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-4">
            <h4 className="text-amber-400 font-medium mb-2">Option 3: Ajustement d'inventaire avec revalorisation</h4>
            <p className="text-slate-400 text-sm mb-3">
              Créer un ajustement d'inventaire avec un nouveau coût force ODOO à recalculer.
              Utile si les couches de valorisation sont désynchronisées.
            </p>
            <div className="bg-slate-700 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              <pre className="text-slate-300">
{`// Créer un ajustement d'inventaire
// ODOO recalcule la valorisation lors de la validation
stock.quant._update_available_quantity(
  product_id,
  location_id,
  quantity,
  lot_id,
  package_id,
  owner_id
)

// Ou via l'interface:
// Inventaire > Operations > Ajustements d'inventaire`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-red-300 text-sm">
              <p className="font-bold mb-2">Attention: Pas d'action automatique de recalcul</p>
              <p className="text-red-300/80">
                Contrairement à ce qu'on pourrait espérer, <strong>ODOO n'a pas d'action native</strong> type
                <code className="bg-slate-700 px-1 rounded mx-1">action_recompute_standard_price()</code>
                pour recalculer le CUMP après modification rétroactive des prix.
                C'est pourquoi cette application calcule le CUMP localement.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-slate-700/50 rounded-lg p-4">
          <p className="text-slate-300 text-sm">
            <strong className="text-white">Pourquoi cette application calcule le CUMP localement:</strong> Puisque modifier les
            <code className="bg-slate-600 px-1 rounded mx-1">price_unit</code> via API ne met pas à jour le
            <code className="bg-slate-600 px-1 rounded mx-1">standard_price</code> sur la fiche produit,
            nous recalculons le CUMP à partir de tous les mouvements de stock. Ainsi, le CUMP affiché est
            <strong className="text-cyan-400"> toujours exact</strong>, même après modifications rétroactives.
          </p>
        </div>
      </div>

      {/* Modification du prix unitaire à posteriori */}
      <div id="modification-prix" className="bg-slate-800 rounded-xl p-6 border border-red-500/50 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Pencil className="w-5 h-5 text-red-400" />
          6. Modification du prix unitaire à posteriori
        </h2>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-red-300 text-sm">
              <p className="font-bold mb-2">Fonctionnalité exclusive API - Impossible via l'interface ODOO</p>
              <p className="text-red-300/80">
                Dans l'interface ODOO standard, une fois qu'un mouvement de stock est validé (state = 'done'),
                le champ <code className="bg-slate-700 px-1 rounded">price_unit</code> devient <strong>en lecture seule</strong> et ne peut plus être modifié.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-slate-300 font-medium mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-400" />
              Interface ODOO (bloqué)
            </h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>• Le champ "Valeur unitaire" est grisé</li>
              <li>• Aucun bouton pour modifier le prix</li>
              <li>• La seule option serait d'annuler le mouvement et d'en recréer un nouveau</li>
              <li>• Cela impacte l'historique et les rapports</li>
            </ul>
          </div>

          <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
            <h3 className="text-green-300 font-medium mb-3 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-green-400" />
              Via API JSON-RPC (possible)
            </h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>• L'API permet d'écrire directement sur le champ</li>
              <li>• Pas de vérification de l'état du mouvement</li>
              <li>• Le mouvement reste intact (même ID, même date)</li>
              <li>• Le CUMP est recalculé automatiquement</li>
            </ul>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Comment ca fonctionne dans cette application</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
              <div>
                <p className="text-slate-300 text-sm">Dans l'onglet <strong className="text-white">Valorisation</strong>, cliquez sur l'icône <Pencil className="w-3 h-3 inline mx-1 text-blue-400" /> à côté du prix</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-slate-300 text-sm">Saisissez le nouveau prix et validez avec <span className="bg-slate-600 px-1.5 py-0.5 rounded text-xs">Entree</span></p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-slate-300 text-sm">L'application envoie la requête API directement à ODOO</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <p className="text-slate-400 mb-2">// Appel API pour modifier le prix d'un mouvement valide</p>
          <pre className="text-slate-300">
{`stock.move.write([move_id], {
  price_unit: nouveau_prix
})

// Exemple concret:
// move_id = 1234 (mouvement déjà validé depuis 3 mois)
// Ancien prix: 10.00 EUR
// Nouveau prix: 12.50 EUR

stock.move.write([1234], { price_unit: 12.50 })

// Résultat:
// - Le prix est mis à jour instantanément
// - La valeur totale du mouvement est recalculée
// - Le CUMP du produit sera recalculé
// - L'historique ODOO conserve la date originale`}
          </pre>
        </div>

        <div className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-amber-300 text-sm">
              <p className="font-medium mb-1">Cas d'usage typiques</p>
              <ul className="text-amber-300/80 space-y-1">
                <li>• Correction d'une erreur de saisie sur un prix d'achat</li>
                <li>• Mise à jour du prix après réception de la facture fournisseur</li>
                <li>• Ajustement rétroactif pour correspondre à la comptabilité</li>
                <li>• Recalcul du CUMP après découverte d'une anomalie</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Actions techniques lors d'une modification */}
      <div id="actions-techniques" className="bg-slate-800 rounded-xl p-6 border border-pink-500/50 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-pink-400" />
          7. Actions techniques lors d'une modification
        </h2>

        <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
            <div className="text-pink-300 text-sm">
              <p className="font-bold mb-2">Que se passe-t-il exactement quand vous modifiez un prix ?</p>
              <p className="text-pink-300/80">
                Voici le détail technique de chaque action effectuée par l'application
                lorsque vous modifiez le prix unitaire d'une entrée de stock initiale.
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-white font-medium mb-4">Séquence des opérations</h3>

        <div className="space-y-4 mb-6">
          {/* Étape 1 */}
          <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
              <h4 className="text-blue-400 font-medium">Appel API : Modification du price_unit</h4>
            </div>
            <div className="ml-11">
              <p className="text-slate-300 text-sm mb-2">
                L'application envoie une requête <code className="bg-slate-600 px-1 rounded">stock.move.write()</code> pour modifier le prix.
              </p>
              <div className="bg-slate-800 rounded p-3 font-mono text-xs overflow-x-auto">
                <pre className="text-slate-300">{`// Requête envoyée à ODOO
POST /api/odoo
{
  "model": "stock.move",
  "method": "write",
  "args": [[move_id], { "price_unit": nouveau_prix }]
}`}</pre>
              </div>
            </div>
          </div>

          {/* Étape 2 */}
          <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
              <h4 className="text-green-400 font-medium">ODOO : Mise à jour du mouvement</h4>
            </div>
            <div className="ml-11">
              <p className="text-slate-300 text-sm mb-2">
                ODOO modifie le champ <code className="bg-slate-600 px-1 rounded">price_unit</code> sur l'enregistrement <code className="bg-slate-600 px-1 rounded">stock.move</code>.
              </p>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• Le mouvement garde son <strong className="text-white">ID original</strong></li>
                <li>• La <strong className="text-white">date</strong> du mouvement reste inchangée</li>
                <li>• Le <strong className="text-white">state</strong> reste "done" (validé)</li>
                <li>• Seul le <code className="bg-slate-600 px-1 rounded">price_unit</code> est modifié</li>
              </ul>
            </div>
          </div>

          {/* Étape 3 - INFO */}
          <div className="bg-amber-500/10 rounded-lg p-4 border-l-4 border-amber-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
              <h4 className="text-amber-400 font-medium">INFO : ODOO ne recalcule PAS automatiquement</h4>
            </div>
            <div className="ml-11">
              <p className="text-slate-300 text-sm mb-3">
                <strong className="text-amber-400">Si on modifiait UNIQUEMENT le price_unit</strong>, ODOO ne recalculerait pas le standard_price.
              </p>
              <div className="bg-slate-800 rounded p-3 mb-3">
                <p className="text-slate-400 text-sm">
                  ODOO ne declenche pas de recalcul du CUMP lorsqu'on modifie un <code className="bg-slate-600 px-1 rounded">price_unit</code>
                  via API sur un mouvement deja valide. C'est pourquoi <strong className="text-white">notre application le fait elle-meme</strong> (etape suivante).
                </p>
              </div>
            </div>
          </div>

          {/* Étape 4 */}
          <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-cyan-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
              <h4 className="text-cyan-400 font-medium">Application : Recalcul du CUMP</h4>
            </div>
            <div className="ml-11">
              <p className="text-slate-300 text-sm mb-2">
                L'application recalcule le CUMP a partir de tous les mouvements d'entree.
              </p>
              <div className="bg-slate-800 rounded p-3 font-mono text-xs overflow-x-auto">
                <pre className="text-slate-300">{`// Calcul du nouveau CUMP
const moves = await fetchAllMoves(product_id)
const entries = moves.filter(m => m.location_dest_id.usage === 'internal')

let totalQty = 0, totalValue = 0
for (const entry of entries) {
  totalQty += entry.product_qty
  totalValue += entry.product_qty * entry.price_unit  // Nouveau prix inclus !
}

const newCUMP = totalValue / totalQty  // Nouveau CUMP`}</pre>
              </div>
            </div>
          </div>

          {/* Étape 5 - MISE À JOUR ODOO */}
          <div className="bg-green-500/10 rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">5</div>
              <h4 className="text-green-400 font-medium">Application : Mise a jour du standard_price sur ODOO</h4>
            </div>
            <div className="ml-11">
              <p className="text-slate-300 text-sm mb-2">
                <strong className="text-green-400">L'application met a jour le champ "Cout" sur la fiche produit dans ODOO.</strong>
              </p>
              <div className="bg-slate-800 rounded p-3 font-mono text-xs overflow-x-auto mb-3">
                <pre className="text-slate-300">{`// Mise a jour du standard_price sur ODOO
await callOdoo('product.product', 'write', [[productId], {
  standard_price: newCUMP  // Le "Cout" sur la fiche produit
}])`}</pre>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded p-3">
                <p className="text-green-300 text-sm">
                  <strong>Resultat :</strong> Le champ "Cout" visible sur la fiche produit dans ODOO est mis a jour avec le nouveau CUMP.
                  C'est l'application qui fait cette mise a jour, pas ODOO automatiquement.
                </p>
              </div>
            </div>
          </div>

          {/* Étape 6 */}
          <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">6</div>
              <h4 className="text-purple-400 font-medium">Resultat final</h4>
            </div>
            <div className="ml-11">
              <p className="text-slate-300 text-sm mb-2">
                Apres modification d'un prix, voici l'etat des donnees :
              </p>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• <strong className="text-green-400">price_unit (mouvement)</strong> = nouveau prix (modifie par l'app)</li>
                <li>• <strong className="text-green-400">standard_price (fiche produit)</strong> = nouveau CUMP (modifie par l'app)</li>
                <li>• <strong className="text-slate-500">standard_price ODOO</strong> = non synchronisé (ignoré)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Résumé visuel */}
        <h3 className="text-white font-medium mb-4">Résumé : Impact sur les données</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-600">
                <th className="pb-2 pr-4">Donnée</th>
                <th className="pb-2 pr-4">Modèle ODOO</th>
                <th className="pb-2 pr-4">Après modification</th>
                <th className="pb-2">Utilisé par l'app</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-700">
                <td className="py-2 pr-4">Prix unitaire du mouvement</td>
                <td className="py-2 pr-4 font-mono text-xs text-green-400">stock.move.price_unit</td>
                <td className="py-2 pr-4"><span className="text-green-400">✓ Modifié</span></td>
                <td className="py-2"><span className="text-green-400">✓ Oui</span></td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-2 pr-4">CUMP fiche produit</td>
                <td className="py-2 pr-4 font-mono text-xs text-amber-400">product.product.standard_price</td>
                <td className="py-2 pr-4"><span className="text-red-400">✗ Non modifié</span></td>
                <td className="py-2"><span className="text-slate-500">✗ Non (ignoré)</span></td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-2 pr-4">Couche de valorisation</td>
                <td className="py-2 pr-4 font-mono text-xs text-amber-400">stock.valuation.layer</td>
                <td className="py-2 pr-4"><span className="text-amber-400">~ Dépend config</span></td>
                <td className="py-2"><span className="text-slate-500">✗ Non</span></td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Date du mouvement</td>
                <td className="py-2 pr-4 font-mono text-xs text-green-400">stock.move.date</td>
                <td className="py-2 pr-4"><span className="text-blue-400">Inchangée</span></td>
                <td className="py-2"><span className="text-green-400">✓ Oui</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-green-300 text-sm">
              <p className="font-bold mb-1">Pourquoi c'est fiable</p>
              <p className="text-green-300/80">
                En calculant le CUMP directement depuis les <code className="bg-slate-700 px-1 rounded">price_unit</code> des mouvements,
                l'application obtient toujours la valeur correcte, <strong>même si le standard_price d'ODOO n'est pas synchronisé</strong>.
                C'est la source de vérité la plus fiable après une modification rétroactive.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calcul CUMP local */}
      <div id="calcul-local" className="bg-slate-800 rounded-xl p-6 border border-slate-700 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-cyan-400" />
          8. Calcul CUMP dans l'application
        </h2>

        <div className="bg-slate-700 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-slate-300">
{`// Pour chaque produit, on calcule:

// 1. Total des entrées (supplier → internal)
let totalQtyIn = 0
let totalValueIn = 0

for (const move of moves) {
  if (move.state !== 'done') continue

  const isEntry = move.location_id.usage === 'supplier'
               && move.location_dest_id.usage === 'internal'

  if (isEntry) {
    totalQtyIn += move.product_qty
    totalValueIn += move.product_qty * move.price_unit
  }
}

// 2. CUMP = Total valeur entrées / Total quantité entrées
const cump = totalQtyIn > 0 ? totalValueIn / totalQtyIn : 0

// 3. Valeur du stock = Quantité nette × CUMP
const stockValue = netQty * cump`}
          </pre>
        </div>
      </div>

      {/* Versions ODOO et modèles explorés */}
      <div id="odoo17" className="bg-slate-800 rounded-xl p-6 border border-slate-700 scroll-mt-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-orange-400" />
          8. Versions ODOO et modèles explorés
        </h2>

        {/* Versions testées */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Versions ODOO testées</h3>
          <div className="flex flex-wrap gap-3">
            <div className="bg-green-600/20 border border-green-600/30 rounded-lg px-4 py-2 text-center">
              <p className="text-green-300 font-bold">ODOO 17</p>
              <p className="text-green-400/70 text-xs">Testé ✓</p>
            </div>
            <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg px-4 py-2 text-center">
              <p className="text-blue-300 font-bold">ODOO 18</p>
              <p className="text-blue-400/70 text-xs">Testé ✓</p>
            </div>
            <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg px-4 py-2 text-center">
              <p className="text-purple-300 font-bold">ODOO 19</p>
              <p className="text-purple-400/70 text-xs">Dernière version</p>
            </div>
          </div>
        </div>

        {/* Standard price éditable */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-green-300 text-sm">
              <p className="font-bold mb-2">standard_price est modifiable manuellement</p>
              <p className="text-green-300/80">
                Contrairement au <code className="bg-slate-700 px-1 rounded">price_unit</code> des mouvements validés,
                le champ <code className="bg-slate-700 px-1 rounded">standard_price</code> sur la fiche produit
                reste <strong>éditable à tout moment</strong> via l'interface ODOO ou via API.
                C'est le coût unitaire officiel utilisé pour la valorisation du stock.
              </p>
            </div>
          </div>
        </div>

        {/* Breaking changes */}
        <h3 className="text-white font-medium mb-3">Breaking changes depuis ODOO 17</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-lg p-3">
            <span className="text-orange-400 font-mono text-xs bg-orange-500/20 px-2 py-0.5 rounded">Breaking</span>
            <p className="text-slate-300">
              <code className="text-cyan-400">type = 'product'</code> remplacé par <code className="text-green-400">is_storable = true</code> sur product.product
            </p>
          </div>
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-lg p-3">
            <span className="text-orange-400 font-mono text-xs bg-orange-500/20 px-2 py-0.5 rounded">Breaking</span>
            <p className="text-slate-300">
              <code className="text-cyan-400">name</code> n'existe plus sur stock.move, utiliser <code className="text-green-400">reference</code>
            </p>
          </div>
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-lg p-3">
            <span className="text-orange-400 font-mono text-xs bg-orange-500/20 px-2 py-0.5 rounded">Breaking</span>
            <p className="text-slate-300">
              <code className="text-cyan-400">quantity_done</code> remplacé par <code className="text-green-400">quantity</code> sur stock.move
            </p>
          </div>
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-lg p-3">
            <span className="text-blue-400 font-mono text-xs bg-blue-500/20 px-2 py-0.5 rounded">Required</span>
            <p className="text-slate-300">
              <code className="text-green-400">procure_method</code> obligatoire sur stock.move (valeur: 'make_to_stock')
            </p>
          </div>
        </div>

        {/* Modèles explorés */}
        <h3 className="text-white font-medium mt-6 mb-3">Modèles ODOO explorés</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <code className="text-green-400">product.product</code>
            <p className="text-slate-400 text-xs mt-1">Produits avec standard_price (CUMP)</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <code className="text-green-400">product.template</code>
            <p className="text-slate-400 text-xs mt-1">Modèles de produits</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <code className="text-green-400">stock.move</code>
            <p className="text-slate-400 text-xs mt-1">Mouvements de stock avec price_unit</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <code className="text-green-400">stock.picking</code>
            <p className="text-slate-400 text-xs mt-1">Bons de transfert</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <code className="text-green-400">stock.location</code>
            <p className="text-slate-400 text-xs mt-1">Emplacements (supplier, internal, customer)</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <code className="text-green-400">stock.picking.type</code>
            <p className="text-slate-400 text-xs mt-1">Types de transfert (incoming, outgoing)</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <code className="text-green-400">stock.valuation.layer</code>
            <p className="text-slate-400 text-xs mt-1">Couches de valorisation (ODOO 13+)</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <code className="text-green-400">stock.quant</code>
            <p className="text-slate-400 text-xs mt-1">Quantités en stock par emplacement</p>
          </div>
        </div>
      </div>
    </main>
  )
}
