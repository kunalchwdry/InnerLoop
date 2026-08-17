import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Sparkles } from 'lucide-react';

const quotes = [
  { text: "Small steps every day lead to big changes one year from now.", author: "Unknown" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Wellness is the natural state of a body in balance.", author: "Unknown" },
  { text: "Focus on progress, not perfection.", author: "Unknown" },
  { text: "What gets scheduled gets done.", author: "Michael Hyatt" },
];

export default function MotivationCard() {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const quote = quotes[dayOfYear % quotes.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl p-6 border border-white/10 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-premium"
    >
      <div className="absolute inset-0 bg-grid-dark opacity-20 pointer-events-none" />
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-white/80">Daily Motivation</span>
        </div>

        <Quote className="w-8 h-8 text-white/20 mb-3" />
        <p className="text-lg font-semibold leading-snug text-balance">
          "{quote.text}"
        </p>
        <p className="text-sm text-white/70 mt-3">— {quote.author}</p>
      </div>
    </motion.div>
  );
}