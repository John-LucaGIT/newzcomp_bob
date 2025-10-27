const { findAllArticleLinks, getNewsArticles } = require('./googlenews');

var theme = 'All'


const testUrl = 'https://edition.cnn.com/world'; // Replace with any section URL

console.log(`Finding article links on: ${testUrl}`);

(async () => {
  const googleResults = await getNewsArticles('Politics');
  // const links = await findAllArticleLinks(testUrl);
  console.log(googleResults)
  console.log('All article links:', links.slice(0, 2));
})();
// console.log(link)