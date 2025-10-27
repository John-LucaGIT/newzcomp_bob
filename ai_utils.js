// ai_utils.js - Centralized AI utilities for news analysis
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate search query using OpenAI from article title and description
 */
async function generateSearchQueryFromArticle({ title, description }) {
  const prompt = `
    You are a news search expert.

    Given the following article title and description, create a string of KEYWORDS that captures the **topic** of the article.
    Use operators like quotes ("") for phrases, AND, OR, NOT if needed.
    Keep it under 500 characters.

    TITLE: "${title}"
    DESCRIPTION: "${description}"

    Return only the search query, nothing else.
  `;

  const gptResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });

  const searchQuery = gptResponse.choices[0].message.content.trim();
  return searchQuery;
}

/**
 * Extract structured article concepts for search query building
 */
async function extractArticleConcepts(articleInfo) {
  const prompt = `
    You are a news analysis expert. Your task is to deconstruct a news article into its core components for a search query.
    Given the article's title, description, and publication date, extract the following information and return it as a JSON object:

    1.  "entities": An array of the most important and specific named entities (people, organizations, locations). Max 5. These are the "who" and "where".
    2.  "topic": A short, descriptive phrase (3-5 words) for the main topic. This is the "what".
    3.  "keywords": An array of 2-3 essential keywords or short phrases that are central to the event, but might have synonyms.

    Article Title: "${articleInfo.title}"
    Article Description: "${articleInfo.description}"

    Return ONLY the JSON object.

    Example output for an article about Apple launching a new iPhone:
    {
      "entities": ["Apple", "Tim Cook", "California"],
      "topic": "new iPhone launch event",
      "keywords": ["iPhone 17", "A19 chip"]
    }
  `;

  const gptResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: "json_object" },
  });

  const concepts = JSON.parse(gptResponse.choices[0].message.content);
  return concepts;
}

/**
 * Uses AI to find the most relevant specific article from a section page
 */
async function findRelevantArticleWithAI(linkCandidates, searchQuery) {
  if (linkCandidates.length === 0) {
    return null;
  }

  // Strip 'after:YYYY-MM-DD' and 'before:YYYY-MM-DD' from searchQuery
  const cleanedQuery = searchQuery.replace(/\b(after|before):\d{4}-\d{2}-\d{2}\b/g, '').trim();

  console.log(`Finding relevant article for query: "${cleanedQuery}" among ${linkCandidates.length} candidates.`);
  console.log('Candidates:', linkCandidates.map((c) => c.href));
  console.log('Candidates:', linkCandidates.map((c) => ({
    url: c.href,
    title: c.text,
    context: c.context
  })));
  const prompt = `
- You are a news article selector. Given a search query and a list of article links with their titles and context, select the MOST RELEVANT article that relates to the search query.
- The list of articles may include general pages or pages that have nothing to do with the query or podcasts and video content but you are looking for news articles.
Search Query: "${cleanedQuery}"

Article Candidates:
${linkCandidates.map((item, index) =>
  `${index + 1}. URL: ${item.href}
   Title: ${item.text}
   Context: ${item.context}`
).join('\n\n')}

Instructions:
1. Analyze which article is most relevant to the search query
2. Consider both the title and context
3. Prefer recent, specific articles over general/category pages
4. Return ONLY the number (1-${linkCandidates.length}) of the most relevant article
5. If no articles are clearly relevant, return "NONE"

Your response (just the number or "NONE"):`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_completion_tokens: 10
  });

  console.log('OpenAI response:', JSON.stringify(response.choices));
  const choice = response.choices[0].message.content.trim();

  console.log(`AI selected choice: "${choice}"`);

  if (choice === "NONE" || isNaN(parseInt(choice))) {
    return null;
  }

  const selectedIndex = parseInt(choice) - 1;
  if (selectedIndex >= 0 && selectedIndex < linkCandidates.length) {
    return linkCandidates[selectedIndex].href;
  }

  return null;
}

/**
 * Analyze articles with OpenAI for bias detection (Markdown format)
 */
async function analyzeArticlesWithAI(articles) {
  const payload = articles.map((a) => ({
    source: a.source,
    title: a.title,
    text: a.text.slice(0, 40_000),
  }));

  const prompt = `
  Your name is Bob, you are a professional news analyst trained to detect Bias.

  **Bob's Summary:**
  (((Summary of the story)))

  **Bob's Bias Analysis:** (Do this for each source)
  - Source: [source name]
  - Title: [title]
  - Bias Rating: [0-5] and Bias Direction: [left/right/neutral]
  - Bias Analysis: [analysis]

  **What the sources agree on:**
  (((Facts all sources agree on)))

  **Bob's Conclusion:**
  (((Conclusion based on the analysis, provide an in-depth conclusion of your analysis, explain your reasoning and how you arrived at your conclusion as well as the reasoning for your ratings.)))
  **Bob's Recommendations:**
  (((Recommendations for the reader)))

  Here are the articles:

  ${JSON.stringify(payload, null, 2)}

  Return a structured report in Markdown.
`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  if (!resp.choices?.length) {
    throw new Error('OpenAI returned no choices');
  }
  return resp.choices[0].message.content.trim();
}

