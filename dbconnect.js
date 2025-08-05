require('dotenv').config();

const mariadb = require('mariadb');
const { v4: uuidv4 } = require('uuid');
console.log("Connecting to MariaDB...");

const pool = mariadb.createPool({
     host: process.env.DB_HOST,
     user: process.env.DB_USER,
     port: process.env.DB_PORT,
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME,
     connectionLimit: 5
});

async function loadAllowedDomains() {
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query("SELECT domain FROM allowed_sources");
    allowedDomains = res.map(row => row.domain);
    console.log("Allowed domains loaded:", allowedDomains);
    return allowedDomains;
  } catch (err) {
    console.error("Error loading allowed domains from DB:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

async function asyncFunction(title, analysis, source_name, source_url, topic = '', summary = '', image_url = '', author = '', related_articles = null) {
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query(
      "INSERT INTO historic_analysis (title, analysis, source_name, source_url, topic, summary, image_url, author, related_articles) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        title,
        JSON.stringify(analysis),
        source_name,
        source_url,
        topic,
        summary,
        image_url,
        author,
        related_articles ? JSON.stringify(related_articles) : null
      ]
    );
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
    const res = await conn.query("SELECT bobid, title, query_date, source_name, source_url, keyword, image_url FROM historic_analysis");
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
    const res = await conn.query("SELECT bobid, title, analysis, query_date, source_name, source_url, keyword, topic, author, image_url, summary, related_articles FROM historic_analysis WHERE bobid = ?", [bobid]);
    return res[0];
  } catch (err) {
    console.error("Error fetching historic article by ID:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

async function getLatestArticleById(bobid) {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log("Fetching article with ID:", bobid);
    const res = await conn.query("SELECT id, topic, theme, news_date, url, title, summary,  analysis, related_articles, keywords, image_url, author, source, created_at, batchid FROM daily_news_articles WHERE id = ?", [bobid]);
    return res[0];
  } catch (err) {
    console.error("Error fetching historic article by ID:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

async function insertDailyNewsArticles(articles, batchid = null) {
  let conn;
  if (!batchid) {
    batchid = uuidv4();
  }
  try {
    conn = await pool.getConnection();
    const query = "INSERT INTO daily_news_articles (topic, theme, news_date, url, title, summary, analysis, related_articles, keywords, image_url, author, source, batchid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    for (const article of articles) {
      // Ensure analysis is stored as a JSON string (object or string input)
      let analysisField = article.analysis;
      if (typeof analysisField !== 'string') {
        analysisField = JSON.stringify(analysisField);
      }
      await conn.query(
        query,
        [
          article.topic,
          article.theme,
          article.news_date,
          article.url,
          article.title,
          article.summary,
          analysisField,
          JSON.stringify(article.related_articles),
          article.keywords,
          article.image_url,
          article.author,
          article.source,
          batchid
        ]
      );
    }
    return batchid;
  } finally {
    if (conn) await conn.end();
  }
}

async function getLatestArticlesByTheme(theme) {
  let conn;
  try {
    conn = await pool.getConnection();
    let articles;

    if (theme === 'all') {
      // Return all articles regardless of theme
      articles = await conn.query(
        'SELECT * FROM daily_news_articles ORDER BY news_date DESC, id DESC'
      );
    } else {
      // Return articles for specific theme
      articles = await conn.query(
        'SELECT * FROM daily_news_articles WHERE LOWER(theme) = ? ORDER BY news_date DESC, id DESC',
        [theme.toLowerCase()]
      );
    }

    return articles;
  } catch (err) {
    console.error("Error getting latest articles by theme:", err);
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

module.exports = { asyncFunction, closePool, getHistoricArticleMetadata, getHistoricArticleById, getLatestArticleById, loadAllowedDomains, insertDailyNewsArticles, getLatestArticlesByTheme };