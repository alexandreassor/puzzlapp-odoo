# Documentation Technique : Modification du Prix d'Achat dans ODOO

## Vue d'ensemble

Cette documentation explique le processus complet de modification retroactive du prix d'achat d'un mouvement de stock dans ODOO, et comment cette modification impacte le calcul du CUMP (Cout Unitaire Moyen Pondere).

**Note:** Cette implementation est compatible avec toutes les versions d'ODOO, y compris celles sans le modele `stock.valuation.layer`.

---

## Architecture de la fonctionnalite

### Fichiers impliques

```
src/
├── services/
│   └── odooService.ts          # Fonction updateStockMovePrice()
├── components/
│   └── ProductDetailModal.tsx  # Interface utilisateur d'edition
proxy-server/
└── server.js                   # Proxy CORS vers ODOO
```

---

## Flux de donnees

```
┌─────────────────┐     ┌───────────────┐     ┌─────────────────┐     ┌──────────┐
│  UI (React)     │────▶│ odooService   │────▶│  Proxy Server   │────▶│  ODOO    │
│  Clic "Modifier"│     │ updateStock   │     │  (localhost:    │     │  API     │
│                 │     │ MovePrice()   │     │   3001)         │     │          │
└─────────────────┘     └───────────────┘     └─────────────────┘     └──────────┘
```

---

## Fonction principale : `updateStockMovePrice`

### Localisation
`src/services/odooService.ts` (lignes 667-745)

### Signature
```typescript
export async function updateStockMovePrice(
  moveId: number,
  newPrice: number
): Promise<{ success: boolean; error?: string }>
```

### Processus detaille (3 etapes)

#### Etape 1 : Recuperer les informations du mouvement

```typescript
const moves = await callOdoo<Array<{ id: number; product_id: [number, string] }>>('stock.move', 'search_read', [
  [['id', '=', moveId]]
], {
  fields: ['id', 'product_id'],
  limit: 1
})
```

**Objectif** : Obtenir l'ID du produit associe au mouvement pour pouvoir recalculer son CUMP par la suite.

#### Etape 2 : Mettre a jour le prix sur le mouvement de stock

```typescript
await callOdoo<boolean>('stock.move', 'write', [[moveId], {
  price_unit: newPrice
}])
```

**Modele ODOO** : `stock.move`
**Champ modifie** : `price_unit`

#### Etape 3 : Recalculer le CUMP a partir des mouvements

On recupere tous les mouvements du produit et on calcule le CUMP directement:

```typescript
// Recuperer tous les mouvements du produit
const allMoves = await callOdoo<Array<{
  id: number
  product_qty: number
  price_unit: number
  location_id: [number, string]
  location_dest_id: [number, string]
  state: string
}>>('stock.move', 'search_read', [
  [['product_id', '=', productId], ['state', '=', 'done']]
], {
  fields: ['id', 'product_qty', 'price_unit', 'location_id', 'location_dest_id', 'state']
})

// Calculer le CUMP (Cout Unitaire Moyen Pondere) base sur les entrees
let totalQty = 0
let totalValue = 0

for (const m of allMoves) {
  const qty = m.product_qty || 0
  const price = m.price_unit || 0
  const destId = m.location_dest_id?.[0]

  // Considerer comme entree si destination est emplacement interne
  if (destId === 8 || (m.location_dest_id?.[1] || '').includes('Stock')) {
    if (qty > 0 && price > 0) {
      totalQty += qty
      totalValue += qty * price
    }
  }
}

// Calculer et mettre a jour le CUMP
if (totalQty > 0) {
  const newCUMP = totalValue / totalQty
  await callOdoo<boolean>('product.product', 'write', [[productId], {
    standard_price: newCUMP
  }])
}
```

**Modele ODOO** : `product.product`
**Champ modifie** : `standard_price` (= CUMP)

---

## Identification des entrees de stock

La fonction determine si un mouvement est une entree en verifiant:

1. **Par ID d'emplacement** : `location_dest_id === 8` (ID typique du stock interne)
2. **Par nom d'emplacement** : Si le nom contient "Stock"

