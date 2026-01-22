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

// 2 produits avec historique simple
const PRODUCTS = [
  {
    code: 'TEST-001',
    name: 'Produit Test Alpha',
    price: 10,
    movements: [
      { type: 'in', qty: 100 },  // Entree +100
      { type: 'out', qty: 30 },  // Sortie -30
      { type: 'in', qty: 50 },   // Entree +50
      { type: 'out', qty: 20 },  // Sortie -20
    ]
    // Stock attendu: 100 - 30 + 50 - 20 = 100
  },
  {
    code: 'TEST-002',
    name: 'Produit Test Beta',
    price: 25,
    movements: [
      { type: 'in', qty: 200 },  // Entree +200
      { type: 'out', qty: 50 },  // Sortie -50
      { type: 'in', qty: 100 }, // Entree +100
      { type: 'out', qty: 75 },  // Sortie -75
      { type: 'out', qty: 25 },  // Sortie -25
    ]
    // Stock attendu: 200 - 50 + 100 - 75 - 25 = 150
  }
];

async function main() {
  console.log('=== SIMULATION PARCOURS REEL ODOO (2 PRODUITS) ===\n');

  // 1. Recuperer les emplacements
  console.log('1. Recuperation des emplacements...');
  const locations = await callOdoo('stock.location', 'search_read', [[]], {
    fields: ['id', 'name', 'usage']
  });

  const supplierLoc = locations.find(l => l.usage === 'supplier');
  const stockLoc = locations.find(l => l.name === 'Stock' && l.usage === 'internal');
  const customerLoc = locations.find(l => l.usage === 'customer');

  if (!supplierLoc || !stockLoc || !customerLoc) {
    console.error('Emplacements manquants!');
    console.log('Supplier:', supplierLoc);
    console.log('Stock:', stockLoc);
    console.log('Customer:', customerLoc);
    return;
  }

  console.log('   Fournisseur: ' + supplierLoc.id + ' (' + supplierLoc.name + ')');
  console.log('   Stock: ' + stockLoc.id + ' (' + stockLoc.name + ')');
  console.log('   Client: ' + customerLoc.id + ' (' + customerLoc.name + ')');

  // 2. Recuperer les types de picking
  console.log('\n2. Types de picking...');
  const pickingTypes = await callOdoo('stock.picking.type', 'search_read', [[]], {
    fields: ['id', 'name', 'code']
  });

  const incomingType = pickingTypes.find(pt => pt.code === 'incoming');
  const outgoingType = pickingTypes.find(pt => pt.code === 'outgoing');

  console.log('   Entrant: ' + (incomingType?.id || 'N/A') + ' (' + (incomingType?.name || '-') + ')');
  console.log('   Sortant: ' + (outgoingType?.id || 'N/A') + ' (' + (outgoingType?.name || '-') + ')');

  // 3. Creer les produits
  console.log('\n3. Creation des produits...');
  const createdProducts = {};

  for (const item of PRODUCTS) {
    // Verifier si existe
    const existing = await callOdoo('product.product', 'search_read', [
      [['default_code', '=', item.code]]
    ], { fields: ['id'], limit: 1 });

    if (existing.length > 0) {
      createdProducts[item.code] = existing[0].id;
      console.log('   [' + item.code + '] Existe deja (id=' + existing[0].id + ')');
    } else {
      // Creer le produit (ODOO 17+: is_storable au lieu de type='product')
      const productId = await callOdoo('product.product', 'create', [{
        name: item.name,
        default_code: item.code,
        is_storable: true,
        standard_price: item.price,
        list_price: item.price * 1.5
      }]);

      createdProducts[item.code] = productId;
      console.log('   [' + item.code + '] Cree (id=' + productId + ')');
    }
  }

  // 4. Creer les mouvements via stock.picking
  console.log('\n4. Creation des mouvements de stock...\n');

  let totalIn = 0, totalOut = 0;

  for (const item of PRODUCTS) {
    const productId = createdProducts[item.code];
    if (!productId) continue;

    console.log('[' + item.code + '] ' + item.name);
    console.log('   ' + item.movements.length + ' mouvements a creer:');

    for (let i = 0; i < item.movements.length; i++) {
      const mov = item.movements[i];
      const isIn = mov.type === 'in';

      try {
        // Etape 1: Creer le picking
        const pickingId = await callOdoo('stock.picking', 'create', [{
          picking_type_id: isIn ? incomingType.id : outgoingType.id,
          location_id: isIn ? supplierLoc.id : stockLoc.id,
          location_dest_id: isIn ? stockLoc.id : customerLoc.id,
          origin: (isIn ? 'ACHAT-' : 'VENTE-') + item.code + '-' + (i + 1)
        }]);

        // Etape 2: Creer le move lie au picking
        const moveId = await callOdoo('stock.move', 'create', [{
          reference: item.name,
          product_id: productId,
          product_uom_qty: mov.qty,
          product_uom: 1,
          location_id: isIn ? supplierLoc.id : stockLoc.id,
          location_dest_id: isIn ? stockLoc.id : customerLoc.id,
          picking_id: pickingId,
          price_unit: item.price,
          procure_method: 'make_to_stock'
        }]);

        // Etape 3: Confirmer le picking
        await callOdoo('stock.picking', 'action_confirm', [[pickingId]]);

        // Etape 4: Assigner (reserver le stock pour les sorties)
        try {
          await callOdoo('stock.picking', 'action_assign', [[pickingId]]);
        } catch (e) {
          // Ignorer si pas de stock a reserver (normal pour entrees)
        }

        // Etape 5: Mettre la quantite faite sur le move
        await callOdoo('stock.move', 'write', [[moveId], {
          quantity: mov.qty
        }]);

        // Etape 6: Valider le picking
        await callOdoo('stock.picking', 'button_validate', [[pickingId]]);

        const symbol = isIn ? '+' : '-';
        console.log('   ' + symbol + mov.qty + ' OK (picking=' + pickingId + ')');

        if (isIn) totalIn++;
        else totalOut++;

      } catch (err) {
        console.log('   ERREUR: ' + err.message.substring(0, 80));
      }
    }
    console.log('');
  }

  // 5. Resume
  console.log('=== RESUME ===');
  console.log('Entrees creees: ' + totalIn);
  console.log('Sorties creees: ' + totalOut);
  console.log('Total: ' + (totalIn + totalOut));

  // 6. Verification des stocks
  console.log('\n=== VERIFICATION DES STOCKS ===\n');

  for (const item of PRODUCTS) {
    const productId = createdProducts[item.code];
    if (!productId) continue;

    const prod = await callOdoo('product.product', 'search_read', [
      [['id', '=', productId]]
    ], { fields: ['qty_available'] });

    let expected = 0;
    for (const mov of item.movements) {
      expected += mov.type === 'in' ? mov.qty : -mov.qty;
    }

    const actual = prod[0]?.qty_available || 0;
    const match = Math.abs(actual - expected) < 1 ? 'OK' : 'ERREUR';

    console.log('[' + item.code + '] Stock actuel: ' + actual + ' (attendu: ' + expected + ') -> ' + match);
  }

  console.log('\n=== TERMINE ===');
}

main().catch(err => {
  console.error('ERREUR FATALE:', err.message);
  process.exit(1);
});
