// detectArticleLinks.js
const { getNewsArticles, findAllArticleLinks, buildSearchParameters, searchNews } = require('./googlenews');
const { loadAllowedDomains, insertDailyNewsArticles, closePool } = require('./dbconnect');
const { parseAnalysisSection } = require('./decode.js');
const utils = require('./report_utils');
const fs = require('fs');
const path = require('path');

// Enhanced Logging System
class Logger {
  constructor(logDir = './logs') {
    this.logDir = logDir;
    this.ensureLogDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.logFile = path.join(logDir, `detect-articles-${timestamp}.log`);
    this.errorFile = path.join(logDir, `detect-articles-errors-${timestamp}.log`);

    this.log('INFO', 'Logger initialized', { logFile: this.logFile, errorFile: this.errorFile });
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
    };
    return JSON.stringify(logEntry) + '\n';
  }

  writeToFile(filename, content) {
    try {
      fs.appendFileSync(filename, content);
    } catch (err) {
      console.error('Failed to write to log file:', err.message);
    }
  }

  log(level, message, data = {}) {
    const formattedMessage = this.formatMessage(level, message, data);

    // Write to console with color coding
    const colors = {
      INFO: '\x1b[36m', // Cyan
      WARN: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m', // Red
      SUCCESS: '\x1b[32m', // Green
      DEBUG: '\x1b[35m', // Magenta
    };
    const resetColor = '\x1b[0m';
    console.log(`${colors[level] || ''}[${level}] ${message}${resetColor}`, data);

    // Write to log file
    this.writeToFile(this.logFile, formattedMessage);

    // Write errors to separate error file
    if (level === 'ERROR') {
      this.writeToFile(this.errorFile, formattedMessage);
    }
  }

  info(message, data = {}) {
    this.log('INFO', message, data);
  }
  warn(message, data = {}) {
    this.log('WARN', message, data);
  }
  error(message, data = {}) {
    this.log('ERROR', message, data);
  }
  success(message, data = {}) {
    this.log('SUCCESS', message, data);
  }
  debug(message, data = {}) {
    this.log('DEBUG', message, data);
  }
}

// Initialize logger
const logger = new Logger();

/**
 * Analyze one article from each source.
 * @param {string[]} articleLinks - Array of article URLs (one per source)
 * @returns {Promise<Array>} - Array of analysis results for each article
 */
