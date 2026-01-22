/**
 * Test pour vérifier QUI modifie standard_price :
 * - Odoo automatiquement ?
 * - Ou notre app via API ?
 *
 * Ce test modifie UNIQUEMENT price_unit sur un mouvement
 * SANS toucher à standard_price, puis vérifie si Odoo l'a recalculé.
 */

const ODOO_URL = 'https://puzzl.odoo.com';
const ODOO_DB = 'puzzl';
const ODOO_USERNAME = 'alexandre.assor.puzzl@gmail.com';
const ODOO_API_KEY = 'REMPLACE_PAR_TON_API_KEY'; // <-- Mets ton API key ici

async function callOdoo(model, method, args, kwargs = {}) {
  const response = await fetch(`${ODOO_URL}/jsonrpc`, {
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
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

async function main() {
  console.log('='.repeat(60));
  console.log('TEST : Qui modifie standard_price - Odoo ou notre App ?');
  console.log('='.repeat(60));

  // 1. Trouver le produit TEST-001
  console.log('\n1. Recherche du produit TEST-001...');
  const products = await callOdoo('product.product', 'search_read',
    [[['default_code', '=', 'TEST-001']]],
    { fields: ['id', 'name', 'standard_price', 'qty_available'], limit: 1 }
  );

  if (products.length === 0) {
    console.log('❌ Produit TEST-001 non trouvé');
    return;
  }

  const product = products[0];
  console.log(`   Produit trouvé: ${product.name} (ID: ${product.id})`);
  console.log(`   standard_price AVANT: ${product.standard_price} €`);

  // 2. Trouver un mouvement d'entrée pour ce produit
  console.log('\n2. Recherche d\'un mouvement d\'entrée...');
  const moves = await callOdoo('stock.move', 'search_read',
    [[['product_id', '=', product.id], ['state', '=', 'done']]],
    { fields: ['id', 'product_qty', 'price_unit', 'location_dest_id'], limit: 1 }
  );

  if (moves.length === 0) {
    console.log('❌ Aucun mouvement trouvé');
    return;
  }

  const move = moves[0];
  const oldPrice = move.price_unit;
  const newPrice = oldPrice + 5; // On ajoute 5€ au prix

  console.log(`   Mouvement trouvé: ID ${move.id}`);
  console.log(`   price_unit actuel: ${oldPrice} €`);

  // 3. Modifier UNIQUEMENT price_unit (sans toucher standard_price)
  console.log('\n3. Modification de price_unit sur le mouvement...');
  console.log(`   Nouveau price_unit: ${newPrice} €`);

  await callOdoo('stock.move', 'write', [[move.id], { price_unit: newPrice }]);
  console.log('   ✅ price_unit modifié');

  // 4. Attendre un peu (au cas où Odoo aurait un trigger async)
  console.log('\n4. Attente de 2 secondes...');
  await new Promise(r => setTimeout(r, 2000));

  // 5. Relire le standard_price du produit
  console.log('\n5. Relecture du standard_price...');
  const productAfter = await callOdoo('product.product', 'search_read',
    [[['id', '=', product.id]]],
    { fields: ['standard_price'], limit: 1 }
  );

  const newStandardPrice = productAfter[0].standard_price;
  console.log(`   standard_price APRES: ${newStandardPrice} €`);

  // 6. Conclusion
  console.log('\n' + '='.repeat(60));
  if (newStandardPrice === product.standard_price) {
    console.log('✅ RESULTAT: standard_price N\'A PAS CHANGE');
    console.log('   → Odoo NE recalcule PAS automatiquement');
    console.log('   → C\'est bien notre APP qui doit le faire');
  } else {
    console.log('⚠️  RESULTAT: standard_price A CHANGE');
    console.log(`   → Odoo l'a recalculé automatiquement`);
    console.log(`   → Avant: ${product.standard_price} € → Après: ${newStandardPrice} €`);
  }
  console.log('='.repeat(60));

  // 7. Remettre l'ancien prix
  console.log('\n7. Remise de l\'ancien prix...');
  await callOdoo('stock.move', 'write', [[move.id], { price_unit: oldPrice }]);
  console.log('   ✅ Prix restauré');
}

main().catch(console.error);
