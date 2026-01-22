const http = require('http');
const fs = require('fs');

const ODOO_CONFIG = {
  url: 'https://puzzl.odoo.com',
  db: 'puzzl',
  username: 'alexandre.assor.puzzl@gmail.com',
  apiKey: '286f8c1336625ae2e6bc69745cdc6e9903fa11da'
};

function callOdoo(model, method, args = [], kwargs = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      odoo: ODOO_CONFIG,
      body: { model, method, args, kwargs }
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/odoo',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success) resolve(json.data.result);
          else reject(new Error(json.error || 'Erreur API'));
        } catch (e) {
          reject(new Error('Parse error: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Modeles ODOO lies au stock
const STOCK_MODELS = [
  { name: 'product.product', label: 'Produit (Variante)' },
  { name: 'product.template', label: 'Modele de Produit' },
  { name: 'product.category', label: 'Categorie de Produit' },
  { name: 'stock.move', label: 'Mouvement de Stock' },
  { name: 'stock.quant', label: 'Quantite en Stock (Quant)' },
  { name: 'stock.location', label: 'Emplacement de Stock' },
  { name: 'stock.warehouse', label: 'Entrepot' },
  { name: 'stock.picking', label: 'Bon de Transfert/Livraison' },
  { name: 'stock.picking.type', label: 'Type de Transfert' },
  { name: 'stock.lot', label: 'Lot/Numero de Serie' },
];

async function main() {
  console.log('Generation de la documentation ODOO Stock...\n');

  let doc = `# Documentation ODOO - Champs lies aux Stocks

> Documentation generee automatiquement depuis l'instance ODOO Puzzl
> Date: ${new Date().toISOString().split('T')[0]}

---

## Table des matieres

1. [Vue d'ensemble](#vue-densemble)
2. [product.product - Produit](#productproduct---produit-variante)
3. [product.template - Modele de Produit](#producttemplate---modele-de-produit)
4. [product.category - Categorie](#productcategory---categorie-de-produit)
5. [stock.move - Mouvement de Stock](#stockmove---mouvement-de-stock)
6. [stock.quant - Quantite en Stock](#stockquant---quantite-en-stock-quant)
7. [stock.location - Emplacement](#stocklocation---emplacement-de-stock)
8. [stock.warehouse - Entrepot](#stockwarehouse---entrepot)
9. [stock.picking - Bon de Transfert](#stockpicking---bon-de-transfertlivraison)
10. [stock.lot - Lot/Serie](#stocklot---lotnumero-de-serie)
11. [Relations entre modeles](#relations-entre-modeles)
12. [Methodes de cout (CUMP, FIFO, Standard)](#methodes-de-cout)
13. [Exemples d'utilisation API](#exemples-dutilisation-api)

---

## Vue d'ensemble

### Architecture Stock ODOO

\`\`\`
+------------------+     +------------------+     +------------------+
|  product.template|---->|  product.product |---->|   stock.quant    |
|  (Modele)        |     |  (Variante)      |     |  (Qte/Emplacement)|
+------------------+     +------------------+     +------------------+
                                  |                       |
                                  v                       v
                         +------------------+     +------------------+
                         |   stock.move     |     |  stock.location  |
                         |  (Mouvement)     |     |  (Emplacement)   |
                         +------------------+     +------------------+
                                  |
                                  v
                         +------------------+
                         |  stock.picking   |
                         |  (Bon transfert) |
                         +------------------+
\`\`\`

### Types d'emplacements (stock.location.usage)

| Usage | Description | Exemple |
|-------|-------------|---------|
| \`supplier\` | Emplacement virtuel fournisseur | Vendors |
| \`customer\` | Emplacement virtuel client | Customers |
| \`internal\` | Emplacement physique de stockage | WH/Stock |
| \`inventory\` | Emplacement pour ajustements | Inventory Adjustment |
| \`production\` | Emplacement de production | Production |
| \`transit\` | En transit entre entrepots | Transit Location |

---

`;

  // Parcourir chaque modele
  for (const model of STOCK_MODELS) {
    console.log('Analyse de ' + model.name + '...');

    try {
      const fields = await callOdoo(model.name, 'fields_get', [], {
        attributes: ['type', 'string', 'help', 'required', 'readonly', 'selection', 'relation']
      });

      doc += `## ${model.name} - ${model.label}\n\n`;

      // Classer les champs par importance
      const importantFields = [];
      const relationFields = [];
      const otherFields = [];

      for (const [fieldName, fieldDef] of Object.entries(fields)) {
        // Ignorer les champs techniques
        if (fieldName.startsWith('__') || fieldName === 'id') continue;

        const fieldInfo = {
          name: fieldName,
          type: fieldDef.type,
          label: fieldDef.string || fieldName,
          help: fieldDef.help || '',
          required: fieldDef.required || false,
          readonly: fieldDef.readonly || false,
          selection: fieldDef.selection || null,
          relation: fieldDef.relation || null
        };

        // Classer par type
        if (['many2one', 'one2many', 'many2many'].includes(fieldDef.type)) {
          relationFields.push(fieldInfo);
        } else if (isImportantField(fieldName, model.name)) {
          importantFields.push(fieldInfo);
        } else {
          otherFields.push(fieldInfo);
        }
      }

      // Champs importants
      if (importantFields.length > 0) {
        doc += `### Champs principaux\n\n`;
        doc += `| Champ | Type | Label | Requis | Description |\n`;
        doc += `|-------|------|-------|--------|-------------|\n`;
        for (const f of importantFields.sort((a, b) => a.name.localeCompare(b.name))) {
          const req = f.required ? '✓' : '';
          const help = f.help ? f.help.substring(0, 80).replace(/\n/g, ' ') : '';
          doc += `| \`${f.name}\` | ${f.type} | ${f.label} | ${req} | ${help} |\n`;
        }
        doc += '\n';
      }

      // Champs de selection
      const selectionFields = [...importantFields, ...otherFields].filter(f => f.selection);
      if (selectionFields.length > 0) {
        doc += `### Champs de selection (valeurs possibles)\n\n`;
        for (const f of selectionFields) {
          doc += `**${f.name}** (${f.label}):\n`;
          for (const [val, label] of f.selection) {
            doc += `- \`${val}\` = ${label}\n`;
          }
          doc += '\n';
        }
      }

      // Relations
      if (relationFields.length > 0) {
        doc += `### Relations\n\n`;
        doc += `| Champ | Type | Modele lie | Label |\n`;
        doc += `|-------|------|------------|-------|\n`;
        for (const f of relationFields.slice(0, 20).sort((a, b) => a.name.localeCompare(b.name))) {
          doc += `| \`${f.name}\` | ${f.type} | ${f.relation || ''} | ${f.label} |\n`;
        }
        if (relationFields.length > 20) {
          doc += `| ... | ... | ... | (${relationFields.length - 20} autres relations) |\n`;
        }
        doc += '\n';
      }

      doc += '---\n\n';

    } catch (err) {
      doc += `## ${model.name} - ${model.label}\n\n`;
      doc += `*Erreur lors de la recuperation des champs: ${err.message}*\n\n---\n\n`;
    }
  }

  // Ajouter sections supplementaires
  doc += `## Relations entre modeles

### Flux d'un achat (Purchase -> Stock)

\`\`\`
purchase.order (Commande achat)
    |
    v
stock.picking (Bon de reception, picking_type = incoming)
    |
    v
stock.move (Mouvement: Vendors -> WH/Stock)
    |
    v
stock.quant (Mise a jour quantite en stock)
    |
    v
product.product.qty_available (Stock disponible recalcule)
\`\`\`

### Flux d'une vente (Sale -> Stock)

\`\`\`
sale.order (Commande vente)
    |
    v
stock.picking (Bon de livraison, picking_type = outgoing)
    |
    v
stock.move (Mouvement: WH/Stock -> Customers)
    |
    v
stock.quant (Mise a jour quantite)
    |
    v
product.product.qty_available (Stock disponible recalcule)
\`\`\`

### Creation directe de mouvement (sans picking)

\`\`\`javascript
// Possible via API mais n'apparait pas dans Entrants/Sortants
await callOdoo('stock.move', 'create', [{
  product_id: 19,
  product_uom_qty: 100,
  quantity: 100,
  product_uom: 1,
  location_id: 1,      // Vendors (supplier)
  location_dest_id: 5, // WH/Stock (internal)
  state: 'done',
  price_unit: 10.50
}]);
\`\`\`

---

## Methodes de cout

### Configuration (product.category.property_cost_method)

| Methode | Code | Comportement |
|---------|------|--------------|
| **Prix Standard** | \`standard\` | Prix fixe, modifiable manuellement uniquement |
| **Cout Moyen (CUMP)** | \`average\` | Recalcule automatiquement a chaque reception |
| **FIFO** | \`fifo\` | Premier entre, premier sorti |

### Calcul du CUMP (Cout Unitaire Moyen Pondere)

\`\`\`
Nouveau CUMP = (Stock_existant × CUMP_actuel + Quantite_achetee × Prix_achat)
               / (Stock_existant + Quantite_achetee)
\`\`\`

**Exemple:**
- Stock: 100 unites a 10€ (CUMP = 10€)
- Achat: 50 unites a 12€
- Nouveau CUMP = (100 × 10 + 50 × 12) / 150 = 1600 / 150 = **10.67€**

**Important:** Les sorties (ventes) ne modifient PAS le CUMP. Les articles sortent valorises au CUMP actuel.

### Changer la methode de cout

\`\`\`javascript
// Via API
await callOdoo('product.category', 'write', [[1], {
  property_cost_method: 'average'  // ou 'standard', 'fifo'
}]);
\`\`\`

---

## Exemples d'utilisation API

### Creer un produit stockable

\`\`\`javascript
// 1. Creer le produit
const productId = await callOdoo('product.product', 'create', [{
  name: 'Mon Produit',
  default_code: 'PROD001',
  standard_price: 10.00,
  list_price: 15.00
}]);

// 2. Activer le suivi de stock (is_storable)
const product = await callOdoo('product.product', 'search_read', [
  [['id', '=', productId]]
], { fields: ['product_tmpl_id'] });

await callOdoo('product.template', 'write', [[product[0].product_tmpl_id[0]], {
  is_storable: true
}]);
\`\`\`

### Creer un mouvement d'entree (achat)

\`\`\`javascript
await callOdoo('stock.move', 'create', [{
  product_id: productId,
  product_uom_qty: 100,
  quantity: 100,
  product_uom: 1,
  location_id: 1,        // Vendors
  location_dest_id: 5,   // WH/Stock
  state: 'done',
  price_unit: 10.50,
  date: '2025-01-15 10:00:00',
  origin: 'PO-001'
}]);
\`\`\`

### Creer un mouvement de sortie (vente)

\`\`\`javascript
await callOdoo('stock.move', 'create', [{
  product_id: productId,
  product_uom_qty: 30,
  quantity: 30,
  product_uom: 1,
  location_id: 5,        // WH/Stock
  location_dest_id: 2,   // Customers
  state: 'done',
  price_unit: 15.00,
  date: '2025-01-20 14:00:00',
  origin: 'SO-001'
}]);
\`\`\`

### Lire le stock d'un produit

\`\`\`javascript
const product = await callOdoo('product.product', 'search_read', [
  [['default_code', '=', 'PROD001']]
], {
  fields: ['qty_available', 'virtual_available', 'incoming_qty', 'outgoing_qty']
});

console.log('Stock disponible:', product[0].qty_available);
console.log('Stock previsionnel:', product[0].virtual_available);
console.log('Entrees prevues:', product[0].incoming_qty);
console.log('Sorties prevues:', product[0].outgoing_qty);
\`\`\`

### Lire le stock par emplacement

\`\`\`javascript
const quants = await callOdoo('stock.quant', 'search_read', [
  [['product_id', '=', productId]]
], {
  fields: ['location_id', 'quantity', 'reserved_quantity']
});

for (const q of quants) {
  console.log(q.location_id[1] + ': ' + q.quantity + ' (reserve: ' + q.reserved_quantity + ')');
}
\`\`\`

### Ajuster l'inventaire (via stock.quant)

\`\`\`javascript
// Verifier/creer un quant
const existingQuant = await callOdoo('stock.quant', 'search_read', [
  [['product_id', '=', productId], ['location_id', '=', 5]]
], { fields: ['id', 'quantity'], limit: 1 });

if (existingQuant.length > 0) {
  // Mettre a jour
  await callOdoo('stock.quant', 'write', [[existingQuant[0].id], {
    quantity: 500
  }]);
} else {
  // Creer
  await callOdoo('stock.quant', 'create', [{
    product_id: productId,
    location_id: 5,
    quantity: 500
  }]);
}
\`\`\`

---

## Champs calcules importants (product.product)

| Champ | Description |
|-------|-------------|
| \`qty_available\` | Stock physique disponible (somme des quants) |
| \`virtual_available\` | Stock previsionnel (disponible + entrees - sorties prevues) |
| \`incoming_qty\` | Quantite en cours de reception |
| \`outgoing_qty\` | Quantite en cours d'expedition |
| \`free_qty\` | Quantite libre (disponible - reserve) |

---

## Notes importantes

1. **stock.move vs stock.picking**: Les \`stock.move\` sont les mouvements unitaires, les \`stock.picking\` regroupent plusieurs mouvements (un bon de livraison peut contenir plusieurs lignes).

2. **Emplacements virtuels**: Les emplacements \`supplier\` et \`customer\` sont virtuels - ils n'existent pas physiquement mais servent a tracer les entrees/sorties.

3. **state des mouvements**: Un mouvement passe par \`draft\` -> \`confirmed\` -> \`assigned\` -> \`done\`. Via API, on peut creer directement en \`done\`.

4. **is_storable**: Sans ce flag a \`true\`, le produit est considere comme consommable et le stock n'est pas tracke.

5. **API vs Interface**: L'API permet de contourner certaines validations de l'interface (mouvements verrouilles, prix, etc.) car elle fait confiance au developpeur.

---

*Documentation generee automatiquement - ${new Date().toISOString()}*
`;

  // Sauvegarder le fichier
  fs.writeFileSync('ODOO_STOCK_DOCUMENTATION.md', doc);
  console.log('\nDocumentation sauvegardee: ODOO_STOCK_DOCUMENTATION.md');
  console.log('Taille: ' + Math.round(doc.length / 1024) + ' Ko');
}

function isImportantField(fieldName, modelName) {
  const importantByModel = {
    'product.product': ['name', 'default_code', 'barcode', 'type', 'categ_id', 'standard_price', 'list_price', 'qty_available', 'virtual_available', 'incoming_qty', 'outgoing_qty', 'free_qty', 'uom_id', 'is_storable', 'tracking', 'active'],
    'product.template': ['name', 'default_code', 'type', 'categ_id', 'standard_price', 'list_price', 'is_storable', 'tracking', 'uom_id', 'active'],
    'product.category': ['name', 'parent_id', 'property_cost_method', 'property_valuation'],
    'stock.move': ['product_id', 'product_uom_qty', 'quantity', 'product_uom', 'location_id', 'location_dest_id', 'state', 'date', 'price_unit', 'origin', 'reference', 'picking_id'],
    'stock.quant': ['product_id', 'location_id', 'quantity', 'reserved_quantity', 'lot_id', 'package_id'],
    'stock.location': ['name', 'complete_name', 'usage', 'parent_id', 'warehouse_id', 'active'],
    'stock.warehouse': ['name', 'code', 'partner_id', 'lot_stock_id'],
    'stock.picking': ['name', 'partner_id', 'picking_type_id', 'location_id', 'location_dest_id', 'state', 'scheduled_date', 'date_done', 'origin'],
    'stock.picking.type': ['name', 'code', 'sequence_code', 'warehouse_id', 'default_location_src_id', 'default_location_dest_id'],
    'stock.lot': ['name', 'product_id', 'expiration_date', 'use_date', 'removal_date', 'alert_date']
  };

  return (importantByModel[modelName] || []).includes(fieldName);
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
