const express = require("express");
const { Client } = require("pg");
const app = express();

const {
  DB_HOST = "localhost",
  DB_PORT = 5432,
  DB_USER = "postgres",
  DB_PASSWORD = "postgres",
  DB_NAME = "postgres",
} = process.env;

// ルートは常に Hello（見た目用）
app.get("/", (_req, res) => {
  res.status(200).send("Hello from Docker container!");
});

// DB疎通チェックは /db-check に分離
app.get("/db-check", async (_req, res) => {
  const client = new Client({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
  try {
    await client.connect();
    const r = await client.query("SELECT 1 as ok");
    res.status(200).json({ db: "ok", result: r.rows[0] });
  } catch (e) {
    res.status(500).json({ db: "ng", error: e.message });
  } finally {
    await client.end().catch(() => {});
  }
});

app.listen(3000, () => console.log("Server on :3000"));
