import React, { useState } from 'react';
import { Helmet } from 'react-helmet';

function Metadata() {
  return (
    <Helmet>
      <title>Feedback for Bob - AI News Assistant by NewzComp</title>
      <meta
        name="description"
        content="Share your feedback on Bob, the experimental AI-powered news analysis tool by NewzComp. Help us improve Bob's ability to analyze news articles for bias, provide summaries, and find related coverage."
      />
      <meta
        name="keywords"
        content="feedback, Bob AI, AI news analysis, news bias detection, article summaries, related news, NewzComp"
      />
      <meta name="author" content="NewzComp" />
      <meta
        property="og:title"
        content="Feedback for Bob - AI News Assistant by NewzComp"
      />
      <meta
        property="og:description"
        content="Let us know your thoughts on Bob, NewzComp's experimental AI for news analysis. Your feedback helps us improve features like bias detection, article summaries, and related news discovery."
      />
      <meta property="og:url" content="https://newzcomp.com/feedback" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/assets/tricolorblack.svg" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="Feedback for Bob - AI News Assistant by NewzComp"
      />
      <meta
        name="twitter:description"
        content="Share your feedback on Bob, the AI-powered news tool by NewzComp. Help us enhance bias detection, summaries, and related news features."
      />
      <meta name="twitter:image" content="/assets/tricolorblack.svg" />
    </Helmet>
  );
}

const FeedbackPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || 'Failed to send feedback.');
      }
    } catch (err) {
      setErrorMsg('Failed to send feedback:' + ' ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto mt-20 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Feedback for Bob</h1>
      <p className="mb-6 text-gray-700 text-center">
        <strong>Bob is a new feature and is in active development.</strong> Please share any feedback, bugs you come across, or feature requests you have. Your input helps us improve Bob for everyone.
        <br />
        <span className="italic">— The NewzComp Team</span>
      </p>
      <div className="bg-white shadow-md rounded-2xl p-6">
        {submitted ? (
          <div className="text-center text-green-600 font-semibold">Thank you for your feedback! We'll review it shortly.</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && <div className="text-red-600 text-center mb-2">{errorMsg}</div>}
            <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="email" placeholder="Your Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea placeholder="Your Message for Bob" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition" disabled={loading}>
              {loading ? 'Sending...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
