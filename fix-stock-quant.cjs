const http = require('http');

// ============================================
// CREDENTIALS ODOO
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

// Produits cibles
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
  console.log('=== CORRECTION DU STOCK VIA STOCK.QUANT ===\n');

  // 1. Recuperer l'emplacement stock interne
  const locations = await callOdoo('stock.location', 'search_read', [[['usage', '=', 'internal']]], {
    fields: ['id', 'name', 'complete_name'],
    limit: 10
  });

  console.log('Emplacements internes:');
  locations.forEach(l => console.log('  ' + l.id + ': ' + l.complete_name));

  const stockLoc = locations.find(l => l.name === 'Stock' || l.complete_name.includes('WH/Stock')) || locations[0];
  console.log('\nUtilisation: ' + stockLoc.id + ' (' + stockLoc.complete_name + ')\n');

  // 2. Verifier les champs disponibles sur product.product pour le type
  console.log('=== ANALYSE DES PRODUITS EXISTANTS ===\n');

  const existingProducts = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'name', 'default_code', 'type', 'qty_available', 'product_tmpl_id']
  });

  console.log('Produits trouves: ' + existingProducts.length);

  for (const prod of existingProducts) {
    console.log('  ID=' + prod.id + ' [' + prod.default_code + '] type=' + prod.type + ' stock=' + prod.qty_available);
  }

  // 3. Essayer de changer le type des produits en 'product' (stockable)
  console.log('\n=== TENTATIVE CONVERSION EN PRODUIT STOCKABLE ===\n');

  for (const prod of existingProducts) {
    try {
      // Essayer via product.template (le type est defini sur le template)
      const tmplId = prod.product_tmpl_id[0];

      await callOdoo('product.template', 'write', [[tmplId], {
        type: 'product'  // 'product' = stockable, 'consu' = consumable, 'service' = service
      }]);

      console.log('[' + prod.default_code + '] Template ' + tmplId + ' converti en type=product');
    } catch (err) {
      console.log('[' + prod.default_code + '] Erreur conversion: ' + err.message);

      // Essayer avec detailed_type si type ne marche pas
      try {
        const tmplId = prod.product_tmpl_id[0];
        await callOdoo('product.template', 'write', [[tmplId], {
          detailed_type: 'product'
        }]);
        console.log('[' + prod.default_code + '] Converti via detailed_type');
      } catch (err2) {
        console.log('[' + prod.default_code + '] Erreur detailed_type: ' + err2.message);
      }
    }
  }

  // 4. Verifier le nouveau type
  console.log('\n=== VERIFICATION APRES CONVERSION ===\n');

  const updatedProducts = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'default_code', 'type', 'qty_available']
  });

  for (const prod of updatedProducts) {
    const target = PRODUCTS.find(p => p.code === prod.default_code);
    const status = prod.type === 'product' ? 'OK' : 'CONSU';
    console.log('[' + status + '] ' + prod.default_code + ' type=' + prod.type + ' stock=' + prod.qty_available + ' (cible: ' + (target?.qty || '?') + ')');
  }

  // 5. Si le type est maintenant 'product', creer/mettre a jour les stock.quant
  console.log('\n=== CREATION DES STOCK.QUANT ===\n');

  for (const prod of updatedProducts) {
    if (prod.type !== 'product') {
      console.log('[' + prod.default_code + '] Ignore - pas stockable');
      continue;
    }

    const target = PRODUCTS.find(p => p.code === prod.default_code);
    if (!target) continue;

    try {
      // Verifier si un quant existe deja
      const existingQuant = await callOdoo('stock.quant', 'search_read', [
        [['product_id', '=', prod.id], ['location_id', '=', stockLoc.id]]
      ], { fields: ['id', 'quantity'], limit: 1 });

      if (existingQuant.length > 0) {
        // Mettre a jour le quant existant
        await callOdoo('stock.quant', 'write', [[existingQuant[0].id], {
          quantity: target.qty
        }]);
        console.log('[' + prod.default_code + '] Quant mis a jour: ' + target.qty);
      } else {
        // Creer un nouveau quant
        const quantId = await callOdoo('stock.quant', 'create', [{
          product_id: prod.id,
          location_id: stockLoc.id,
          quantity: target.qty
        }]);
        console.log('[' + prod.default_code + '] Quant cree (id=' + quantId + '): ' + target.qty);
      }
    } catch (err) {
      console.log('[' + prod.default_code + '] Erreur quant: ' + err.message);
    }
  }

  // 6. Verification finale
  console.log('\n=== VERIFICATION FINALE ===\n');

  const finalProducts = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'default_code', 'qty_available']
  });

  let success = 0, fail = 0;
  for (const prod of finalProducts) {
    const target = PRODUCTS.find(p => p.code === prod.default_code);
    const match = target && Math.abs(prod.qty_available - target.qty) < 0.01;
    if (match) success++;
    else fail++;
    console.log((match ? 'OK' : 'X ') + ' [' + prod.default_code + '] Stock: ' + prod.qty_available + ' (cible: ' + (target?.qty || '?') + ')');
  }

  console.log('\nResultat: ' + success + ' OK, ' + fail + ' erreurs');
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
