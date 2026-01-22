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
  console.log('=== VERIFICATION METHODE DE COUT ===\n');

  // 1. Recuperer les categories de produits
  const categories = await callOdoo('product.category', 'search_read', [[]], {
    fields: ['id', 'name', 'property_cost_method', 'property_valuation'],
    limit: 20
  });

  console.log('Categories de produits:');
  for (const cat of categories) {
    console.log('  [' + cat.id + '] ' + cat.name);
    console.log('      Methode de cout: ' + (cat.property_cost_method || 'standard'));
    console.log('      Valorisation: ' + (cat.property_valuation || 'manual'));
  }

  // 2. Verifier les champs disponibles
  console.log('\n=== CHAMPS DISPONIBLES SUR PRODUCT.CATEGORY ===\n');

  const fields = await callOdoo('product.category', 'fields_get', [], {
    attributes: ['type', 'string', 'selection']
  });

  const relevantFields = ['property_cost_method', 'property_valuation', 'property_stock_valuation_account_id'];
  for (const fieldName of relevantFields) {
    if (fields[fieldName]) {
      const f = fields[fieldName];
      console.log(fieldName + ' (' + f.type + '): ' + f.string);
      if (f.selection) {
        f.selection.forEach(s => console.log('  - ' + s[0] + ' = ' + s[1]));
      }
    } else {
      console.log(fieldName + ': N\'EXISTE PAS');
    }
  }

  // 3. Regarder un produit specifique
  console.log('\n=== DETAIL PRODUIT 11122 ===\n');

  const prod = await callOdoo('product.product', 'search_read', [
    [['default_code', '=', '11122']]
  ], {
    fields: ['id', 'name', 'categ_id', 'standard_price', 'cost_currency_id']
  });

  if (prod.length > 0) {
    console.log('Produit: ' + prod[0].name);
    console.log('Categorie: ' + (prod[0].categ_id ? prod[0].categ_id[1] : 'N/A'));
    console.log('Prix standard: ' + prod[0].standard_price + ' EUR');
  }

  // 4. Verifier les stock.move avec leur price_unit
  console.log('\n=== MOUVEMENTS AVEC PRIX ===\n');

  const moves = await callOdoo('stock.move', 'search_read', [
    [['product_id', '=', prod[0].id]]
  ], {
    fields: ['id', 'date', 'quantity', 'price_unit', 'location_id', 'location_dest_id', 'origin'],
    order: 'date asc',
    limit: 10
  });

  console.log('Premiers mouvements du produit 11122:');
  for (const m of moves) {
    const type = m.location_id[1].includes('Vendor') ? 'ACHAT' : 'VENTE';
    console.log('  ' + m.date.substring(0, 10) + ' | ' + type + ' | qty=' + m.quantity + ' | prix=' + m.price_unit + ' EUR | ' + m.origin);
  }

  // 5. Expliquer
  console.log('\n=== EXPLICATION ===\n');
  console.log('Si property_cost_method = "standard" ou absent:');
  console.log('  -> Le standard_price ne change JAMAIS automatiquement');
  console.log('  -> Il faut le modifier manuellement ou via API');
  console.log('');
  console.log('Si property_cost_method = "average" (CUMP):');
  console.log('  -> Le standard_price se recalcule a chaque reception');
  console.log('  -> Formule: (ancien_stock * ancien_prix + nouvel_achat * nouveau_prix) / total_stock');
  console.log('');
  console.log('Si property_cost_method = "fifo":');
  console.log('  -> Premier entre, premier sorti');
  console.log('  -> Le prix de sortie = prix du lot le plus ancien');
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
