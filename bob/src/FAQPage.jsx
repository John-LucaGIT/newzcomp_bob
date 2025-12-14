import React, { useState } from 'react';

function FAQPage() {
  const [openQuestion, setOpenQuestion] = useState(null);

  const toggleQuestion = (index) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  const faqData = [
    {
      category: "About NewzComp & Bob AI",
      questions: [
        {
          question: "What is NewzComp?",
          answer: "NewzComp is an innovative news analysis platform that helps readers navigate today's complex media landscape. Founded on the principle that informed citizens need access to multiple perspectives, NewzComp provides tools to compare how different news sources cover the same stories. Our flagship AI assistant, Bob, analyzes news articles from across the political spectrum to help you understand bias, identify key facts, and see the full picture of any news story."
        },
        {
          question: "How does Bob AI work?",
          answer: "Bob is an advanced artificial intelligence system that analyzes news articles using natural language processing (NLP) and machine learning algorithms. When you submit an article, Bob performs several key functions: (1) Content Analysis - Bob reads and comprehends the article's main points, claims, and narrative structure. (2) Bias Detection - Using trained models on thousands of labeled articles, Bob identifies language patterns, framing choices, and rhetorical techniques that indicate political bias. (3) Source Comparison - Bob searches for related coverage from sources across the political spectrum (left, center, right) to provide balanced perspective. (4) Summary Generation - Bob creates concise summaries highlighting key information and divergent viewpoints. The entire process takes just seconds, giving you instant access to comprehensive news analysis."
        },
        {
          question: "Is NewzComp free to use?",
          answer: "Yes! NewzComp and Bob AI are completely free to use. We believe that access to unbiased news analysis should be available to everyone. Our mission is to combat misinformation and promote media literacy, which we can best achieve by keeping our tools accessible to all users regardless of their financial situation."
        }
      ]
    },
    {
      category: "Understanding Media Bias",
      questions: [
        {
          question: "What is media bias and why does it matter?",
          answer: "Media bias refers to the tendency of news outlets to present information in ways that favor particular political viewpoints, ideologies, or narratives. Bias can manifest through story selection (what gets covered), framing (how it's presented), language choices, source selection, and emphasis. Media bias matters because it shapes public opinion and understanding of important issues. When people consume news from only one perspective, they may develop incomplete or skewed understanding of events. Recognizing bias helps you become a more critical news consumer and make better-informed decisions about political, social, and economic issues."
        },
        {
          question: "How is political bias classified (left, center, right)?",
          answer: "Political bias is typically classified along a spectrum from left to right based on editorial positions, language patterns, and source reliability. LEFT-LEANING sources generally favor progressive policies, emphasize social justice issues, support government intervention in markets, and prioritize environmental protection and civil rights. CENTER sources aim for balanced reporting, present multiple viewpoints, use neutral language, and focus on factual reporting over opinion. RIGHT-LEANING sources typically favor conservative policies, emphasize individual liberty and free markets, support traditional values, and advocate for limited government. It's important to note that bias exists on a spectrum - sources aren't simply 'left' or 'right' but may lean slightly or strongly in either direction. Additionally, individual articles from a generally centrist source can still exhibit bias."
        },
        {
          question: "Can news ever be completely unbiased?",
          answer: "No, completely unbiased news is practically impossible. Every journalist, editor, and news organization makes choices - what stories to cover, which sources to quote, what facts to emphasize, how to frame narratives - and these choices reflect human judgment and values. Even the decision of what constitutes 'news' involves subjective judgment. However, this doesn't mean all news is equally biased. Professional journalism follows ethical standards aimed at minimizing bias: fact-checking, presenting multiple viewpoints, distinguishing news from opinion, and transparent sourcing. The goal isn't to eliminate bias entirely (which is impossible) but to be aware of it, minimize its impact, and consume news from multiple sources to get a balanced understanding."
        },
        {
          question: "What are common signs of biased reporting?",
          answer: "Key indicators of biased reporting include: (1) LOADED LANGUAGE - Using emotionally charged words instead of neutral terms (e.g., 'radical' vs 'progressive'). (2) SELECTIVE FACTS - Presenting only facts that support one viewpoint while omitting contrary information. (3) UNBALANCED SOURCES - Quoting only sources from one side of an issue. (4) FRAMING - How a story is presented can emphasize certain interpretations (e.g., 'government spending' vs 'investment in infrastructure'). (5) HEADLINE BIAS - Headlines that sensationalize or misrepresent the article's content. (6) OMISSION - Not covering important stories that conflict with an outlet's narrative. (7) OPINION AS NEWS - Presenting commentary or analysis as objective reporting. Recognizing these patterns helps you identify bias and seek additional perspectives."
        }
      ]
    },
    {
      category: "AI and Bias Detection",
      questions: [
        {
          question: "How does AI detect bias in news articles?",
          answer: "AI detects bias through sophisticated natural language processing techniques trained on large datasets of labeled articles. The process involves several components: (1) LINGUISTIC ANALYSIS - AI identifies loaded language, emotional tone, and framing patterns. For example, describing the same policy as 'entitlement spending' vs 'earned benefits' indicates different bias. (2) SEMANTIC UNDERSTANDING - AI analyzes which facts are emphasized, which are minimized, and what's omitted entirely. (3) SOURCE ANALYSIS - AI examines which sources are quoted and whether multiple viewpoints are represented. (4) PATTERN RECOGNITION - Machine learning models trained on thousands of articles from known left-leaning, centrist, and right-leaning sources learn to recognize characteristic patterns. (5) CONTEXTUAL COMPARISON - AI compares how different outlets cover the same story to identify divergent framing. The AI assigns confidence scores based on the strength and consistency of bias indicators detected."
        },
        {
          question: "How accurate is AI at detecting bias?",
          answer: "Modern AI systems for bias detection are quite accurate but not perfect. Studies show well-trained models can achieve 75-85% accuracy in classifying political bias in news articles. However, accuracy varies based on several factors: (1) CLEAR vs SUBTLE BIAS - AI excels at detecting obvious bias (loaded language, one-sided sourcing) but may struggle with subtle bias like emphasis and omission. (2) TRAINING DATA QUALITY - AI accuracy depends heavily on the quality and diversity of training data. (3) EVOLVING LANGUAGE - Political discourse evolves, and AI must continuously update to recognize new patterns. (4) CONTEXT DEPENDENCY - The same language might indicate bias in one context but be neutral in another. That's why Bob provides explanations of WHY it detected bias, allowing users to evaluate the AI's reasoning. We recommend using AI bias detection as one tool among many for critical news consumption, not as the final word."
        },
        {
          question: "What are the limitations of using AI to analyze news?",
          answer: "While AI is powerful, it has important limitations users should understand: (1) LACK OF HUMAN JUDGMENT - AI doesn't understand nuance, context, or cultural subtleties the way humans do. Irony, sarcasm, and complex rhetoric can confuse AI systems. (2) TRAINING BIAS - AI models reflect biases in their training data. If trained primarily on US political discourse, they may not accurately assess international news. (3) SURFACE-LEVEL ANALYSIS - AI analyzes text patterns but doesn't truly 'understand' content or verify factual accuracy without additional fact-checking systems. (4) EVOLVING STANDARDS - What constitutes 'bias' itself is somewhat subjective and culturally dependent. AI applies learned patterns but can't make philosophical judgments about fairness. (5) TECHNICAL ERRORS - AI can misinterpret context, miss subtle meanings, or produce inconsistent results. (6) NO ORIGINAL THOUGHT - AI summarizes and analyzes existing information but doesn't generate original journalism or investigation. Users should use AI analysis as a starting point for critical thinking, not a replacement for it."
        },
        {
          question: "Can AI itself be biased?",
          answer: "Yes, AI systems can definitely be biased, which is why transparency is crucial. AI bias can arise from: (1) TRAINING DATA BIAS - If an AI is trained primarily on articles labeled by people with particular political viewpoints, it will learn those biases. For example, if conservative articles are over-represented in training data, the AI might learn to see moderate positions as left-leaning. (2) LABELING BIAS - Human bias in labeling training data (deciding what counts as 'left' or 'right') directly transfers to the AI. (3) ALGORITHMIC BIAS - The way models are designed and optimized can introduce bias. (4) CULTURAL BIAS - Most NLP models are trained on English-language, Western news, which may not generalize well to other contexts. At NewzComp, we address these concerns by: using diverse training data from verified media bias rating organizations, regularly auditing our models for systematic errors, being transparent about limitations, and encouraging users to think critically about AI outputs. AI should augment human judgment, not replace it."
        }
      ]
    },
    {
      category: "Using NewzComp Effectively",
      questions: [
        {
          question: "How should I use NewzComp to stay informed?",
          answer: "For best results, use NewzComp as part of a comprehensive news consumption strategy: (1) START WITH BOB - When you read a news article that interests you, submit it to Bob for analysis to understand its bias and framing. (2) READ ACROSS THE SPECTRUM - Use Bob's related article finder to read how left, center, and right sources cover the same story. This gives you a complete picture. (3) COMPARE AND CONTRAST - Notice what facts different sources emphasize, how they frame issues, and what they omit. This reveals both the story and how media shapes narratives. (4) CHECK LATEST NEWS - Browse our Latest News section filtered by topic to stay current on breaking stories with instant bias analysis. (5) THINK CRITICALLY - Use Bob's analysis as a starting point, not the final word. Form your own judgments based on evidence from multiple sources. (6) VERIFY IMPORTANT CLAIMS - For critical information, verify facts through primary sources or fact-checking organizations. NewzComp helps you become a more informed, critical news consumer."
        },
        {
          question: "What types of articles work best with Bob?",
          answer: "Bob works best with: (1) NEWS ARTICLES - Standard news reporting from established media outlets provides the clearest analysis. (2) POLITICAL COVERAGE - Articles about politics, policy, elections, and government are where bias is most relevant and detectable. (3) RECENT ARTICLES - Current news allows Bob to find related coverage from multiple sources for comparison. (4) SUBSTANTIAL CONTENT - Articles with several paragraphs of content provide enough text for accurate analysis. Bob may struggle with: (1) VERY SHORT ARTICLES - Brief news briefs may lack sufficient content for detailed bias detection. (2) OPINION PIECES - While Bob can analyze opinion columns, they're expected to be biased, so the analysis is less useful. (3) HIGHLY TECHNICAL CONTENT - Specialized scientific, financial, or legal content may not fit standard political bias categories. (4) LOCAL NEWS - Hyperlocal stories may not have comparable coverage from multiple national sources. For best results, use Bob with mainstream news coverage of significant national or international stories."
        },
        {
          question: "How often should I check multiple news sources?",
          answer: "For important stories that affect your life, decisions, or understanding of the world, you should always check multiple sources. This is especially critical for: (1) POLITICAL NEWS - Elections, policy debates, and government actions where different outlets may have strong biases. (2) BREAKING NEWS - Initial reports are often incomplete or inaccurate; comparing sources helps identify facts vs speculation. (3) CONTROVERSIAL TOPICS - Issues where people have strong disagreements benefit most from multiple perspectives. (4) DECISION-MAKING - Any news that might influence your voting, financial decisions, or life choices. For routine news consumption, develop a balanced diet: regularly read at least one source from the left, center, and right. This exposes you to different viewpoints and helps you recognize bias patterns. NewzComp's Latest News section makes this easy by categorizing articles by bias and topic. Remember: the goal isn't to read everything from every source, but to ensure you're not trapped in an echo chamber."
        }
      ]
    },
    {
      category: "Media Literacy & Critical Thinking",
      questions: [
        {
          question: "What is media literacy and why is it important?",
          answer: "Media literacy is the ability to access, analyze, evaluate, and create media in various forms. It's understanding how media messages are constructed, recognizing bias and persuasion techniques, distinguishing fact from opinion, and thinking critically about information sources. In today's world, media literacy is essential because: (1) INFORMATION OVERLOAD - We're exposed to thousands of messages daily; media literacy helps filter signal from noise. (2) MISINFORMATION - False or misleading information spreads rapidly; critical evaluation skills help identify it. (3) ALGORITHMIC FILTERING - Social media algorithms create echo chambers; awareness helps you seek diverse viewpoints. (4) CIVIC PARTICIPATION - Democracy requires informed citizens who can evaluate political claims and media narratives. (5) PERSONAL DECISIONS - From health choices to financial planning, we make decisions based on information consumed through media. NewzComp is a media literacy tool - it doesn't tell you what to think, but helps you understand how media shapes thinking so you can draw your own informed conclusions."
        },
        {
          question: "How can I identify misinformation and fake news?",
          answer: "Identifying misinformation requires critical thinking and verification: (1) CHECK THE SOURCE - Is it a established news organization with editorial standards? Be suspicious of unfamiliar sites or those mimicking legitimate outlets. (2) VERIFY WITH MULTIPLE SOURCES - Does other reliable reporting confirm this? If only one source reports something major, be skeptical. (3) EXAMINE THE EVIDENCE - Does the article cite credible sources? Are there quotes from named experts or officials? Be wary of anonymous sources or vague attributions. (4) CHECK THE DATE - Is this current news or an old story being recirculated? (5) ANALYZE THE LANGUAGE - Misinformation often uses extreme language, emotional appeals, and sensational claims. (6) REVERSE IMAGE SEARCH - For suspicious images, use Google reverse image search to check if they're taken out of context. (7) FACT-CHECK - Use fact-checking sites like Snopes, FactCheck.org, or PolitiFact for questionable claims. (8) CONSIDER MOTIVATION - Does the source have an agenda? Be especially critical of information that confirms your existing beliefs. NewzComp's bias analysis helps by showing you how different sources frame stories, making manipulation more visible."
        },
        {
          question: "What's the difference between bias and misinformation?",
          answer: "Bias and misinformation are related but distinct concepts: BIAS is a tendency to present information from a particular perspective or viewpoint. Biased reporting can still be factually accurate - it's about framing, emphasis, and interpretation. For example, two outlets might report the same unemployment statistics but frame them differently ('economy struggles with high unemployment' vs 'unemployment drops to lowest level in months'). Both statements might be technically true but emphasize different aspects. MISINFORMATION is false or inaccurate information, regardless of intent. This includes factual errors, fabricated quotes, manipulated statistics, or completely false stories. Misinformation can be unintentional (mistakes) or intentional (disinformation). The key differences: (1) Bias is about perspective; misinformation is about accuracy. (2) Bias exists on a spectrum; misinformation is binary (true/false). (3) Bias is inherent to human communication; misinformation is a failure or corruption of communication. (4) Bias can be legitimate (opinion columns); misinformation is never acceptable in journalism. NewzComp primarily addresses bias rather than fact-checking, though biased sources are more likely to spread misinformation."
        },
        {
          question: "How do echo chambers form and how can I avoid them?",
          answer: "Echo chambers form when you're exposed only to information and opinions that reinforce your existing beliefs. This happens through: (1) ALGORITHMIC FILTERING - Social media and search engines show you content similar to what you've engaged with before, creating a self-reinforcing loop. (2) SELECTIVE EXPOSURE - We naturally prefer information that confirms our beliefs and avoid challenging viewpoints. (3) SOCIAL SORTING - We follow, friend, and interact with people who share our views. (4) MEDIA FRAGMENTATION - The abundance of specialized news sources lets people choose outlets that match their ideology. Echo chambers are dangerous because they: (1) Distort reality by filtering out contrary evidence. (2) Polarize society by eliminating common ground. (3) Make people more susceptible to misinformation that confirms biases. (4) Reduce critical thinking by eliminating challenge to assumptions. To escape echo chambers: (1) Consciously consume news from across the political spectrum. (2) Follow people with different viewpoints on social media. (3) Use tools like NewzComp that expose you to multiple perspectives. (4) Question information that perfectly confirms your beliefs - it might be too good to be true. (5) Engage respectfully with people who disagree. (6) Recognize that complexity and nuance are signs of truth, not weakness."
        }
      ]
    },
    {
      category: "Technical Questions",
      questions: [
        {
          question: "How does Bob find related articles from different sources?",
          answer: "Bob uses several sophisticated techniques to find related coverage: (1) TOPIC EXTRACTION - Bob identifies key entities (people, places, organizations), events, and themes in the submitted article using named entity recognition (NER) and topic modeling. (2) SEMANTIC SEARCH - Rather than simple keyword matching, Bob uses semantic understanding to find articles about the same story even when they use different wording. (3) TIME-BASED FILTERING - Bob looks for articles published around the same time as the original, since news coverage is time-sensitive. (4) SOURCE DIVERSITY - Bob specifically searches across sources categorized as left-leaning, centrist, and right-leaning to ensure political diversity. (5) RELEVANCE RANKING - Results are ranked by relevance, ensuring the most closely related articles appear first. (6) QUALITY FILTERING - Bob prioritizes articles from established, reputable sources over low-quality or unreliable outlets. This multi-faceted approach ensures you see how the full spectrum of media covered the same story, revealing differences in framing, emphasis, and interpretation."
        },
        {
          question: "What data does NewzComp collect and how is it used?",
          answer: "NewzComp is committed to user privacy and transparency. We collect minimal data necessary to provide our service: (1) ARTICLE SUBMISSIONS - URLs and content of articles you submit for analysis (to perform the analysis). (2) USAGE ANALYTICS - Anonymous data about how users interact with the site (to improve user experience), collected through Google Analytics. (3) SEARCH HISTORY - Article searches are stored anonymously in our database to power the 'Past Searches' feature that helps other users. (4) TECHNICAL DATA - Standard web server logs (IP addresses, browser types) for security and troubleshooting. We DO NOT: (1) Require accounts or personal information. (2) Track individual users across sessions. (3) Sell or share data with third parties. (4) Use data for advertising. (5) Store sensitive personal information. All analysis happens server-side, and we don't store the full content of analyzed articles beyond what's necessary for our service. Our goal is providing valuable analysis while respecting your privacy."
        },
        {
          question: "Can I use NewzComp on mobile devices?",
          answer: "Yes! NewzComp is fully responsive and works seamlessly on mobile devices, tablets, and desktop computers. The interface automatically adapts to your screen size for optimal usability. On mobile, you can: (1) Submit article URLs for Bob analysis. (2) Browse Latest News by topic. (3) View detailed article analysis and bias reports. (4) Access article history. (5) Use all filter and search features. For the best mobile experience, we recommend using an up-to-date mobile browser like Safari (iOS) or Chrome (Android). The collapsible filter panels are specifically designed to save space on smaller screens while maintaining full functionality. You can also add NewzComp to your phone's home screen for quick access - just use your browser's 'Add to Home Screen' feature."
        }
      ]
    }
  ];

  // Generate FAQ schema for rich results
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.flatMap(category =>
      category.questions.map(qa => ({
        "@type": "Question",
        "name": qa.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": qa.answer
        }
      }))
    )
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-3 py-26 md:py-38 mt-5 md:mt-0">
      <head>
        <title>FAQ - News Bias Detection & AI Analysis Questions | NewzComp Bob</title>
        <meta name="description" content="Answers to common questions about media bias, AI-powered news analysis, how NewzComp works, and tips for becoming a more informed news consumer. Learn about bias detection, media literacy, and critical thinking." />
        <meta name="keywords" content="media bias FAQ, news analysis questions, AI bias detection, how does NewzComp work, media literacy, fake news detection, echo chambers, political bias, news comparison, Bob AI, misinformation, fact checking, critical thinking, journalism ethics" />
        <meta name="author" content="NewzComp" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bob.newzcomp.com/faq" />
        <meta property="og:title" content="FAQ - Understanding News Bias & AI Analysis | NewzComp" />
        <meta property="og:description" content="Get answers about media bias detection, how AI analyzes news, and tips for critical news consumption. Learn how NewzComp helps you navigate today's media landscape." />
        <meta property="og:image" content="/assets/tricolorblack.svg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://bob.newzcomp.com/faq" />
        <meta name="twitter:title" content="FAQ - News Bias & AI Analysis Questions | NewzComp" />
        <meta name="twitter:description" content="Learn about media bias, AI-powered news analysis, and how to become a more informed news consumer with NewzComp's comprehensive FAQ." />
        <meta name="twitter:image" content="/assets/tricolorblack.svg" />

        {/* Additional SEO meta tags */}
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        <meta name="topic" content="News, Media Literacy, AI, Journalism" />
        <meta name="coverage" content="Worldwide" />
        <meta name="distribution" content="Global" />
        <meta name="rating" content="General" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://bob.newzcomp.com/faq" />

        {/* FAQ Schema for Rich Results */}
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>

        {/* Additional Organization Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "NewzComp",
            "description": "AI-powered news analysis and bias detection platform",
            "url": "https://bob.newzcomp.com",
            "logo": "https://bob.newzcomp.com/assets/tricolorblack.svg",
            "sameAs": [
              "https://twitter.com/newzcomp",
              "https://www.instagram.com/newzcomp",
              "https://www.linkedin.com/company/newzcomp"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "Customer Service",
              "url": "https://bob.newzcomp.com/feedback"
            }
          })}
        </script>

        {/* Breadcrumb Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://bob.newzcomp.com"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "FAQ",
                "item": "https://bob.newzcomp.com/faq"
              }
            ]
          })}
        </script>
      </head>

      <div className="w-full max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Everything you need to know about NewzComp, media bias detection, AI-powered news analysis, and becoming a more informed news consumer.
          </p>
        </div>

        {/* FAQ Categories */}
        {faqData.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-8">
            {/* Category Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-blue-600 pl-4">
                {category.category}
              </h2>
            </div>

            {/* Questions in Category */}
            <div className="space-y-3">
              {category.questions.map((qa, questionIndex) => {
                const globalIndex = categoryIndex * 100 + questionIndex;
                const isOpen = openQuestion === globalIndex;

                return (
                  <div
                    key={questionIndex}
                    className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg"
                  >
                    {/* Question Button */}
                    <button
                      onClick={() => toggleQuestion(globalIndex)}
                      className="w-full p-6 flex items-start justify-between text-left hover:bg-gray-50 transition-colors duration-200"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                          <span className="text-blue-600 font-semibold">Q</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 flex-1">
                          {qa.question}
                        </h3>
                      </div>
                      <svg
                        className={`w-6 h-6 text-gray-500 transition-transform duration-200 flex-shrink-0 ml-4 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Answer */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-6 pb-6 pl-18">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold">A</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed flex-1">
                            {qa.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Analyze News with Bob?</h2>
          <p className="text-lg mb-6 opacity-90">
            Start exploring news from multiple perspectives and become a more informed citizen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/"
              className="px-6 py-3 bg-white text-blue-700 rounded-lg font-bold hover:bg-gray-100 transition shadow-md"
            >
              Analyze an Article
            </a>
            <a
              href="/latest"
              className="px-6 py-3 bg-white text-white rounded-lg font-bold hover:bg-gray-100 transition shadow-md"
            >
              Browse Latest News
            </a>
          </div>
        </div>

        {/* Still Have Questions Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-md p-8 text-center">
          <h3 className="text-2xl font-semibold text-gray-800 mb-3">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-6">
            We'd love to hear from you. Send us your feedback or questions and we'll get back to you.
          </p>
          <a
            href="/feedback"
              className="inline-flex items-center px-6 py-3 bg-white-300 text-white rounded-lg font-bold transition shadow-md"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"ƒ
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Contact Us
          </a>
        </div>

        {/* External Resources */}
        <div className="mt-8 bg-gray-50 rounded-2xl shadow-md p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            Additional Resources for Media Literacy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Fact-Checking Organizations</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Snopes.com - Fact-checking urban legends and claims</li>
                <li>• FactCheck.org - Nonpartisan fact-checking</li>
                <li>• PolitiFact - Political fact-checking</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Media Bias Resources</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• AllSides.com - Media bias ratings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FAQPage;
