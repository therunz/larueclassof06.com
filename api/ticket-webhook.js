import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Vercel needs the raw, unparsed body to verify Stripe's signature
export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const TICKET_LABELS = {
  single: 'Single Ticket',
  couple: 'Couple Ticket',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const ticketType = session.metadata?.ticketType;
    const nameField = session.custom_fields?.find((f) => f.key === 'full_name');
    const name = nameField?.text?.value || 'there';

    if (email) {
      try {
        await resend.emails.send({
          from: 'tickets@larueclassof06.com',
          to: email,
          subject: 'Your Larue County Class of 2006 Reunion Ticket',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <img src="https://larueclassof06.com/Ticket.png" alt="Larue County Class of 2006 Reunion" width="480" style="display:block; margin-bottom: 16px; max-width: 100%;">
              <h2 style="color:#101d3a;">You're all set, ${name}!</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Ticket type:</strong> ${TICKET_LABELS[ticketType] || 'Reunion Ticket'}</p>
              <p><strong>Saturday, October 17, 2026</strong><br>6:00 PM &ndash; 11:00 PM</p>
              <p><strong>Kayla's Fill-Up Station</strong><br>928 Old Elizabethtown Rd.<br>Hodgenville, KY 42748</p>
              <p>Show this email at the door. Can't wait to see you there!</p>
            </div>
          `,
        });
        console.log(`Ticket email sent to ${email}`);
      } catch (err) {
        console.error('Failed to send ticket email:', err);
      }
    } else {
      console.error('No email found on completed session:', session.id);
    }
  }

  res.status(200).json({ received: true });
}
