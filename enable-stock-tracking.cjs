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

// Produits cibles avec leurs stocks
const PRODUCTS = [
  { code: '11122', qty: 741 },
  { code: 'NMD-44038', qty: 697 },
  { code: '01867', qty: 685 },
  { code: '02499', qty: 665 },
  { code: '04346', qty: 624 },
  { code: '03214', qty: 606 },
  { code: '12910', qty: 416 },
  { code: '01679', qty: 409 },
  { code: 'NMD-04899', qty: 400 },
  { code: '14067', qty: 399 },
];

async function main() {
  console.log('=== ACTIVATION DU SUIVI D\'INVENTAIRE ===\n');

  // 1. Recuperer les produits
  const products = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'name', 'default_code', 'is_storable', 'product_tmpl_id']
  });

  console.log('Produits trouves: ' + products.length + '\n');

  // 2. Activer is_storable sur chaque template
  console.log('=== ETAPE 1: ACTIVER IS_STORABLE ===\n');

  for (const prod of products) {
    const tmplId = prod.product_tmpl_id[0];
    try {
      await callOdoo('product.template', 'write', [[tmplId], {
        is_storable: true
      }]);
      console.log('[' + prod.default_code + '] is_storable active sur template ' + tmplId);
    } catch (err) {
      console.log('[' + prod.default_code + '] Erreur: ' + err.message);
    }
  }

  // 3. Verifier que is_storable est bien active
  console.log('\n=== VERIFICATION IS_STORABLE ===\n');

  const updatedProducts = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'default_code', 'is_storable', 'type', 'qty_available']
  });

  for (const prod of updatedProducts) {
    console.log('[' + prod.default_code + '] is_storable=' + prod.is_storable + ' type=' + prod.type + ' stock=' + prod.qty_available);
  }

  // 4. Creer les stock.quant
  console.log('\n=== ETAPE 2: CREATION DES STOCK.QUANT ===\n');

  const stockLocId = 5; // WH/Stock

  for (const prod of updatedProducts) {
    if (!prod.is_storable) {
      console.log('[' + prod.default_code + '] Ignore - pas storable');
      continue;
    }

    const target = PRODUCTS.find(p => p.code === prod.default_code);
    if (!target) continue;

    try {
      // Verifier si un quant existe deja
      const existingQuants = await callOdoo('stock.quant', 'search_read', [
        [['product_id', '=', prod.id], ['location_id', '=', stockLocId]]
      ], { fields: ['id', 'quantity'], limit: 1 });

      if (existingQuants.length > 0) {
        // Mettre a jour
        await callOdoo('stock.quant', 'write', [[existingQuants[0].id], {
          quantity: target.qty
        }]);
        console.log('[' + prod.default_code + '] Quant mis a jour: ' + existingQuants[0].quantity + ' -> ' + target.qty);
      } else {
        // Creer
        const quantId = await callOdoo('stock.quant', 'create', [{
          product_id: prod.id,
          location_id: stockLocId,
          quantity: target.qty
        }]);
        console.log('[' + prod.default_code + '] Quant cree (id=' + quantId + '): ' + target.qty);
      }
    } catch (err) {
      console.log('[' + prod.default_code + '] Erreur quant: ' + err.message);
    }
  }

  // 5. Verification finale
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
    console.log(status + ' [' + prod.default_code + '] ' + prod.name.substring(0, 30));
    console.log('    Stock: ' + prod.qty_available + ' | Cible: ' + (target?.qty || '?'));
  }

  console.log('\n=============================');
  console.log('RESULTAT: ' + success + '/10 produits avec stock correct');
  if (fail > 0) {
    console.log('Erreurs: ' + fail);
  } else {
    console.log('TOUS LES STOCKS CORRESPONDENT AUX CIBLES!');
  }
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
