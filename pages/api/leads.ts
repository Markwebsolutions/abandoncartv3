import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL
, // Set this in Railway project settings
});
const TABLE = 'leads';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Fetch all leads, including mysql_id if present
      const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY createdat DESC`);
      return res.status(200).json(result.rows || []);
    }

    if (req.method === 'POST') {
      // Insert new lead, support mysql_id for deduplication
      const newLead = req.body;
      if (!newLead.id) delete newLead.id;
      if (typeof newLead.value === "string") {
        newLead.value = parseFloat(newLead.value) || 0;
      }
      if (newLead.quantity !== undefined && newLead.quantity !== null && newLead.quantity !== '') {
        newLead.quantity = parseInt(newLead.quantity, 10) || 1;
      }
      // If mysql_id is present, check for existing record
      if (newLead.mysql_id) {
        const check = await pool.query(`SELECT * FROM ${TABLE} WHERE mysql_id = $1 LIMIT 1`, [newLead.mysql_id]);
        if (check.rows && check.rows.length > 0) {
          // Return existing record
          return res.status(200).json(check.rows[0]);
        }
      }
      // Build insert query dynamically
      const keys = Object.keys(newLead);
      const values = Object.values(newLead);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const query = `INSERT INTO ${TABLE} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await pool.query(query, values);
      // Return the created record (including id)
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const { id, ...fieldsToUpdate } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing id' });
      }
      Object.keys(fieldsToUpdate).forEach(
        (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
      );
      if (fieldsToUpdate.value !== undefined && typeof fieldsToUpdate.value === "string") {
        fieldsToUpdate.value = parseFloat(fieldsToUpdate.value) || 0;
      }
      if (fieldsToUpdate.quantity !== undefined && fieldsToUpdate.quantity !== null && fieldsToUpdate.quantity !== '') {
        fieldsToUpdate.quantity = parseInt(fieldsToUpdate.quantity, 10) || 1;
      }
      // Build update query dynamically
      const keys = Object.keys(fieldsToUpdate);
      const values = Object.values(fieldsToUpdate);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      const query = `UPDATE ${TABLE} SET ${setClause} WHERE id = $${keys.length + 1}`;
      await pool.query(query, [...values, id]);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || req.query;
      if (!id) return res.status(400).json({ message: 'Missing lead id' });
      await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
      return res.status(200).json({ message: 'Lead deleted successfully' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('API error:', error); // Add this line
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
