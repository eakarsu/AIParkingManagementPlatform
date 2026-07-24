const axios = require('axios');

async function callAI(systemPrompt, userPrompt, options = {}) {
  try {
    if (!process.env.OPENROUTER_API_KEY || !process.env.OPENROUTER_MODEL) throw new Error('OpenRouter provider is not configured');
    const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AI Parking Management Platform',
        },
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content || !String(content).trim()) throw new Error('OpenRouter returned empty content');
    return {
      success: true,
      content,
      model: response.data.model,
      usage: response.data.usage,
    };
  } catch (error) {
    console.error('OpenRouter API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || error.message);
  }
}

module.exports = { callAI };
