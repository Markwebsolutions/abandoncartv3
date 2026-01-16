
import type { NextApiRequest, NextApiResponse } from "next"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Save a new remark/response
    const { cart_id, type, message, response, agent, status } = req.body
    try {
      const insertQuery = `
        INSERT INTO abandoned_cart_remarks (cart_id, type, message, response, agent, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `
      const values = [cart_id, type, message, response, agent, status]
      const { rows } = await pool.query(insertQuery, values)
      return res.status(200).json({ data: rows[0] })
    } catch (error: any) {
      console.error("POST /api/cart-remarks error:", error)
      return res.status(500).json({ error: error.message || "Internal server error" })
    }
  }

  if (req.method === "GET") {
    // Get all remarks for a cart
    const { cart_id } = req.query
    try {
      const selectQuery = `
        SELECT * FROM abandoned_cart_remarks
        WHERE cart_id = $1
        ORDER BY created_at ASC
      `
      const { rows } = await pool.query(selectQuery, [cart_id])
      return res.status(200).json({ data: rows })
    } catch (error: any) {
      console.error("GET /api/cart-remarks error:", error)
      return res.status(500).json({ error: error.message || "Internal server error" })
    }
  }

  if (req.method === "DELETE") {
    const { cart_id, remark_id } = req.query
    if (!cart_id || !remark_id) {
      return res.status(400).json({ error: "cart_id and remark_id required" })
    }
    try {
      const deleteQuery = `
        DELETE FROM abandoned_cart_remarks
        WHERE cart_id = $1 AND id = $2
      `
      await pool.query(deleteQuery, [cart_id, remark_id])
      // Return updated remarks
      const selectQuery = `
        SELECT * FROM abandoned_cart_remarks
        WHERE cart_id = $1
        ORDER BY created_at ASC
      `
      const { rows } = await pool.query(selectQuery, [cart_id])
      return res.status(200).json({ data: rows })
    } catch (error: any) {
      console.error("DELETE /api/cart-remarks error:", error)
      return res.status(500).json({ error: error.message || "Internal server error" })
    }
  }

  res.status(405).json({ error: "Method not allowed" })
}
