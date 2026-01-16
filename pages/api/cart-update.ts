
import type { NextApiRequest, NextApiResponse } from "next"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
})

// Helper to update status/priority in abandoned_checkouts
async function updateCartStatusOrPriority(cart_id: string, field: string, value: string) {
  try {
    const updateQuery = `
      UPDATE abandoned_checkouts
      SET ${field} = $1
      WHERE id = $2
      RETURNING *
    `
    const { rows } = await pool.query(updateQuery, [value, cart_id])
    return { data: rows, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { cart_id, remark_id, field, value } = req.body
    console.log("cart-update POST:", { cart_id, remark_id, field, value })
    if (!field) {
      return res.status(400).json({ error: "field is required" })
    }
    // If cart-level status/priority change, create a new remark AND update abandoned_checkouts
    if (cart_id && !remark_id && (field === 'status' || field === 'priority')) {
      try {
        // Insert a new remark logging the status/priority change
        const insertRemarkQuery = `
          INSERT INTO abandoned_cart_remarks (cart_id, ${field}, type, message, agent)
          VALUES ($1, $2, 'system', $3, 'System')
          RETURNING *
        `
        const message = `Cart ${field} changed to ${value}`
        const { rows: remarkRows } = await pool.query(insertRemarkQuery, [cart_id, value, message])
        // Also update the main abandoned_checkouts table
        const { data: cartData, error: cartError } = await updateCartStatusOrPriority(cart_id, field, value)
        if (cartError) {
          console.error('Postgres update error (cart-level status/priority):', cartError)
          return res.status(500).json({ error: cartError.message || String(cartError) })
        }
        return res.status(200).json({ remark: remarkRows[0], cart: cartData })
      } catch (error: any) {
        console.error('Postgres insert error (cart-level status/priority):', error)
        return res.status(500).json({ error: error.message || String(error) })
      }
    }
    // Update abandoned_checkouts for other cart-level fields
    if (cart_id && !remark_id) {
      try {
        const updateQuery = `
          UPDATE abandoned_checkouts
          SET ${field} = $1
          WHERE id = $2
          RETURNING *
        `
        const { rows } = await pool.query(updateQuery, [value, cart_id])
        if (!rows || rows.length === 0) {
          console.warn('No cart updated for id:', cart_id)
          return res.status(404).json({ error: "Cart not found or not updated" })
        }
        return res.status(200).json({ data: rows })
      } catch (error: any) {
        console.error('Postgres update error (cart):', error)
        return res.status(500).json({ error: error.message || String(error) })
      }
    }
    // Update abandoned_cart_remarks if remark_id is present
    if (remark_id) {
      // Only allow updating status or priority for remarks
      if (field !== 'status' && field !== 'priority') {
        return res.status(400).json({ error: "Only status or priority can be updated for remarks" })
      }
      try {
        const updateRemarkQuery = `
          UPDATE abandoned_cart_remarks
          SET ${field} = $1
          WHERE id = $2
          RETURNING *
        `
        const { rows } = await pool.query(updateRemarkQuery, [value, remark_id])
        if (!rows || rows.length === 0) {
          console.warn('No remark updated for id:', remark_id)
          return res.status(404).json({ error: "Remark not found or not updated" })
        }
        return res.status(200).json({ data: rows })
      } catch (error: any) {
        console.error('Postgres update error (remark):', error)
        return res.status(500).json({ error: error.message || String(error) })
      }
    }
    // If neither cart_id nor remark_id is present
    return res.status(400).json({ error: "cart_id or remark_id is required" })
  }
  res.status(405).json({ error: "Method not allowed" })
}
