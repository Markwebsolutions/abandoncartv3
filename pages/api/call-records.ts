import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Configure your PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
})


// Helper to parse record from DB row
const parseRecord = (row: any) => ({
  id: row.id,
  date: row.date,
  customerName: row.customer_name,
  mobileNumber: row.mobile_number,
  remark: row.remark,
  callFor: row.call_for,
  remarks: row.remarks,
  status: row.status,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get all call records
    try {
      const result = await pool.query('SELECT * FROM call_records ORDER BY date DESC, id DESC');
      res.status(200).json(result.rows.map(parseRecord));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch call records' });
    }
  } else if (req.method === 'POST') {
    // Add a new call record
    const { date, customerName, mobileNumber, remark, callFor, remarks, status } = req.body;
    if (!mobileNumber || !remark) {
      return res.status(400).json({ error: 'Mobile number and remark are required' });
    }
    try {
      const result = await pool.query(
        'INSERT INTO call_records (date, customer_name, mobile_number, remark, call_for, remarks, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [date, customerName, mobileNumber, remark, callFor, remarks, status]
      );
      res.status(201).json(parseRecord(result.rows[0]));
    } catch (err) {
      res.status(500).json({ error: 'Failed to add call record' });
    }
  } else if (req.method === 'PUT') {
    // Update a call record
    const { id, date, customerName, mobileNumber, remark, callFor, remarks, status } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      const result = await pool.query(
        'UPDATE call_records SET date=$1, customer_name=$2, mobile_number=$3, remark=$4, call_for=$5, remarks=$6, status=$7 WHERE id=$8 RETURNING *',
        [date, customerName, mobileNumber, remark, callFor, remarks, status, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
      res.status(200).json(parseRecord(result.rows[0]));
    } catch (err) {
      res.status(500).json({ error: 'Failed to update call record' });
    }
  } else if (req.method === 'DELETE') {
    // Delete a call record
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      await pool.query('DELETE FROM call_records WHERE id=$1', [id]);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete call record' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
