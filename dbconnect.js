require('dotenv').config();

const mariadb = require('mariadb');
console.log("Connecting to MariaDB...");

const pool = mariadb.createPool({
     host: process.env.DB_HOST,
     user: process.env.DB_USER,
     port: process.env.DB_PORT,
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME,
     connectionLimit: 5
});

async function asyncFunction(title, analysis, source_name, source_url, keyword) {
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query("INSERT INTO historic_analysis (title, analysis, source_name, source_url, keyword) VALUES (?, ?, ?, ?, ?)",
      [title, JSON.stringify(analysis), source_name, source_url, keyword]);
    console.log(res);

  } catch (err) {
    throw err;
  } finally {
    if (conn) conn.end();
  }
}

async function getHistoricArticleMetadata() {
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query("SELECT bobid, title, query_date, source_name, source_url, keyword FROM historic_analysis");
    return res;
  } catch (err) {
    console.error("Error fetching historic article metadata:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

async function getHistoricArticleById(bobid) {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log("Fetching article with ID:", bobid);
    const res = await conn.query("SELECT bobid, title, analysis, query_date, source_name, source_url, keyword FROM historic_analysis WHERE bobid = ?", [bobid]);
    return res[0];
  } catch (err) {
    console.error("Error fetching historic article by ID:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

function closePool() {
  return pool.end().then(() => {
    console.log("Connection pool closed.");
  }).catch(err => {
    console.error("Error closing the connection pool:", err);
  });
}

module.exports = { asyncFunction, closePool, getHistoricArticleMetadata, getHistoricArticleById };