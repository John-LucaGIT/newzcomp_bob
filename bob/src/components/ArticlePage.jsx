import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function cleanMarkdown(markdown) {
  return markdown?.replace(/^```markdown\s*/, '').replace(/```$/, '') || '';
}

function ArticlePage() {
  const { bobid } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [meta, setMeta] = useState({ source_name: '', source_url: '', title: '', keyword: '', description: '' });
  useEffect(() => {
    fetch(`${API_BASE}/articles/${bobid}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setArticle(data.analysis);
        setMarkdownContent(cleanMarkdown(data.analysis.analysis));
        setMeta({
          source_name: data.source_name || '',
          source_url: data.source_url || '',
          title: data.title || '',
          keyword: data.keyword || '',
          description: data.description || '',
        });
      })
      .catch(() => setArticle(null));
  }, [bobid]);

  if (!article) return <div>Loading...</div>;

  return (
    <>
      <Helmet>
        <title>{meta.title ? `${meta.title} | ${meta.source_name} | Bob News Analysis by NewzComp` : 'Article - Bob News Analysis'}</title>
        <meta name="description" content={meta.description ? meta.description : `Read news analysis, bias summary, and related coverage for this article on Bob by NewzComp.`} />
        <meta name="author" content={meta.source_name || 'NewzComp'} />
        <meta name="keywords" content={`news, analysis, bias, ${meta.source_name}, ${meta.title}, ${meta.keyword}, NewzComp, Bob`} />
        {/* Open Graph tags */}
        <meta property="og:title" content={meta.title ? `${meta.title} | Bob News Analysis` : 'Article - Bob News Analysis'} />
        <meta property="og:description" content={meta.description || 'Read news analysis, bias summary, and related coverage for this article on Bob by NewzComp.'} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://bob.newzcomp.com/article/${bobid}`} />
        <meta property="og:image" content="/assets/tricolorblack.svg" />
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title ? `${meta.title} | Bob News Analysis` : 'Article - Bob News Analysis'} />
        <meta name="twitter:description" content={meta.description || 'Read news analysis, bias summary, and related coverage for this article on Bob by NewzComp.'} />
        <meta name="twitter:image" content="/assets/tricolorblack.svg" />
      </Helmet>
      <div className="flex flex-col items-center min-h-screen bg-gray-100 pt-32 pb-10 px-1">
        <h1 className="text-5xl font-bold mb-8 text-center text-gray-800">Article Details</h1>
        <div
          className="
            bg-white rounded-2xl shadow-2xl w-full
            max-w-4xl
            p-4 sm:p-6 md:p-8 mb-6 relative
            md:w-4/5
          "
          style={{ maxWidth: '100%' }}
        >
          {/* Close Button */}
          <button className="absolute top-6 right-6 text-gray-500 hover:text-red-500 text-3xl font-bold" onClick={() => navigate('/stored-articles')} aria-label="Close">
            &times;
          </button>
          <h2 className="text-4xl font-bold mb-2">{meta.title}</h2>
          <div className="mb-2 text-sm text-gray-500">{meta.source_name}</div>
          <div className="mb-6 text-gray-600">{meta.description}</div>
          <div className="prose prose-xl max-w-none overflow-x-auto break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h1 className="text-4xl font-bold mt-8 mb-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-3xl font-semibold mt-6 mb-3" {...props} />,
                p: ({ node, ...props }) => <p className="mb-4 text-gray-700" {...props} />,
                li: ({ node, ...props }) => <li className="ml-6 list-disc" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
          {meta.source_url && typeof meta.source_url === 'string' && meta.source_url.trim() !== '' ? (
            <a href={meta.source_url} target="_blank" rel="noopener noreferrer" className="block mt-8 text-blue-600 hover:underline">
              View Original Article
            </a>
          ) : (
            <span className="block mt-8 text-gray-400">Original article link unavailable</span>
          )}

          {Array.isArray(article.related_articles) && article.related_articles.length > 0 && (
            <>
              <h2 className="text-4xl font-semibold mt-16 mb-8 text-gray-800">Related Articles</h2>
              <div className="space-y-10">
                {article.related_articles.map((rel, idx) => (
                  <div key={idx} className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="text-sm text-gray-500 mb-2">{rel.source}</div>
                    <a href={rel.url} target="_blank" rel="noopener noreferrer" className="text-2xl font-semibold text-blue-600 hover:underline">
                      {rel.title}
                    </a>
                    <p className="text-gray-700 mt-6 whitespace-pre-wrap">{rel.content}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default ArticlePage;
