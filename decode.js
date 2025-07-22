/**
 * Parses a JSON string (possibly with markdown code block markers or extra newlines) into a JS object.
 * @param {string} analysisText - The AI response as a string (may include ```json ... ``` wrappers)
 * @returns {object|null} The parsed object, or null if parsing fails
 */
function parseAnalysisSection(analysisText) {
  if (typeof analysisText !== 'string') return null;
  // Remove markdown code block markers and trim whitespace
  let cleaned = analysisText.trim()
    .replace(/^```json[\r\n]*/i, '')
    .replace(/^```[\r\n]*/i, '')
    .replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse analysis section:', e);
    return null;
  }
}

module.exports = {
  parseAnalysisSection,
};