async function analyzeArticlesFromLinks(articleLinks, options = {}) {
  const allowedDomains = await loadAllowedDomains();
  const results = [];
  const { category = '', isBreaking = false } = options;
  if (!articleLinks || !Array.isArray(articleLinks)) {
    logger.error('articleLinks is not an array or is undefined', {
      articleLinks,
      type: typeof articleLinks,
      isArray: Array.isArray(articleLinks),
    });
    return [];
  }

  if (articleLinks.length === 0) {
    logger.warn('No article links provided');
    return [];
  }

  for (const url of articleLinks) {
    try {
      // Check if domain is allowed
      const submittedDomain = new URL(url).hostname.replace(/^www\./, '');
      const isAllowed = allowedDomains.some((domain) => submittedDomain.endsWith(domain));
      if (!isAllowed) {
        results.push({ url, error: `Domain not allowed for analysis: ${submittedDomain}` });
        continue;
      }
      // Extract keywords and fetch related articles
      logger.info('Starting article processing', { url });
      const keyword = await utils.extractKeywords(url);
      logger.info('Extracted keywords', { url, keyword });

      const concepts = await utils.extractArticleConceptsFromUrl(url);
      logger.info('Extracted Concepts', { url, concepts });

      const params = buildSearchParameters(concepts, url);
      logger.info('Built search parameters', { url, params });

      const google_related_articles = await searchNews(params);
      logger.info('Google Related Articles', { url, count: google_related_articles?.length || 0 });

      if (!google_related_articles || google_related_articles.length === 0) {
        logger.warn('No related articles found in Google News', { url });
        results.push({ url, error: 'No related articles found in Google News' });
        continue;
      }

      // const relatedArticles = await utils.fetchRelatedArticles(keyword, url, allowedDomains);
      const relatedArticles = await utils.cleanGoogleArticles(google_related_articles, allowedDomains);
      logger.info('Cleaned Google Related Articles', { url, count: relatedArticles?.length || 0 });

      if (!relatedArticles.length) {
        logger.warn('No related articles found after cleaning', { url });
        results.push({ url, error: 'No related articles found' });
        continue;
      }
      // Scrape articles
      logger.info('Starting article scraping', { url, articlesToScrape: relatedArticles.length });
      const scrapedArticles = await utils.scrapeArticles(relatedArticles);
      logger.info('Scraped articles completed', { url, scrapedCount: scrapedArticles.length });

      if (!scrapedArticles.length) {
        logger.warn('No articles scraped', { url });
        results.push({ url, error: 'No articles scraped' });
        continue;
      }

      // Get article info for imageUrl
      logger.info('Getting article info', { url });
      const { title, description, imageUrl, author } = await utils.getArticleInfo(url);
      logger.info('Got article info', { url, title: title?.substring(0, 50) });

      // You may want to extract author/source if available from getArticleInfo or another method
      logger.info('Starting AI analysis', { url, scrapedArticlesCount: scrapedArticles.length });
      const analysisRaw = await utils.analyzeArticlesWithAINew(scrapedArticles);
      logger.info('AI analysis completed', { url, analysisLength: analysisRaw?.length || 0 });
      let analysis = analysisRaw;
      if (typeof analysisRaw === 'string') {
        logger.info('Parsing analysis from string', { url });
        // Try to parse if it's a JSON string or markdown-wrapped JSON
        try {
          analysis = parseAnalysisSection ? parseAnalysisSection(analysisRaw) : JSON.parse(analysisRaw);
          logger.info('Successfully parsed analysis', { url, analysisKeys: Object.keys(analysis || {}) });
        } catch (parseError) {
          logger.error('Failed to parse analysis', { url, error: parseError.message, rawLength: analysisRaw?.length });
          analysis = { error: 'Failed to parse analysis', raw: analysisRaw };
        }
      }

      const resultData = {
        analysis: {
          bias: analysis.bias || [],
          bias_rating: analysis.bias_rating || 'unknown',
          bias_direction: analysis.bias_direction || 'unknown',
          summary: analysis.summary || '',
          conclusion: analysis.conclusion || '',
          recommendations: analysis.recommendations || '',
          sources_agree_on: analysis.sources_agree_on || '',
        },
        url,
        title: title || '',
        summary: description || '',
        keywords: keyword || '',
        imageUrl: imageUrl || '',
        author: author, // set if you extract it
        source: submittedDomain,
        category,
        isBreaking,
        related_articles: scrapedArticles.map((article) => ({
          source: article.source,
          title: article.title,
          url: article.url,
          content: article.text,
        })),
      };

      logger.info('Result data created', {
        url,
        hasTitle: !!resultData.title,
        hasSummary: !!resultData.summary,
        hasAnalysis: !!resultData.analysis.summary,
        relatedCount: resultData.related_articles.length,
      });

      // Validate critical fields before adding to results
      const validationIssues = [];
      if (!resultData.title || resultData.title.length < 5) {
        validationIssues.push('title missing or too short');
      }
      if (!resultData.analysis.summary || resultData.analysis.summary.length < 20) {
        validationIssues.push('analysis summary missing or too short');
      }
      if (!resultData.analysis.bias || resultData.analysis.bias.length === 0) {
        validationIssues.push('bias analysis missing');
      }
      if (!resultData.related_articles || resultData.related_articles.length === 0) {
        validationIssues.push('no related articles');
      }

      if (validationIssues.length > 0) {
        logger.warn('Article has validation issues but will be included in results', {
          url,
          issues: validationIssues,
        });
      } else {
        logger.success('Article passed validation checks', { url });
      }

      results.push(resultData);
    } catch (err) {
      results.push({ url, error: err.message });
      logger.error('Error processing article', { url, error: err.message });
    }
  }
  logger.info('Analysis results', { results });
  return results;
}

// Heuristic: returns true if the link looks like a real article
function isArticleLink(url) {
  return /\/\d{4}\/\d{2}\/\d{2}\//.test(url) || /\/[a-z-]+-\d{7,}/i.test(url) || /\/news\//i.test(url);
}

/**
 * Step 1: Fetches article links for a theme, returning only one link per unique domain.
 * @param {string} theme - The news theme or topic to search for.
 * @returns {Promise<string[]>} - Array of article URLs, one per unique domain.
 */
