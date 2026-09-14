import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Your two real Price IDs from Stripe
const PRICE_IDS = {
  single: 'price_1UFbheFIEBxYaQ0Vo1BhGodz',
  couple: 'price_1UFbiLFIEBxYaQ0V0trNXMjo',
};

export default async function handler(req, res) {
  // Allow the browser on your GitHub Pages site to call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticketType } = req.body;
  const priceId = PRICE_IDS[ticketType];

  if (!priceId) {
    return res.status(400).json({ error: 'Invalid ticket type' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      custom_fields: [
        {
          key: 'full_name',
          label: { type: 'custom', custom: 'Full Name' },
          type: 'text',
          optional: false,
        },
      ],
      return_url: 'https://larueclassof06.com/return?session_id={CHECKOUT_SESSION_ID}',
    });

    res.status(200).json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong creating the checkout session' });
  }
}
