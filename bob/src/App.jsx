import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
  const [url, setUrl] = useState('');  // Store the article URL
  const [markdownContent, setMarkdownContent] = useState('');  // Store the markdown content

  // Function to handle URL input change
  const handleUrlChange = (e) => {
    setUrl(e.target.value);  // Update the URL state
  };

  // Function to handle "Analyze" button click
  const handleAnalyze = async () => {
    try {
      if (!url) {
        alert('Please enter an article URL!');
        return;
      }

      // Make an API call with the URL entered by the user
      const response = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }), // Send the URL in the request body
      });

      // Check if the response is successful
      if (response.ok) {
        const data = await response.json();
        setMarkdownContent(data.analysis);  // Set the markdown content to the response analysis
      } else {
        console.error('Error analyzing article:', response.statusText);
        alert('Failed to analyze article');
      }
    } catch (error) {
      console.error('Error analyzing article:', error);
      alert('An error occurred while analyzing the article');
    }
  };

  return (
    <div className="app-container">
      <h1>Article Bias Analysis</h1>

      <div className="input-container">
        <input
          type="text"
          placeholder="Enter Article URL"
          value={url}
          onChange={handleUrlChange}  // Update the URL when the user types
          className="url-input"
        />
      </div>

      <button onClick={handleAnalyze}>Analyze Article</button>

      <div className="markdown-output">
        {/* Render the markdown content returned by the API */}
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      </div>
    </div>
  );
}

export default App;
