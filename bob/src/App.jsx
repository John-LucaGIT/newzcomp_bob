import React, { useState } from 'react';
import { ClipLoader } from 'react-spinners';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const [url, setUrl] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  function cleanMarkdown(markdown) {
    // Remove ```markdown at the start and ``` at the end
    return markdown.replace(/^```markdown\s*/, '').replace(/```$/, '');
  }

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };

  const handleAnalyze = async () => {
    if (!url) {
      alert('Please enter an article URL!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        const cleanedMarkdown = cleanMarkdown(data.analysis); // Clean the markdown

        setMarkdownContent(cleanedMarkdown); // Update state
        setRelatedArticles(data.related_articles);
        setAnalyzed(true);
      } else {
        console.error('Error analyzing article:', response.statusText);
        alert('Failed to analyze article');
      }
    } catch (error) {
      console.error('Error analyzing article:', error);
      alert('An error occurred while analyzing the article');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-6 py-12">
      <header className="fixed top-2 left-1/2 transform -translate-x-1/2 bg-white shadow-md z-50 rounded-xl max-w-5xl w-full px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Return Link */}
          <div className="flex items-center space-x-4">
            <img
              src="/assets/tricolorblack.svg" // Replace with your logo path
              alt="NewzComp Logo"
              className="h-10 w-10"
            />
            <a href="https://newzcomp.com/" className="text-md font-semibold text-gray-800 hover:text-blue-600 transition">
              Return to NewzComp
            </a>
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-4">
            {/* Twitter */}
            <a href="https://twitter.com/newzcomp" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition">
              <i className="fab fa-twitter text-xl"></i>
            </a>

            {/* Instagram */}
            <a href="https://www.instagram.com/newzcomp" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-pink-500 transition">
              <i className="fab fa-instagram text-xl"></i>
            </a>

            {/* LinkedIn */}
            <a href="https://www.linkedin.com/company/newzcomp" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition">
              <i className="fab fa-linkedin text-xl"></i>
            </a>
          </div>
        </div>
      </header>
      {/* Main Content */}
      {
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Meet Bob</h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">Bob analyzes news articles for bias, summarizes the story, and finds related coverage. Enter a URL below!</p>
        </div>
      }
      <div className="w-full max-w-2xl flex flex-col items-center space-y-4">
        <input type="text" placeholder="Paste article URL here..." value={url} onChange={handleUrlChange} className="w-full p-4 text-lg rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white shadow-md" />

        <button onClick={handleAnalyze} disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-lg rounded-xl transition shadow-md">
          {loading ? 'Analyzing...' : 'Analyze with Bob'}
        </button>
      </div>
      {loading && (
        <div className="flex items-center justify-center w-full h-full absolute top-0 left-0 bg-gray-100">
          <div className="text-center">
            <ClipLoader size={50} color="#3B82F6" />
            <p className="mt-4 text-gray-500">Bob is analyzing the article...</p>
          </div>
        </div>
      )}
      {analyzed && (
        <div className="mt-16 w-full max-w-5xl">
          <div className="prose prose-lg max-w-none bg-white p-10 rounded-2xl shadow-xl overflow-x-auto break-words">
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

          <h2 className="text-3xl font-semibold mt-12 mb-6 text-gray-800">Related Articles</h2>

          <div className="space-y-8">
            {Array.isArray(relatedArticles) &&
              relatedArticles.map((article, idx) => (
                <div key={idx} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="text-sm text-gray-500 mb-1">{article.source}</div>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-2xl font-semibold text-blue-600 hover:underline">
                    {article.title}
                  </a>
                  <p className="text-gray-700 mt-4 whitespace-pre-wrap">{article.content}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
