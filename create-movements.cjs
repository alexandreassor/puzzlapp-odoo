const http = require('http');

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

// Produits avec stock cible - on va simuler achats et ventes
const PRODUCTS = [
  { code: '11122', qty: 741, purchaseQty: 1000, saleQty: 259 },
  { code: 'NMD-44038', qty: 697, purchaseQty: 900, saleQty: 203 },
  { code: '01867', qty: 685, purchaseQty: 850, saleQty: 165 },
  { code: '02499', qty: 665, purchaseQty: 800, saleQty: 135 },
  { code: '04346', qty: 624, purchaseQty: 750, saleQty: 126 },
  { code: '03214', qty: 606, purchaseQty: 720, saleQty: 114 },
  { code: '12910', qty: 416, purchaseQty: 500, saleQty: 84 },
  { code: '01679', qty: 409, purchaseQty: 500, saleQty: 91 },
  { code: 'NMD-04899', qty: 400, purchaseQty: 480, saleQty: 80 },
  { code: '14067', qty: 399, purchaseQty: 480, saleQty: 81 },
];

async function main() {
  console.log('=== CREATION DES MOUVEMENTS ACHAT/VENTE ===\n');

  // 1. Recuperer les emplacements
  const locations = await callOdoo('stock.location', 'search_read', [[]], {
    fields: ['id', 'name', 'usage', 'complete_name'],
    limit: 50
  });

  const supplierLoc = locations.find(l => l.usage === 'supplier');
  const stockLoc = locations.find(l => l.usage === 'internal' && l.name === 'Stock');
  const customerLoc = locations.find(l => l.usage === 'customer');

  console.log('Emplacements:');
  console.log('  Fournisseur: ' + supplierLoc.id + ' (' + supplierLoc.complete_name + ')');
  console.log('  Stock: ' + stockLoc.id + ' (' + stockLoc.complete_name + ')');
  console.log('  Client: ' + customerLoc.id + ' (' + customerLoc.complete_name + ')');

  // 2. Supprimer les quants existants pour repartir de zero
  console.log('\n=== REMISE A ZERO DES QUANTS ===\n');

  const existingQuants = await callOdoo('stock.quant', 'search_read', [
    [['location_id', '=', stockLoc.id]]
  ], { fields: ['id', 'product_id', 'quantity'] });

  for (const quant of existingQuants) {
    try {
      await callOdoo('stock.quant', 'unlink', [[quant.id]]);
      console.log('Quant ' + quant.id + ' supprime');
    } catch (err) {
      // Si on ne peut pas supprimer, mettre a zero
      await callOdoo('stock.quant', 'write', [[quant.id], { quantity: 0 }]);
      console.log('Quant ' + quant.id + ' mis a zero');
    }
  }

  // 3. Recuperer les produits
  const products = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'name', 'default_code', 'uom_id']
  });

  console.log('\n=== CREATION DES MOUVEMENTS ===\n');

  let purchaseCount = 0, saleCount = 0, errors = 0;

  for (const item of PRODUCTS) {
    const prod = products.find(p => p.default_code === item.code);
    if (!prod) {
      console.log('[' + item.code + '] Produit non trouve!');
      errors++;
      continue;
    }

    const uomId = prod.uom_id ? prod.uom_id[0] : 1;

    try {
      // ACHAT: Fournisseur -> Stock
      const purchaseMoveId = await callOdoo('stock.move', 'create', [{
        product_id: prod.id,
        product_uom_qty: item.purchaseQty,
        quantity: item.purchaseQty,
        product_uom: uomId,
        location_id: supplierLoc.id,
        location_dest_id: stockLoc.id,
        state: 'done',
        origin: 'ACHAT-INIT-' + item.code
      }]);
      console.log('[' + item.code + '] ACHAT +' + item.purchaseQty + ' (move=' + purchaseMoveId + ')');
      purchaseCount++;

      // VENTE: Stock -> Client
      const saleMoveId = await callOdoo('stock.move', 'create', [{
        product_id: prod.id,
        product_uom_qty: item.saleQty,
        quantity: item.saleQty,
        product_uom: uomId,
        location_id: stockLoc.id,
        location_dest_id: customerLoc.id,
        state: 'done',
        origin: 'VENTE-INIT-' + item.code
      }]);
      console.log('[' + item.code + '] VENTE -' + item.saleQty + ' (move=' + saleMoveId + ')');
      saleCount++;

      console.log('    -> Stock attendu: ' + item.purchaseQty + ' - ' + item.saleQty + ' = ' + item.qty);

    } catch (err) {
      console.log('[' + item.code + '] ERREUR: ' + err.message);
      errors++;
    }
  }

  console.log('\n=== RESULTAT ===');
  console.log('Mouvements ACHAT: ' + purchaseCount);
  console.log('Mouvements VENTE: ' + saleCount);
  console.log('Erreurs: ' + errors);

  // 4. Verification finale
  console.log('\n=== VERIFICATION FINALE ===\n');

  const finalProducts = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'default_code', 'name', 'qty_available']
  });

  let success = 0, fail = 0;
  for (const prod of finalProducts) {
    const target = PRODUCTS.find(p => p.code === prod.default_code);
    const match = target && Math.abs(prod.qty_available - target.qty) < 0.01;
    if (match) success++;
    else fail++;
    const status = match ? 'OK' : 'X ';
    console.log(status + ' [' + prod.default_code + '] Stock: ' + prod.qty_available + ' (cible: ' + target?.qty + ')');
  }

  console.log('\n=============================');
  console.log('RESULTAT: ' + success + '/10 stocks corrects');

  // 5. Afficher les mouvements crees
  console.log('\n=== MOUVEMENTS DANS ODOO ===\n');
  const moves = await callOdoo('stock.move', 'search_read', [
    [['origin', 'like', '-INIT-']]
  ], {
    fields: ['id', 'product_id', 'quantity', 'location_id', 'location_dest_id', 'state', 'origin'],
    order: 'id desc',
    limit: 25
  });

  console.log('Derniers mouvements:');
  for (const m of moves.slice(0, 10)) {
    const type = m.location_id[1].includes('Vendor') ? 'ACHAT' : 'VENTE';
    console.log('  ' + type + ' | ' + m.product_id[1].substring(0, 25) + ' | qty=' + m.quantity + ' | ' + m.origin);
  }
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
