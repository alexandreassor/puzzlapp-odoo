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

// Produits avec stock cible
const PRODUCTS = [
  { code: '11122', qty: 741, price: 5 },
  { code: 'NMD-44038', qty: 697, price: 8 },
  { code: '01867', qty: 685, price: 3 },
  { code: '02499', qty: 665, price: 6 },
  { code: '04346', qty: 624, price: 12 },
  { code: '03214', qty: 606, price: 4 },
  { code: '12910', qty: 416, price: 25 },
  { code: '01679', qty: 409, price: 18 },
  { code: 'NMD-04899', qty: 400, price: 45 },
  { code: '14067', qty: 399, price: 35 },
];

// Generer une date pour un mois specifique (0 = ce mois, 11 = il y a 11 mois)
function getDateForMonth(monthsAgo) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() - monthsAgo;

  // Calculer annee et mois corrects
  const targetDate = new Date(year, month, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  // Jour aleatoire dans le mois (1-28 pour eviter problemes)
  const day = 1 + Math.floor(Math.random() * 27);
  const hour = 8 + Math.floor(Math.random() * 10);
  const minute = Math.floor(Math.random() * 60);

  const dateStr = targetYear + '-' +
    String(targetMonth + 1).padStart(2, '0') + '-' +
    String(day).padStart(2, '0') + ' ' +
    String(hour).padStart(2, '0') + ':' +
    String(minute).padStart(2, '0') + ':00';

  return dateStr;
}

// Generer un historique realiste pour un produit sur 12 mois
function generateHistory(targetQty) {
  const history = [];

  // Stock initial (achat important il y a 12 mois)
  const initialStock = Math.floor(targetQty * 0.5);
  history.push({ type: 'purchase', qty: initialStock, monthsAgo: 11 });

  let currentStock = initialStock;

  // Simuler 11 mois d'activite (de -10 mois a maintenant)
  for (let monthsAgo = 10; monthsAgo >= 0; monthsAgo--) {
    // 1-2 achats par mois
    const numPurchases = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numPurchases; i++) {
      const purchaseQty = Math.floor(50 + Math.random() * 150);
      history.push({ type: 'purchase', qty: purchaseQty, monthsAgo });
      currentStock += purchaseQty;
    }

    // 2-4 ventes par mois
    const numSales = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numSales; i++) {
      const maxSale = Math.min(currentStock - targetQty + 200, Math.floor(currentStock * 0.25));
      if (maxSale > 10) {
        const saleQty = Math.floor(10 + Math.random() * Math.min(maxSale, 80));
        history.push({ type: 'sale', qty: saleQty, monthsAgo });
        currentStock -= saleQty;
      }
    }
  }

  // Ajuster pour atteindre exactement le stock cible
  const diff = currentStock - targetQty;
  if (diff > 0) {
    history.push({ type: 'sale', qty: diff, monthsAgo: 0 });
  } else if (diff < 0) {
    history.push({ type: 'purchase', qty: -diff, monthsAgo: 0 });
  }

  return history;
}

