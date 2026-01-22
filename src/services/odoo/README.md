# Architecture Multi-Versions Odoo - Pattern Adapter

Ce document explique l'architecture utilisée pour gérer plusieurs versions d'Odoo (17, 18, 19, 20+) avec un code maintenable et évolutif.

## Le Problème

Chaque version d'Odoo introduit des changements dans l'API :
- **Noms de champs différents** : `name` → `origin` sur `stock.move`
- **Nouveaux champs** : `picked`, `quantity` en v19
- **IDs d'emplacements** : peuvent varier selon l'instance
- **Méthodes API** : certaines disparaissent ou changent de signature

**Sans architecture adaptée**, le code devient :
```typescript
// ❌ Code non maintenable
if (version === '19') {
  moveData.origin = reference
  moveData.picked = true
} else if (version === '18') {
  moveData.name = reference
} else {
  // etc...
}
```

## La Solution : Pattern Adapter

Le **Pattern Adapter** (ou Wrapper) permet de :
1. Définir une **interface commune** pour toutes les versions
2. Créer un **adaptateur spécifique** par version
3. Utiliser une **Factory** pour instancier le bon adaptateur

```
┌─────────────────────────────────────────────────────────────┐
│                     Application                              │
│                         │                                    │
│                         ▼                                    │
│              ┌─────────────────────┐                        │
│              │   IOdooAdapter      │  ← Interface commune   │
│              │   (interface)       │                        │
│              └─────────────────────┘                        │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Odoo18      │ │ Odoo19      │ │ Odoo20      │           │
│  │ Adapter     │ │ Adapter     │ │ Adapter     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│         │               │               │                   │
│         ▼               ▼               ▼                   │
│  ┌─────────────────────────────────────────────┐           │
│  │              Odoo JSON-RPC API              │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Structure des Fichiers

```
src/services/odoo/
├── index.ts                    # Point d'entrée (exports)
├── types.ts                    # Types communs à toutes les versions
├── OdooAdapterFactory.ts       # Factory + Manager singleton
├── README.md                   # Cette documentation
└── adapters/
    ├── OdooAdapter.ts          # Interface + classe abstraite
    ├── Odoo18Adapter.ts        # Implémentation v18
    ├── Odoo19Adapter.ts        # Implémentation v19
    └── Odoo20Adapter.ts        # (futur) Implémentation v20
```

## Comment ça Fonctionne

### 1. Types Communs (`types.ts`)

Définit les types **indépendants de la version** :

```typescript
// Version supportées
export type OdooVersion = '17' | '18' | '19' | '20'

// Configuration de connexion
export interface OdooConnectionConfig {
  id: string
  name: string
  url: string
  database: string
  username: string
  apiKey: string
  version: OdooVersion      // ← La clé pour choisir l'adapter
  isActive: boolean
}

// Types métier (identiques quelle que soit la version)
export interface OdooProduct {
  id: number
  name: string
  defaultCode: string | null
  standardPrice: number
  qtyAvailable: number
}

// Configuration spécifique par version
export interface VersionConfig {
  locations: {
    suppliers: number    // ID peut varier
    stock: number
    customers: number
  }
  fields: {
    stockMoveReference: string  // 'name' ou 'origin'
  }
  features: {
    hasPickedField: boolean
    hasQuantityField: boolean
  }
}
```

### 2. Interface Commune (`adapters/OdooAdapter.ts`)

Définit le **contrat** que tous les adaptateurs doivent respecter :

```typescript
export interface IOdooAdapter {
  // Propriétés
  readonly version: string
  readonly config: OdooConnectionConfig
  readonly versionConfig: VersionConfig

  // Méthodes communes
  testConnection(): Promise<ApiResult<{ uid: number }>>
  searchProducts(query: string): Promise<OdooProduct[]>
  getStockMoves(filters?: StockMoveFilters): Promise<OdooStockMove[]>
  createStockEntry(data: StockEntryData): Promise<ApiResult<{ moveId: number }>>
  createStockExit(data: StockEntryData): Promise<ApiResult<{ moveId: number }>>

  // Méthode générique pour appels directs
  callOdoo<T>(model: string, method: string, args: unknown[]): Promise<T>
}
```

### 3. Classe Abstraite (`adapters/OdooAdapter.ts`)

Implémente les méthodes **communes à toutes les versions** :

```typescript
export abstract class BaseOdooAdapter implements IOdooAdapter {
  abstract readonly version: string
  abstract readonly versionConfig: VersionConfig

