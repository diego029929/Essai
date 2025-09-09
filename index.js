# Stripe Local Fullstack (React + Node) - Single-file project export

This document contains a complete minimal fullstack app you can run locally to create Stripe Checkout sessions (test mode). It includes:

- `server/` - Node + Express backend that creates Stripe Checkout sessions
- `client/` - React frontend (single-file App) that calls the backend and redirects the user to Stripe Checkout
- `.env.example` - example environment variables
- `README.md` - quick run instructions

> All code is included below as separate file blocks. Create the files locally using the exact paths and run the instructions in `README.md`.

---

## File: README.md

```markdown
# Stripe Local Fullstack - React + Node (Checkout Session)

This project shows how to run a local backend (Express) and a local frontend (React) to create Stripe Checkout sessions in test mode.

### Requirements
- Node.js 18+ (or 16+ should work)
- npm or yarn

### Setup

1. Create files exactly as in this repository structure.
2. Copy `.env.example` to `.env` in the `server/` folder and fill your Stripe keys.

### Environment variables (server/.env)
```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
FRONTEND_URL=http://localhost:3000
PORT=4242
```

Use Stripe test keys (from stripe.com) and keep them secret.

### Install & Run

**Backend**
```bash
cd server
npm install
npm run dev
# or: node server.js
```
By default the server listens on port 4242.

**Frontend**
```bash
cd client
npm install
npm start
```
This opens http://localhost:3000 (React dev server).

### How it works
- Frontend calls POST `/create-checkout-session` on the backend with a product description and price.
- Backend talks to Stripe using the secret key, creates a Checkout Session and returns `url` to redirect the browser.
- The browser is redirected to Stripe Checkout (test mode). Complete payment with test card `4242 4242 4242 4242`.

### Notes
- This example intentionally keeps things simple for local testing. In production you should enforce server-side validation, HTTPS, and use webhooks to confirm payments.
- If you want to test webhooks locally, use `stripe listen` or ngrok and add a webhook endpoint on the server.
```
```

---

## File: .env.example (server/.env.example)

```text
# Copy this file to server/.env and fill the keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
FRONTEND_URL=http://localhost:3000
PORT=4242
```

---

## File: server/package.json

```json
{
  "name": "stripe-local-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "license": "MIT",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.2",
    "stripe": "^12.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

---

## File: server/server.js

```js
// server/server.js
require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4242;

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.error('Missing STRIPE_SECRET_KEY in environment. Copy server/.env.example -> server/.env and set keys.');
  process.exit(1);
}

const stripe = Stripe(stripeSecret, { apiVersion: '2023-08-16' });

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Health
app.get('/', (req, res) => res.send({ ok: true }));

// Create a Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    // Example: client can pass items, but in this simple example we'll accept optional data and validate.
    const { price = 1500, quantity = 1, name = 'Test Product' } = req.body || {};

    if (!Number.isInteger(price) || price <= 0) {
      return res.status(400).json({ error: 'price must be a positive integer (in cents)' });
    }

    const YOUR_DOMAIN = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: String(name) },
            unit_amount: price,
          },
          quantity: quantity,
        },
      ],
      success_url: `${YOUR_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/cancelled`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
```

---

## File: client/package.json

```json
{
  "name": "stripe-local-client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
```

---

## File: client/src/index.js

```js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

---

## File: client/public/index.html

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stripe Local Client</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

---

## File: client/src/App.jsx

```jsx
import React, { useState } from 'react';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(1500);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('Test Product');
  const backend = 'http://localhost:4242';

  async function handleCheckout(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${backend}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(price), quantity: Number(quantity), name }),
      });
      const data = await res.json();
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location = data.url;
      } else {
        alert(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error(err);
      alert('Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 720, margin: '40px auto' }}>
      <h1>Stripe Checkout — Test local</h1>
      <p>Utilisez la carte de test <code>4242 4242 4242 4242</code> avec n'importe quelle date d'expiration et CVC.</p>

      <form onSubmit={handleCheckout} style={{ display: 'grid', gap: 12 }}>
        <label>
          Nom du produit
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
        </label>

        <label>
          Prix (en centimes) — ex: 1500 = 15.00€
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: '100%' }} />
        </label>

        <label>
          Quantité
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={1} style={{ width: '100%' }} />
        </label>

        <button type="submit" disabled={loading} style={{ padding: '12px 16px', fontSize: 16 }}>
          {loading ? 'Redirection...' : 'Payer via Stripe (Checkout)'}
        </button>
      </form>

      <hr />
      <p>Après paiement, Stripe vous redirigera vers <code>/success</code> ou <code>/cancelled</code> sur le frontend. Vous pouvez ajouter ces routes pour afficher le résultat.</p>
    </div>
  );
}
```

---

## File: client/src/setupTests.js

```js
// left empty - react-scripts default
```

---

## Additional suggestions

- If you want to verify payment completion server-side you should implement a webhook endpoint and use `stripe.webhooks.constructEvent`. For local testing, use `stripe listen --forward-to localhost:4242/webhook`.
- In production, never expose your secret key to the frontend. Use HTTPS.

---

That's everything — create the files, install dependencies in `server` and `client` and run both. Good luck!
