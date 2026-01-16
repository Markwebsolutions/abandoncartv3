import type { NextApiRequest, NextApiResponse } from "next";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL, // Set this in Railway project settings
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const shop = process.env.SHOPIFY_SHOP
  const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN

  if (!shop || !accessToken) {
    return res.status(500).json({ error: "Shopify credentials are not set in environment variables." })
  }

  // SYNC: Only fetch new entries from Shopify and store in Postgres
  if (req.method === "POST" || req.query.sync === "1") {
    // Get latest created_at from Postgres
    let latestCreatedAt: string | null = null;
    try {
      const latestResult = await pool.query(`SELECT created_at FROM abandoned_checkouts ORDER BY created_at DESC LIMIT 1`);
      if (latestResult.rows.length > 0) {
        latestCreatedAt = latestResult.rows[0].created_at;
      }
    } catch (latestErr) {
      console.error("Postgres latest fetch error:", latestErr);
      return res.status(500).json({ error: (latestErr as Error).message });
    }
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    let createdAtMin = threeDaysAgo.toISOString();
    if (latestCreatedAt && new Date(latestCreatedAt) > threeDaysAgo) {
      createdAtMin = new Date(latestCreatedAt).toISOString();
    }

    let newCheckouts: any[] = [];
    let nextPageUrl: string | null = `https://${shop}/admin/api/2025-04/checkouts.json?status=abandoned&limit=250&created_at_min=${encodeURIComponent(createdAtMin)}`;
    try {
      while (nextPageUrl) {
        const response: Response = await fetch(nextPageUrl, {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const error = await response.text();
          console.error("Shopify API error:", response.status, error)
          return res.status(response.status).json({ error });
        }
        const data = await response.json();
        newCheckouts = newCheckouts.concat(data.checkouts || []);
        const linkHeader: string | null = response.headers.get("link");
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const match: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>; rel="next"/);
          nextPageUrl = match ? match[1] : null;
        } else {
          nextPageUrl = null;
        }
      }
      // Insert new checkouts into Postgres (ignore duplicates)
      for (const checkout of newCheckouts) {
        try {
          await pool.query(
            `INSERT INTO abandoned_checkouts (id, created_at, updated_at, customer, email, phone, cart_value, items, raw) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at, customer = EXCLUDED.customer, email = EXCLUDED.email, phone = EXCLUDED.phone, cart_value = EXCLUDED.cart_value, items = EXCLUDED.items, raw = EXCLUDED.raw`,
            [
              checkout.id,
              checkout.created_at,
              checkout.updated_at,
              checkout.customer,
              checkout.email,
              checkout.phone,
              checkout.subtotal_price,
              JSON.stringify(checkout.line_items),
              JSON.stringify(checkout),
            ]
          );
        } catch (upsertErr) {
          console.error("Postgres upsert error for checkout", checkout.id, upsertErr);
        }
      }
      // Return count of all entries after sync
      const countResult = await pool.query(`SELECT COUNT(id) FROM abandoned_checkouts`);
      const totalCount = countResult.rows[0]?.count || 0;
      return res.status(200).json({ inserted: newCheckouts.length, totalCount });
    } catch (error) {
      console.error("Sync catch error:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  // PATCH: Update status or priority for a cart (Postgres only)
  if (req.method === "PATCH") {
    const { cartId, field, value } = req.body;
    if (!cartId || !field) {
      return res.status(400).json({ error: "cartId and field are required" });
    }
    try {
      await pool.query(
        `UPDATE abandoned_checkouts SET ${field} = $1 WHERE id = $2`,
        [value, cartId]
      );
      return res.status(200).json({ success: true });
    } catch (pgErr) {
      return res.status(500).json({ error: (pgErr as Error).message });
    }
  }

  // GET: If shopify=1, fetch directly from Shopify API (live data, not Supabase)
  if (req.method === "GET" && req.query.shopify === "1") {
    try {
      let startDate = req.query.start_date as string | undefined;
      let endDate = req.query.end_date as string | undefined;
      const now = new Date();
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(now.getDate() - 3);
      if (!startDate) startDate = threeDaysAgo.toISOString();
      if (!endDate) endDate = now.toISOString();
      startDate = startDate || '';
      endDate = endDate || '';
      let url = `https://${shop}/admin/api/2025-04/checkouts.json?status=abandoned&limit=250&created_at_min=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&created_at_max=${encodeURIComponent(endDate)}`;
      let allCheckouts: any[] = [];
      let nextPageUrl: string = url;
      while (nextPageUrl) {
        const response = await fetch(nextPageUrl, {
          headers: {
            "X-Shopify-Access-Token": String(accessToken),
            "Content-Type": "application/json",
          } as Record<string, string>,
        });
        if (!response.ok) {
          const error = await response.text();
          return res.status(response.status).json({ error });
        }
        const data = await response.json();
        const checkouts = data.checkouts || [];
        allCheckouts = allCheckouts.concat(checkouts);
        const linkHeader = response.headers.get("link");
        if (linkHeader && typeof linkHeader === 'string' && linkHeader.includes('rel="next"')) {
          const match = linkHeader.match(/<([^>]+)>; rel="next"/);
          if (match && Array.isArray(match) && match[1]) {
            nextPageUrl = match[1];
          } else {
            nextPageUrl = '';
          }
        } else {
          nextPageUrl = '';
        }
      }
      return res.status(200).json({ checkouts: allCheckouts, total: allCheckouts.length });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  // GET: Serve all date-filtered data from Postgres only (no limit/offset)
  if (req.method === "GET") {
    try {
      let startDate = req.query.start_date as string | undefined;
      let endDate = req.query.end_date as string | undefined;
      const now = new Date();
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(now.getDate() - 3);
      if (!startDate) startDate = threeDaysAgo.toISOString();
      if (!endDate) endDate = now.toISOString();
      let query = `SELECT *, COUNT(*) OVER() as total FROM abandoned_checkouts WHERE 1=1`;
      const params: any[] = [];
      let paramIdx = 1;
      if (startDate) {
        query += ` AND created_at >= $${paramIdx++}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND created_at <= $${paramIdx++}`;
        params.push(endDate);
      }
      query += ` ORDER BY created_at DESC`;
      const result = await pool.query(query, params);
      const checkouts = result.rows;
      const total = checkouts[0]?.total || 0;
      return res.status(200).json({ checkouts, total });
    } catch (pgErr) {
      return res.status(500).json({ error: (pgErr as Error).message });
    }
  }
}
