import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Map MySQL row to Lead type used in frontend
function mapMysqlRowToLead(row: any) {
  return {
    id: String(row.id),
    name: row.full_name || '',
    email: row.email_address || '',
    phone: row.contact_number || '',
    source: 'MySQL', // distinguish source
    product: row.product_name || '',
    status: 'Imported', // or map if you have a status field
    value: 0, // No value field in your table, set to 0 or parse if you add it
    quantity: row.quantity_required !== undefined ? Number(row.quantity_required) : undefined,
    notes: row.message || '',
    createdat: row.created_date ? new Date(row.created_date).toISOString().split('T')[0] : '',
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    const [rows] = await connection.execute('SELECT * FROM form_bulk_order_enq');
    await connection.end();
    const leads = Array.isArray(rows) ? rows.map(mapMysqlRowToLead) : [];
    res.status(200).json(leads);
  } catch (err: any) {
    console.error('MySQL fetch error:', err);
    // Return error message for debugging (remove in production)
    res.status(500).json({ error: 'Failed to fetch leads from MySQL', details: err && err.message ? err.message : String(err) });
  }
}
