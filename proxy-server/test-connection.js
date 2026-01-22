/**
 * Script de test de connexion ODOO
 * Usage: node test-connection.js
 */

require('dotenv').config();
const axios = require('axios');

const { ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY } = process.env;

async function testConnection() {
  console.log('🔍 Test de connexion ODOO...\n');
  console.log(`URL: ${ODOO_URL}`);
  console.log(`Base: ${ODOO_DB}`);
  console.log(`Utilisateur: ${ODOO_USERNAME}`);
  console.log(`API Key: ${ODOO_API_KEY ? '***' + ODOO_API_KEY.slice(-4) : 'NON CONFIGURÉE'}\n`);

  try {
    // Test 1: Authentification
    console.log('1️⃣ Test d\'authentification...');
    const authResponse = await axios.post(`${ODOO_URL}/jsonrpc`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'authenticate',
        args: [ODOO_DB, ODOO_USERNAME, ODOO_API_KEY, {}]
      },
      id: 1
    });

    const uid = authResponse.data.result;
    if (!uid) {
      console.error('❌ Authentification échouée. Vérifiez vos credentials.\n');
      console.log('Réponse:', JSON.stringify(authResponse.data, null, 2));
      process.exit(1);
    }
    console.log(`✅ Authentification réussie! UID: ${uid}\n`);

    // Test 2: Lecture des produits
    console.log('2️⃣ Test de lecture des produits...');
    const productsResponse = await axios.post(`${ODOO_URL}/jsonrpc`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          uid,
          ODOO_API_KEY,
          'product.product',
          'search_count',
          [[['type', '=', 'product']]]
        ]
      },
      id: 2
    });

    const productCount = productsResponse.data.result;
    console.log(`✅ ${productCount} produits stockables trouvés\n`);

    // Test 3: Lecture des emplacements
    console.log('3️⃣ Test de lecture des emplacements...');
    const locationsResponse = await axios.post(`${ODOO_URL}/jsonrpc`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          uid,
          ODOO_API_KEY,
          'stock.location',
          'search_count',
          [[['usage', '=', 'internal']]]
        ]
      },
      id: 3
    });

    const locationCount = locationsResponse.data.result;
    console.log(`✅ ${locationCount} emplacements internes trouvés\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Tous les tests sont passés avec succès!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nVous pouvez maintenant démarrer le serveur:');
    console.log('  npm start\n');

  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    if (error.response) {
      console.error('Réponse:', error.response.data);
    }
    process.exit(1);
  }
}

testConnection();
