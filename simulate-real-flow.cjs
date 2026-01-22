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

// 10 produits avec historique simple (max 10 mouvements chacun)
const PRODUCTS = [
  { code: '11122', name: 'FUZION Poignees HEX Black Red', price: 5, movements: [
    { type: 'in', qty: 500 },
    { type: 'out', qty: 50 },
    { type: 'in', qty: 300 },
    { type: 'out', qty: 80 },
    { type: 'out', qty: 60 },
  ]},
  { code: 'NMD-44038', name: 'HADES Roulement ABEC7', price: 8, movements: [
    { type: 'in', qty: 400 },
    { type: 'out', qty: 30 },
    { type: 'in', qty: 200 },
    { type: 'out', qty: 45 },
  ]},
  { code: '01867', name: 'BLUNT Axe de roue et Boulon', price: 3, movements: [
    { type: 'in', qty: 600 },
    { type: 'out', qty: 100 },
    { type: 'out', qty: 75 },
    { type: 'in', qty: 150 },
  ]},
  { code: '02499', name: 'ETHIC Poignee FOAM Mousse Noir', price: 6, movements: [
    { type: 'in', qty: 350 },
    { type: 'out', qty: 40 },
    { type: 'in', qty: 250 },
    { type: 'out', qty: 60 },
  ]},
  { code: '04346', name: 'GROUND CONTROL H-Block', price: 12, movements: [
    { type: 'in', qty: 300 },
    { type: 'out', qty: 25 },
    { type: 'out', qty: 35 },
    { type: 'in', qty: 100 },
  ]},
  { code: '03214', name: 'NOMADESHOP GRIP CYBORG vert', price: 4, movements: [
    { type: 'in', qty: 450 },
    { type: 'out', qty: 55 },
    { type: 'in', qty: 200 },
    { type: 'out', qty: 70 },
    { type: 'out', qty: 25 },
  ]},
  { code: '12910', name: 'BLUNT Roue Delux 120mm Jaune', price: 25, movements: [
    { type: 'in', qty: 200 },
    { type: 'out', qty: 20 },
    { type: 'in', qty: 150 },
    { type: 'out', qty: 30 },
  ]},
  { code: '01679', name: 'Nano Roue F SERIE 76mm', price: 18, movements: [
    { type: 'in', qty: 250 },
    { type: 'out', qty: 35 },
    { type: 'in', qty: 100 },
    { type: 'out', qty: 40 },
    { type: 'out', qty: 25 },
  ]},
  { code: 'NMD-04899', name: 'TSG Casque EVO WMN Satin Sakura', price: 45, movements: [
    { type: 'in', qty: 100 },
    { type: 'out', qty: 10 },
    { type: 'in', qty: 80 },
    { type: 'out', qty: 15 },
  ]},
  { code: '14067', name: 'CHAYA Platine SHARI STANDARD', price: 35, movements: [
    { type: 'in', qty: 150 },
    { type: 'out', qty: 20 },
    { type: 'in', qty: 100 },
    { type: 'out', qty: 30 },
  ]},
];

