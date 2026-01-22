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

// Produits avec stock cible et prix de base
const PRODUCTS = [
  { code: '11122', qty: 741, basePrice: 5.00 },      // Poignees - prix stable
  { code: 'NMD-44038', qty: 697, basePrice: 8.00 }, // Roulements - petit ecart
  { code: '01867', qty: 685, basePrice: 3.00 },     // Axe/Boulon - tres stable
  { code: '02499', qty: 665, basePrice: 6.00 },     // Poignee mousse
  { code: '04346', qty: 624, basePrice: 12.00 },    // H-Block
  { code: '03214', qty: 606, basePrice: 4.00 },     // Grip
  { code: '12910', qty: 416, basePrice: 25.00 },    // Roue premium
  { code: '01679', qty: 409, basePrice: 18.00 },    // Roue
  { code: 'NMD-04899', qty: 400, basePrice: 45.00 },// Casque - variations plus grandes
  { code: '14067', qty: 399, basePrice: 35.00 },    // Platine
];

// Generer un prix avec variation (+/- 5-15%)
function getPriceWithVariation(basePrice, monthsAgo) {
  // Tendance: prix plus bas il y a longtemps (inflation)
  const inflationFactor = 1 + (11 - monthsAgo) * 0.005; // +0.5% par mois

  // Variation aleatoire +/- 10%
  const randomVariation = 0.9 + Math.random() * 0.2;

  // Prix final arrondi a 2 decimales
  const price = basePrice * inflationFactor * randomVariation;
  return Math.round(price * 100) / 100;
}

// Generer une date pour un mois specifique
function getDateForMonth(monthsAgo) {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const day = 1 + Math.floor(Math.random() * 27);
  const hour = 8 + Math.floor(Math.random() * 10);
  const minute = Math.floor(Math.random() * 60);

  return targetDate.getFullYear() + '-' +
    String(targetDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(day).padStart(2, '0') + ' ' +
    String(hour).padStart(2, '0') + ':' +
    String(minute).padStart(2, '0') + ':00';
}

// Generer un historique avec prix
function generateHistory(targetQty, basePrice) {
  const history = [];

  // Stock initial
  const initialStock = Math.floor(targetQty * 0.5);
  const initialPrice = getPriceWithVariation(basePrice, 11);
  history.push({ type: 'purchase', qty: initialStock, monthsAgo: 11, price: initialPrice });

  let currentStock = initialStock;

  // Simuler 11 mois
  for (let monthsAgo = 10; monthsAgo >= 0; monthsAgo--) {
    // 1-2 achats par mois avec prix variables
    const numPurchases = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numPurchases; i++) {
      const purchaseQty = Math.floor(50 + Math.random() * 150);
      const price = getPriceWithVariation(basePrice, monthsAgo);
      history.push({ type: 'purchase', qty: purchaseQty, monthsAgo, price });
      currentStock += purchaseQty;
    }

    // 2-4 ventes par mois (sorties au CUMP, on met le prix de base)
    const numSales = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numSales; i++) {
      const maxSale = Math.min(currentStock - targetQty + 200, Math.floor(currentStock * 0.25));
      if (maxSale > 10) {
        const saleQty = Math.floor(10 + Math.random() * Math.min(maxSale, 80));
        // Prix de vente = prix de base * 1.5 (marge 50%)
        const salePrice = Math.round(basePrice * 1.5 * 100) / 100;
        history.push({ type: 'sale', qty: saleQty, monthsAgo, price: salePrice });
        currentStock -= saleQty;
      }
    }
  }

  // Ajustement final
  const diff = currentStock - targetQty;
  if (diff > 0) {
    history.push({ type: 'sale', qty: diff, monthsAgo: 0, price: Math.round(basePrice * 1.5 * 100) / 100 });
  } else if (diff < 0) {
    history.push({ type: 'purchase', qty: -diff, monthsAgo: 0, price: basePrice });
  }

  return history;
}