Une entree valide doit avoir:
- `qty > 0` (quantite positive)
- `price > 0` (prix renseigne)
- `state === 'done'` (mouvement effectue)

---

## Interface Utilisateur

### Localisation
`src/components/ProductDetailModal.tsx`

### Fonctionnement

1. **Affichage** : Dans l'onglet "Historique", chaque mouvement affiche son prix unitaire
2. **Edition** : Un clic sur l'icone crayon (apparait au survol) active le mode edition
3. **Validation** :
   - Entree = Valider
   - Echap = Annuler
   - Clic sur check = Valider

### Code de l'interface d'edition

```tsx
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
      className="..."
      autoFocus
    />
    <button onClick={savePrice}>check</button>
    <button onClick={cancelEditPrice}>X</button>
  </div>
) : (
  <div className="flex items-center justify-end gap-2">
    <span>{formatCurrency(move.price_unit)}</span>
    <button onClick={() => startEditPrice(move)}>
      <Pencil />
    </button>
  </div>
)}
```

---

## Modeles ODOO utilises

### 1. stock.move
**Description** : Mouvements de stock (entrees, sorties, transferts)
**Champs cles** :
- `id` : Identifiant unique
- `product_id` : Produit concerne
- `product_qty` : Quantite deplacee
- `price_unit` : Prix unitaire au moment du mouvement
- `location_id` : Emplacement source
- `location_dest_id` : Emplacement destination
- `date` : Date du mouvement
- `state` : Etat (draft, confirmed, assigned, done, cancelled)

### 2. product.product
**Description** : Produits (variantes)
**Champs cles** :
- `id` : Identifiant
- `name` : Nom du produit
- `standard_price` : Prix de revient / CUMP
- `qty_available` : Quantite en stock
- `virtual_available` : Quantite prevue

---

## Formule du CUMP

```
CUMP = Somme(Quantite x Prix) / Somme(Quantite)
     = Valeur totale des entrees / Quantite totale entree
```

**Exemple** :
- Entree 1 : 10 unites a 5EUR = 50EUR
- Entree 2 : 20 unites a 8EUR = 160EUR
- CUMP = (50 + 160) / (10 + 20) = 210 / 30 = 7EUR

---

## Gestion des erreurs

```typescript
try {
  // ... operations ODOO
  return { success: true }
} catch (error) {
  console.error('Erreur modification prix mouvement:', error)
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Erreur inconnue'
  }
}
```

---

## Limitations connues

1. **Permissions ODOO** : L'utilisateur API doit avoir les droits d'ecriture sur `stock.move` et `product.product`

2. **Mouvements valides uniquement** : Seuls les mouvements a l'etat "done" sont pris en compte

3. **Pas de trace d'audit** : Cette modification directe ne cree pas de trace dans le chatter ODOO

4. **Identification des entrees** : La logique suppose que l'ID 8 ou les emplacements contenant "Stock" sont internes

---

## Requetes ODOO brutes (pour debug)

### Lire un mouvement
```json
POST /jsonrpc
{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "service": "object",
    "method": "execute_kw",
    "args": [
      "DATABASE",
      UID,
      "API_KEY",
      "stock.move",
      "search_read",
      [[[["id", "=", MOVE_ID]]]],
      {"fields": ["id", "product_id", "product_qty", "price_unit"]}
    ]
  }
}
```

### Modifier le prix
```json
POST /jsonrpc
{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "service": "object",
    "method": "execute_kw",
    "args": [
      "DATABASE",
      UID,
      "API_KEY",
      "stock.move",
      "write",
      [[MOVE_ID], {"price_unit": NEW_PRICE}],
      {}
    ]
  }
}
```

---

## Tests

Pour tester la fonctionnalite :

1. Ouvrir l'application sur http://localhost:5174
2. Cliquer sur un produit pour ouvrir sa fiche
3. Aller dans l'onglet "Historique"
4. Survoler une ligne de mouvement
5. Cliquer sur l'icone crayon
6. Entrer un nouveau prix
7. Valider avec Entree ou le bouton check
8. Verifier que le CUMP a ete recalcule

---

## Auteur

Alexandre Assor
Documentation generee pour le projet inventory-dashboard
Date : Janvier 2026
