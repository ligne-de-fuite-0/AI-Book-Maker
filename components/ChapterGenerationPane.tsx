
import React from 'react';
import { ChapterTask } from '../types';
import SectionItem from './SectionItem';
import LoadingIndicator from './LoadingIndicator';

interface ChapterGenerationPaneProps {
  tasks: ChapterTask[];
  onToggleAutoGeneration: () => void; // Changed from onStartGeneration
  isAutoGenerating: boolean;
  activelyGeneratingChapterId: string | null;
  onComplete: () => void;
  onGoBack: () => void;
  onRequestRewriteChapter: (taskId: string) => void; // New prop
}

const ChapterGenerationPane: React.FC<ChapterGenerationPaneProps> = ({
  tasks,
  onToggleAutoGeneration,
  isAutoGenerating,
  activelyGeneratingChapterId,
  onComplete,
  onGoBack,
  onRequestRewriteChapter,
}) => {
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const allTasksProcessed = tasks.every(task => task.status === 'done' || task.status === 'error');
  const pendingTasksExist = tasks.some(task => task.status === 'pending');


  if (!tasks.length) {
    return (
      <div className="text-center p-8">
        <p className="text-slate-400">No chapters defined in the structure.</p>
        <button
            onClick={onGoBack}
            className="mt-4 px-6 py-2 border border-slate-600 text-base font-medium rounded-md text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
          >
            Back to Outline
          </button>
      </div>
    );
  }

  const getAutoGenerateButtonText = () => {
    if (isAutoGenerating) {
      return activelyGeneratingChapterId ? "Pause Automatic Generation" : "Pausing...";
    }
    if (pendingTasksExist) {
      return "Resume Automatic Generation";
    }
    return "Start Automatic Chapter Generation";
  };
  
  const canToggleAutoGeneration = () => {
    if (isAutoGenerating) return true; // Can always pause
    return pendingTasksExist; // Can start/resume if pending tasks
  };


  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-sky-400 mb-2 text-center">Write Chapters</h2>
      
      {(!allTasksProcessed || pendingTasksExist) && (
        <div className="text-center my-6">
          <button
            onClick={onToggleAutoGeneration}
            disabled={!canToggleAutoGeneration() || (isAutoGenerating && !activelyGeneratingChapterId)} // Disable pause if nothing is actively generating but still in auto mode (should not happen often)
            className={`px-8 py-3 text-lg font-semibold rounded-md text-white transition-colors shadow-lg
                        ${isAutoGenerating 
                          ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500' 
                          : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'}
                        focus:outline-none focus:ring-2 focus:ring-offset-2 
                        disabled:bg-slate-500 disabled:cursor-not-allowed`}
          >
            {getAutoGenerateButtonText()}
          </button>
        </div>
      )}


      {(isAutoGenerating || completedTasks > 0 || tasks.some(t=>t.status === 'error')) && (
        <div className="my-6 p-4 bg-slate-700 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-sky-300">
              {isAutoGenerating && activelyGeneratingChapterId ? `Writing: ${tasks.find(t=>t.id === activelyGeneratingChapterId)?.title || 'Chapter'}...` 
                : (isAutoGenerating && !activelyGeneratingChapterId && pendingTasksExist ? 'Preparing next chapter...' 
                : (allTasksProcessed && completedTasks < totalTasks ? 'Generation Halted (Errors)' 
                : (allTasksProcessed ? 'All Chapters Processed' : 'Progress')))}
            </span>
            <span className="text-sm font-medium text-slate-300">{completedTasks} / {totalTasks} Chapters Completed</span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2.5">
            <div 
              className="bg-sky-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progressPercentage}%` }}
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
           {isAutoGenerating && !activelyGeneratingChapterId && pendingTasksExist && !allTasksProcessed && <LoadingIndicator text="Queuing next chapter..." size="sm"/>}
        </div>
      )}

      <div className="space-y-4">
        {tasks.map((task) => (
          <SectionItem 
            key={task.id} 
            task={task} 
            isCurrentlyGeneratingThis={task.id === activelyGeneratingChapterId}
            isAutoGeneratingGlobal={isAutoGenerating && !!activelyGeneratingChapterId} // True if auto mode is on AND something is actively generating
            onRequestRewrite={onRequestRewriteChapter}
          />
        ))}
      </div>
      <div className="mt-10 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <button
            onClick={onGoBack}
            disabled={isAutoGenerating && !!activelyGeneratingChapterId}
            className="w-full sm:w-auto px-6 py-2 border border-slate-600 text-base font-medium rounded-md text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back to Outline
          </button>
        <button
          onClick={onComplete}
          disabled={isAutoGenerating && !!activelyGeneratingChapterId} 
          className="w-full sm:w-auto px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
        >
          View Full Book
        </button>
      </div>
    </div>
  );
};

export default ChapterGenerationPane;
