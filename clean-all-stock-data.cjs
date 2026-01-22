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

async function deleteRecords(model, domain = []) {
  const ids = await callOdoo(model, 'search', [domain]);
  if (ids.length === 0) {
    console.log(model + ': 0 enregistrements');
    return 0;
  }

  let deleted = 0;
  for (const id of ids) {
    try {
      // Pour stock.move, mettre en draft d'abord
      if (model === 'stock.move') {
        await callOdoo(model, 'write', [[id], { state: 'draft' }]);
      }
      await callOdoo(model, 'unlink', [[id]]);
      deleted++;
    } catch (err) {
      // Ignorer les erreurs individuelles
    }
  }
  console.log(model + ': ' + deleted + '/' + ids.length + ' supprimes');
  return deleted;
}

async function main() {
  console.log('=== SUPPRESSION DE TOUTES LES DONNEES STOCK ===\n');
  console.log('Instance: ' + ODOO_CONFIG.url);
  console.log('Base: ' + ODOO_CONFIG.db);
  console.log('');

  // 1. Supprimer les mouvements de stock
  console.log('1. Suppression des stock.move...');
  await deleteRecords('stock.move');

  // 2. Supprimer les quants
  console.log('2. Suppression des stock.quant...');
  await deleteRecords('stock.quant');

  // 3. Supprimer les stock.picking (bons de transfert)
  console.log('3. Suppression des stock.picking...');
  const pickings = await callOdoo('stock.picking', 'search', [[]]);
  for (const id of pickings) {
    try {
      await callOdoo('stock.picking', 'write', [[id], { state: 'draft' }]);
      await callOdoo('stock.picking', 'unlink', [[id]]);
    } catch (e) {}
  }
  console.log('stock.picking: ' + pickings.length + ' traites');

  // 4. Supprimer les produits crees (codes specifiques)
  console.log('4. Suppression des produits crees...');
  const productCodes = ['11122', 'NMD-44038', '01867', '02499', '04346', '03214', '12910', '01679', 'NMD-04899', '14067'];

  const products = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', productCodes]]
  ], { fields: ['id', 'product_tmpl_id'] });

  let prodDeleted = 0;
  for (const p of products) {
    try {
      // Supprimer la variante
      await callOdoo('product.product', 'unlink', [[p.id]]);
      // Supprimer le template
      if (p.product_tmpl_id) {
        await callOdoo('product.template', 'unlink', [[p.product_tmpl_id[0]]]);
      }
      prodDeleted++;
    } catch (e) {
      console.log('  Erreur suppression produit ' + p.id + ': ' + e.message);
    }
  }
  console.log('product.product: ' + prodDeleted + '/' + products.length + ' supprimes');

  // 5. Verification
  console.log('\n=== VERIFICATION ===\n');

  const remainingMoves = await callOdoo('stock.move', 'search_count', [[]]);
  const remainingQuants = await callOdoo('stock.quant', 'search_count', [[]]);
  const remainingProducts = await callOdoo('product.product', 'search_count', [
    [['default_code', 'in', productCodes]]
  ]);

  console.log('stock.move restants: ' + remainingMoves);
  console.log('stock.quant restants: ' + remainingQuants);
  console.log('Produits test restants: ' + remainingProducts);

  console.log('\n=== NETTOYAGE TERMINE ===');
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
