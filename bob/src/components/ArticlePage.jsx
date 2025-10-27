import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';

function getBiasColor(biasDirection) {
  switch (biasDirection?.toLowerCase()) {
    case 'left':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'right':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'center':
    case 'neutral':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function getBiasRatingColor(rating) {
  // Handle numeric ratings (0-5 scale)
  if (typeof rating === 'number' || !isNaN(parseFloat(rating))) {
    const numRating = parseFloat(rating);
    if (numRating <= 1.5) {
      return 'bg-green-50 text-green-700 border-green-200';
    } else if (numRating <= 3.5) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    } else {
      return 'bg-red-50 text-red-700 border-red-200';
    }
  }

  // Handle string ratings
  switch (rating?.toLowerCase()) {
    case 'low':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'medium':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'high':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function ArticlePage() {
  const { bobid } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_BASE;

  // Check if coming from latest news page
  const source = searchParams.get('source');
  const isFromLatest = source === 'latest';

  console.log('ArticlePage: Component mounted');
  console.log('ArticlePage: bobid =', bobid);
  console.log('ArticlePage: API_BASE =', API_BASE);

  useEffect(() => {
    // Determine which endpoint to use based on source
    const endpoint = isFromLatest ? `/latest/${bobid}` : `/articles/${bobid}`;
    const fullUrl = `${API_BASE}${endpoint}`;

    console.log('ArticlePage: bobid =', bobid);
    console.log('ArticlePage: API_BASE =', API_BASE);
    console.log('ArticlePage: isFromLatest =', isFromLatest);
    console.log('ArticlePage: Full URL =', fullUrl);

    fetch(fullUrl)
      .then((res) => {
        console.log('ArticlePage: Response status:', res.status);
        console.log('ArticlePage: Response ok:', res.ok);
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        console.log('ArticlePage: Received data:', data);
        setArticle(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('ArticlePage: Error fetching article:', error);
        setArticle(null);
        setLoading(false);
      });
  }, [bobid, API_BASE, isFromLatest]);

  if (loading) {
    console.log('ArticlePage: Currently loading...');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!article) {
    console.log('ArticlePage: No article found');
    const backPath = isFromLatest ? '/latest' : '/stored-articles';
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Article Not Found</h1>
        <button
          onClick={() => navigate(backPath)}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          {isFromLatest ? 'Back to Latest News' : 'Back to Articles'}
        </button>
      </div>
    );
  }

  console.log('ArticlePage: Rendering article:', article);

  return (
    <>
      <Helmet>
        <title>{article.title ? `${article.title} | ${article.source_name} | Bob News Analysis by NewzComp` : 'Article - Bob News Analysis'}</title>
        <meta name="description" content={article.analysis?.summary ? article.analysis.summary : `Read news analysis, bias summary, and related coverage for this article on Bob by NewzComp.`} />
        <meta name="author" content={article.author || article.source_name || 'NewzComp'} />
        <meta name="keywords" content={`news, analysis, bias, ${article.source_name}, ${article.title}, ${article.keyword}, NewzComp, Bob`} />
        {/* Open Graph tags */}
        <meta property="og:title" content={article.title ? `${article.title} | Bob News Analysis` : 'Article - Bob News Analysis'} />
        <meta property="og:description" content={article.analysis?.summary || 'Read news analysis, bias summary, and related coverage for this article on Bob by NewzComp.'} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://bob.newzcomp.com/article/${bobid}`} />
        <meta property="og:image" content={article.image_url || "/assets/tricolorblack.svg"} />
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title ? `${article.title} | Bob News Analysis` : 'Article - Bob News Analysis'} />
        <meta name="twitter:description" content={article.analysis?.summary || 'Read news analysis, bias summary, and related coverage for this article on Bob by NewzComp.'} />
        <meta name="twitter:image" content={article.image_url || "/assets/tricolorblack.svg"} />
      </Helmet>

      <div className="flex flex-col items-center min-h-screen bg-gray-50 pt-32 pb-10 px-4">
        <h1 className="text-4xl lg:text-5xl font-bold mb-8 text-center text-gray-800">Article Analysis</h1>

        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl p-6 sm:p-8 md:p-10 mb-6 relative">
          {/* Close Button */}
          <button
            className="absolute top-6 right-6 text-gray-500 hover:text-red-500 text-3xl font-bold transition-colors"
            onClick={() => navigate(isFromLatest ? '/latest' : '/stored-articles')}
            aria-label="Close"
          >
            &times;
          </button>

          {/* Article Header */}
          <div className="mb-8">
            {article.image_url && (
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-64 object-cover rounded-xl mb-6"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {article.topic && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {article.topic}
                </span>
              )}
              {article.source_name && article.source_name.trim() && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {article.source_name}
                </span>
              )}
              {article.author && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  By {article.author}
                </span>
              )}
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">{article.title}</h2>

            {article.query_date && (
              <div className="text-sm text-gray-500 mb-4">
                Published: {new Date(article.query_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>

          {/* Smart Summary Box - Purple */}
          {article.analysis?.summary && (
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 rounded-xl p-6 mb-8">
              <div className="flex items-center mb-4">
                <div className="bg-purple-500 text-white rounded-full p-2 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.051V8a1 1 0 01-2 0V6a1 1 0 01.504-.864l3-1.716a1 1 0 011.114.084zM14.382 4.504a1 1 0 011.114-.084l3 1.716A1 1 0 0119 6v2a1 1 0 11-2 0V7.051l-1.254.717a1 1 0 11-.992-1.736L15.016 6l-.23-.132a1 1 0 01-.372-1.364z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-purple-800">Smart Summary</h3>
              </div>
              <div className="prose max-w-none">
                <div className="text-purple-700">
                  {article.analysis.summary}
                </div>
              </div>
            </div>
          )}

          {/* Bias Analysis Boxes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Bias Direction Box */}
            {article.analysis?.bias_direction && (
              <div className={`rounded-xl p-6 border-2 ${getBiasColor(article.analysis.bias_direction)}`}>
                <h3 className="text-lg font-bold mb-3">Bias Direction</h3>
                <div className="text-2xl font-bold capitalize mb-2">
                  {article.analysis.bias_direction}
                </div>
                {article.analysis.reasoning && (
                  <p className="text-sm opacity-80">
                    {article.analysis.reasoning}
                  </p>
                )}
              </div>
            )}

            {/* Bias Rating Box */}
            {article.analysis?.bias_rating && (
              <div className={`rounded-xl p-6 border-2 ${getBiasRatingColor(article.analysis.bias_rating)}`}>
                <h3 className="text-lg font-bold mb-3">Bias Intensity</h3>
                <div className="text-2xl font-bold capitalize mb-2">
                  {typeof article.analysis.bias_rating === 'number' || !isNaN(parseFloat(article.analysis.bias_rating))
                    ? `${parseFloat(article.analysis.bias_rating).toFixed(1)}/5.0`
                    : article.analysis.bias_rating}
                </div>
                <div className="text-sm opacity-80">
                  {typeof article.analysis.bias_rating === 'number' || !isNaN(parseFloat(article.analysis.bias_rating))
                    ? 'Bias intensity on a scale of 0-5'
                    : 'Level of bias detected in the article'}
                </div>
              </div>
            )}
          </div>

          {/* Individual Article Bias Ratings */}
          {Array.isArray(article.analysis?.bias) && article.analysis.bias.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Source Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {article.analysis.bias.map((bias, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="font-semibold text-gray-800 mb-2">{bias.source || `Source ${idx + 1}`}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Direction:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getBiasColor(bias.bias_direction)}`}>
                        {bias.bias_direction || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-600">Rating:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getBiasRatingColor(bias.bias_rating)}`}>
                        {typeof bias.bias_rating === 'number' || !isNaN(parseFloat(bias.bias_rating))
                          ? `${parseFloat(bias.bias_rating).toFixed(1)}/5`
                          : bias.bias_rating || 'Unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Bias Analysis by Source */}
          {Array.isArray(article.analysis?.bias) && article.analysis.bias.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Detailed Bias Analysis by Source</h3>
              <div className="space-y-6">
                {article.analysis.bias.map((bias, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    {/* Source Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-4 border-b border-gray-300">
                      <div className="mb-2 sm:mb-0">
                        <h4 className="text-lg font-bold text-gray-800">{bias.source || `Source ${idx + 1}`}</h4>
                        {bias.title && (
                          <p className="text-sm text-gray-600 mt-1">{bias.title}</p>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBiasColor(bias.bias_direction)}`}>
                          {bias.bias_direction || 'Unknown'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBiasRatingColor(bias.bias_rating)}`}>
                          {typeof bias.bias_rating === 'number' || !isNaN(parseFloat(bias.bias_rating))
                            ? `${parseFloat(bias.bias_rating).toFixed(1)}/5`
                            : bias.bias_rating || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Bias Analysis */}
                    {bias.bias_analysis && (
                      <div className="mb-4">
                        <h5 className="text-md font-semibold text-gray-700 mb-3">Bias Analysis:</h5>
                        <p className="text-gray-700 leading-relaxed">{bias.bias_analysis}</p>
                      </div>
                    )}

                    {/* Article Summary (if present and not empty) */}
                    {bias.summary && bias.summary.trim() && (
                      <div>
                        <h5 className="text-md font-semibold text-gray-700 mb-3">Article Summary:</h5>
                        <p className="text-gray-700 leading-relaxed">{bias.summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Analysis Sections */}
          {article.analysis?.sources_agree_on && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Sources Agree On</h3>
              <div className="prose max-w-none">
                <div className="text-gray-700">
                  {article.analysis.sources_agree_on}
                </div>
              </div>
            </div>
          )}

          {(article.analysis?.conclusion || article.analysis?.recommendations) && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                {article.analysis?.conclusion && article.analysis?.recommendations
                  ? "Conclusion & Recommendations"
                  : article.analysis?.conclusion
                    ? "Conclusion"
                    : "Recommendations"}
              </h3>
              <div className="prose max-w-none space-y-4">
                {article.analysis?.conclusion && (
                  <div>
                    {article.analysis?.recommendations && (
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">Conclusion:</h4>
                    )}
                    <div className="text-gray-700">
                      {article.analysis.conclusion}
                    </div>
                  </div>
                )}
                {article.analysis?.recommendations && (
                  <div>
                    {article.analysis?.conclusion && (
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">Recommendations:</h4>
                    )}
                    <div className="text-gray-700">
                      {article.analysis.recommendations}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Reasoning Section */}
          {article.analysis?.reasoning && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-3">AI Reasoning</h3>
              <div className="prose max-w-none">
                <div className="text-gray-700">
                  {article.analysis.reasoning}
                </div>
              </div>
            </div>
          )}

          {/* Original Article Link */}
          {article.source_url && typeof article.source_url === 'string' && article.source_url.trim() !== '' ? (
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors font-medium border border-blue-300"
            >
              View Original Article
            </a>
          ) : (
            <span className="inline-block px-6 py-3 bg-gray-300 text-gray-600 rounded-lg">
              Original article link unavailable
            </span>
          )}
          {Array.isArray(article.related_articles) && article.related_articles.length > 0 && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-8 text-gray-800">Related Articles</h2>
              <div className="space-y-6">
                {article.related_articles.map((rel, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
                    <div className="text-sm text-purple-600 font-medium mb-2">{rel.source}</div>
                    <a
                      href={rel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xl font-semibold text-gray-800 hover:text-blue-600 transition-colors block mb-3"
                    >
                      {rel.title}
                    </a>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{rel.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ArticlePage;
