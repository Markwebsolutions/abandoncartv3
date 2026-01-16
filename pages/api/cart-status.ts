
import type { NextApiRequest, NextApiResponse } from "next"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { cart_id, status, agent = "System" } = req.body
    if (!cart_id || !status) {
      return res.status(400).json({ error: "cart_id and status are required" })
    }
    try {
      const insertQuery = `
        INSERT INTO abandoned_cart_remarks (cart_id, type, message, status, agent)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `
      const values = [cart_id, "status-change", `Status changed to ${status}`, status, agent]
      const { rows } = await pool.query(insertQuery, values)
      return res.status(200).json({ data: rows[0] })
    } catch (error: any) {
      console.error("POST /api/cart-status error:", error)
      return res.status(500).json({ error: error.message || "Internal server error" })
    }
  }
  if (req.method === "GET") {
    const { cart_id } = req.query
    if (!cart_id) {
      return res.status(400).json({ error: "cart_id is required" })
    }
    try {
      const selectQuery = `
        SELECT status FROM abandoned_cart_remarks
        WHERE cart_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `
      const { rows } = await pool.query(selectQuery, [cart_id])
      return res.status(200).json({ status: rows[0]?.status || null })
    } catch (error: any) {
      console.error("GET /api/cart-status error:", error)
      return res.status(500).json({ error: error.message || "Internal server error" })
    }
  }
  res.status(405).json({ error: "Method not allowed" })
}
