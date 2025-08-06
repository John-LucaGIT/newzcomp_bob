// Push Notification Service for iOS using APNs
const apn = require('node-apn');
const path = require('path');
require('dotenv').config();

class PushNotificationService {
  constructor() {
    this.provider = null;
    this.initialize();
  }

  initialize() {
    try {
      const isProduction = process.env.NODE_ENV === 'production';

      console.log(`🔧 Initializing APNs Provider for: ${isProduction ? 'PRODUCTION' : 'SANDBOX'}`);

      // Configure APNs Provider
      const options = {
        token: {
          key: path.join(__dirname, 'AuthKey_R5DSNH8485.p8'), // Your .p8 file
          keyId: process.env.APNS_KEY_ID || 'R5DSNH8485', // Your Key ID from Apple Developer Portal
          teamId: process.env.APNS_TEAM_ID, // Your Team ID from Apple Developer Portal
        },
        production: isProduction, // Use sandbox for development
      };

      this.provider = new apn.Provider(options);
      console.log(`✅ APNs Provider initialized successfully (${isProduction ? 'Production' : 'Sandbox'})`);

      // Handle provider events
      this.provider.on('connected', () => {
        console.log('APNs Provider connected');
      });

      this.provider.on('disconnected', () => {
        console.log('APNs Provider disconnected');
      });

      this.provider.on('socketError', (err) => {
        console.error('APNs Provider socket error:', err);
      });

      this.provider.on('transmitted', (notification, device) => {
        console.log('Notification transmitted to device:', device.toString());
      });

      this.provider.on('transmissionError', (errorCode, notification, device) => {
        console.error('Transmission error:', errorCode, 'for device:', device.toString());
      });

    } catch (error) {
      console.error('❌ Failed to initialize APNs Provider:', error.message);
      throw error;
    }
  }

