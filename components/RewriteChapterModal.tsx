
import React, { useState, useEffect } from 'react';

interface RewriteChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (instructions: string) => void;
  chapterTitle: string;
}

const RewriteChapterModal: React.FC<RewriteChapterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  chapterTitle,
}) => {
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInstructions(''); // Reset instructions when modal opens
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instructions.trim()) {
      onSubmit(instructions);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rewrite-modal-title"
    >
      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg shadow-xl max-w-lg w-full">
        <h3 id="rewrite-modal-title" className="text-xl font-semibold text-sky-300 mb-2">
          Rewrite Chapter: <span className="text-sky-400 italic">{chapterTitle}</span>
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Provide specific instructions on how you'd like this chapter to be rewritten.
          The AI will use these instructions, the original chapter outline, and the context of other chapters.
        </p>
        
        <div>
          <label htmlFor="rewriteInstructions" className="block text-sm font-medium text-slate-300 mb-1">
            Rewrite Instructions:
          </label>
          <textarea
            id="rewriteInstructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"
            placeholder="e.g., 'Focus more on the historical impact...', 'Make the tone more optimistic.', 'Add a paragraph explaining concept X.'"
            required
            aria-required="true"
          />
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!instructions.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed"
          >
            Submit Rewrite
          </button>
        </div>
      </form>
    </div>
  );
};

export default RewriteChapterModal;
