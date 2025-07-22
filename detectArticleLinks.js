// detectArticleLinks.js
const { getNewsArticles, findAllArticleLinks } = require('./googlenews');
const { loadAllowedDomains, insertDailyNewsArticles, closePool } = require('./dbconnect');
const { parseAnalysisSection } = require('./decode.js');
const utils = require('./report_utils');
const fs = require('fs');

/**
 * Analyze one article from each source.
 * @param {string[]} articleLinks - Array of article URLs (one per source)
 * @returns {Promise<Array>} - Array of analysis results for each article
 */
async function analyzeArticlesFromLinks(articleLinks, options = {}) {
  const allowedDomains = await loadAllowedDomains();
  const results = [];
  const { category = '', isBreaking = false } = options;
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
      const keyword = await utils.extractKeywords(url);
      const relatedArticles = await utils.fetchRelatedArticles(keyword, url, allowedDomains);
      if (!relatedArticles.length) {
        results.push({ url, error: 'No related articles found' });
        continue;
      }
      // Scrape articles
      const scrapedArticles = await utils.scrapeArticles(relatedArticles);
      if (!scrapedArticles.length) {
        results.push({ url, error: 'No articles scraped' });
        continue;
      }
      // Get article info for imageUrl
      const { title, description, imageUrl, author } = await utils.getArticleInfo(url);
      // You may want to extract author/source if available from getArticleInfo or another method
      const analysisRaw = await utils.analyzeArticlesWithAINew(scrapedArticles);
      let analysis = analysisRaw;
      if (typeof analysisRaw === 'string') {
        // Try to parse if it's a JSON string or markdown-wrapped JSON
        analysis = parseAnalysisSection ? parseAnalysisSection(analysisRaw) : JSON.parse(analysisRaw);
      }
      results.push({
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
      });
    } catch (err) {
      results.push({ url, error: err.message });
    }
  }
  console.log('Analysis results:');
  console.log(results);
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
const themes = [
  'All',
  'Sports',
  'Entertainment',
  'Science',
  'Environment',
  'Education',
  'Politics',
  'Tech',
  'Business',
  'Health',
  'World',
  'Breaking'
];

// Run analysis for all themes
(async () => {
  for (const topic of themes) {
    const isBreaking = topic.toLowerCase() === 'breaking';
    console.log(`Analyzing topic: ${topic}`);
    const results = await getAnalysisForTopic(topic, { isBreaking });
    const outputPath = `./analysis_results_${topic}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Analysis results written to ${outputPath}`);

    // Prepare articles for DB insert
    const allowedDomainsForInsert = await loadAllowedDomains();
    const news_date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const theme = topic;
    const articlesForDb = results
      .filter((article) => {
        try {
          const domain = new URL(article.url).hostname.replace(/^www\./, '');
          return allowedDomainsForInsert.some((allowed) => domain.endsWith(allowed));
        } catch {
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
    const batchid = await insertDailyNewsArticles(articlesForDb);
    console.log(`Inserted ${articlesForDb.length} articles into DB with batchid: ${batchid}`);
  }
  await closePool();
})();
