const http = require('http');

// ============================================
// CREDENTIALS ODOO - A REMPLIR
// ============================================
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

// Produits a creer avec leur stock cible (10 premiers du fichier Excel)
const PRODUCTS_TO_CREATE = [
  { code: '11122', name: 'FUZION Poignées HEX Black Red', qty: 741, price: 5 },
  { code: 'NMD-44038', name: 'HADES Roulement ABEC7', qty: 697, price: 8 },
  { code: '01867', name: 'BLUNT Axe de roue et Boulon', qty: 685, price: 3 },
  { code: '02499', name: 'ETHIC Poignee FOAM Mousse Noir', qty: 665, price: 6 },
  { code: '04346', name: 'GROUND CONTROL H-Block FORMULA 1 FLAT Blanc', qty: 624, price: 12 },
  { code: '03214', name: 'NOMADESHOP GRIP CYBORG vert', qty: 606, price: 4 },
  { code: '12910', name: 'BLUNT Roue Delux 120mm Jaune', qty: 416, price: 25 },
  { code: '01679', name: 'Nano Roue F SERIE 76mm', qty: 409, price: 18 },
  { code: 'NMD-04899', name: 'TSG Casque EVO WMN Solid Colors Satin Sakura', qty: 400, price: 45 },
  { code: '14067', name: 'CHAYA Platine SHARI STANDARD 20° Noir', qty: 399, price: 35 },
];

async function main() {
  console.log('=== CREATION DES PRODUITS ET MOUVEMENTS ===\n');

  // 1. Recuperer les emplacements
  const locations = await callOdoo('stock.location', 'search_read', [[]], {
    fields: ['id', 'name', 'usage'],
    limit: 100
  });

  const supplierLoc = locations.find(l => l.usage === 'supplier') || { id: 4 };
  const stockLoc = locations.find(l => l.usage === 'internal') || { id: 8 };

  console.log('Emplacements: Fournisseur=' + supplierLoc.id + ', Stock=' + stockLoc.id);
  console.log('');

  // 2. Creer les produits et les mouvements
  let successProd = 0, successMove = 0, errors = 0;

  for (const item of PRODUCTS_TO_CREATE) {
    try {
      // Verifier si le produit existe deja
      const existing = await callOdoo('product.product', 'search_read', [
        [['default_code', '=', item.code]]
      ], { fields: ['id'], limit: 1 });

      let productId;

      if (existing.length > 0) {
        productId = existing[0].id;
        console.log('[' + item.code + '] Produit existe deja (id=' + productId + ')');
      } else {
        // Creer le produit (sans type, ODOO choisira le defaut)
        productId = await callOdoo('product.product', 'create', [{
          name: item.name,
          default_code: item.code,
          standard_price: item.price,
          list_price: item.price * 1.5
        }]);
        console.log('[' + item.code + '] Produit cree (id=' + productId + ')');
        successProd++;
      }

      // Creer le mouvement d'achat directement valide
      const moveId = await callOdoo('stock.move', 'create', [{
        product_id: productId,
        product_uom_qty: item.qty,
        quantity: item.qty,
        product_uom: 1,
        location_id: supplierLoc.id,
        location_dest_id: stockLoc.id,
        price_unit: item.price,
        state: 'done'
      }]);

      console.log('  -> Mouvement ACHAT ' + item.qty + ' unites cree (move_id=' + moveId + ')');
      successMove++;

    } catch (err) {
      console.log('[' + item.code + '] ERREUR: ' + err.message);
      errors++;
    }
  }

  console.log('\n=== RESULTAT ===');
  console.log('Produits crees:', successProd);
  console.log('Mouvements crees:', successMove);
  console.log('Erreurs:', errors);

  // Verification
  console.log('\n=== VERIFICATION ===');
  for (const item of PRODUCTS_TO_CREATE.slice(0, 5)) {
    const prod = await callOdoo('product.product', 'search_read', [
      [['default_code', '=', item.code]]
    ], { fields: ['qty_available'], limit: 1 });

    if (prod.length > 0) {
      const match = Math.abs(prod[0].qty_available - item.qty) < 0.01 ? '✓' : '✗';
      console.log(match + ' [' + item.code + '] Stock: ' + prod[0].qty_available + ' (cible: ' + item.qty + ')');
    }
  }
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
