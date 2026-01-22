# Documentation Technique - Application Gestion des Stocks ODOO

## Table des Matieres
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Modeles ODOO utilises](#modeles-odoo-utilises)
4. [Fonctionnalites implementees](#fonctionnalites-implementees)
5. [Modifications recentes](#modifications-recentes)
6. [Guide de depannage](#guide-de-depannage)

---

## Vue d'ensemble

Cette application est un tableau de bord de gestion des stocks connecte a ODOO via son API JSON-RPC. Elle permet de visualiser l'inventaire, consulter l'historique des mouvements, effectuer des entrees/sorties de stock et modifier retroactivement les prix d'achat.

### Stack Technologique
- **Frontend** : React 18 + TypeScript + Vite
- **Styling** : Tailwind CSS
- **Icons** : Lucide React
- **Backend** : Proxy Node.js (Express) pour contourner CORS

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   App.tsx    │  │InventoryTab │  │ProductDetail │               │
│  │   (Main)     │  │    le.tsx   │  │  Modal.tsx   │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│         └─────────────────┼─────────────────┘                        │
│                           │                                          │
│                  ┌────────▼─────────┐                                │
│                  │ odooService.ts   │                                │
│                  │ (API Functions)  │                                │
│                  └────────┬─────────┘                                │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │  Proxy Server │
                    │  (port 3001)  │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  ODOO Server  │
                    │  (JSON-RPC)   │
                    └───────────────┘
```

### Fichiers Principaux

```
inventory-dashboard/
├── src/
│   ├── App.tsx                    # Composant principal, gestion des vues
│   ├── components/
│   │   ├── InventoryTable.tsx     # Tableau d'inventaire avec tri/recherche
│   │   ├── ProductDetailModal.tsx # Fiche produit detaillee + historique
│   │   ├── AddStockModal.tsx      # Modal entree/sortie de stock
│   │   ├── SettingsModal.tsx      # Configuration connexion ODOO
│   │   ├── OdooStyleView.tsx      # Vue style interface ODOO
│   │   └── PivotTableView.tsx     # Tableau croise dynamique
│   ├── services/
│   │   └── odooService.ts         # Toutes les fonctions API ODOO
│   ├── types/
│   │   └── index.ts               # Types TypeScript
│   └── data/
│       └── stockMovements.json    # Donnees Excel converties
├── proxy-server/
│   ├── server.js                  # Proxy CORS vers ODOO
│   └── .env                       # Configuration (optionnel)
└── docs/
    ├── MODIFICATION_PRIX_ODOO.md  # Doc modification prix
    └── DOCUMENTATION_TECHNIQUE.md # Ce fichier
```

---

## Modeles ODOO utilises

### 1. product.product (Produits)

Le modele principal pour les produits/articles stockes.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Integer | Identifiant unique du produit |
| `name` | String | Nom du produit |
| `default_code` | String | Code interne / Reference |
| `barcode` | String | Code-barres EAN/UPC |
| `categ_id` | Many2one | [ID, "Nom"] de la categorie |
| `uom_id` | Many2one | [ID, "Nom"] de l'unite de mesure |
| `type` | Selection | Type: 'consu' (consommable), 'product' (stockable), 'service' |
| `tracking` | Selection | Tracabilite: 'none', 'lot', 'serial' |

**Champs de Stock:**

| Champ | Type | Description |
|-------|------|-------------|
| `qty_available` | Float | Stock physique disponible maintenant |
| `virtual_available` | Float | Stock previsionnel (disponible + entrant - sortant) |
| `incoming_qty` | Float | Quantite en cours de reception |
| `outgoing_qty` | Float | Quantite en cours de livraison |
| `free_qty` | Float | Stock disponible pour vente (sans reservations) |

**Champs de Prix:**

| Champ | Type | Description |
|-------|------|-------------|
| `standard_price` | Float | **Cout de revient / CUMP** (cout moyen pondere) |
| `list_price` | Float | Prix de vente public |

### 2. stock.move (Mouvements de Stock)

Represente chaque mouvement de stock (entree, sortie, transfert).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Integer | Identifiant unique du mouvement |
| `name` | String | Description du mouvement |
| `product_id` | Many2one | [ID, "Nom"] du produit |
| `product_qty` | Float | Quantite reelle deplacee (en UdM produit) |
| `product_uom_qty` | Float | Quantite demandee |
| `product_uom` | Many2one | [ID, "Nom"] de l'unite de mesure |
| `date` | Datetime | Date et heure du mouvement |
| `date_deadline` | Date | Date limite |
| `state` | Selection | Etat du mouvement (voir ci-dessous) |
| `reference` | String | Reference affichee |
| `picking_id` | Many2one | [ID, "Nom"] du bon de livraison/reception |
| `price_unit` | Float | **Prix unitaire au moment du mouvement** |
| `origin` | String | Document d'origine |

**Champs d'Emplacement:**

| Champ | Type | Description |
|-------|------|-------------|
| `location_id` | Many2one | [ID, "Nom"] emplacement **source** (d'ou ca part) |
| `location_dest_id` | Many2one | [ID, "Nom"] emplacement **destination** (ou ca arrive) |
| `picking_type_id` | Many2one | [ID, "Nom"] type d'operation |

**Etats possibles (`state`):**

| Etat | Description |
|------|-------------|
| `draft` | Brouillon - non confirme |
| `waiting` | En attente d'autres mouvements |
| `confirmed` | Confirme - en attente de stock |
| `assigned` | Reserve - stock disponible |
| `done` | **Effectue** - mouvement realise |
| `cancel` | Annule |

**Logique de direction (entree/sortie):**
```
- Entree = location_dest_id est un stock interne (ex: ID 8)
- Sortie = location_id est un stock interne
- Transfert = les deux sont des stocks internes
```

### 3. stock.valuation.layer (Couches de Valorisation)

Systeme de tracabilite des couts pour le calcul du CUMP.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Integer | Identifiant unique |
| `stock_move_id` | Many2one | Mouvement de stock associe |
| `product_id` | Many2one | Produit |
| `quantity` | Float | Quantite (+entree, -sortie) |
| `unit_cost` | Float | **Cout unitaire de cette couche** |
| `value` | Float | **Valeur totale** (quantity × unit_cost) |
| `remaining_qty` | Float | Quantite restante (FIFO) |
| `remaining_value` | Float | Valeur restante |

**Utilisation pour CUMP:**
```
CUMP = Σ(value de toutes les couches avec quantity > 0) / Σ(quantity > 0)
```

### 4. stock.location (Emplacements)

Represente les emplacements physiques et virtuels.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Integer | Identifiant unique |
| `name` | String | Nom de l'emplacement |
| `complete_name` | String | Chemin complet (Parent / Enfant) |
| `usage` | Selection | Type d'emplacement |
| `company_id` | Many2one | Societe |
| `warehouse_id` | Many2one | Entrepot |

**Types d'emplacement (`usage`):**

| Usage | Description |
|-------|-------------|
| `supplier` | Emplacement fournisseur (virtuel) |
| `view` | Vue (conteneur, pas de stock) |
| `internal` | **Emplacement interne** (stock reel) |
| `customer` | Emplacement client (virtuel) |
| `inventory` | Inventaire / Pertes |
| `transit` | Emplacement de transit |
| `production` | Production |

### 5. stock.picking (Bons de Transfert)

Regroupe plusieurs mouvements dans un meme document.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Integer | Identifiant unique |
| `name` | String | Reference du bon (WH/IN/00001) |
| `partner_id` | Many2one | Partenaire (fournisseur/client) |
| `origin` | String | Document d'origine (PO, SO) |
| `state` | Selection | Etat (draft, waiting, confirmed, assigned, done, cancel) |
| `picking_type_id` | Many2one | Type d'operation |
| `move_ids_without_package` | One2many | Liste des mouvements |

### 6. stock.quant (Quantites en Stock)

Stock reel par emplacement et lot.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Integer | Identifiant unique |
| `product_id` | Many2one | Produit |
| `location_id` | Many2one | Emplacement |
| `lot_id` | Many2one | Lot/Numero de serie |
| `quantity` | Float | Quantite en stock |
| `reserved_quantity` | Float | Quantite reservee |
| `available_quantity` | Float | = quantity - reserved_quantity |

### 7. stock.lot (Lots et Numeros de Serie)

Tracabilite par lot.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Integer | Identifiant unique |
| `name` | String | Numero de lot/serie |
| `product_id` | Many2one | Produit |
| `expiration_date` | Date | Date d'expiration |
| `use_date` | Date | Date limite d'utilisation |
| `removal_date` | Date | Date de retrait |
| `alert_date` | Date | Date d'alerte |

---

## Fonctionnalites implementees

### 1. Affichage de l'inventaire
- Liste des produits avec stock, valeur, statut
- Recherche et filtres
- Tri par colonne
- 3 vues: Inventaire, Odoo, Pivot

### 2. Fiche produit detaillee
- Informations generales
- Stock actuel et virtuel
- CUMP calcule dynamiquement
- Valeur du stock

### 3. Historique des mouvements
- Liste complete des entrees/sorties
- Date, quantite, prix, etat
- **Edition du prix unitaire** avec recalcul CUMP

### 4. Entrees/Sorties manuelles
- Creation de mouvements de stock
- Choix du type (entree/sortie)
- Date, quantite, prix, reference

### 5. Mode historique
- Visualisation du stock a une date passee
- Calcul retroactif du CUMP

### 6. Tableau croise dynamique
- Donnees Excel importees
- Ou donnees ODOO en direct
- Export CSV

---

## Modifications recentes

### Session actuelle (Janvier 2026)

1. **Amelioration de la gestion des erreurs**
   - Ajout de logs detailles dans `callOdoo()` pour tracer les appels API
   - Messages d'erreur plus explicites (au lieu de messages generiques)
   - Detection des credentials manquants avec message clair

2. **Amelioration du proxy server**
   - Meilleur parsing des erreurs ODOO
   - Log du modele et de la methode qui echoue
   - Affichage du message d'erreur ODOO complet

3. **Integration Tableau Croise Dynamique**
   - Conversion Excel vers JSON
   - Composant PivotTableView
   - Toggle entre donnees Excel et ODOO live

4. **Documentation**
   - MODIFICATION_PRIX_ODOO.md
   - Cette documentation technique

---

## Guide de depannage

### Erreur "Invalid URL"
**Cause:** L'URL ODOO n'est pas configuree ou mal formatee.
**Solution:** Dans les parametres, verifiez que l'URL commence par `http://` ou `https://`

### Erreur "Configuration ODOO incomplete"
**Cause:** Un ou plusieurs champs sont vides dans les parametres.
**Solution:** Remplissez tous les champs: URL, Base de donnees, Username, API Key

### Erreur "Impossible de se connecter au proxy local"
**Cause:** Le proxy server n'est pas demarre.
**Solution:** Executez `npm run dev` dans le dossier `proxy-server`

### Erreur "Access Denied" ou "Odoo Server Error"
**Cause:** L'API key est invalide ou l'utilisateur n'a pas les droits.
**Solution:**
1. Verifiez que l'API key est correcte
2. Verifiez que l'utilisateur a les droits sur les modules stock

### Le CUMP ne se met pas a jour apres modification du prix
**Cause:** La fonction `updateStockMovePrice` doit mettre a jour 3 modeles.
**Solution:** Verifiez que l'utilisateur API a les droits sur:
- `stock.move` (write)
- `stock.valuation.layer` (write)
- `product.product` (write)

---

## Formules de calcul

### CUMP (Cout Unitaire Moyen Pondere)
```
CUMP = Somme(Valeur de toutes les entrees) / Somme(Quantite de toutes les entrees)
     = Σ(quantity × unit_cost) / Σ(quantity)
```

### Stock a une date
```
Stock(date) = Σ mouvements avec:
  - state = 'done'
  - date <= date_cible
  - location_dest_id = stock interne  →  +qty
  - location_id = stock interne       →  -qty
```

### Valeur du stock
```
Valeur = Stock × CUMP
```

---

## Maintenance

### Pour ajouter un nouveau champ ODOO
1. Ajouter le champ dans le type TypeScript (`types/index.ts`)
2. Ajouter le champ dans la liste `fields` de la fonction `callOdoo`
3. Utiliser le champ dans le composant

### Pour ajouter une nouvelle fonctionnalite
1. Creer la fonction dans `odooService.ts`
2. Creer le composant UI si necessaire
3. Integrer dans `App.tsx`

---

*Documentation generee pour le projet inventory-dashboard*
*Derniere mise a jour: Janvier 2026*
