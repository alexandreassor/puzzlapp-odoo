const ODOO_URL = 'https://puzzl.odoo.com';
const ODOO_DB = 'puzzl';
const ODOO_API_KEY = '286f8c1336625ae2e6bc69745cdc6e9903fa11da';

async function callOdoo(model, method, args, kwargs = {}) {
  const response = await fetch(ODOO_URL + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [ODOO_DB, 2, ODOO_API_KEY, model, method, args, kwargs]
      },
      id: Date.now()
    })
  });
  const data = await response.json();
  return data.result;
}

async function main() {
  // Chercher les mouvements recents
  const moves = await callOdoo('stock.move', 'search_read',
    [[['state', '=', 'done']]],
    {
      fields: ['id', 'product_id', 'product_qty', 'price_unit', 'location_id', 'location_dest_id', 'date'],
      order: 'date desc',
      limit: 15
    }
  );

  console.log('=== Mouvements recents (price_unit stocke par Odoo) ===\n');
  console.log('TYPE     | PRODUIT              | QTY  | PRICE_UNIT | DE -> VERS');
  console.log('-'.repeat(80));

  for (const m of moves) {
    const destName = m.location_dest_id[1];
    const isEntry = destName.includes('Stock');
    const type = isEntry ? 'ENTREE ' : 'SORTIE ';
    const productName = m.product_id[1].substring(0, 20).padEnd(20);
    const qty = String(m.product_qty).padStart(4);
    const price = String(m.price_unit).padStart(10) + ' EUR';
    const from = m.location_id[1].substring(0, 15);
    const to = m.location_dest_id[1].substring(0, 15);

    console.log(`${type} | ${productName} | ${qty} | ${price} | ${from} -> ${to}`);
  }

  // Verifier les standard_price des produits
  const products = await callOdoo('product.product', 'search_read',
    [[['qty_available', '>', 0]]],
    { fields: ['name', 'default_code', 'standard_price', 'qty_available'], limit: 10 }
  );

  console.log('\n=== standard_price actuel des produits ===\n');
  for (const p of products) {
    console.log(`${(p.default_code || '-').padEnd(10)} | ${p.name.substring(0, 25).padEnd(25)} | CUMP: ${p.standard_price} EUR | Stock: ${p.qty_available}`);
  }
}

main().catch(console.error);