  constructor(public readonly config: OdooConnectionConfig) {}

  // Méthode commune : appel JSON-RPC
  async callOdoo<T>(model: string, method: string, args: unknown[]): Promise<T> {
    const response = await fetch(`${this.config.url}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [this.config.database, 2, this.config.apiKey, model, method, args]
        }
      })
    })
    const data = await response.json()
    return data.result
  }

  // Méthodes communes implémentées ici
  async searchProducts(query: string): Promise<OdooProduct[]> {
    // Code identique pour toutes les versions
  }

  // Méthodes abstraites à implémenter par chaque version
  abstract createStockEntry(data: StockEntryData): Promise<ApiResult<{ moveId: number }>>
  abstract createStockExit(data: StockEntryData): Promise<ApiResult<{ moveId: number }>>
}
```

### 4. Adaptateur Spécifique (`adapters/Odoo19Adapter.ts`)

Chaque version implémente ses **spécificités** :

```typescript
export class Odoo19Adapter extends BaseOdooAdapter {
  readonly version = '19'

  // Configuration spécifique v19
  readonly versionConfig: VersionConfig = {
    locations: {
      suppliers: 1,   // IDs spécifiques à v19 / cette instance
      stock: 5,
      customers: 2
    },
    fields: {
      stockMoveReference: 'origin'  // En v19, on utilise 'origin'
    },
    features: {
      hasPickedField: true,         // v19 a le champ 'picked'
      hasQuantityField: true        // v19 a le champ 'quantity'
    }
  }

  async createStockEntry(data: StockEntryData): Promise<ApiResult<{ moveId: number }>> {
    const { suppliers, stock } = this.versionConfig.locations

    const moveData = {
      origin: data.reference,        // ← Spécifique v19 (pas 'name')
      product_id: data.productId,
      product_uom_qty: data.quantity,
      quantity: data.quantity,       // ← Spécifique v19
      location_id: suppliers,
      location_dest_id: stock,
      price_unit: data.priceUnit,
      state: 'draft'
    }

    const moveId = await this.callOdoo<number>('stock.move', 'create', [moveData])

    // Validation avec 'picked' (spécifique v19)
    await this.callOdoo('stock.move', 'write', [[moveId], {
      state: 'done',
      quantity: data.quantity,
      picked: true                   // ← Spécifique v19
    }])

    return { success: true, data: { moveId } }
  }
}
```

### 5. Factory (`OdooAdapterFactory.ts`)

Crée l'adaptateur approprié selon la version :

```typescript
// Map des adaptateurs disponibles
const adapters: Record<OdooVersion, new (config: OdooConnectionConfig) => IOdooAdapter> = {
  '17': Odoo18Adapter,  // Fallback
  '18': Odoo18Adapter,
  '19': Odoo19Adapter,
  '20': Odoo19Adapter   // Fallback jusqu'à création de Odoo20Adapter
}

export function createOdooAdapter(config: OdooConnectionConfig): IOdooAdapter {
  const AdapterClass = adapters[config.version]
  return new AdapterClass(config)
}

// Manager singleton pour gérer plusieurs connexions
class OdooAdapterManager {
  private adapters: Map<string, IOdooAdapter> = new Map()
  private activeConnectionId: string | null = null

  setConnection(config: OdooConnectionConfig): IOdooAdapter {
    const adapter = createOdooAdapter(config)
    this.adapters.set(config.id, adapter)
    if (config.isActive) this.activeConnectionId = config.id
    return adapter
  }

  getActiveAdapter(): IOdooAdapter | null {
    if (!this.activeConnectionId) return null
    return this.adapters.get(this.activeConnectionId) || null
  }
}

export const odooManager = OdooAdapterManager.getInstance()
```

## Utilisation

### Basique

```typescript
import { createOdooAdapter } from '@/services/odoo'

const adapter = createOdooAdapter({
  id: 'ma-connexion',
  name: 'Mon Odoo',
  url: 'https://mon-odoo.com',
  database: 'ma_base',
  username: 'admin',
  apiKey: 'xxx',
  version: '19',        // ← Détermine quel adapter est utilisé
  isActive: true
})

// Utilisation identique quelle que soit la version !
const products = await adapter.searchProducts('test')
const result = await adapter.createStockEntry({
  productId: 123,
  quantity: 10,
  priceUnit: 50
})
```

### Avec le Manager (multi-connexions)

```typescript
import { odooManager } from '@/services/odoo'

// Configurer plusieurs connexions
odooManager.setConnection({
  id: 'prod-v19',
  name: 'Production (v19)',
  version: '19',
  // ...
  isActive: true
})

odooManager.setConnection({
  id: 'dev-v18',
  name: 'Dev (v18)',
  version: '18',
  // ...
  isActive: false
})

// Utiliser la connexion active
const adapter = odooManager.getActiveAdapter()
const products = await adapter?.searchProducts('test')

// Changer de connexion
odooManager.setActiveConnection('dev-v18')
```

## Ajouter une Nouvelle Version

### Étape 1 : Créer l'adaptateur

Copier un adaptateur existant et adapter :

```typescript
// adapters/Odoo20Adapter.ts
export class Odoo20Adapter extends BaseOdooAdapter {
  readonly version = '20'

  readonly versionConfig: VersionConfig = {
    locations: {
      suppliers: 1,    // À vérifier sur Odoo 20
      stock: 5,
      customers: 2
    },
    fields: {
      stockMoveReference: 'origin'  // À vérifier
    },
    features: {
      hasPickedField: true,         // À vérifier
      hasQuantityField: true        // À vérifier
    }
  }

  // Implémenter les méthodes si elles diffèrent de v19
  // Sinon, hériter de la classe parente
}
```

### Étape 2 : Enregistrer dans la Factory

```typescript
// OdooAdapterFactory.ts
import { Odoo20Adapter } from './adapters/Odoo20Adapter'

const adapters: Record<OdooVersion, ...> = {
  '17': Odoo18Adapter,
  '18': Odoo18Adapter,
  '19': Odoo19Adapter,
  '20': Odoo20Adapter   // ← Nouveau
}
```

### Étape 3 : Ajouter le type

```typescript
// types.ts
export type OdooVersion = '17' | '18' | '19' | '20'  // Déjà fait
```

## Bonnes Pratiques

### 1. Ne jamais modifier les adaptateurs existants

Quand une nouvelle version sort, **créer un nouvel adaptateur** plutôt que de modifier l'existant :

```
✅ Créer Odoo20Adapter.ts
❌ Modifier Odoo19Adapter.ts pour supporter v20
```

### 2. Documenter les différences

Dans chaque adaptateur, commenter les spécificités :

```typescript
/**
 * Adaptateur Odoo 19
 *
 * Différences avec v18 :
 * - Champ 'origin' au lieu de 'name' sur stock.move
 * - Champ 'picked' requis pour valider un mouvement
 * - Champ 'quantity' en plus de 'product_uom_qty'
 */
```

### 3. Utiliser des fallbacks intelligents

```typescript
const adapters = {
  '17': Odoo18Adapter,  // v17 similaire à v18
  '18': Odoo18Adapter,
  '19': Odoo19Adapter,
  '20': Odoo19Adapter   // En attendant Odoo20Adapter
}
```

### 4. Tester avec chaque version

Créer des tests spécifiques par version :

```typescript
describe('Odoo19Adapter', () => {
  it('should use origin field', async () => {
    const adapter = new Odoo19Adapter(config)
    // ...
  })
})

describe('Odoo18Adapter', () => {
  it('should use name field', async () => {
    const adapter = new Odoo18Adapter(config)
    // ...
  })
})
```

## Réutilisation dans d'Autres Projets

Cette architecture est **générique** et peut s'appliquer à :

- **Autres ERP** : SAP, Sage, etc.
- **APIs versionnées** : Stripe v1/v2, Shopify, etc.
- **Bases de données** : PostgreSQL, MySQL, MongoDB
- **Services Cloud** : AWS, Azure, GCP

### Template générique

```typescript
// 1. Interface
interface IServiceAdapter {
  readonly version: string
  doSomething(): Promise<Result>
}

// 2. Classe abstraite
abstract class BaseServiceAdapter implements IServiceAdapter {
  abstract readonly version: string
  // Méthodes communes
}

// 3. Implémentations
class ServiceV1Adapter extends BaseServiceAdapter { }
class ServiceV2Adapter extends BaseServiceAdapter { }

// 4. Factory
const adapters = { v1: ServiceV1Adapter, v2: ServiceV2Adapter }
function createAdapter(version: string) {
  return new adapters[version](config)
}
```

## Avantages

| Aspect | Sans Adapter | Avec Adapter |
|--------|-------------|--------------|
| Ajout version | Modifier partout | 1 fichier |
| Tests | Complexes | Isolés |
| Maintenance | ❌ Difficile | ✅ Facile |
| Lisibilité | ❌ Conditions partout | ✅ Code propre |
| Rollback | ❌ Risqué | ✅ Simple |

---

## Modification du Prix Unitaire (Valorisation)

### Le Probleme : Ecritures de Correction Automatiques

Quand on modifie `price_unit` sur un `stock.move` deja valide (state='done'), **Odoo cree automatiquement des ecritures de correction** dans `stock.valuation.layer`.

```
❌ AVANT (problematique) :
stock.move.write([id], { price_unit: 50 })
  → Odoo detecte le changement
  → Cree des lignes de correction avec quantite = 0 et valeur = difference
  → Pollue les donnees avec des ecritures parasites
```

### La Solution : Modifier stock.valuation.layer

Pour eviter ces ecritures de correction, on modifie **directement** la couche de valorisation :

```typescript
// ✅ MAINTENANT (correct) :
async updateStockMovePrice(moveId: number, newPrice: number): Promise<ApiResult<void>> {
  // 1. Recuperer le mouvement et son produit
  const moves = await this.callOdoo('stock.move', 'search_read',
    [[['id', '=', moveId]]],
    { fields: ['id', 'product_id'] }
  )
  const productId = moves[0].product_id[0]

  // 2. Trouver la couche de valorisation associee
  const layers = await this.callOdoo('stock.valuation.layer', 'search_read',
    [[['stock_move_id', '=', moveId]]],
    { fields: ['id', 'quantity', 'unit_cost', 'value'] }
  )

  if (layers.length > 0) {
    // 3. Modifier directement la couche (pas d'ecriture de correction !)
    const layer = layers[0]
    const newValue = Math.abs(layer.quantity) * newPrice

    await this.callOdoo('stock.valuation.layer', 'write', [[layer.id], {
      unit_cost: newPrice,
      value: layer.quantity >= 0 ? newValue : -newValue
    }])
  }

  // 4. Recalculer le CUMP du produit
  const allLayers = await this.callOdoo('stock.valuation.layer', 'search_read',
    [['product_id', '=', productId], ['quantity', '>', 0]],
    { fields: ['quantity', 'unit_cost'] }
  )

  let totalQty = 0, totalValue = 0
  for (const layer of allLayers) {
    totalQty += layer.quantity
    totalValue += layer.quantity * layer.unit_cost
  }

  const newCUMP = totalValue / totalQty

  // 5. Mettre a jour le standard_price du produit
  await this.callOdoo('product.product', 'write', [[productId], {
    standard_price: newCUMP
  }])
}
```

### Flux de Modification

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Utilisateur modifie le prix d'une entree de stock          │
│                           │                                     │
│                           ▼                                     │
│  2. Application trouve stock.valuation.layer via stock_move_id │
│                           │                                     │
│                           ▼                                     │
│  3. Modification directe : unit_cost + value sur la couche     │
│     (PAS de modification de stock.move.price_unit !)           │
│                           │                                     │
│                           ▼                                     │
│  4. Recalcul du CUMP depuis toutes les couches (quantity > 0)  │
│                           │                                     │
│                           ▼                                     │
│  5. Mise a jour product.product.standard_price                 │
└─────────────────────────────────────────────────────────────────┘
```

### Modeles Odoo Concernes

| Modele | Role | Quand modifier ? |
|--------|------|------------------|
| `stock.move` | Mouvement physique | Jamais apres validation |
| `stock.valuation.layer` | Couche de valorisation | ✅ Pour changer le prix |
| `product.product` | Fiche produit | ✅ Pour mettre a jour le CUMP |

---

## Sorties de Stock (Ventes)

### Comprendre les Sorties

Une **sortie de stock** correspond a :
- Une vente a un client
- Une consommation interne
- Un transfert vers un autre entrepot
- Une perte/casse

### Caracteristiques d'une Sortie

```typescript
// Une sortie de stock :
{
  location_id: 5,           // Stock (source)
  location_dest_id: 2,      // Clients (destination)
  product_qty: 10,          // Quantite positive
  // MAIS dans la valorisation :
  quantity: -10,            // Quantite negative (sortie)
  value: -500               // Valeur negative (diminution du stock)
}
```

### Prix de Sortie = CUMP

**Important** : Les sorties sont valorisees au **CUMP** (Cout Unitaire Moyen Pondere), pas au prix de vente !

```
Exemple :
- Entree 1 : 10 unites a 40€ = 400€
- Entree 2 : 10 unites a 60€ = 600€
- CUMP = (400 + 600) / 20 = 50€

- Sortie : 5 unites
- Valeur sortie = 5 x 50€ = 250€ (au CUMP, pas au prix de vente)
```

### Creation d'une Sortie

```typescript
async createStockExit(data: StockEntryData): Promise<ApiResult<{ moveId: number }>> {
  const { stock, customers } = this.versionConfig.locations

  // 1. Recuperer le CUMP actuel du produit
  const products = await this.callOdoo<Array<{ standard_price: number }>>(
    'product.product', 'read', [[data.productId], ['standard_price']]
  )
  const cump = products[0]?.standard_price || 0

  // 2. Creer le mouvement de sortie
  const moveData = {
    origin: data.reference,
    product_id: data.productId,
    product_uom_qty: data.quantity,
    quantity: data.quantity,
    location_id: stock,           // Stock → Clients
    location_dest_id: customers,
    price_unit: cump,             // ← CUMP, pas prix de vente !
    state: 'draft'
  }

  const moveId = await this.callOdoo<number>('stock.move', 'create', [moveData])

  // 3. Valider le mouvement
  await this.callOdoo('stock.move', 'write', [[moveId], {
    state: 'done',
    quantity: data.quantity,
    picked: true
  }])

  return { success: true, data: { moveId } }
}
```

### Impact sur la Valorisation

Apres une sortie, Odoo cree automatiquement une couche de valorisation negative :

```
stock.valuation.layer :
┌────────┬──────────┬────────────┬─────────┐
│   ID   │ quantity │ unit_cost  │  value  │
├────────┼──────────┼────────────┼─────────┤
│  101   │   10     │    40.00   │  400.00 │  ← Entree 1
│  102   │   10     │    60.00   │  600.00 │  ← Entree 2
│  103   │   -5     │    50.00   │ -250.00 │  ← Sortie (au CUMP)
└────────┴──────────┴────────────┴─────────┘

Stock restant : 15 unites
Valeur restante : 400 + 600 - 250 = 750€
```

### Pourquoi le Prix de Sortie n'est PAS Modifiable ?

Dans l'interface, seules les **entrees** sont editables car :

1. **Entrees** = Prix d'achat reel (peut etre corrige si erreur)
2. **Sorties** = CUMP au moment de la sortie (calcule automatiquement)

Modifier le prix d'une sortie n'a pas de sens comptablement : le CUMP est un calcul, pas une donnee saisie.

### Cas Particulier : Retour Client

Un retour client est une **entree** (le stock augmente) :

```typescript
// Retour client = entree depuis "Clients"
{
  location_id: 2,           // Clients (source du retour)
  location_dest_id: 5,      // Stock (destination)
  product_qty: 2,
  price_unit: cump_au_moment_vente  // Ou prix negocie
}
```

---

## Resume des Regles

### Entrees de Stock
- **Modifiable** : Oui (prix d'achat peut etre corrige)
- **Valorisation** : Au prix d'achat saisi
- **Modification via** : `stock.valuation.layer` (pas `stock.move`)

### Sorties de Stock
- **Modifiable** : Non (calcule au CUMP)
- **Valorisation** : Au CUMP du moment
- **Affichage** : Prix unitaire = CUMP, non editable

### CUMP (Cout Unitaire Moyen Pondere)
- **Calcul** : Somme(Qte x Prix) / Somme(Qte) des entrees
- **Stocke dans** : `product.product.standard_price`
- **Recalcule** : A chaque modification de prix d'entree

---

## Licence

MIT - Libre d'utilisation et modification.