/**
 * Analyze articles with OpenAI for bias detection (JSON format)
 */
async function analyzeArticlesWithAINew(articles) {
  const payload = articles.map((a) => ({
    source: a.source,
    title: a.title,
    text: a.text.slice(0, 40_000),
  }));

  console.log('Payload for OpenAI:', payload);

  const prompt = `
  Your name is Bob, you are a professional news analyst trained to detect Bias.

  **Bob's Summary:**
  (((Summary of the story)))

  **Bob's Bias Analysis:** (Do this for each source)
  - Source: [source name]
  - Title: [title]
  - Bias Rating: [0-5] and Bias Direction: [left/right/neutral]
  - Bias Analysis: [analysis]

  **What the sources agree on:**
  (((Facts all sources agree on)))

  **Bob's Conclusion:**
  (((Conclusion based on the analysis, provide an in-depth conclusion of your analysis, explain your reasoning and how you arrived at your conclusion as well as the reasoning for your ratings.)))
  **Bob's Recommendations:**
  (((Recommendations for the reader)))

  Here are the articles:

  ${JSON.stringify(payload, null, 2)}

  Return a structured report in JSON format. Add relevant key value pairs such as bias_rating, bias_direction, summary, sources_agree_on, conclusion, recommendations, reasoning, and topic.
  For the summary you should summarize the articles in a few sentences, focusing on the main points and themes.
  For the bias analysis, provide a detailed analysis of the bias present in each article, including the bias rating and direction.
  The sources_agree_on should summarize what all sources agree on, while the conclusion should provide an overall conclusion based on the analysis.
  The recommendations should provide actionable advice for readers and for media outlets.
  The reasoning should explain how you arrived at your conclusions and ratings.

  For the "topic" key, assign one of the following values ONLY: "all", "politics", "technology", "business", "health", "world", "sports", "entertainment", "science", "environment", "education", "breaking".
  If the report does not fit into one of the category select category "all".

  Please provide a detailed response and analyze each article thoroughly.

  Important: Please note, if you are only provided with one article OR if the additional articles are the exact same, do not return your analysis as if you are comparing articles. Instead, treat it as a single article analysis.
  Also add to the recommendations that readers should seek additional perspectives especially in a case where only one article was found by you.

  This is how your output will be structured:
  Not we also add a sumarry of each article in the bias array. Here is an example of the output format:
  {
    "summary": "The articles discuss...",
    "bias" : [{
      "source": "CNN",
      "title": "Man dies after being pulled into an MRI by a metal chain he wore, police say",
      "summary: "The article reports on a tragic incident...",
      "bias_rating": 2,
      "bias_direction": "neutral",
      "bias_analysis": "CNN's report on the MRI-related accident is straightforward, delivering factual information on the circumstances surrounding the incident. The article highlights the importance of safety around MRI machines without inserting opinion or speculative content. The narrative is factual, with an emphasis on reported details, indicating a neutral stance."
    }],
    "bias_rating": 3, -- Overall bias rating for the collective narrative
    "bias_direction": "left", -- Overall bias direction for the collective narrative
    "sources_agree_on": "Both sources agree that...",
    "conclusion": "The collective narrative from the articles presents...", -- You should add specific details on each article's contribution to the overall narrative and point out any biases and inconsistencies.
    "recommendations": "Readers should seek additional perspectives to understand...",
    "reasoning": "The analysis was based on the content of the articles, focusing on the language used, the framing of the issues, and the overall tone. The bias rating was determined by evaluating the presence of emotionally charged language, selective reporting, and the balance of viewpoints presented.",
    "topic": "politics" -- assign one of: "all", "politics", "technology", "business", "health", "world", "sports", "entertainment", "science", "environment", "education", "breaking"
  }
`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  if (!resp.choices?.length) {
    throw new Error('OpenAI returned no choices');
  }

  const result = resp.choices[0].message.content.trim();

  // Save AI analysis output for debugging
  try {
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'ai_analysis_output.json');
    fs.writeFileSync(outputPath, result);
    console.log(`AI analysis output written to ${outputPath}`);
  } catch (error) {
    console.warn('Could not save AI analysis output:', error.message);
  }

  return result;
}

module.exports = {
  generateSearchQueryFromArticle,
  extractArticleConcepts,
  findRelevantArticleWithAI,
  analyzeArticlesWithAI,
  analyzeArticlesWithAINew
};
