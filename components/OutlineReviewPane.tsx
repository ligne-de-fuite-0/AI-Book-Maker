
import React, { useState } from 'react';
import { BookStructure, ChapterTask } from '../types';
import LoadingIndicator from './LoadingIndicator';

interface OutlineReviewPaneProps {
  title: string | null;
  structure: BookStructure | null;
  chapterTasks: ChapterTask[]; 
  onProceed: () => void;
  onGoBack: () => void;
  onRegenerate: (regenerationPrompt: string) => void; // New prop for regeneration
  isLoading: boolean; // This is for initial generation or regeneration
  isRegenerating: boolean; // Specific loading state for regeneration action
}

const renderStructureToList = (struct: BookStructure | string, level = 0, path: string[] = []): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  
  if (typeof struct === 'string') {
    elements.push(
      <li key={path.join('-') || 'desc'} className={`ml-${level * 4} text-slate-300`}>
        <span className="font-semibold text-slate-100">{path.length > 0 ? path.slice(-1)[0] : "Description"}:</span> {struct}
      </li>
    );
    return elements;
  }
  
  Object.entries(struct).forEach(([key, value]) => {
    const currentPath = [...path, key];
    elements.push(
      <li key={currentPath.join('-')} className={`ml-${level * 4} mt-1 list-none`}>
        <details className="group" open={level < 1}>
          <summary className="cursor-pointer py-1 list-none">
            <strong className="text-sky-400 group-hover:text-sky-300 text-base">{key}</strong>
            {typeof value === 'string' && <span className="text-slate-400 ml-2 text-sm italic"> - {value}</span>}
          </summary>
          {typeof value === 'object' && value !== null && (
            <ul className="pl-4 mt-1 border-l border-slate-600">
              {renderStructureToList(value as BookStructure, level + 1, currentPath)}
            </ul>
          )}
        </details>
      </li>
    );
  });
  return elements;
};


const OutlineReviewPane: React.FC<OutlineReviewPaneProps> = ({ 
  title, 
  structure, 
  onProceed, 
  onGoBack, 
  onRegenerate,
  isLoading,
  isRegenerating
}) => {
  const [regenerationPrompt, setRegenerationPrompt] = useState('');

  const handleRegenerateClick = () => {
    if (regenerationPrompt.trim()) {
      onRegenerate(regenerationPrompt);
      // setRegenerationPrompt(''); // Optionally clear after submission, or App can handle it
    }
  };

  if (isLoading && !isRegenerating) { // Loading for initial outline generation
    return <LoadingIndicator text="Finalizing title and structure..." />;
  }
  
  // If only isRegenerating is true, it means user clicked "Regenerate Outline & Title with Changes"
  // The main isLoading prop might also be true if App.tsx sets it.
  // We'll show a specific indicator or disable buttons during regeneration.


  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-slate-800 rounded-xl shadow-2xl">
      <h2 className="text-3xl font-bold text-sky-400 mb-6 text-center">Review Your Book Outline</h2>
      
      {isRegenerating && <LoadingIndicator text="Regenerating outline and title based on your feedback..." size="md" />}

      {title && (
        <div className="mb-6 p-4 bg-slate-700 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-sky-300 mb-2">Generated Title:</h3>
          <p className="text-2xl text-slate-100 italic font-serif">"{title}"</p>
        </div>
      )}

      {structure && (
        <div className="mb-6 p-4 bg-slate-700 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-sky-300 mb-2">Generated Structure:</h3>
          <ul className="space-y-1 text-sm">
            {renderStructureToList(structure)}
          </ul>
        </div>
      )}
      
      {!title && !structure && !isLoading && !isRegenerating && <p className="text-center text-slate-400 py-5">No outline generated yet, or an error occurred.</p>}

      <div className="my-8 p-4 bg-slate-700/50 rounded-lg shadow">
        <label htmlFor="regenerationPrompt" className="block text-sm font-medium text-slate-300 mb-1">
          Request changes to the outline or title (optional):
        </label>
        <textarea
          id="regenerationPrompt"
          value={regenerationPrompt}
          onChange={(e) => setRegenerationPrompt(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"
          placeholder="e.g., 'Make chapter 3 focus more on X.', 'The title should be more evocative.'"
          disabled={isRegenerating || isLoading}
          aria-label="Instructions for regenerating the book outline and title"
        />
        <button
          onClick={handleRegenerateClick}
          disabled={!regenerationPrompt.trim() || isRegenerating || isLoading}
          className="mt-3 w-full sm:w-auto px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate Outline & Title with Changes'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between mt-8 space-y-3 sm:space-y-0">
        <button
          onClick={onGoBack}
          disabled={isRegenerating || isLoading}
          className="w-full sm:w-auto px-6 py-2 border border-slate-600 text-base font-medium rounded-md text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-50"
        >
          Back to Inputs & Reset
        </button>
        <button
          onClick={onProceed}
          disabled={!title || !structure || isRegenerating || isLoading}
          className="w-full sm:w-auto px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
        >
          Proceed to Write Chapters
        </button>
      </div>
    </div>
  );
};

export default OutlineReviewPane;
