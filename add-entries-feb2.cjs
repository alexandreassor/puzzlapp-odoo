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
          reject(new Error('Parse error: ' + data.substring(0, 300)));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Date cible: 2 fevrier 2025
const TARGET_DATE = '2025-02-02 10:00:00';

// Memes produits avec nouvelles entrees
const ENTRIES = [
  { code: 'TEST-001', qty: 100, price: 10 },
  { code: 'TEST-002', qty: 200, price: 25 }
];

async function main() {
  console.log('=== CREATION ENTREES AU 2 FEVRIER 2025 ===\n');

  // 1. Recuperer les emplacements
  const locations = await callOdoo('stock.location', 'search_read', [[]], {
    fields: ['id', 'name', 'usage']
  });

  const supplierLoc = locations.find(l => l.usage === 'supplier');
  const stockLoc = locations.find(l => l.name === 'Stock' && l.usage === 'internal');

  console.log('Fournisseur: ' + supplierLoc.id + ', Stock: ' + stockLoc.id);

  // 2. Type de picking entrant
  const pickingTypes = await callOdoo('stock.picking.type', 'search_read', [
    [['code', '=', 'incoming']]
  ], { fields: ['id', 'name'], limit: 1 });

  const incomingType = pickingTypes[0];
  console.log('Type entrant: ' + incomingType.id + ' (' + incomingType.name + ')');

  // 3. Creer les entrees
  console.log('\n--- Creation des entrees ---\n');

  for (const entry of ENTRIES) {
    // Trouver le produit
    const products = await callOdoo('product.product', 'search_read', [
      [['default_code', '=', entry.code]]
    ], { fields: ['id', 'name'], limit: 1 });

    if (products.length === 0) {
      console.log('[' + entry.code + '] Produit non trouve!');
      continue;
    }

    const product = products[0];
    console.log('[' + entry.code + '] ' + product.name);

    try {
      // Creer le picking avec la date
      const pickingId = await callOdoo('stock.picking', 'create', [{
        picking_type_id: incomingType.id,
        location_id: supplierLoc.id,
        location_dest_id: stockLoc.id,
        origin: 'ENTREE-FEV-' + entry.code,
        scheduled_date: TARGET_DATE
      }]);

      // Creer le move
      const moveId = await callOdoo('stock.move', 'create', [{
        reference: 'Entree ' + entry.code + ' - 02/02/2025',
        product_id: product.id,
        product_uom_qty: entry.qty,
        product_uom: 1,
        location_id: supplierLoc.id,
        location_dest_id: stockLoc.id,
        picking_id: pickingId,
        price_unit: entry.price,
        procure_method: 'make_to_stock',
        date: TARGET_DATE
      }]);

      // Confirmer
      await callOdoo('stock.picking', 'action_confirm', [[pickingId]]);

      // Assigner
      try {
        await callOdoo('stock.picking', 'action_assign', [[pickingId]]);
      } catch (e) {}

      // Mettre la quantite
      await callOdoo('stock.move', 'write', [[moveId], {
        quantity: entry.qty
      }]);

      // Valider
      await callOdoo('stock.picking', 'button_validate', [[pickingId]]);

      // Forcer la date sur le move valide
      await callOdoo('stock.move', 'write', [[moveId], {
        date: TARGET_DATE
      }]);

      console.log('   +' + entry.qty + ' @ ' + entry.price + ' EUR -> OK (picking=' + pickingId + ')');

    } catch (err) {
      console.log('   ERREUR: ' + err.message.substring(0, 80));
    }
  }

  // 4. Verification
  console.log('\n=== VERIFICATION ===\n');

  for (const entry of ENTRIES) {
    const products = await callOdoo('product.product', 'search_read', [
      [['default_code', '=', entry.code]]
    ], { fields: ['id', 'qty_available'], limit: 1 });

    if (products.length > 0) {
      console.log('[' + entry.code + '] Stock: ' + products[0].qty_available);
    }
  }

  console.log('\n=== TERMINE ===');
}

main().catch(err => {
  console.error('ERREUR FATALE:', err.message);
  process.exit(1);
});
