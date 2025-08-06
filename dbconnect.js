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

// ===== PUSH NOTIFICATION DATABASE FUNCTIONS =====

/**
 * Register or update a device token for push notifications
 */
async function registerDeviceToken(deviceData) {
  let conn;
  try {
    conn = await pool.getConnection();

    // Check if device token already exists
    const existing = await conn.query(
      "SELECT id FROM device_tokens WHERE device_token = ?",
      [deviceData.device_token]
    );

    if (existing.length > 0) {
      // Update existing record
      await conn.query(
        `UPDATE device_tokens SET
         app_version = ?,
         device_model = ?,
         os_version = ?,
         last_active = CURRENT_TIMESTAMP,
         active = true
         WHERE device_token = ?`,
        [
          deviceData.app_version,
          deviceData.device_model,
          deviceData.os_version,
          deviceData.device_token
        ]
      );
      console.log('Device token updated:', deviceData.device_token.substring(0, 10) + '...');
      return { success: true, action: 'updated' };
    } else {
      // Insert new record
      await conn.query(
        `INSERT INTO device_tokens (
          device_token, platform, app_version, bundle_id,
          device_model, os_version, user_preferences, notification_categories
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deviceData.device_token,
          deviceData.platform || 'ios',
          deviceData.app_version,
          deviceData.bundle_id || 'com.newzcomp.bob',
          deviceData.device_model,
          deviceData.os_version,
          JSON.stringify(deviceData.user_preferences || {}),
          JSON.stringify(deviceData.notification_categories || ['breaking_news', 'analysis_complete', 'weekly_report'])
        ]
      );
      console.log('Device token registered:', deviceData.device_token.substring(0, 10) + '...');
      return { success: true, action: 'created' };
    }
  } catch (err) {
    console.error("Error registering device token:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Get all active device tokens for push notifications
 */
async function getActiveDeviceTokens(platform = 'ios') {
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query(
      "SELECT device_token, notification_categories, user_preferences FROM device_tokens WHERE active = true AND platform = ?",
      [platform]
    );
    return res;
  } catch (err) {
    console.error("Error fetching active device tokens:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Get device tokens that want a specific notification type
 */
async function getDeviceTokensForNotificationType(notificationType, platform = 'ios') {
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query(
      `SELECT device_token, user_preferences
       FROM device_tokens
       WHERE active = true
       AND platform = ?
       AND JSON_CONTAINS(notification_categories, ?)`,
      [platform, JSON.stringify(notificationType)]
    );
    return res;
  } catch (err) {
    console.error("Error fetching device tokens for notification type:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Deactivate a device token
 */
async function deactivateDeviceToken(deviceToken) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      "UPDATE device_tokens SET active = false WHERE device_token = ?",
      [deviceToken]
    );
    console.log('Device token deactivated:', deviceToken.substring(0, 10) + '...');
    return { success: true };
  } catch (err) {
    console.error("Error deactivating device token:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Clean up invalid/expired device tokens
 */
async function cleanupInvalidTokens() {
  let conn;
  try {
    conn = await pool.getConnection();
    // Deactivate tokens that haven't been active for 30 days
    const result = await conn.query(
      "UPDATE device_tokens SET active = false WHERE last_active < DATE_SUB(NOW(), INTERVAL 30 DAY) AND active = true"
    );
    console.log(`Cleaned up ${result.affectedRows} inactive device tokens`);
    return { success: true, cleaned: result.affectedRows };
  } catch (err) {
    console.error("Error cleaning up device tokens:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Update user notification preferences
 */
async function updateNotificationPreferences(deviceToken, preferences) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      "UPDATE device_tokens SET user_preferences = ?, notification_categories = ? WHERE device_token = ?",
      [
        JSON.stringify(preferences.user_preferences || {}),
        JSON.stringify(preferences.notification_categories || ['breaking_news', 'analysis_complete', 'weekly_report']),
        deviceToken
      ]
    );
    console.log('Notification preferences updated for:', deviceToken.substring(0, 10) + '...');
    return { success: true };
  } catch (err) {
    console.error("Error updating notification preferences:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Log a sent notification
 */
async function logNotification(deviceToken, notificationType, title, body, payload, status = 'sent', errorMessage = null) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO notification_logs
       (device_token, notification_type, title, body, payload, delivery_status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceToken,
        notificationType,
        title,
        body,
        JSON.stringify(payload),
        status,
        errorMessage
      ]
    );
  } catch (err) {
    console.error("Error logging notification:", err);
    // Don't throw here as this is just logging
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

module.exports = {
  asyncFunction,
  closePool,
  getHistoricArticleMetadata,
  getHistoricArticleById,
  getLatestArticleById,
  loadAllowedDomains,
  insertDailyNewsArticles,
  getLatestArticlesByTheme,
  registerDeviceToken,
  getActiveDeviceTokens,
  getDeviceTokensForNotificationType,
  deactivateDeviceToken,
  cleanupInvalidTokens,
  updateNotificationPreferences,
  logNotification
};