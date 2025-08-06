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

// ===== USER MANAGEMENT FUNCTIONS =====

/**
 * Create or update a user in the database
 * @param {Object} userData - User data object
 * @returns {Object} Result with success status and user info
 */
async function createOrUpdateUser(userData) {
  let conn;
  try {
    conn = await pool.getConnection();

    const {
      userID,
      email,
      firstName,
      lastName,
      isAuthenticated = false,
      deviceInfo = null,
      appVersion = null
    } = userData;

    // Check if user exists
    const existingUser = await conn.query(
      "SELECT id, email FROM users WHERE id = ? OR email = ?",
      [userID, email]
    );

    let user;
    if (existingUser.length > 0) {
      // Update existing user
      await conn.query(
        `UPDATE users SET
         first_name = ?,
         last_name = ?,
         is_authenticated = ?,
         last_login_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ? OR email = ?`,
        [firstName, lastName, isAuthenticated, userID, email]
      );

      user = {
        id: existingUser[0].id,
        email: existingUser[0].email,
        updated: true
      };
    } else {
      // Create new user
      await conn.query(
        `INSERT INTO users (id, email, first_name, last_name, is_authenticated, last_login_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userID, email, firstName, lastName, isAuthenticated]
      );

      user = {
        id: userID,
        email: email,
        created: true
      };
    }

    // Update or create device info if provided
    if (deviceInfo && userID) {
      await createOrUpdateUserDevice(userID, deviceInfo, appVersion);
    }

    // Update user analytics
    await updateUserAnalytics(user.id, 'login');

    // Log activity
    await logUserActivity(user.id, 'login', { ip_address: deviceInfo?.ip_address });

    return {
      success: true,
      user: user
    };

  } catch (err) {
    console.error("Error creating/updating user:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Get user by ID or email
 * @param {string} identifier - User ID or email
 * @returns {Object|null} User object or null if not found
 */
async function getUserById(identifier) {
  let conn;
  try {
    conn = await pool.getConnection();

    const user = await conn.query(
      `SELECT u.*,
       COUNT(DISTINCT ud.id) as device_count,
       ua.total_articles_analyzed,
       ua.total_articles_viewed
       FROM users u
       LEFT JOIN user_devices ud ON u.id = ud.user_id AND ud.is_active = TRUE
       LEFT JOIN user_analytics ua ON u.id = ua.user_id
       WHERE u.id = ? OR u.email = ?
       GROUP BY u.id`,
      [identifier, identifier]
    );

    if (user.length === 0) return null;

    // Convert BigInt values to strings/numbers for JSON serialization
    const userData = user[0];
    Object.keys(userData).forEach(key => {
      if (typeof userData[key] === 'bigint') {
        userData[key] = Number(userData[key]);
      }
    });

    return userData;

  } catch (err) {
    console.error("Error fetching user:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Create or update user device information
 * @param {string} userId - User ID
 * @param {Object} deviceInfo - Device information
 * @param {string} appVersion - App version
 * @returns {Object} Result with success status
 */
async function createOrUpdateUserDevice(userId, deviceInfo, appVersion) {
  let conn;
  try {
    conn = await pool.getConnection();

    const {
      deviceType = 'ios',
      deviceModel = '',
      osVersion = '',
      bundleId = 'com.newzcomp.bob',
      deviceToken = null
    } = deviceInfo;

    // Check if device exists for this user
    const existingDevice = await conn.query(
      "SELECT id FROM user_devices WHERE user_id = ? AND device_type = ? AND device_model = ?",
      [userId, deviceType, deviceModel]
    );

    if (existingDevice.length > 0) {
      // Update existing device
      await conn.query(
        `UPDATE user_devices SET
         device_token = ?,
         os_version = ?,
         app_version = ?,
         bundle_id = ?,
         last_seen_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [deviceToken, osVersion, appVersion, bundleId, existingDevice[0].id]
      );
    } else {
      // Create new device
      await conn.query(
        `INSERT INTO user_devices (user_id, device_token, device_type, device_model, os_version, app_version, bundle_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, deviceToken, deviceType, deviceModel, osVersion, appVersion, bundleId]
      );
    }

    return { success: true };

  } catch (err) {
    console.error("Error creating/updating user device:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {string} preferenceKey - Preference key
 * @param {Object} preferenceValue - Preference value (will be JSON)
 * @returns {Object} Result with success status
 */
async function updateUserPreferences(userId, preferenceKey, preferences) {
  let connection;
  try {
    connection = await pool.getConnection();

    console.log(`🔄 Updating preferences for user ${userId}, key: ${preferenceKey}`);
    console.log(`📝 Preferences to save:`, preferences);

    // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both insert and update
    const query = `
      INSERT INTO user_preferences (user_id, preference_key, preference_value, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        preference_value = VALUES(preference_value),
        updated_at = CURRENT_TIMESTAMP
    `;

    const result = await connection.execute(query, [
      userId,
      preferenceKey,
      JSON.stringify(preferences)
    ]);

    console.log(`✅ Preferences updated successfully. Affected rows: ${result.affectedRows}`);

    return {
      success: true,
      affectedRows: result.affectedRows,
      preferences: preferences
    };
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Get user preferences
 * @param {string} userId - User ID
 * @param {string} preferenceKey - Optional preference key to filter
 * @returns {Object} User preferences
 */
async function getUserPreferences(userId, preferenceKey = null) {
  let conn;
  try {
    conn = await pool.getConnection();

    let query = "SELECT preference_key, preference_value FROM user_preferences WHERE user_id = ?";
    let params = [userId];

    if (preferenceKey) {
      query += " AND preference_key = ?";
      params.push(preferenceKey);
    }

    const preferences = await conn.query(query, params);

    // Convert to object with parsed JSON values
    const result = {};
    preferences.forEach(pref => {
      try {
        result[pref.preference_key] = JSON.parse(pref.preference_value);
      } catch (e) {
        result[pref.preference_key] = pref.preference_value;
      }
    });

    return result;

  } catch (err) {
    console.error("Error fetching user preferences:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Log user activity
 * @param {string} userId - User ID
 * @param {string} activityType - Type of activity
 * @param {Object} activityData - Additional activity data
 * @returns {Object} Result with success status
 */
async function logUserActivity(userId, activityType, activityData = {}) {
  let conn;
  try {
    conn = await pool.getConnection();

    await conn.query(
      `INSERT INTO user_activity_log (user_id, activity_type, activity_data, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        activityType,
        JSON.stringify(activityData),
        activityData.ip_address || null,
        activityData.user_agent || null
      ]
    );

    return { success: true };

  } catch (err) {
    console.error("Error logging user activity:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Update user analytics
 * @param {string} userId - User ID
 * @param {string} activityType - Type of activity for analytics
 * @returns {Object} Result with success status
 */
async function updateUserAnalytics(userId, activityType) {
  let conn;
  try {
    conn = await pool.getConnection();

    // Create analytics record if it doesn't exist
    await conn.query(
      `INSERT IGNORE INTO user_analytics (user_id) VALUES (?)`,
      [userId]
    );

    // Update based on activity type
    switch (activityType) {
      case 'login':
        await conn.query(
          `UPDATE user_analytics SET
           total_login_sessions = total_login_sessions + 1,
           updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [userId]
        );
        break;
      case 'analyze_article':
        await conn.query(
          `UPDATE user_analytics SET
           total_articles_analyzed = total_articles_analyzed + 1,
           last_analysis_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [userId]
        );
        break;
      case 'view_article':
        await conn.query(
          `UPDATE user_analytics SET
           total_articles_viewed = total_articles_viewed + 1,
           updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [userId]
        );
        break;
    }

    return { success: true };

  } catch (err) {
    console.error("Error updating user analytics:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Get user overview with statistics
 * @param {string} userId - User ID
 * @returns {Object} User overview data
 */
async function getUserOverview(userId) {
  let conn;
  try {
    conn = await pool.getConnection();

    const overview = await conn.query(
      "SELECT * FROM user_overview WHERE id = ?",
      [userId]
    );

    if (overview.length === 0) return null;

    // Convert BigInt values to numbers for JSON serialization
    const overviewData = overview[0];
    Object.keys(overviewData).forEach(key => {
      if (typeof overviewData[key] === 'bigint') {
        overviewData[key] = Number(overviewData[key]);
      }
    });

    return overviewData;

  } catch (err) {
    console.error("Error fetching user overview:", err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Delete user and all associated data
 * @param {string} userId - User ID
 * @returns {Object} Result with success status
 */
async function deleteUser(userId) {
  let conn;
  try {
    conn = await pool.getConnection();

    // MariaDB will cascade delete related records due to foreign key constraints
    await conn.query("DELETE FROM users WHERE id = ?", [userId]);

    return { success: true };

  } catch (err) {
    console.error("Error deleting user:", err);
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
  logNotification,
  createOrUpdateUser,
  getUserById,
  updateUserPreferences,
  getUserPreferences,
  logUserActivity,
  updateUserAnalytics,
  getUserOverview,
  deleteUser
};