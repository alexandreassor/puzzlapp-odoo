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
          reject(new Error('Parse error'));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const PRODUCT_CODES = ['11122', 'NMD-44038', '01867', '02499', '04346', '03214', '12910', '01679', 'NMD-04899', '14067'];

async function main() {
  console.log('=== SUPPRESSION FORCEE ===\n');

  const products = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCT_CODES]]
  ], { fields: ['id', 'default_code', 'product_tmpl_id'] });

  console.log('Produits: ' + products.length);
  const productIds = products.map(p => p.id);

  // Supprimer quants
  console.log('\n1. Quants...');
  const quants = await callOdoo('stock.quant', 'search', [[['product_id', 'in', productIds]]]);
  for (const qid of quants) {
    try { await callOdoo('stock.quant', 'unlink', [[qid]]); } catch(e) {}
  }
  console.log('   ' + quants.length + ' traites');

  // Archiver les produits
  console.log('\n2. Archivage produits...');
  for (const p of products) {
    try {
      await callOdoo('product.product', 'write', [[p.id], { active: false }]);
      await callOdoo('product.template', 'write', [[p.product_tmpl_id[0]], { active: false }]);
      console.log('   [' + p.default_code + '] archive');
    } catch(e) {
      console.log('   [' + p.default_code + '] erreur');
    }
  }

  console.log('\n=== VERIFICATION ===');
  const remaining = await callOdoo('product.product', 'search_count', [[['default_code', 'in', PRODUCT_CODES]]]);
  console.log('Produits actifs restants: ' + remaining);
  console.log('\nTermine!');
}

main().catch(err => console.error('ERREUR:', err.message));
