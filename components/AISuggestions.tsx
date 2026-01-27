
import React, { useState, useEffect } from 'react';
import { getSmartRecommendations } from '../services/geminiService';

interface AISuggestionsProps {
  categories: string[];
}

const AISuggestions: React.FC<AISuggestionsProps> = ({ categories }) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categories.length > 0) {
      const fetchSuggestion = async () => {
        setLoading(true);
        const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const res = await getSmartRecommendations(categories, now);
        setSuggestion(res);
        setLoading(false);
      };
      fetchSuggestion();
    }
  }, [categories]);

  if (loading) {
    return (
      <div className="mx-4 my-6 p-4 bg-gray-50 border-l-4 border-gray-200 rounded-r-2xl animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="mx-4 my-6 p-4 bg-gradient-to-r from-orange-50 to-white border-l-4 border-orange-500 rounded-r-2xl shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">✨</span>
        <h3 className="text-sm font-black text-orange-800 uppercase tracking-wider">GuaraFood AI Sugere</h3>
      </div>
      <p className="text-sm text-gray-700 italic leading-relaxed">
        "{suggestion}"
      </p>
    </div>
  );
};

export default AISuggestions;
