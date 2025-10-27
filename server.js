// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const fs = require('fs');
const https = require('https');
require('dotenv').config();
const { parseAnalysisSection } = require('./decode.js');
const {
  asyncFunction,
  getHistoricArticleMetadata,
  getHistoricArticleById,
  getLatestArticleById,
  closePool,
  loadAllowedDomains,
  getLatestArticlesByTheme,
  registerDeviceToken,
  getActiveDeviceTokens,
  getDeviceTokensForNotificationType,
  deactivateDeviceToken,
  cleanupInvalidTokens,
  updateNotificationPreferences,
  logNotification,
  // User management functions
  createOrUpdateUser,
  getUserById,
  updateUserPreferences,
  getUserPreferences,
  logUserActivity,
  updateUserAnalytics,
  getUserOverview,
  deleteUser
} = require('./dbconnect');
const { pushNotificationService } = require('./push_notify');
const allowedOrigins = ['https://bob.newzcomp.com', 'http://localhost:5173', 'https://localhost:5173', 'http://localhost:3001', 'https://localhost:3001', 'http://192.168.86.240:5173', 'http://192.168.86.231:5173', 'https://app.newzcomp.com', 'app.newzcomp.com','http://192.168.86.248:5173','https://bob.newzcomp.com:3001', 'http://192.168.86.92:5173'];
const app = express();
const port = process.env.PORT || 3001;
const { utils } = require('./utils');
const corsOptions = {
  origin: (origin, callback) => {
    console.log('CORS Request from origin:', origin);
    // Allow requests without origin (like from Node.js scripts, Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS error: Origin ${origin} not allowed`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['POST', 'GET', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
// SSL options with fallback for development
let serverOptions = null;
try {
  // Try multiple SSL certificate paths

  const sslPaths = [
    { key: '/home/cyberfx/ssl/privkey.pem', cert: '/home/cyberfx/ssl/fullchain.pem' },
    { key: '/etc/letsencrypt/live/newzcomp.com/privkey.pem', cert: '/etc/letsencrypt/live/newzcomp.com/fullchain.pem' },
    { key: '/etc/letsencrypt/live/bob.newzcomp.com/privkey.pem', cert: '/etc/letsencrypt/live/bob.newzcomp.com/fullchain.pem' }
  ];

  console.log('Looking for SSL certs...');
  sslPaths.forEach(p => {
    console.log(`Checking: key = ${p.key}, cert = ${p.cert}`);
    console.log('Key exists?', fs.existsSync(p.key));
    console.log('Cert exists?', fs.existsSync(p.cert));
  });


  for (const paths of sslPaths) {
    if (fs.existsSync(paths.key) && fs.existsSync(paths.cert)) {
      serverOptions = {
        key: fs.readFileSync(paths.key),
        cert: fs.readFileSync(paths.cert),
      };
      console.log(`SSL certificates loaded successfully from ${paths.key}`);
      break;
    }
  }

  if (!serverOptions) {
    console.warn('SSL certificates not found in any location, will run in HTTP mode');
  }
} catch (error) {
  console.warn('SSL certificates could not be loaded, running in HTTP mode:', error.message);
}

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(morgan('combined'));

// Create a rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiter to all requests
app.use(limiter);

// ===== MAIN ANALYZE ENDPOINT =====
app.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const validator = require('validator');

    // Check if URL is valid
    if (!url || !validator.isURL(url)) {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }
    const allowedDomains = await loadAllowedDomains();
    const submittedDomain = new URL(url).hostname.replace(/^www\./, '');
    const isAllowed = allowedDomains.some((domain) => submittedDomain.endsWith(domain));

    if (!isAllowed) {
      const messageBody = `
      🚫 NewzComp - Unsupported Domain Attempt

      A user attempted to analyze an article from an unsupported domain.

      🕒 ${new Date().toLocaleString()}
      🌐 IP: ${req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown'}
      📱 UA: ${req.headers['user-agent'] || 'Unknown'}
      📦 Payload: ${JSON.stringify(req.body, null, 2).slice(0, 400)}
      ❌ Requested Domain: ${submittedDomain}
      ❌ Requested URL: ${url}
      `.trim();

      const htmlText = `
        <h1>NewzComp - Unsupported Domain Attempt</h1>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP:</strong> ${req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown'}</p>
        <p><strong>User Agent:</strong> ${req.headers['user-agent'] || 'Unknown'}</p>
        <p><strong>Payload:</strong> ${JSON.stringify(req.body, null, 2).slice(0, 400)}</p>
        <p><strong>Requested Domain:</strong> ${submittedDomain}</p>
        <p><strong>Requested URL:</strong> ${url}</p>
      `;

      await utils.sendEmail(process.env.EMAIL_USER, process.env.EMAIL_TO, 'NewzComp - Bob Unsupported Domain Attempt 🚫', messageBody, htmlText);

      return res.status(403).json({ error: `Domain not allowed for analysis: ${submittedDomain}` });
    }

    const keyword = await utils.extractKeywords(url);
    const relatedArticles = await utils.fetchRelatedArticles(keyword, url, allowedDomains);
    console.log('Related Articles:', relatedArticles);
    if (!relatedArticles.length) {
      return res.status(404).json({ error: 'No related articles found' });
    }
    const scrapedArticles = await utils.scrapeArticles(relatedArticles);
    console.log('Scraped Articles:', scrapedArticles);
    if (!scrapedArticles.length) {
      return res.status(404).json({ error: 'No articles scraped' });
    }
    const analysis = await utils.analyzeArticlesWithAINew(scrapedArticles);
    // Extract article info for metadata
    const { title, description, imageUrl, author } = await utils.getArticleInfo(url);

    let cleanedAnalysis = analysis;
    if (typeof analysis === 'string') {
      cleanedAnalysis = parseAnalysisSection(analysis);
    }
    if (!cleanedAnalysis || typeof cleanedAnalysis !== 'object') {
      cleanedAnalysis = { error: 'Failed to parse analysis' };
    }
    // Use analysis fields for DB and response
    const analysisTitle = cleanedAnalysis.title || title || '';
    const analysisTopic = cleanedAnalysis.topic || 'all';
    const analysisSummary = cleanedAnalysis.summary || description || '';    const analysisRelated = cleanedAnalysis.related_articles || scrapedArticles.map((article) => ({
        source: article.source,
        title: article.title,
        url: article.url,
        content: article.text,
    }));

    // Save to DB
    const source_url = url;
    const source_name = scrapedArticles[0].source;
    const analysisData = {
      analysis: cleanedAnalysis,
      title: analysisTitle,
      topic: analysisTopic,
      summary: analysisSummary,
      image_url: imageUrl || '',
      author: author || '',
      related_articles: analysisRelated,
    };
    console.log('Saving to DB:', { title: analysisTitle, topic: analysisTopic, analysisData, source_url });
    try {
      await asyncFunction(
        analysisTitle,
        analysisData,
        source_name,
        source_url,
        analysisTopic,
        analysisSummary,
        imageUrl || '',
        author || '',
        analysisRelated
      );
      console.log('Data saved to DB');
    } catch (err) {
      console.error('Error saving to DB:', err);
    }

    // Send email notification and response
    try {
      const cleanedBody = JSON.stringify(req.body, null, 2).slice(0, 400);
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const requestIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown';

      const messageBody = `
      📰 NewzComp Analysis Request | BOB

        🔍 /analyze endpoint used
        🕒 ${new Date().toLocaleString()}
        🌐 IP: ${requestIP}
        📱 UA: ${userAgent}
        📦 Payload: ${cleanedBody}

        🔑 Generated Search Query: ${keyword}

        📊 Bob's Analysis: ${analysis}
      `.trim();

      const htmlText = `
        <h1>NewzComp Analysis Request</h1>
        <p><strong>Endpoint:</strong> /analyze</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP:</strong> ${requestIP}</p>
        <p><strong>User Agent:</strong> ${userAgent}</p>
        <p><strong>Payload:</strong> ${cleanedBody}</p>
        <p><strong>Generated Search Query:</strong> ${keyword}</p>
        <p><strong>Bob's Analysis:</strong> ${analysis}</p>
      `;

      // Send email notification (non-blocking, with error handling)
      utils.sendEmail(process.env.EMAIL_USER, process.env.EMAIL_TO, 'NewzComp - Bob API Notification ✔', messageBody, htmlText)
        .catch(emailError => {
          console.error('Email notification failed:', emailError.message);
        });

    } catch (notificationError) {
      console.error('Notification setup failed:', notificationError.message);
    }

    // ===== SEND PUSH NOTIFICATION FOR ANALYSIS COMPLETE =====
    try {
      // Get devices that want analysis complete notifications
      const devicesForAnalysis = await getDeviceTokensForNotificationType('analysis_complete');

      if (devicesForAnalysis.length > 0) {
        const deviceTokens = devicesForAnalysis.map(device => device.device_token);

        // Create analysis complete notification
        const notificationData = pushNotificationService.createAnalysisCompleteNotification({
          title: `Analysis Complete: ${analysisTitle}`,
          body: `Your article analysis is ready. Tap to view the results.`,
          id: analysisData.bobid || null,
          article_url: url,
          bias_score: cleanedAnalysis.bias_rating
        });

        // Send notification to all devices
        const pushResults = await pushNotificationService.sendCustomNotification(deviceTokens, notificationData);

        // Log notifications sent
        for (const deviceToken of deviceTokens) {
          await logNotification(deviceToken, 'analysis_complete', `Analysis Complete: ${analysisTitle}`, 'Your article analysis is ready.', 'sent');
        }

        console.log(`Sent analysis complete notifications to ${deviceTokens.length} devices`);
      }
    } catch (pushError) {
      // Don't fail the request if push notifications fail
      console.error('Push notification failed:', pushError.message);
    }

    // Send successful response to client
    res.json({
      analysis: cleanedAnalysis,
      title: analysisTitle,
      topic: analysisTopic,
      summary: analysisSummary,
      image_url: imageUrl || '',
      author: author || '',
      related_articles: analysisRelated,
    });
  } catch (error) {
    console.error('Error in /analyze endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== FEEDBACK ENDPOINT =====

app.post('/feedback', async (req, res) => {
  const { name, email, message } = req.body;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const requestIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown';

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const messageBody = `
    📝 NewzComp Feedback

    🕒 ${new Date().toLocaleString()}
    🌐 IP: ${req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown'}
    📱 UA: ${req.headers['user-agent'] || 'Unknown'}

    👤 Name: ${name}
    📧 Email: ${email}
    💬 Message: ${message}
  `.trim();

  const htmlText = `
    <h1>NewzComp Feedback</h1>
    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>IP:</strong> ${requestIP}</p>
    <p><strong>User Agent:</strong> ${userAgent}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Message:</strong> ${message}</p>
  `;

  await utils.sendEmail(process.env.EMAIL_USER, process.env.EMAIL_TO, 'NewzComp - Bob Feedback Notification ✔', messageBody, htmlText);

  res.json({ success: true, message: 'Feedback submitted successfully.' });
});

// ===== LATEST BREAKING NEWS ENDPOINT =====
const { parseStringPromise } = require('xml2js');

// ===== LATEST BREAKING NEWS ENDPOINT (Refactored for theme & time filtering) =====
app.get('/latest', async (req, res) => {
  try {
    let theme = req.query.theme;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;

    if (!theme) {
      return res.status(400).json({ error: 'Missing required theme parameter' });
    }
    theme = theme.toLowerCase(); // Ensure theme is lowercase

    // Query the DB for articles with this theme (topic) and optional date range
    const conn = await require('mariadb').createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    let articles;
    let queryParams = [];
    let whereClause = '';
    let dateClause = '';

    // Build date filtering clause if start_date and/or end_date are provided
    if (start_date || end_date) {
      const dateConditions = [];

      if (start_date) {
        dateConditions.push('news_date >= ?');
        queryParams.push(new Date(start_date));
      }

      if (end_date) {
        dateConditions.push('news_date <= ?');
        queryParams.push(new Date(end_date));
      }

      dateClause = dateConditions.join(' AND ');
    }

    if (theme === 'all') {
      // Return all articles regardless of theme, with optional date filtering
      if (dateClause) {
        whereClause = `WHERE ${dateClause}`;
        articles = await conn.query(
          `SELECT * FROM daily_news_articles ${whereClause} ORDER BY news_date DESC, id DESC`,
          queryParams
        );
      } else {
        articles = await conn.query(
          'SELECT * FROM daily_news_articles ORDER BY news_date DESC, id DESC'
        );
      }
    } else {
      // Return articles for specific theme, with optional date filtering
      if (dateClause) {
        whereClause = `WHERE LOWER(theme) = ? AND ${dateClause}`;
        queryParams.unshift(theme); // Add theme as first parameter
        articles = await conn.query(
          `SELECT * FROM daily_news_articles ${whereClause} ORDER BY news_date DESC, id DESC`,
          queryParams
        );
      } else {
        articles = await conn.query(
          'SELECT * FROM daily_news_articles WHERE LOWER(theme) = ? ORDER BY news_date DESC, id DESC',
          [theme]
        );
      }
    }

    await conn.end();

    if (!articles.length) {
      let errorMessage = `No articles found for theme: ${theme}`;
      if (start_date || end_date) {
        errorMessage += ` within the specified date range`;
        if (start_date) errorMessage += ` (from ${start_date})`;
        if (end_date) errorMessage += ` (to ${end_date})`;
      }
      return res.status(404).json({ error: errorMessage });
    }

    return res.json({
      articles,
      filters: {
        theme,
        start_date: start_date || null,
        end_date: end_date || null,
        count: articles.length
      }
    });
  } catch (error) {
    console.error('Error in /latest endpoint:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get metadata for all articles
app.get('/articles', async (req, res) => {
  try {
    let articles = await getHistoricArticleMetadata(); // Fetch all articles metadata from the database
    articles = articles.map((article) => ({
      ...article,
      bobid: article.bobid?.toString(),
    }));
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles metadata:', error.message);
    res.status(500).json({ error: 'Failed to fetch articles metadata' });
  }
});

// Endpoint to get a specific article by ID
app.get('/articles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const article = await getHistoricArticleById(id); // Fetch specific article by ID from the database
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    if (typeof article.bobid === 'bigint') {
      article.bobid = article.bobid.toString();
    }
    // Parse analysis JSON
    let parsedAnalysis = {};
    try {
      parsedAnalysis = typeof article.analysis === 'string' ? JSON.parse(article.analysis) : article.analysis;
      // Handle nested analysis if it exists
      if (parsedAnalysis.analysis && typeof parsedAnalysis.analysis === 'object') {
        parsedAnalysis = parsedAnalysis.analysis;
      }
    } catch (e) {
      parsedAnalysis = {};
    }

    // Parse related_articles if it's a string
    let relatedArticles = [];
    try {
      if (article.related_articles) {
        relatedArticles = typeof article.related_articles === 'string' ? JSON.parse(article.related_articles) : article.related_articles;
      }
    } catch (e) {
      relatedArticles = [];
    }

    res.json({
      bobid: article.bobid,
      title: article.title || '',
      topic: article.topic || '',
      author: article.author || '',
      image_url: article.image_url || '',
      related_articles: relatedArticles,
      query_date: article.query_date,
      source_name: article.source_name || '',
      source_url: article.source_url || '',
      keyword: article.keyword || '',
      analysis: {
        summary: parsedAnalysis.summary || '',
        bias: parsedAnalysis.bias || [],
        bias_rating: parsedAnalysis.bias_rating || '',
        bias_direction: parsedAnalysis.bias_direction || '',
        sources_agree_on: parsedAnalysis.sources_agree_on || '',
        conclusion: parsedAnalysis.conclusion || '',
        recommendations: parsedAnalysis.recommendations || '',
        reasoning: parsedAnalysis.reasoning || ''
      }
    });
  } catch (error) {
    console.error(`Error fetching article with ID ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

app.get('/latest/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const article = await getLatestArticleById(id); // Fetch specific article by ID from the database
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    if (typeof article.bobid === 'bigint') {
      article.bobid = article.bobid.toString();
    }
    // Parse analysis JSON
    let parsedAnalysis = {};
    try {
      parsedAnalysis = typeof article.analysis === 'string' ? JSON.parse(article.analysis) : article.analysis;
      // Handle nested analysis if it exists
      if (parsedAnalysis.analysis && typeof parsedAnalysis.analysis === 'object') {
        parsedAnalysis = parsedAnalysis.analysis;
      }
    } catch (e) {
      parsedAnalysis = {};
    }

    // Parse related_articles if it's a string
    let relatedArticles = [];
    try {
      if (article.related_articles) {
        relatedArticles = typeof article.related_articles === 'string' ? JSON.parse(article.related_articles) : article.related_articles;
      }
    } catch (e) {
      relatedArticles = [];
    }

    res.json({
      bobid: article.id,
      title: article.title || '',
      topic: article.topic || '',
      author: article.author || '',
      image_url: article.image_url || '',
      related_articles: relatedArticles,
      query_date: article.query_date,
      source_name: article.source_name || '',
      source_url: article.source_url || '',
      keyword: article.keyword || '',
      analysis: {
        summary: parsedAnalysis.summary || '',
        bias: parsedAnalysis.bias || [],
        bias_rating: parsedAnalysis.bias_rating || '',
        bias_direction: parsedAnalysis.bias_direction || '',
        sources_agree_on: parsedAnalysis.sources_agree_on || '',
        conclusion: parsedAnalysis.conclusion || '',
        recommendations: parsedAnalysis.recommendations || '',
        reasoning: parsedAnalysis.reasoning || ''
      }
    });
  } catch (error) {
    console.error(`Error fetching article with ID ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

app.get('/whitelist', async (req, res) => {
  try {
    const allowedDomains = await loadAllowedDomains();
    if (!allowedDomains || !allowedDomains.length) {
      return res.status(404).json({ error: 'No allowed domains found' });
    }
    res.json({ allowed_domains: allowedDomains });
  } catch (error) {
    console.error('Error fetching allowed domains:', error.message);
    res.status(500).json({ error: 'Failed to fetch allowed domains' });
  }
});
// ===== PUSH NOTIFICATION ENDPOINTS =====

/**
 * Register device for push notifications
 * POST /register-device
 * Body: { device_token, user_id?, notification_preferences? }
 */
app.post('/register-device', async (req, res) => {
  try {
    const { device_token, user_id, notification_preferences, platform, app_version, device_model, os_version, bundle_id } = req.body;

    if (!device_token) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    // Set default preferences if not provided
    const preferences = notification_preferences || {
      breaking_news: true,
      analysis_complete: true,
      weekly_report: false
    };

    // Create device data object matching the function signature
    const deviceData = {
      device_token,
      platform: platform || 'ios',
      app_version,
      bundle_id: bundle_id || 'com.newzcomp.bob',
      device_model,
      os_version,
      user_preferences: preferences,
      notification_categories: ['breaking_news', 'analysis_complete', 'weekly_report']
    };

    const result = await registerDeviceToken(deviceData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Device registered successfully',
        device_id: result.device_id
      });
    } else {
      res.status(500).json({ error: 'Failed to register device' });
    }
  } catch (error) {
    console.error('Error in /register-device:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update notification preferences for a device
 * POST /update-preferences
 * Body: { device_token, notification_preferences }
 */
app.post('/update-preferences', async (req, res) => {
  try {
    const { device_token, notification_preferences } = req.body;

    if (!device_token || !notification_preferences) {
      return res.status(400).json({ error: 'Device token and notification preferences are required' });
    }

    const result = await updateNotificationPreferences(device_token, notification_preferences);

    if (result.success) {
      res.json({
        success: true,
        message: 'Notification preferences updated successfully'
      });
    } else {
      res.status(404).json({ error: 'Device not found' });
    }
  } catch (error) {
    console.error('Error in /update-preferences:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Unregister device from push notifications
 * DELETE /unregister-device
 * Body: { device_token }
 */
app.delete('/unregister-device', async (req, res) => {
  try {
    const { device_token } = req.body;

    if (!device_token) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    const result = await deactivateDeviceToken(device_token);

    if (result.success) {
      res.json({
        success: true,
        message: 'Device unregistered successfully'
      });
    } else {
      res.status(404).json({ error: 'Device not found' });
    }
  } catch (error) {
    console.error('Error in /unregister-device:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send manual push notification (admin/testing endpoint)
 * POST /send-notification
 * Body: { notification_type, title, body, data?, target_devices? }
 */
// Update your /send-notification endpoint to handle both custom and typed notifications
app.post('/send-notification', async (req, res) => {
  try {
    const {
      title,
      body,
      subtitle,
      badge,
      sound,
      category,
      threadId,
      contentAvailable,
      mutableContent,
      priority,
      data,
      notification_type,
      target_devices
    } = req.body;

    // Validation - either notification_type OR (title AND body) is required
    if (!notification_type && (!title || !body)) {
      return res.status(400).json({
        error: 'Either notification_type OR both title and body are required'
      });
    }

    // Get device tokens
    let deviceTokens = [];

    if (target_devices && target_devices.length > 0) {
      deviceTokens = target_devices;
    } else {
      // Get all registered devices using your existing database function
      const allDevices = await getActiveDeviceTokens();
      deviceTokens = allDevices.map(device => device.device_token);
    }

    if (deviceTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No device tokens found'
      });
    }

    // Prepare notification data
    let notificationData;

    if (notification_type) {
      // Use predefined templates
      switch (notification_type) {
        case 'breaking_news':
          notificationData = pushNotificationService.createBreakingNewsNotification({
            title: title || '🚨 Breaking News',
            body: body || 'Important news update',
            category: data?.category,
            url: data?.article_url,
            id: data?.article_id,
            bias_score: data?.bias_score
          });
          break;
        case 'analysis_complete':
          notificationData = pushNotificationService.createAnalysisCompleteNotification({
            title: title || 'Analysis Complete',
            body: body || 'Your analysis is ready',
            id: data?.analysis_id,
            bias_score: data?.bias_score,
            article_url: data?.article_url
          });
          break;
        case 'weekly_report':
          notificationData = pushNotificationService.createWeeklyReportNotification({
            title: title || 'Weekly Report',
            body: body || 'Your weekly report is ready',
            articles_analyzed: data?.articles_analyzed,
            week_start: data?.week_start,
            average_bias: data?.average_bias
          });
          break;
        default:
          notificationData = {
            title: title || 'NewzComp Notification',
            body: body || 'You have a new notification',
            data: data || {}
          };
      }
    } else {
      // Use custom notification data directly from request
      notificationData = {
        title,
        body,
        subtitle,
        badge,
        sound,
        category,
        threadId,
        contentAvailable,
        mutableContent,
        priority,
        data: data || {}
      };
    }

    // Send the notification
    const result = await pushNotificationService.sendCustomNotification(
      deviceTokens,
      notificationData
    );

    console.log('📱 Notification sent:', {
      title: notificationData.title,
      body: notificationData.body,
      sent: result.sent,
      failed: result.failed
    });

    res.json({
      success: true,
      message: 'Notification sent successfully',
      sent_count: result.sent,
      failed_count: result.failed,
      results: result
    });

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});
/**
 * Get device statistics (admin endpoint)
 * GET /notification-stats
 */
app.get('/notification-stats', async (req, res) => {
  try {
    const activeDevices = await getActiveDeviceTokens();

    // Count devices by notification preferences
    const stats = {
      total_active_devices: activeDevices.length,
      breaking_news_enabled: activeDevices.filter(d => d.breaking_news).length,
      analysis_complete_enabled: activeDevices.filter(d => d.analysis_complete).length,
      weekly_report_enabled: activeDevices.filter(d => d.weekly_report).length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error in /notification-stats:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ENHANCED ANALYZE ENDPOINT WITH PUSH NOTIFICATIONS =====
// Modify the existing analyze endpoint to send push notifications when analysis is complete
app.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const validator = require('validator');

    // Check if URL is valid
    if (!url || !validator.isURL(url)) {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }
    const allowedDomains = await loadAllowedDomains();
    const submittedDomain = new URL(url).hostname.replace(/^www\./, '');
    const isAllowed = allowedDomains.some((domain) => submittedDomain.endsWith(domain));

    if (!isAllowed) {
      const messageBody = `
      🚫 NewzComp - Unsupported Domain Attempt

      A user attempted to analyze an article from an unsupported domain.

      🕒 ${new Date().toLocaleString()}
      🌐 IP: ${req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown'}
      📱 UA: ${req.headers['user-agent'] || 'Unknown'}
      📦 Payload: ${JSON.stringify(req.body, null, 2).slice(0, 400)}
      ❌ Requested Domain: ${submittedDomain}
      ❌ Requested URL: ${url}
      `.trim();

      const htmlText = `
        <h1>NewzComp - Unsupported Domain Attempt</h1>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP:</strong> ${req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown'}</p>
        <p><strong>User Agent:</strong> ${req.headers['user-agent'] || 'Unknown'}</p>
        <p><strong>Payload:</strong> ${JSON.stringify(req.body, null, 2).slice(0, 400)}</p>
        <p><strong>Requested Domain:</strong> ${submittedDomain}</p>
        <p><strong>Requested URL:</strong> ${url}</p>
      `;

      await utils.sendEmail(process.env.EMAIL_USER, process.env.EMAIL_TO, 'NewzComp - Bob Unsupported Domain Attempt 🚫', messageBody, htmlText);

      return res.status(403).json({ error: `Domain not allowed for analysis: ${submittedDomain}` });
    }

    const keyword = await utils.extractKeywords(url);
    const relatedArticles = await utils.fetchRelatedArticles(keyword, url, allowedDomains);
    console.log('Related Articles:', relatedArticles);
    if (!relatedArticles.length) {
      return res.status(404).json({ error: 'No related articles found' });
    }
    const scrapedArticles = await utils.scrapeArticles(relatedArticles);
    console.log('Scraped Articles:', scrapedArticles);
    if (!scrapedArticles.length) {
      return res.status(404).json({ error: 'No articles scraped' });
    }
    const analysis = await utils.analyzeArticlesWithAINew(scrapedArticles);
    // Extract article info for metadata
    const { title, description, imageUrl, author } = await utils.getArticleInfo(url);

    let cleanedAnalysis = analysis;
    if (typeof analysis === 'string') {
      cleanedAnalysis = parseAnalysisSection(analysis);
    }
    if (!cleanedAnalysis || typeof cleanedAnalysis !== 'object') {
      cleanedAnalysis = { error: 'Failed to parse analysis' };
    }
    // Use analysis fields for DB and response
    const analysisTitle = cleanedAnalysis.title || title || '';
    const analysisTopic = cleanedAnalysis.topic || 'all';
    const analysisSummary = cleanedAnalysis.summary || description || '';    const analysisRelated = cleanedAnalysis.related_articles || scrapedArticles.map((article) => ({
        source: article.source,
        title: article.title,
        url: article.url,
        content: article.text,
    }));

    // Save to DB
    const source_url = url;
    const source_name = scrapedArticles[0].source;
    const analysisData = {
      analysis: cleanedAnalysis,
      title: analysisTitle,
      topic: analysisTopic,
      summary: analysisSummary,
      image_url: imageUrl || '',
      author: author || '',
      related_articles: analysisRelated,
    };
    console.log('Saving to DB:', { title: analysisTitle, topic: analysisTopic, analysisData, source_url });
    try {
      await asyncFunction(
        analysisTitle,
        analysisData,
        source_name,
        source_url,
        analysisTopic,
        analysisSummary,
        imageUrl || '',
        author || '',
        analysisRelated
      );
      console.log('Data saved to DB');
    } catch (err) {
      console.error('Error saving to DB:', err);
    }

    // Send email notification and response
    try {
      const cleanedBody = JSON.stringify(req.body, null, 2).slice(0, 400);
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const requestIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown';

      const messageBody = `
      📰 NewzComp Analysis Request | BOB

        🔍 /analyze endpoint used
        🕒 ${new Date().toLocaleString()}
        🌐 IP: ${requestIP}
        📱 UA: ${userAgent}
        📦 Payload: ${cleanedBody}

        🔑 Generated Search Query: ${keyword}

        📊 Bob's Analysis: ${analysis}
      `.trim();

      const htmlText = `
        <h1>NewzComp Analysis Request</h1>
        <p><strong>Endpoint:</strong> /analyze</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP:</strong> ${requestIP}</p>
        <p><strong>User Agent:</strong> ${userAgent}</p>
        <p><strong>Payload:</strong> ${cleanedBody}</p>
        <p><strong>Generated Search Query:</strong> ${keyword}</p>
        <p><strong>Bob's Analysis:</strong> ${analysis}</p>
      `;

      // Send email notification (non-blocking, with error handling)
      utils.sendEmail(process.env.EMAIL_USER, process.env.EMAIL_TO, 'NewzComp - Bob API Notification ✔', messageBody, htmlText)
        .catch(emailError => {
          console.error('Email notification failed:', emailError.message);
        });

    } catch (notificationError) {
      console.error('Notification setup failed:', notificationError.message);
    }

    // ===== PUSH NOTIFICATION LOGIC =====
    try {
      const deviceTokens = await getDeviceTokensForNotificationType('analysis_complete');

      if (deviceTokens.length > 0) {
        // Create notification data
        const notificationData = pushNotificationService.createAnalysisCompleteNotification({
          title: 'Analysis Complete',
          body: 'Your analysis is ready',
          id: analysisData.bobid || null,
          article_url: url,
          bias_score: cleanedAnalysis.bias_rating
        });

        // Send push notification to all devices subscribed to analysis_complete
        const pushResults = await pushNotificationService.sendCustomNotification(
          deviceTokens.map(dt => dt.device_token),
          notificationData
        );

        // Log the notification
        for (const deviceToken of deviceTokens) {
          await logNotification(deviceToken.device_token, 'analysis_complete', 'Analysis Complete', 'Your analysis is ready', 'sent');
        }

        console.log(`Sent analysis complete notifications to ${deviceTokens.length} devices`);
      }
    } catch (pushError) {
      console.error('Error sending push notification:', pushError.message);
    }

    // Send successful response to client
    res.json({
      analysis: cleanedAnalysis,
      title: analysisTitle,
      topic: analysisTopic,
      summary: analysisSummary,
      image_url: imageUrl || '',
      author: author || '',
      related_articles: analysisRelated,
    });
  } catch (error) {
    console.error('Error in /analyze endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== USER API ENDPOINTS =====

/**
 * Health check for user API (must be before dynamic routes)
 * GET /api/users/health
 */
app.get('/api/users/health', (req, res) => {
  res.json({
    success: true,
    message: 'User API is healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      createUser: 'POST /api/users',
      getUser: 'GET /api/users/:identifier',
      signup: 'POST /api/users/signup',
      login: 'POST /api/users/login',
      updatePreferences: 'POST /api/users/:userId/preferences',
      getPreferences: 'GET /api/users/:userId/preferences',
      getAnalytics: 'GET /api/users/:userId/analytics',
      logActivity: 'POST /api/users/:userId/activity',
      deleteUser: 'DELETE /api/users/:userId'
    }
  });
});

/**
 * Create or update user information
 * POST /api/users
 * Body: UserPayload from iOS app
 */
app.post('/api/users', async (req, res) => {
  try {
    const {
      userID,
      email,
      firstName,
      lastName,
      fullName,
      isAuthenticated,
      deviceInfo,
      appVersion
    } = req.body;

    // Validation
    if (!userID || !email || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields: userID, email, firstName, lastName are required'
      });
    }

    // Extract IP and User Agent for tracking
    const requestIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Prepare user data
    const userData = {
      userID,
      email,
      firstName,
      lastName,
      isAuthenticated: isAuthenticated || false,
      deviceInfo: {
        ...deviceInfo,
        ip_address: requestIP,
        user_agent: userAgent
      },
      appVersion
    };

    // Create or update user
    const result = await createOrUpdateUser(userData);

    // Log activity
    await logUserActivity(userID, 'login', {
      ip_address: requestIP,
      user_agent: userAgent,
      app_version: appVersion
    });

    res.json({
      success: true,
      message: result.user.created ? 'User created successfully' : 'User updated successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        created: result.user.created || false,
        updated: result.user.updated || false
      }
    });

  } catch (error) {
    console.error('Error in /api/users:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Email signup endpoint
 * POST /api/users/signup
 * Body: { firstName, lastName, email, password }
 */
app.post('/api/users/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: firstName, lastName, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await getUserById(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }

    // Extract IP and User Agent for tracking
    const requestIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Generate unique user ID for email signup
    const userID = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Hash password using bcrypt
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Prepare user data
    const userData = {
      userID,
      email,
      firstName,
      lastName,
      isAuthenticated: true,
      password: hashedPassword, // Store hashed password
      deviceInfo: {
        ip_address: requestIP,
        user_agent: userAgent,
        signup_method: 'email'
      },
      appVersion: req.body.appVersion || '1.0.0'
    };

    // Create user
    const result = await createOrUpdateUser(userData);

    // Log signup activity
    await logUserActivity(userID, 'login', {
      ip_address: requestIP,
      user_agent: userAgent,
      signup_method: 'email'
    });

    res.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: firstName,
        lastName: lastName
      }
    });

  } catch (error) {
    console.error('Error in /api/users/signup:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Email login endpoint
 * POST /api/users/login
 * Body: { email, password }
 */
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email and password are required'
      });
    }

    // Get user by email
    const user = await getUserById(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Check if user has a password (email signup user)
    if (!user.password) {
      return res.status(401).json({
        error: 'This account was not created with email/password. Please use Apple Sign In.'
      });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Extract IP and User Agent for tracking
    const requestIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Log login activity
    await logUserActivity(user.id, 'login', {
      ip_address: requestIP,
      user_agent: userAgent,
      login_method: 'email'
    });

    // Update last login
    await createOrUpdateUser({
      userID: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isAuthenticated: true,
      deviceInfo: {
        ip_address: requestIP,
        user_agent: userAgent,
        login_method: 'email'
      }
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });

  } catch (error) {
    console.error('Error in /api/users/login:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user information by ID or email
 * GET /api/users/:identifier
 */
app.get('/api/users/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    if (!identifier) {
      return res.status(400).json({ error: 'User identifier is required' });
    }

    const user = await getUserById(identifier);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive information before sending
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: user.full_name,
      isAuthenticated: user.is_authenticated,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      status: user.status,
      deviceCount: user.device_count || 0,
      totalArticlesAnalyzed: user.total_articles_analyzed || 0,
      totalArticlesViewed: user.total_articles_viewed || 0
    };

    res.json({
      success: true,
      user: sanitizedUser
    });

  } catch (error) {
    console.error('Error in /api/users/:identifier:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update user preferences
 * POST /api/users/:userId/preferences
 * Body: { preferenceKey, preferenceValue }
 */
app.post('/api/users/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferenceKey = 'notifications', preferences } = req.body;

    console.log(`📝 Updating preferences for user: ${userId}`);
    console.log(`🔑 Preference key: ${preferenceKey}`);
    console.log(`📋 New preferences:`, preferences);

    // First, get existing preferences
    const existingPrefs = await getUserPreferences(userId, preferenceKey);
    console.log(`📖 Existing preferences:`, existingPrefs);

    // Merge new preferences with existing ones
    let mergedPreferences = {};

    // Access the preferences using the preference key (e.g., existingPrefs.notifications)
    if (existingPrefs && existingPrefs[preferenceKey]) {
      mergedPreferences = { ...existingPrefs[preferenceKey] };
    }

    // Merge the new preferences
    mergedPreferences = { ...mergedPreferences, ...preferences };

    console.log(`🔀 Merged preferences:`, mergedPreferences);

    // Update preferences with merged data
    const result = await updateUserPreferences(userId, preferenceKey, mergedPreferences);

    if (result.success) {
      res.json({
        success: true,
        message: 'Preferences updated successfully',
        preferences: mergedPreferences
      });
      console.log(`✅ Preferences updated successfully for user: ${userId}`);
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to update preferences'
      });
      console.log(`❌ Failed to update preferences: ${result.error}`);
    }
  } catch (error) {
    console.error('Error in /users/:userId/preferences:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Get user preferences
 * GET /api/users/:userId/preferences
 * GET /api/users/:userId/preferences?key=preference_key
 */
app.get('/api/users/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const { key } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const preferences = await getUserPreferences(userId, key);

    // If a specific key was requested, return just that preference value
    // This ensures the iOS app gets the format it expects
    if (key && preferences[key]) {
      res.json({
        success: true,
        preferences: preferences[key]
      });
    } else {
      // Return all preferences
      res.json({
        success: true,
        preferences: preferences
      });
    }

  } catch (error) {
    console.error('Error in /api/users/:userId/preferences:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user analytics/overview
 * GET /api/users/:userId/analytics
 */

app.get('/api/users/:userId/analytics', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📊 Getting analytics for user: ${userId}`);

    const overviewData = await getUserOverview(userId);

    if (overviewData) {
      // Convert MySQL dates to ISO8601 format and map to iOS expected format (snake_case)
      const formattedAnalytics = {
        total_articles_analyzed: overviewData.total_articles_analyzed || 0,
        total_articles_viewed: overviewData.total_articles_viewed || 0,
        device_count: overviewData.device_count || 0,
        active_sessions: overviewData.total_login_sessions || 0,
        last_analysis_date: overviewData.last_analysis_date ?
          new Date(overviewData.last_analysis_date).toISOString() : null,
        member_since: overviewData.created_at ?
          new Date(overviewData.created_at).toISOString() : null,
        last_login_at: overviewData.last_login_at ?
          new Date(overviewData.last_login_at).toISOString() : null
      };

      res.json({
        success: true,
        analytics: formattedAnalytics
      });
      console.log(`✅ Analytics retrieved for user: ${userId}`, formattedAnalytics);
    } else {
      // If no overview data, create default analytics with snake_case keys
      const defaultAnalytics = {
        total_articles_analyzed: 0,
        total_articles_viewed: 0,
        device_count: 0,
        active_sessions: 0,
        last_analysis_date: null,
        member_since: null,
        last_login_at: null
      };

      res.json({
        success: true,
        analytics: defaultAnalytics
      });
      console.log(`✅ Default analytics returned for user: ${userId}`);
    }
  } catch (error) {
    console.error('Error in /users/:userId/analytics:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Log user activity
 * POST /api/users/:userId/activity
 * Body: { activityType, activityData }
 */
app.post('/api/users/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const { activityType, activityData = {} } = req.body;

    if (!userId || !activityType) {
      return res.status(400).json({
        error: 'userId and activityType are required'
      });
    }

    // Add request metadata
    const requestIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const enrichedActivityData = {
      ...activityData,
      ip_address: requestIP,
      user_agent: userAgent,
      timestamp: new Date().toISOString()
    };

    // Log the activity
    await logUserActivity(userId, activityType, enrichedActivityData);

    // Update analytics if applicable
    if (['analyze_article', 'view_article'].includes(activityType)) {
      await updateUserAnalytics(userId, activityType);
    }

    res.json({
      success: true,
      message: 'Activity logged successfully'
    });

  } catch (error) {
    console.error('Error in /api/users/:userId/activity:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete user account
 * DELETE /api/users/:userId
 */
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { confirm } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!confirm || confirm !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        error: 'Account deletion requires confirmation. Send "confirm": "DELETE_MY_ACCOUNT" in request body.'
      });
    }

    // Check if user exists
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user and all associated data
    const result = await deleteUser(userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'User account deleted successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to delete user account' });
    }

  } catch (error) {
    console.error('Error in DELETE /api/users/:userId:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  try {
    await closePool();
    console.log('Database connection pool closed.');
  } catch (err) {
    console.error('Error closing database connection pool:', err.message);
  }
  process.exit(0);
});

// Start server with HTTPS/HTTP fallback
if (serverOptions) {
  https.createServer(serverOptions, app).listen(port, () => {
    console.log(`HTTPS server is running on https://bob.newzcomp.com:${port}`);
  });
} else {
  app.listen(port, '0.0.0.0', () => {
    console.log(`HTTP server is running on http://0.0.0.0:${port}`);
    console.log('Note: Running in HTTP mode - SSL certificates not available');
  });
}
