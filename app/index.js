const express = require('express');
const { Client } = require('pg');
const app = express();

app.get('/', async (_, res) => {
  try {
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres'
    });
    await client.connect();
    const r = await client.query('SELECT 1 as ok');
    await client.end();
    res.send(`OK: ${r.rows[0].ok}`);
  } catch (e) {
    res.status(200).send('Hello from Docker container! (DB未接続でも表示)');
  }
});

app.listen(3000, () => console.log('Server on :3000'));