// Calculer le CUMP apres tous les mouvements
function calculateCUMP(history, basePrice) {
  let totalValue = 0;
  let totalQty = 0;
  let cumpHistory = [];

  for (const entry of history) {
    if (entry.type === 'purchase') {
      totalValue += entry.qty * entry.price;
      totalQty += entry.qty;
      const cump = totalQty > 0 ? totalValue / totalQty : 0;
      cumpHistory.push({
        action: 'ACHAT',
        qty: entry.qty,
        price: entry.price,
        stockQty: totalQty,
        stockValue: Math.round(totalValue * 100) / 100,
        cump: Math.round(cump * 100) / 100
      });
    } else {
      // Sortie: on sort au CUMP actuel
      const cump = totalQty > 0 ? totalValue / totalQty : basePrice;
      const exitValue = entry.qty * cump;
      totalValue -= exitValue;
      totalQty -= entry.qty;
      cumpHistory.push({
        action: 'VENTE',
        qty: entry.qty,
        price: entry.price, // prix de vente
        stockQty: totalQty,
        stockValue: Math.round(totalValue * 100) / 100,
        cump: Math.round(cump * 100) / 100
      });
    }
  }

  return cumpHistory;
}

async function main() {
  console.log('=== CREATION HISTORIQUE 12 MOIS AVEC PRIX ===\n');

  // 1. Recuperer les emplacements
  const locations = await callOdoo('stock.location', 'search_read', [[]], {
    fields: ['id', 'name', 'usage'],
    limit: 50
  });

  const supplierLoc = locations.find(l => l.usage === 'supplier');
  const stockLoc = locations.find(l => l.usage === 'internal' && l.name === 'Stock');
  const customerLoc = locations.find(l => l.usage === 'customer');

  console.log('Emplacements: Fournisseur=' + supplierLoc.id + ', Stock=' + stockLoc.id + ', Client=' + customerLoc.id);

  // 2. Nettoyage
  console.log('\n=== NETTOYAGE ===\n');

  const products = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'name', 'default_code', 'uom_id']
  });

  const productIds = products.map(p => p.id);

  const existingMoves = await callOdoo('stock.move', 'search', [
    [['product_id', 'in', productIds]]
  ]);

  if (existingMoves.length > 0) {
    for (const moveId of existingMoves) {
      try {
        await callOdoo('stock.move', 'write', [[moveId], { state: 'draft' }]);
        await callOdoo('stock.move', 'unlink', [[moveId]]);
      } catch (e) {}
    }
    console.log(existingMoves.length + ' anciens mouvements supprimes');
  }

  const quants = await callOdoo('stock.quant', 'search_read', [
    [['product_id', 'in', productIds]]
  ], { fields: ['id'] });

  for (const q of quants) {
    try {
      await callOdoo('stock.quant', 'write', [[q.id], { quantity: 0 }]);
    } catch (e) {}
  }
  console.log('Quants remis a zero');

  console.log('\n=== CREATION DES MOUVEMENTS AVEC PRIX ===\n');

  let totalPurchases = 0, totalSales = 0;
  let totalPurchaseValue = 0, totalSaleValue = 0;
  const cumpResults = {};

  for (const item of PRODUCTS) {
    const prod = products.find(p => p.default_code === item.code);
    if (!prod) continue;

    const uomId = prod.uom_id ? prod.uom_id[0] : 1;
    const history = generateHistory(item.qty, item.basePrice);

    // Calculer le CUMP
    const cumpHistory = calculateCUMP(history, item.basePrice);
    const finalCump = cumpHistory.length > 0 ? cumpHistory[cumpHistory.length - 1].cump : item.basePrice;
    cumpResults[item.code] = {
      basePrice: item.basePrice,
      finalCump: finalCump,
      history: cumpHistory
    };

    let purchaseCount = 0, saleCount = 0;
    let prodPurchaseValue = 0, prodSaleValue = 0;

    for (const entry of history) {
      const date = getDateForMonth(entry.monthsAgo);

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
            price_unit: entry.price,
            origin: 'PO-' + item.code + '-' + String(purchaseCount + 1).padStart(3, '0')
          }]);
          purchaseCount++;
          totalPurchases++;
          prodPurchaseValue += entry.qty * entry.price;
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
            price_unit: entry.price,
            origin: 'SO-' + item.code + '-' + String(saleCount + 1).padStart(3, '0')
          }]);
          saleCount++;
          totalSales++;
          prodSaleValue += entry.qty * entry.price;
        }
      } catch (err) {
        console.log('  Erreur: ' + err.message);
      }
    }

    totalPurchaseValue += prodPurchaseValue;
    totalSaleValue += prodSaleValue;

    console.log('[' + item.code + '] ' + purchaseCount + ' achats (' + Math.round(prodPurchaseValue) + ' EUR), ' +
                saleCount + ' ventes (' + Math.round(prodSaleValue) + ' EUR)');
  }

  console.log('\n=== RESUME FINANCIER ===');
  console.log('Total achats: ' + totalPurchases + ' mouvements, ' + Math.round(totalPurchaseValue) + ' EUR');
  console.log('Total ventes: ' + totalSales + ' mouvements, ' + Math.round(totalSaleValue) + ' EUR');

  // Afficher le CUMP pour chaque produit
  console.log('\n=== CUMP PAR PRODUIT ===\n');
  console.log('Code       | Prix base | CUMP final | Ecart');
  console.log('-----------|-----------|------------|-------');

  for (const item of PRODUCTS) {
    const result = cumpResults[item.code];
    if (result) {
      const ecart = ((result.finalCump - result.basePrice) / result.basePrice * 100).toFixed(1);
      console.log(
        item.code.padEnd(10) + ' | ' +
        result.basePrice.toFixed(2).padStart(9) + ' | ' +
        result.finalCump.toFixed(2).padStart(10) + ' | ' +
        (ecart > 0 ? '+' : '') + ecart + '%'
      );
    }
  }

  // Exemple detaille pour un produit
  console.log('\n=== EXEMPLE CALCUL CUMP (11122 - FUZION Poignees) ===\n');
  const exampleHistory = cumpResults['11122'].history.slice(0, 8);
  console.log('Action | Qty | Prix  | Stock Qty | Stock Val | CUMP');
  console.log('-------|-----|-------|-----------|-----------|------');
  for (const h of exampleHistory) {
    console.log(
      h.action.padEnd(6) + ' | ' +
      String(h.qty).padStart(3) + ' | ' +
      h.price.toFixed(2).padStart(5) + ' | ' +
      String(h.stockQty).padStart(9) + ' | ' +
      String(h.stockValue.toFixed(0)).padStart(9) + ' | ' +
      h.cump.toFixed(2)
    );
  }
  console.log('...');

  // Verification stocks
  console.log('\n=== VERIFICATION STOCKS ===\n');

  const finalProducts = await callOdoo('product.product', 'search_read', [
    [['default_code', 'in', PRODUCTS.map(p => p.code)]]
  ], {
    fields: ['id', 'default_code', 'qty_available', 'standard_price']
  });

  let success = 0;
  for (const prod of finalProducts) {
    const target = PRODUCTS.find(p => p.code === prod.default_code);
    const match = target && Math.abs(prod.qty_available - target.qty) < 1;
    if (match) success++;
    const status = match ? 'OK' : 'X ';
    console.log(status + ' [' + prod.default_code + '] Stock: ' + prod.qty_available +
                ' | Prix standard ODOO: ' + (prod.standard_price || 0).toFixed(2) + ' EUR');
  }

  console.log('\n' + success + '/10 stocks corrects');

  console.log('\n=== NOTE SUR LE CUMP ===');
  console.log('- Le CUMP ne change QUE sur les ACHATS (entrees)');
  console.log('- Les VENTES (sorties) ne modifient PAS le CUMP');
  console.log('- Les articles sortent valorises au CUMP actuel');
  console.log('- ODOO utilise standard_price comme prix de revient');
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
