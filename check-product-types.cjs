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
  console.log('=== ANALYSE DES CHAMPS PRODUCT.TEMPLATE ===\n');

  // Recuperer la definition des champs
  const fields = await callOdoo('product.template', 'fields_get', [], {
    attributes: ['type', 'selection', 'string', 'help']
  });

  // Afficher les champs lies au type/stock
  const relevantFields = ['type', 'detailed_type', 'is_storable', 'tracking', 'categ_id'];

  for (const fieldName of relevantFields) {
    if (fields[fieldName]) {
      const f = fields[fieldName];
      console.log('=== ' + fieldName + ' ===');
      console.log('Type:', f.type);
      console.log('Label:', f.string);
      if (f.selection) {
        console.log('Valeurs possibles:');
        f.selection.forEach(s => console.log('  - ' + s[0] + ' = ' + s[1]));
      }
      if (f.help) console.log('Aide:', f.help);
      console.log('');
    } else {
      console.log('=== ' + fieldName + ' === (N\'EXISTE PAS)\n');
    }
  }

  // Lister tous les champs qui contiennent 'stock' ou 'track' ou 'type'
  console.log('=== AUTRES CHAMPS INTERESSANTS ===\n');
  for (const [name, def] of Object.entries(fields)) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('stock') || lowerName.includes('track') || lowerName.includes('storable')) {
      console.log(name + ' (' + def.type + '):', def.string);
      if (def.selection) {
        def.selection.forEach(s => console.log('  - ' + s[0]));
      }
    }
  }

  // Verifier stock.quant
  console.log('\n=== CHAMPS STOCK.QUANT ===\n');
  const quantFields = await callOdoo('stock.quant', 'fields_get', [], {
    attributes: ['type', 'string', 'required']
  });

  const importantQuantFields = ['product_id', 'location_id', 'quantity', 'reserved_quantity', 'lot_id'];
  for (const fieldName of importantQuantFields) {
    if (quantFields[fieldName]) {
      const f = quantFields[fieldName];
      console.log(fieldName + ' (' + f.type + '): ' + f.string + (f.required ? ' [REQUIS]' : ''));
    }
  }

  // Essayer de creer un stock.quant directement meme pour un produit consu
  console.log('\n=== TEST CREATION STOCK.QUANT POUR PRODUIT CONSU ===\n');

  try {
    // Recuperer un produit existant
    const prod = await callOdoo('product.product', 'search_read', [
      [['default_code', '=', '11122']]
    ], { fields: ['id', 'name'], limit: 1 });

    if (prod.length > 0) {
      console.log('Produit: ' + prod[0].id + ' - ' + prod[0].name);

      // Essayer de creer un quant
      const quantId = await callOdoo('stock.quant', 'create', [{
        product_id: prod[0].id,
        location_id: 5,  // WH/Stock
        quantity: 741
      }]);
      console.log('Quant cree avec succes! ID=' + quantId);

      // Verifier le stock
      const updated = await callOdoo('product.product', 'search_read', [
        [['id', '=', prod[0].id]]
      ], { fields: ['qty_available'] });
      console.log('Stock apres creation quant: ' + updated[0].qty_available);
    }
  } catch (err) {
    console.log('Erreur: ' + err.message);
  }
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