async function getUniqueDomainArticleLinks(theme = 'Politics') {
  const googleResults = await getNewsArticles(theme);
  const seenDomains = new Set();
  const articleLinks = [];

  for (const result of googleResults) {
    const url = result.link;
    let linksToCheck = [];
    if (isArticleLink(url)) {
      linksToCheck = [url];
    } else {
      const foundArticles = await findAllArticleLinks(url);
      linksToCheck = foundArticles;
    }
    for (const link of linksToCheck) {
      try {
        const domain = new URL(link).hostname.replace(/^www\./, '');
        if (!seenDomains.has(domain)) {
          seenDomains.add(domain);
          articleLinks.push(link);
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    }
  }
  return articleLinks;
}

/**
 * Step 2: For a given topic, get one article per unique domain and analyze each article using the full pipeline.
 * @param {string} topic - The news topic/theme to analyze.
 * @returns {Promise<Array>} - Array of analysis results for each article.
 */
async function getAnalysisForTopic(topic, opts = {}) {
  const articleLinks = await getUniqueDomainArticleLinks(topic);
  // Set category and isBreaking for all articles in this topic
  const options = { category: topic, isBreaking: opts.isBreaking || false };
  return await analyzeArticlesFromLinks(articleLinks, options);
}

// Define list of themes
const themes = ['All', 'Sports', 'Entertainment', 'Science', 'Environment', 'Education', 'Politics', 'Tech', 'Business', 'Health', 'World', 'Breaking'];

// Run analysis for all themes
(async () => {
  for (const topic of themes) {
    const isBreaking = topic.toLowerCase() === 'breaking';
    logger.info(`Analyzing topic: ${topic}`);
    const results = await getAnalysisForTopic(topic, { isBreaking });
    const outputPath = `./analysis/analysis_results_${topic}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    logger.success(`Analysis results written to ${outputPath}`);

    // Prepare articles for DB insert with validation
    const allowedDomainsForInsert = await loadAllowedDomains();
    const news_date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const theme = topic;

    /**
     * Validates if an article has sufficient content for database insertion
     */
    function isValidArticle(article) {
      // Check for required fields
      if (!article.url || !article.title) {
        logger.warn('Article missing URL or title', { url: article.url, title: article.title });
        return false;
      }

      // Check if title is meaningful (not just "No title" or similar)
      if (article.title.toLowerCase().includes('no title') || article.title.length < 10) {
        logger.warn('Article has invalid or too short title', { title: article.title });
        return false;
      }

      // Check if analysis exists and has meaningful content
      if (!article.analysis || typeof article.analysis !== 'object') {
        logger.warn('Article missing analysis object', { url: article.url });
        return false;
      }

      // Check if analysis has summary (most critical field)
      if (!article.analysis.summary || article.analysis.summary.length < 20) {
        logger.warn('Article missing or too short analysis summary', {
          url: article.url,
          summaryLength: article.analysis.summary?.length || 0,
        });
        return false;
      }

      // Check if bias analysis exists
      if (!article.analysis.bias || !Array.isArray(article.analysis.bias) || article.analysis.bias.length === 0) {
        logger.warn('Article missing bias analysis', { url: article.url });
        return false;
      }

      // Check if we have related articles (should have at least 1)
      if (!article.related_articles || !Array.isArray(article.related_articles) || article.related_articles.length === 0) {
        logger.warn('Article missing related articles', { url: article.url });
        return false;
      }

      logger.info('Article passed validation', { url: article.url, title: article.title.substring(0, 50) });
      return true;
    }

    const articlesForDb = results
      .filter((article) => {
        try {
          // First check domain allowlist
          const domain = new URL(article.url).hostname.replace(/^www\./, '');
          const isDomainAllowed = allowedDomainsForInsert.some((allowed) => domain.endsWith(allowed));
          if (!isDomainAllowed) {
            logger.warn('Article domain not in allowlist', { domain, url: article.url });
            return false;
          }

          // Then validate article content
          const isValid = isValidArticle(article);
          if (!isValid) {
            logger.warn('Article failed validation, excluding from DB insert', { url: article.url });
          }
          return isValid;
        } catch (error) {
          logger.error('Error validating article', { url: article.url, error: error.message });
          return false;
        }
      })
      .map((article) => {
        const filteredRelated = Array.isArray(article.related_articles)
          ? article.related_articles.filter((rel) => {
              try {
                const relDomain = new URL(rel.url).hostname.replace(/^www\./, '');
                return allowedDomainsForInsert.some((allowed) => relDomain.endsWith(allowed));
              } catch {
                return false;
              }
            })
          : [];
        return {
          topic,
          theme,
          news_date,
          url: article.url,
          title: article.title || '',
          summary: article.summary || '',
          analysis: article.analysis || '',
          related_articles: filteredRelated,
          keywords: article.keywords || '',
          image_url: article.imageUrl || '',
          author: article.author || '',
          source: article.source || '',
        };
      });

    logger.info(`Validation results: ${results.length} total articles, ${articlesForDb.length} valid for DB insertion`);

    if (articlesForDb.length === 0) {
      logger.warn(`No valid articles found for topic ${topic} - skipping database insertion`);
    } else {
      const batchid = await insertDailyNewsArticles(articlesForDb);
      logger.success(`Inserted ${articlesForDb.length} valid articles into DB with batchid: ${batchid}`);
    }
  }
  await closePool();
})();
