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

const PRODUCT_CODES = ['11122', 'NMD-44038', '01867', '02499', '04346', '03214', '12910', '01679', 'NMD-04899', '14067'];

async function main() {
  console.log('=== VERIFICATION CUMP ET VALORISATION ===\n');

  // 1. Recuperer les produits avec leurs valeurs ODOO
  const products = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCT_CODES]]
  ], {
    fields: ['id', 'name', 'default_code', 'qty_available', 'standard_price', 'categ_id']
  });

  console.log('=== VALEURS ODOO ACTUELLES ===\n');
  console.log('Code       | Stock | Prix ODOO | Valeur ODOO');
  console.log('-----------|-------|-----------|------------');

  let totalOdooValue = 0;
  for (const p of products.sort((a, b) => a.default_code.localeCompare(b.default_code))) {
    const value = p.qty_available * p.standard_price;
    totalOdooValue += value;
    console.log(
      p.default_code.padEnd(10) + ' | ' +
      String(p.qty_available).padStart(5) + ' | ' +
      p.standard_price.toFixed(2).padStart(9) + ' | ' +
      value.toFixed(2).padStart(10)
    );
  }
  console.log('-----------|-------|-----------|------------');
  console.log('TOTAL ODOO                     | ' + totalOdooValue.toFixed(2).padStart(10));

  // 2. Calculer le vrai CUMP basé sur les mouvements
  console.log('\n=== CALCUL REEL DU CUMP (basé sur les mouvements) ===\n');

  let totalCalculatedValue = 0;

  for (const prod of products) {
    // Recuperer tous les mouvements d'entree (achats)
    const purchaseMoves = await callOdoo('stock.move', 'search_read', [
      [
        ['product_id', '=', prod.id],
        ['location_dest_id', '=', 5], // WH/Stock
        ['state', '=', 'done']
      ]
    ], {
      fields: ['quantity', 'price_unit', 'date'],
      order: 'date asc'
    });

    // Recuperer tous les mouvements de sortie (ventes)
    const saleMoves = await callOdoo('stock.move', 'search_read', [
      [
        ['product_id', '=', prod.id],
        ['location_id', '=', 5], // WH/Stock
        ['state', '=', 'done']
      ]
    ], {
      fields: ['quantity', 'price_unit', 'date'],
      order: 'date asc'
    });

    // Combiner et trier par date
    const allMoves = [
      ...purchaseMoves.map(m => ({ ...m, type: 'IN' })),
      ...saleMoves.map(m => ({ ...m, type: 'OUT' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculer le CUMP progressivement
    let stockQty = 0;
    let stockValue = 0;
    let cump = 0;

    for (const move of allMoves) {
      if (move.type === 'IN') {
        // Entree: nouveau CUMP
        stockValue += move.quantity * move.price_unit;
        stockQty += move.quantity;
        cump = stockQty > 0 ? stockValue / stockQty : 0;
      } else {
        // Sortie: on sort au CUMP actuel (pas au prix de vente!)
        const exitValue = move.quantity * cump;
        stockValue -= exitValue;
        stockQty -= move.quantity;
        // Le CUMP reste inchange apres une sortie
      }
    }

    const realCump = cump;
    const realValue = stockQty * realCump;
    totalCalculatedValue += realValue;

    const odooPrice = prod.standard_price;
    const diff = ((realCump - odooPrice) / odooPrice * 100).toFixed(1);

    console.log('[' + prod.default_code + ']');
    console.log('  Entrees: ' + purchaseMoves.length + ' | Sorties: ' + saleMoves.length);
    console.log('  Stock final: ' + stockQty + ' (ODOO: ' + prod.qty_available + ')');
    console.log('  CUMP calcule: ' + realCump.toFixed(2) + ' EUR');
    console.log('  Prix ODOO: ' + odooPrice.toFixed(2) + ' EUR (ecart: ' + diff + '%)');
    console.log('  Valeur calculee: ' + realValue.toFixed(2) + ' EUR');
    console.log('');
  }

  console.log('=== RESUME VALORISATION ===\n');
  console.log('Valeur totale ODOO (standard_price): ' + totalOdooValue.toFixed(2) + ' EUR');
  console.log('Valeur totale calculee (CUMP reel): ' + totalCalculatedValue.toFixed(2) + ' EUR');
  console.log('Ecart: ' + (totalCalculatedValue - totalOdooValue).toFixed(2) + ' EUR');

  // 3. Verifier la methode de cout
  console.log('\n=== METHODE DE COUT CONFIGUREE ===\n');

  const categories = await callOdoo('product.category', 'search_read', [[]], {
    fields: ['id', 'name', 'property_cost_method', 'property_valuation']
  });

  for (const cat of categories) {
    console.log('[' + cat.id + '] ' + cat.name);
    console.log('    Methode: ' + (cat.property_cost_method || 'standard'));
    console.log('    Valorisation: ' + (cat.property_valuation || 'periodic'));
  }

  console.log('\n=== EXPLICATION ===\n');
  console.log('Le standard_price ODOO ne se met PAS a jour automatiquement car:');
  console.log('- La methode de cout est "standard" (prix fixe)');
  console.log('- Pour avoir le CUMP automatique, il faut:');
  console.log('  1. Changer property_cost_method = "average" sur la categorie');
  console.log('  2. Ou mettre a jour standard_price manuellement via API');
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
