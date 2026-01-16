import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
  const SHOPIFY_ADMIN_API_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

  if (!SHOPIFY_SHOP || !SHOPIFY_ADMIN_API_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Shopify credentials not set' });
  }

  const { start, end, email } = req.query;

  // Require email for this endpoint
  if (!email) {
    return res.status(400).json({ error: 'Missing email parameter' });
  }

  // Default: past 7 days if no start provided
  const createdAtMin = start ? String(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const createdAtMax = end ? `&created_at_max=${encodeURIComponent(String(end))}` : '';
  const emailFilter = `&email=${encodeURIComponent(String(email))}`;

  const url = `https://${SHOPIFY_SHOP}/admin/api/2025-04/checkouts.json?created_at_min=${encodeURIComponent(createdAtMin)}${createdAtMax}${emailFilter}`;

  try {
    const shopifyRes = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!shopifyRes.ok) {
      return res.status(shopifyRes.status).json({
        error: 'Shopify API error',
        details: await shopifyRes.text(),
      });
    }

    const data = await shopifyRes.json();

    // Extract all checkout URLs from abandoned checkouts for this email
    const checkouts = data.checkouts || [];
    const urls = checkouts
      .filter((checkout: any) => (checkout.abandoned_checkout_url || checkout.checkout_url) && checkout.email === email)
      .map((checkout: any) => ({
        id: checkout.id,
        email: checkout.email,
        created_at: checkout.created_at,
        checkout_url: checkout.abandoned_checkout_url || checkout.checkout_url,
      }));

    return res.status(200).json({ count: urls.length, urls });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to fetch from Shopify',
      details: (err as Error).message,
    });
  }
}