  /**
   * Send a custom push notification to device(s)
   * @param {string|string[]} deviceTokens - Device token(s) to send to
   * @param {Object} notificationData - Complete notification configuration
   * @returns {Promise<Object>} - The result of the send operation
   */
  async sendCustomNotification(deviceTokens, notificationData) {
    if (!this.provider) {
      throw new Error('APNs Provider not initialized');
    }

    try {
      console.log('📝 Creating notification with data:', JSON.stringify(notificationData, null, 2));      // Create notification
      const notification = new apn.Notification();

      // Set basic properties with defaults
      notification.expiry = notificationData.expiry || (Math.floor(Date.now() / 1000) + 3600); // 1 hour default
      notification.badge = notificationData.badge || 1;
      notification.sound = notificationData.sound || 'default';
      notification.topic = notificationData.topic || process.env.IOS_BUNDLE_ID || 'com.newzcomp.bob';

      // Set alert content using the proper APN notification methods
      if (notificationData.title) {
        notification.title = notificationData.title;
      }

      if (notificationData.body) {
        notification.body = notificationData.body;
      }

      if (notificationData.subtitle) {
        notification.subtitle = notificationData.subtitle;
      }

      // Advanced alert options
      if (notificationData.launchImage) {
        notification.launchImage = notificationData.launchImage;
      }

      if (notificationData.titleLocKey) {
        notification.titleLocKey = notificationData.titleLocKey;
        notification.titleLocArgs = notificationData.titleLocArgs || [];
      }

      if (notificationData.locKey) {
        notification.locKey = notificationData.locKey;
        notification.locArgs = notificationData.locArgs || [];
      }

      // Set custom data payload
      if (notificationData.data) {
        notification.payload = notificationData.data;
      }

      // Set notification category for custom actions
      if (notificationData.category) {
        notification.category = notificationData.category;
      }

      // Set thread identifier for grouping
      if (notificationData.threadId) {
        notification.threadId = notificationData.threadId;
      }

      // Set content available for background updates
      if (notificationData.contentAvailable) {
        notification.contentAvailable = true;
      }

      // Set mutable content for notification extensions
      if (notificationData.mutableContent) {
        notification.mutableContent = true;
      }

      // Set priority
      if (notificationData.priority !== undefined) {
        notification.priority = notificationData.priority;
      }

      console.log('📝 Final notification object:', JSON.stringify({
        alert: notification.alert,
        badge: notification.badge,
        sound: notification.sound,
        topic: notification.topic
      }, null, 2));

      // Handle single token or array of tokens
      const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];

      console.log('📝 Sending to tokens:', tokens);

      // Send the notification
      const result = await this.provider.send(notification, tokens);

      // Process and log results
      const successCount = result.sent ? result.sent.length : 0;
      const failureCount = result.failed ? result.failed.length : 0;

      console.log(`📊 Custom notification results: ${successCount} sent, ${failureCount} failed`);

      // Log failures for debugging
      if (result.failed && result.failed.length > 0) {
        result.failed.forEach(failure => {
          console.error(`❌ Failed to send to ${failure.device.substring(0, 10)}...: ${failure.status} - ${failure.response?.reason || 'Unknown error'}`);
        });
      }

      return {
        success: successCount > 0,
        sent: successCount,
        failed: failureCount,
        result: result
      };

    } catch (error) {
      console.error('❌ Error sending custom notification:', error.message);
      throw error;
    }
  }

  /**
   * Send notification using simplified parameters (backwards compatibility)
   * @param {string|string[]} deviceTokens - Device token(s)
   * @param {Object} payload - Simple payload with title, body, etc.
   * @returns {Promise<Object>} - The result of the send operation
   */
  async sendNotification(deviceTokens, payload) {
    return this.sendCustomNotification(deviceTokens, {
      title: payload.title,
      body: payload.body,
      subtitle: payload.subtitle,
      badge: payload.badge,
      sound: payload.sound,
      data: payload.data,
      category: payload.type || payload.category
    });
  }

  /**
   * Create pre-configured notification templates
   */
  createBreakingNewsNotification(newsData) {
    return {
      title: newsData.title || '🚨 Breaking News',
      body: newsData.body || 'Major news development detected',
      subtitle: newsData.category || 'Politics',
      badge: 1,
      sound: 'success-sound.mp3',
      category: 'breaking_news',
      threadId: 'breaking_news',
      data: {
        article_url: newsData.url,
        article_id: newsData.id,
        category: newsData.category,
        bias_score: newsData.bias_score,
        timestamp: new Date().toISOString(),
        notification_type: 'breaking_news'
      }
    };
  }

  createAnalysisCompleteNotification(analysisData) {
    return {
      title: analysisData.title || 'Analysis Complete',
      body: analysisData.body || `Your article analysis is ready. Bias score: ${analysisData.bias_score}/5`,
      subtitle: 'Bob AI Analysis',
      badge: 1,
      sound: 'success-sound.mp3',
      category: 'analysis_complete',
      threadId: 'analysis',
      data: {
        analysis_id: analysisData.id,
        bias_score: analysisData.bias_score,
        article_url: analysisData.article_url,
        timestamp: new Date().toISOString(),
        notification_type: 'analysis_complete'
      }
    };
  }

  createWeeklyReportNotification(reportData) {
    return {
      title: reportData.title || 'Weekly Bias Report',
      body: reportData.body || `You analyzed ${reportData.articles_analyzed} articles this week. See your bias exposure trends.`,
      subtitle: 'NewzComp Report',
      badge: 1,
      sound: 'success-sound.mp3',
      category: 'weekly_report',
      threadId: 'reports',
      data: {
        articles_analyzed: reportData.articles_analyzed,
        week_start: reportData.week_start,
        average_bias: reportData.average_bias,
        timestamp: new Date().toISOString(),
        notification_type: 'weekly_report'
      }
    };
  }

  /**
   * Send notification with full customization options
   * @param {string|string[]} deviceTokens - Device token(s)
   * @param {Object} options - Full notification options
   * @returns {Promise<Object>} - The result of the send operation
   */
  async sendAdvancedNotification(deviceTokens, options) {
    return this.sendCustomNotification(deviceTokens, {
      title: options.title,
      body: options.body,
      subtitle: options.subtitle,
      badge: options.badge || 1,
      sound: options.sound || 'default',
      data: options.data || {},
      category: options.category,
      threadId: options.threadId,
      contentAvailable: options.contentAvailable || false,
      mutableContent: options.mutableContent || false,
      priority: options.priority || 10,
      expiry: options.expiry,
      topic: options.topic,
      launchImage: options.launchImage,
      titleLocKey: options.titleLocKey,
      titleLocArgs: options.titleLocArgs,
      locKey: options.locKey,
      locArgs: options.locArgs
    });
  }

  /**
   * Shutdown the APNs provider
   */
  shutdown() {
    if (this.provider) {
      this.provider.shutdown();
      console.log('APNs Provider shut down');
    }
  }
}

// Create and export a singleton instance
const pushNotificationService = new PushNotificationService();

module.exports = {
  PushNotificationService,
  pushNotificationService
};