async function main() {
  console.log('=== SIMULATION PARCOURS REEL ODOO ===\n');

  // 1. Recuperer les emplacements et types de picking
  const locations = await callOdoo('stock.location', 'search_read', [[]], {
    fields: ['id', 'name', 'usage']
  });
  const supplierLoc = locations.find(l => l.usage === 'supplier');
  const stockLoc = locations.find(l => l.name === 'Stock' && l.usage === 'internal');
  const customerLoc = locations.find(l => l.usage === 'customer');

  console.log('Emplacements: Fournisseur=' + supplierLoc.id + ', Stock=' + stockLoc.id + ', Client=' + customerLoc.id);

  // Types de picking
  const pickingTypes = await callOdoo('stock.picking.type', 'search_read', [[]], {
    fields: ['id', 'name', 'code']
  });
  const incomingType = pickingTypes.find(pt => pt.code === 'incoming');
  const outgoingType = pickingTypes.find(pt => pt.code === 'outgoing');

  console.log('Types: Entrant=' + (incomingType?.id || 'N/A') + ', Sortant=' + (outgoingType?.id || 'N/A'));

  // Verifier les champs de stock.picking
  console.log('\nChamps disponibles sur stock.picking...');
  const pickingFields = await callOdoo('stock.picking', 'fields_get', [], {
    attributes: ['type', 'string']
  });
  const moveFields = Object.keys(pickingFields).filter(f => f.includes('move'));
  console.log('Champs move: ' + moveFields.join(', '));

  // Utiliser les produits existants ou les creer
  console.log('\n=== VERIFICATION/CREATION DES PRODUITS ===\n');

  const createdProducts = {};

  for (const item of PRODUCTS) {
    // Verifier si existe
    const existing = await callOdoo('product.product', 'search_read', [
      [['default_code', '=', item.code]]
    ], { fields: ['id'], limit: 1 });

    if (existing.length > 0) {
      createdProducts[item.code] = existing[0].id;
      console.log('[' + item.code + '] Existe deja (id=' + existing[0].id + ')');
    } else {
      const productId = await callOdoo('product.product', 'create', [{
        name: item.name,
        default_code: item.code,
        standard_price: item.price,
        list_price: item.price * 1.5
      }]);

      // Activer le suivi de stock
      const prod = await callOdoo('product.product', 'search_read', [
        [['id', '=', productId]]
      ], { fields: ['product_tmpl_id'] });

      await callOdoo('product.template', 'write', [[prod[0].product_tmpl_id[0]], {
        is_storable: true
      }]);

      createdProducts[item.code] = productId;
      console.log('[' + item.code + '] Cree (id=' + productId + ')');
    }
  }

  // 3. Creer les mouvements via stock.picking (methode 2 etapes)
  console.log('\n=== CREATION DES MOUVEMENTS ===\n');

  let totalIn = 0, totalOut = 0;

  for (const item of PRODUCTS) {
    const productId = createdProducts[item.code];
    if (!productId) continue;

    console.log('[' + item.code + '] ' + item.movements.length + ' mouvements:');

    for (let i = 0; i < item.movements.length; i++) {
      const mov = item.movements[i];
      const isIn = mov.type === 'in';

      try {
        // Etape 1: Creer le picking vide
        const pickingId = await callOdoo('stock.picking', 'create', [{
          picking_type_id: isIn ? incomingType.id : outgoingType.id,
          location_id: isIn ? supplierLoc.id : stockLoc.id,
          location_dest_id: isIn ? stockLoc.id : customerLoc.id,
          origin: (isIn ? 'ACHAT-' : 'VENTE-') + item.code + '-' + (i + 1)
        }]);

        // Etape 2: Creer le move lie au picking
        const moveId = await callOdoo('stock.move', 'create', [{
          name: item.name,
          product_id: productId,
          product_uom_qty: mov.qty,
          product_uom: 1,
          location_id: isIn ? supplierLoc.id : stockLoc.id,
          location_dest_id: isIn ? stockLoc.id : customerLoc.id,
          picking_id: pickingId
        }]);

        // Etape 3: Confirmer le picking
        await callOdoo('stock.picking', 'action_confirm', [[pickingId]]);

        // Etape 4: Assigner (reserver)
        try {
          await callOdoo('stock.picking', 'action_assign', [[pickingId]]);
        } catch (e) {
          // Ignorer si pas de stock a reserver
        }

        // Etape 5: Mettre la quantite faite
        await callOdoo('stock.move', 'write', [[moveId], {
          quantity: mov.qty
        }]);

        // Etape 6: Valider le picking
        await callOdoo('stock.picking', 'button_validate', [[pickingId]]);

        const symbol = isIn ? '+' : '-';
        console.log('   ' + symbol + mov.qty + ' OK (picking=' + pickingId + ', move=' + moveId + ')');

        if (isIn) totalIn++;
        else totalOut++;

      } catch (err) {
        console.log('   ERREUR: ' + err.message.substring(0, 100));
      }
    }
  }

  console.log('\n=== RESUME ===');
  console.log('Entrees: ' + totalIn);
  console.log('Sorties: ' + totalOut);
  console.log('Total: ' + (totalIn + totalOut));

  // 4. Verification
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
    const match = Math.abs(actual - expected) < 1 ? 'OK' : 'X ';

    console.log(match + ' [' + item.code + '] Stock: ' + actual + ' (attendu: ' + expected + ')');
  }

  console.log('\n=== TERMINE ===');
}

main().catch(err => {
  console.error('ERREUR FATALE:', err.message);
  process.exit(1);
});
