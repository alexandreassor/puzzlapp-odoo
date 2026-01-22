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
  console.log('=== ANALYSE DES CHAMPS DATE ===\n');

  // 1. Voir tous les champs date de stock.move
  const fields = await callOdoo('stock.move', 'fields_get', [], {
    attributes: ['type', 'string', 'help']
  });

  console.log('Champs date dans stock.move:');
  for (const [name, def] of Object.entries(fields)) {
    if (def.type === 'datetime' || def.type === 'date' || name.includes('date')) {
      console.log('  ' + name + ' (' + def.type + '): ' + def.string);
      if (def.help) console.log('    -> ' + def.help.substring(0, 80));
    }
  }

  // 2. Regarder un mouvement existant
  console.log('\n=== EXEMPLE MOUVEMENT ===\n');

  const move = await callOdoo('stock.move', 'search_read', [
    [['origin', 'like', 'PO-11122']]
  ], {
    fields: ['id', 'date', 'create_date', 'write_date', 'date_deadline', 'origin'],
    limit: 5
  });

  for (const m of move) {
    console.log('Move ID: ' + m.id + ' (' + m.origin + ')');
    console.log('  date: ' + m.date);
    console.log('  create_date: ' + m.create_date);
    console.log('  write_date: ' + m.write_date);
    console.log('');
  }

  // 3. L'interface utilise probablement create_date ou write_date
  console.log('=== CONCLUSION ===');
  console.log('Le champ "date" est bien defini mais ODOO affiche probablement');
  console.log('create_date dans l\'interface (date de creation du record).');
  console.log('');
  console.log('Pour avoir des dates differentes dans l\'affichage, il faudrait');
  console.log('soit modifier create_date (difficile), soit utiliser un autre workflow.');
}

main().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
