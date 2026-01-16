import type { NextApiRequest, NextApiResponse } from 'next';

// Fetch checkout_url from Shopify Admin API by order_id
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Accept both checkout_id and id for flexibility
  const checkout_id = req.query.checkout_id || req.query.id;
  if (!checkout_id) {
    return res.status(400).json({ error: 'Missing checkout_id' });
  }

  const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
  const SHOPIFY_ADMIN_API_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  if (!SHOPIFY_SHOP || !SHOPIFY_ADMIN_API_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Shopify credentials not set' });
  }

  try {
    // Remove # if present (e.g. #12345 -> 12345)
    const cleanCheckoutId = String(checkout_id).replace(/^#/, '');
    const url = `https://${SHOPIFY_SHOP}/admin/api/2025-04/checkouts/${cleanCheckoutId}.json`;
    const shopifyRes = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    if (!shopifyRes.ok) {
      return res.status(shopifyRes.status).json({ error: 'Shopify API error', details: await shopifyRes.text() });
    }
    const data = await shopifyRes.json();
    // The checkout object should have a checkout_url field
    const checkout_url = data.checkout?.abandoned_checkout_url || data.checkout?.checkout_url || data.checkout?.web_url || null;
    if (!checkout_url) {
      return res.status(404).json({ error: 'Checkout URL not found for this checkout' });
    }
    return res.status(200).json({ checkout_url });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch from Shopify', details: (err as Error).message });
  }
}
