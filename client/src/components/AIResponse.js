import React from 'react';

function AIResponse({ data, loading, error }) {
  if (loading) {
    return (
      <div className="ai-response">
        <div className="ai-loading">
          <div className="spinner"></div>
          <p>AI is analyzing your data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-response">
        <div className="error-message">
          AI Error: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatContent = (content) => {
    if (!content) return '';
    // Convert markdown-like formatting to HTML
    let html = content
      // Headers
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Lists
      .replace(/^\d+\.\s+(.*$)/gm, '<li>$1</li>')
      .replace(/^[-•]\s+(.*$)/gm, '<li>$1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    // Wrap in paragraph
    html = '<p>' + html + '</p>';
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    // Wrap consecutive li elements in ul
    html = html.replace(/(<li>.*?<\/li>(\s*<br\/>)?)+/g, (match) => {
      return '<ul>' + match.replace(/<br\/>/g, '') + '</ul>';
    });

    return html;
  };

  return (
    <div className="ai-response">
      <div className="ai-response-header">
        <div className="ai-icon">🤖</div>
        <div>
          <h3>{data.feature || 'AI Analysis'}</h3>
          <div className="ai-model">
            Powered by {data.model || 'Claude AI'} via OpenRouter
          </div>
        </div>
      </div>
      <div
        className="ai-response-body"
        dangerouslySetInnerHTML={{ __html: formatContent(data.content) }}
      />
      {data.usage && (
        <div className="ai-response-footer">
          <span>Tokens: {data.usage.prompt_tokens + data.usage.completion_tokens} total</span>
          <span>Model: {data.model}</span>
        </div>
      )}
    </div>
  );
}

export default AIResponse;
