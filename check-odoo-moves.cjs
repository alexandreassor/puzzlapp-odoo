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

async function main() {
  console.log('=== VERIFICATION DES MOUVEMENTS DANS ODOO ===\n');

  // 1. Compter les mouvements totaux
  const allMoves = await callOdoo('stock.move', 'search_count', [[]]);
  console.log('Total mouvements dans ODOO: ' + allMoves);

  // 2. Mouvements pour le produit 11122
  const prod = await callOdoo('product.product', 'search_read', [
    [['default_code', '=', '11122']]
  ], { fields: ['id', 'name'], limit: 1 });

  if (prod.length === 0) {
    console.log('Produit 11122 non trouve!');
    return;
  }

  console.log('\nProduit: ' + prod[0].name + ' (ID: ' + prod[0].id + ')');

  // 3. Lister les mouvements de ce produit
  const moves = await callOdoo('stock.move', 'search_read', [
    [['product_id', '=', prod[0].id]]
  ], {
    fields: ['id', 'date', 'quantity', 'price_unit', 'location_id', 'location_dest_id', 'state', 'origin'],
    order: 'date asc'
  });

  console.log('\nMouvements pour 11122 (' + moves.length + ' total):\n');
  console.log('Date                | Type  | Qte  | Prix   | Origin');
  console.log('--------------------|-------|------|--------|------------------');

  for (const m of moves.slice(0, 20)) {
    const isIn = m.location_dest_id[1].includes('Stock');
    const type = isIn ? 'IN ' : 'OUT';
    console.log(
      m.date.substring(0, 16).padEnd(19) + ' | ' +
      type + '   | ' +
      String(m.quantity).padStart(4) + ' | ' +
      (m.price_unit || 0).toFixed(2).padStart(6) + ' | ' +
      (m.origin || '').substring(0, 18)
    );
  }

  if (moves.length > 20) {
    console.log('... et ' + (moves.length - 20) + ' autres mouvements');
  }

  // 4. Repartition par mois
  console.log('\n=== REPARTITION PAR MOIS (tous produits) ===\n');

  const allMovesData = await callOdoo('stock.move', 'search_read', [
    [['state', '=', 'done']]
  ], {
    fields: ['date', 'location_id', 'location_dest_id'],
    limit: 1000
  });

  const byMonth = {};
  for (const m of allMovesData) {
    const month = m.date.substring(0, 7);
    if (!byMonth[month]) byMonth[month] = { in: 0, out: 0 };

    const isIn = m.location_dest_id[1].includes('Stock');
    if (isIn) byMonth[month].in++;
    else byMonth[month].out++;
  }

  const sortedMonths = Object.keys(byMonth).sort();
  for (const month of sortedMonths) {
    console.log(month + ': ' + byMonth[month].in + ' entrees, ' + byMonth[month].out + ' sorties');
  }

  // 5. Verification stock.quant
  console.log('\n=== STOCK.QUANT DANS ODOO ===\n');

  const quants = await callOdoo('stock.quant', 'search_read', [
    [['location_id', '=', 5]] // WH/Stock
  ], {
    fields: ['product_id', 'quantity', 'value'],
    limit: 20
  });

  console.log('Quants en stock (WH/Stock):');
  for (const q of quants) {
    console.log('  ' + q.product_id[1].substring(0, 30) + ': ' + q.quantity + ' unites');
  }

  console.log('\n=== CONCLUSION ===');
  console.log('Les donnees sont bien dans ODOO (base puzzl).');
  console.log('Vous pouvez les voir dans:');
  console.log('  - Inventaire > Rapports > Historique des mouvements');
  console.log('  - Inventaire > Produits > [Produit] > Mouvements');
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
