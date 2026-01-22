/**
 * Test de création d'une entrée de stock via API Odoo
 * Pour diagnostiquer le problème "l'ajout de produit ne fonctionne pas"
 */

const ODOO_URL = 'https://puzzl.odoo.com';
const ODOO_DB = 'puzzl';
const ODOO_USERNAME = 'alexandre.assor.puzzl@gmail.com';
const ODOO_API_KEY = '286f8c1336625ae2e6bc69745cdc6e9903fa11da';

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
  if (data.error) {
    console.error('Erreur Odoo:', JSON.stringify(data.error, null, 2));
    throw new Error(JSON.stringify(data.error));
  }
  return data.result;
}

async function main() {
  console.log('='.repeat(60));
  console.log('TEST: Création d\'une entrée de stock');
  console.log('='.repeat(60));

  // 1. D'abord, vérifier les locations disponibles
  console.log('\n1. Vérification des locations disponibles...');
  const locations = await callOdoo('stock.location', 'search_read',
    [[]],
    { fields: ['id', 'name', 'usage', 'complete_name'], limit: 20 }
  );
  console.log('Locations:');
  locations.forEach(loc => {
    console.log(`   ID ${loc.id}: ${loc.complete_name} (usage: ${loc.usage})`);
  });

  // 2. Trouver les IDs corrects
  const supplierLoc = locations.find(l => l.usage === 'supplier');
  const stockLoc = locations.find(l => l.usage === 'internal' && l.name === 'Stock');

  console.log('\n2. Locations identifiées:');
  console.log(`   Fournisseurs: ID ${supplierLoc?.id || 'NON TROUVE'}`);
  console.log(`   Stock interne: ID ${stockLoc?.id || 'NON TROUVE'}`);

  // 3. Chercher un produit (TROTINETTE)
  console.log('\n3. Recherche du produit TROTINETTE...');
  const products = await callOdoo('product.product', 'search_read',
    [[['name', 'ilike', 'TROTINETTE']]],
    { fields: ['id', 'name', 'standard_price', 'qty_available', 'is_storable'], limit: 1 }
  );

  if (products.length === 0) {
    console.log('❌ Produit non trouvé');
    return;
  }

  const product = products[0];
  console.log(`   Produit: ${product.name} (ID: ${product.id})`);
  console.log(`   is_storable: ${product.is_storable}`);
  console.log(`   Stock actuel: ${product.qty_available}`);
  console.log(`   Prix actuel: ${product.standard_price} €`);

  // 4. Vérifier les champs disponibles sur stock.move
  console.log('\n4. Vérification des champs disponibles sur stock.move...');
  try {
    const moveFields = await callOdoo('stock.move', 'fields_get', [], {});
    const fieldNames = Object.keys(moveFields);
    console.log(`   Nombre de champs: ${fieldNames.length}`);
    console.log(`   Champ 'name' existe: ${fieldNames.includes('name')}`);
    console.log(`   Champ 'reference' existe: ${fieldNames.includes('reference')}`);
    console.log(`   Champ 'origin' existe: ${fieldNames.includes('origin')}`);
  } catch (e) {
    console.log('   Erreur lors de la lecture des champs:', e.message);
  }

  // 5. Tenter de créer un mouvement de stock
  console.log('\n5. Tentative de création d\'un mouvement de stock...');

  const moveData = {
    product_id: product.id,
    product_uom_qty: 1,
    quantity: 1,
    product_uom: 1,
    location_id: supplierLoc?.id || 1,
    location_dest_id: stockLoc?.id || 5,
    price_unit: 100,
    state: 'draft'
  };

  console.log('   Données du mouvement:', JSON.stringify(moveData, null, 2));

  try {
    const moveId = await callOdoo('stock.move', 'create', [moveData]);
    console.log(`   ✅ Mouvement créé avec ID: ${moveId}`);

    // 6. Valider le mouvement
    console.log('\n6. Validation du mouvement...');
    await callOdoo('stock.move', 'write', [[moveId], {
      state: 'done',
      quantity: 1,
      picked: true
    }]);
    console.log('   ✅ Mouvement validé');

    // 7. Vérifier le stock
    console.log('\n7. Vérification du stock après création...');
    const productAfter = await callOdoo('product.product', 'search_read',
      [[['id', '=', product.id]]],
      { fields: ['qty_available'] }
    );
    console.log(`   Stock après: ${productAfter[0].qty_available}`);
    console.log(`   Différence: +${productAfter[0].qty_available - product.qty_available}`);

  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test terminé');
  console.log('='.repeat(60));
}

main().catch(console.error);
