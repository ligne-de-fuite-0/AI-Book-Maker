
import React from 'react';
import { ChapterTask } from '../types';
import LoadingIndicator from './LoadingIndicator';

interface SectionItemProps {
  task: ChapterTask;
  isCurrentlyGeneratingThis: boolean; 
  isAutoGeneratingGlobal: boolean; // To disable rewrite button during auto generation
  onRequestRewrite: (taskId: string) => void; // Callback to open rewrite modal
}

const SectionItem: React.FC<SectionItemProps> = ({ task, isCurrentlyGeneratingThis, isAutoGeneratingGlobal, onRequestRewrite }) => {
  const Icon = ({ path, className }: { path: string; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`hero-icon ${className || ''}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );

  let statusIndicator;
  switch (task.status) {
    case 'pending':
      statusIndicator = (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-600 text-slate-100">
          <Icon path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4 mr-1.5" /> Pending
        </span>
      );
      break;
    case 'generating':
      statusIndicator = <LoadingIndicator size="sm" text="Writing..." />;
      break;
    case 'done':
      statusIndicator = (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-700 text-green-100">
          <Icon path="M4.5 12.75l6 6 9-13.5" className="w-4 h-4 mr-1.5" /> Done
        </span>
      );
      break;
    case 'error':
      statusIndicator = (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-700 text-red-100">
          <Icon path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" className="w-4 h-4 mr-1.5" /> Error
        </span>
      );
      break;
    default:
      statusIndicator = null;
  }


  return (
    <div className={`p-4 bg-slate-700 rounded-lg shadow transition-all duration-300 ${isCurrentlyGeneratingThis ? 'ring-2 ring-sky-500 shadow-sky-500/30' : 'hover:shadow-md hover:shadow-sky-500/20'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-2">
        <div className="flex-grow">
          <h4 className="text-lg font-semibold text-sky-300">{task.path.join(' / ')}</h4>
          <p className="text-xs text-slate-500 mt-1 italic max-h-20 overflow-y-auto">Outline: {task.description}</p>
        </div>
        <div className="ml-0 sm:ml-4 mt-2 sm:mt-0 flex-shrink-0 flex flex-col items-end space-y-2">
          {statusIndicator}
          <button
            onClick={() => onRequestRewrite(task.id)}
            disabled={isAutoGeneratingGlobal || isCurrentlyGeneratingThis} // Disable if any chapter is being auto-generated or this one specifically
            className="px-3 py-1 text-xs font-medium rounded-md text-sky-300 border border-sky-600 hover:bg-sky-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={`Rewrite chapter: ${task.title}`}
          >
            Rewrite Chapter
          </button>
        </div>
      </div>
      
      {(task.status === 'done' || (task.status === 'generating' && task.content)) && task.content && (
        <div className="mt-3 pt-3 border-t border-slate-600">
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed prose prose-sm prose-invert max-w-none">
            {task.content}
          </p>
        </div>
      )}
      {task.status === 'error' && task.errorMessage && (
         <p className="mt-2 text-xs text-red-400 bg-red-900/50 p-2 rounded">{task.errorMessage}</p>
      )}
    </div>
  );
};

export default SectionItem;
