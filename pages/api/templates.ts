import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Fetch all templates
    try {
      const { rows } = await pool.query('SELECT * FROM templates ORDER BY id ASC')
      return res.status(200).json(rows)
    } catch (error: any) {
      console.error('Postgres fetch error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    // Add a new template
    const { type, name, text, category, isStarred, usageCount } = req.body
    if (!type || !name || !text || !category) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    try {
      const insertQuery = `
        INSERT INTO templates (type, name, text, category, "isStarred", "usageCount")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `
      const values = [type, name, text, category, isStarred ?? false, usageCount ?? 0]
      const { rows } = await pool.query(insertQuery, values)
      return res.status(201).json(rows[0])
    } catch (error: any) {
      console.error('Postgres insert error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  if (req.method === 'PUT') {
    // Update a template
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'Missing id' })

    const fields = Object.keys(updates)
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' })

    // Quote field names to preserve camelCase
    const setClause = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ')
    const values = fields.map(f => updates[f])

    try {
      const updateQuery = `
        UPDATE templates
        SET ${setClause}
        WHERE id = $${fields.length + 1}
        RETURNING *
      `
      const { rows } = await pool.query(updateQuery, [...values, id])
      if (!rows[0]) return res.status(404).json({ error: 'Template not found' })
      return res.status(200).json(rows[0])
    } catch (error: any) {
      console.error('Postgres update error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  if (req.method === 'DELETE') {
    // Delete a template
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Missing id' })
    try {
      const deleteQuery = 'DELETE FROM templates WHERE id = $1'
      await pool.query(deleteQuery, [id])
      return res.status(204).end()
    } catch (error: any) {
      console.error('Postgres delete error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
