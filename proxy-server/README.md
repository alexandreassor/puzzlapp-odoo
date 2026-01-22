# Serveur Proxy ODOO

Serveur proxy simple pour connecter des applications web à l'API ODOO en contournant les restrictions CORS.

## Prérequis

- Node.js 18+
- Une instance ODOO accessible
- Une API Key ODOO (recommandé) ou mot de passe

## Installation

```bash
cd proxy-server
npm install
```

## Configuration

1. Copiez le fichier d'exemple :
```bash
cp .env.example .env
```

2. Éditez `.env` avec vos informations ODOO :
```env
ODOO_URL=https://votre-instance.odoo.com
ODOO_DB=nom_de_votre_base
ODOO_USERNAME=admin@example.com
ODOO_API_KEY=votre_api_key
PORT=3001
```

### Créer une API Key ODOO

1. Connectez-vous à ODOO
2. Allez dans **Paramètres** > **Utilisateurs** > Votre profil
3. Onglet **Clés API** > **Nouvelle clé API**
4. Copiez la clé générée (elle ne sera plus visible ensuite)

## Démarrage

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://localhost:3001`

## Endpoints

### Health Check
```
GET /health
```
Retourne l'état du serveur.

### Appel API ODOO
```
POST /api/odoo
Content-Type: application/json

{
  "body": {
    "model": "product.product",
    "method": "search_read",
    "args": [[["type", "=", "product"]]],
    "kwargs": {
      "fields": ["id", "name", "qty_available"],
      "limit": 100
    }
  }
}
```

## Déploiement en Production

### Option 1 : Serveur VPS (Recommandé)

```bash
# Installer PM2
npm install -g pm2

# Démarrer le serveur
pm2 start server.js --name odoo-proxy

# Configurer le démarrage automatique
pm2 startup
pm2 save
```

### Option 2 : Docker

Créez un `Dockerfile` :
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

```bash
docker build -t odoo-proxy .
docker run -d -p 3001:3001 --env-file .env odoo-proxy
```

### Option 3 : Hébergement Cloud

Compatible avec :
- **Railway** (gratuit pour démarrer)
- **Render**
- **Fly.io**
- **Heroku**

## Sécurité

### HTTPS obligatoire en production

Utilisez un reverse proxy (Nginx/Caddy) avec certificat SSL :

```nginx
server {
    listen 443 ssl;
    server_name api.votre-domaine.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Variables d'environnement

Ne jamais committer le fichier `.env` ! Ajoutez-le à `.gitignore` :
```
.env
```

### Restreindre les origines

En production, limitez les origines autorisées :
```env
ALLOWED_ORIGINS=https://votre-app.com,https://admin.votre-app.com
```

## Architecture Multi-Clients

### Modèle 1 : Un proxy par client (Recommandé)

Chaque client a son propre proxy avec ses propres credentials :

```
Client A → proxy-client-a.com → ODOO A
Client B → proxy-client-b.com → ODOO B
```

**Avantages** : Isolation totale, pas de risque de fuite entre clients

### Modèle 2 : Proxy mutualisé

Un seul proxy avec routing par header/subdomain :

```
Client A → api.votre-service.com (header: X-Client-ID: A) → ODOO A
Client B → api.votre-service.com (header: X-Client-ID: B) → ODOO B
```

Nécessite une base de données pour stocker les credentials de chaque client.

## Intégration Frontend

Dans votre application React, configurez l'URL du proxy :

```typescript
// src/services/odooService.ts
const API_URL = 'https://votre-proxy.com/api/odoo';

const callOdoo = async (model: string, method: string, args: any[], kwargs?: object) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body: { model, method, args, kwargs }
    })
  });
  return response.json();
};
```

## Troubleshooting

### Erreur "Access Denied"
- Vérifiez que l'API Key est valide
- Vérifiez que l'utilisateur a les droits sur les modèles appelés

### Erreur "Database not found"
- Vérifiez le nom exact de la base dans ODOO_DB

### Erreur CORS
- Vérifiez ALLOWED_ORIGINS dans .env
- En développement, laissez `*` ou ajoutez `http://localhost:5173`

## Licence

MIT - Libre d'utilisation et de modification.