async function main() {
  console.log('=== CREATION HISTORIQUE 12 MOIS ===\n');
  console.log('Periode: Janvier 2025 - Janvier 2026\n');

  // 1. Recuperer les emplacements
  const locations = await callOdoo('stock.location', 'search_read', [[]], {
    fields: ['id', 'name', 'usage'],
    limit: 50
  });

  const supplierLoc = locations.find(l => l.usage === 'supplier');
  const stockLoc = locations.find(l => l.usage === 'internal' && l.name === 'Stock');
  const customerLoc = locations.find(l => l.usage === 'customer');

  console.log('Emplacements: Fournisseur=' + supplierLoc.id + ', Stock=' + stockLoc.id + ', Client=' + customerLoc.id);

  // 2. Supprimer tous les mouvements existants pour ces produits
  console.log('\n=== NETTOYAGE ===\n');

  const products = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'name', 'default_code', 'uom_id']
  });

  const productIds = products.map(p => p.id);

  // Supprimer les mouvements existants
  const existingMoves = await callOdoo('stock.move', 'search', [
    [['product_id', 'in', productIds]]
  ]);

  if (existingMoves.length > 0) {
    for (const moveId of existingMoves) {
      try {
        await callOdoo('stock.move', 'write', [[moveId], { state: 'draft' }]);
        await callOdoo('stock.move', 'unlink', [[moveId]]);
      } catch (e) {
        // Ignorer
      }
    }
    console.log(existingMoves.length + ' anciens mouvements supprimes');
  }

  // Remettre les quants a zero
  const quants = await callOdoo('stock.quant', 'search_read', [
    [['product_id', 'in', productIds]]
  ], { fields: ['id'] });

  for (const q of quants) {
    try {
      await callOdoo('stock.quant', 'write', [[q.id], { quantity: 0 }]);
    } catch (e) {}
  }
  console.log('Quants remis a zero');

  console.log('\n=== CREATION DES MOUVEMENTS ===\n');

  let totalPurchases = 0, totalSales = 0;
  const monthlyStats = {};

  for (const item of PRODUCTS) {
    const prod = products.find(p => p.default_code === item.code);
    if (!prod) continue;

    const uomId = prod.uom_id ? prod.uom_id[0] : 1;
    const history = generateHistory(item.qty);

    let purchaseCount = 0, saleCount = 0;

    for (const entry of history) {
      const date = getDateForMonth(entry.monthsAgo);
      const monthKey = date.substring(0, 7); // YYYY-MM

      if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { purchases: 0, sales: 0 };

      try {
        if (entry.type === 'purchase') {
          await callOdoo('stock.move', 'create', [{
            product_id: prod.id,
            product_uom_qty: entry.qty,
            quantity: entry.qty,
            product_uom: uomId,
            location_id: supplierLoc.id,
            location_dest_id: stockLoc.id,
            state: 'done',
            date: date,
            origin: 'PO-' + item.code + '-' + String(purchaseCount + 1).padStart(3, '0')
          }]);
          purchaseCount++;
          totalPurchases++;
          monthlyStats[monthKey].purchases++;
        } else {
          await callOdoo('stock.move', 'create', [{
            product_id: prod.id,
            product_uom_qty: entry.qty,
            quantity: entry.qty,
            product_uom: uomId,
            location_id: stockLoc.id,
            location_dest_id: customerLoc.id,
            state: 'done',
            date: date,
            origin: 'SO-' + item.code + '-' + String(saleCount + 1).padStart(3, '0')
          }]);
          saleCount++;
          totalSales++;
          monthlyStats[monthKey].sales++;
        }
      } catch (err) {
        console.log('  Erreur: ' + err.message);
      }
    }

    console.log('[' + item.code + '] ' + purchaseCount + ' achats, ' + saleCount + ' ventes');
  }

  console.log('\n=== REPARTITION PAR MOIS ===\n');

  const sortedMonths = Object.keys(monthlyStats).sort();
  for (const month of sortedMonths) {
    const stats = monthlyStats[month];
    console.log(month + ': ' + stats.purchases + ' achats, ' + stats.sales + ' ventes');
  }

  console.log('\n=== RESUME ===');
  console.log('Total mouvements ACHAT: ' + totalPurchases);
  console.log('Total mouvements VENTE: ' + totalSales);
  console.log('Total mouvements: ' + (totalPurchases + totalSales));

  // Verification
  console.log('\n=== VERIFICATION STOCKS ===\n');

  const finalProducts = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'default_code', 'qty_available']
  });

  let success = 0;
  for (const prod of finalProducts) {
    const target = PRODUCTS.find(p => p.code === prod.default_code);
    const match = target && Math.abs(prod.qty_available - target.qty) < 1;
    if (match) success++;
    const status = match ? 'OK' : 'X ';
    console.log(status + ' [' + prod.default_code + '] Stock: ' + prod.qty_available + ' (cible: ' + target?.qty + ')');
  }

  console.log('\n' + success + '/10 stocks corrects');
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
