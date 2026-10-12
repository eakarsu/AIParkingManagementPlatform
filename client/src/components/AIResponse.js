import React from 'react';
import AIReport from './AIReport';
export default function AIResponse({ data, loading, error }) {
  return <AIReport response={data} loading={loading} error={error} title={data?.feature || 'AI analysis'} />;
}
