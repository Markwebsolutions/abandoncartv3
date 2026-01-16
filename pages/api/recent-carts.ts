
import type { NextApiRequest, NextApiResponse } from "next"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL, // Set this in Railway project settings
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  try {
    // Pagination: get page from query, default to 1, 10 entries per page
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // Get total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) FROM abandoned_checkouts');
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch paginated carts
    const query = `SELECT id, customer, items, cart_value, created_at, updated_at, status, priority FROM abandoned_checkouts ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    const result = await pool.query(query, [pageSize, offset]);

    return res.status(200).json({
      data: result.rows,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (e: any) {
    console.error('API error:', e);
    return res.status(500).json({ error: e.message || "Unknown error" });
  }
}
