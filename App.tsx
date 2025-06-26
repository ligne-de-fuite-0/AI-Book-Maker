
import React, { useState, useCallback, useEffect } from 'react';
import { UserInputs, BookStructure, ChapterTask, AppStep, RewriteChapterModalData } from './types';
import * as geminiService from './services/geminiService';
import UserInputPane from './components/UserInputPane';
import OutlineReviewPane from './components/OutlineReviewPane';
import ChapterGenerationPane from './components/ChapterGenerationPane';
import BookViewPane from './components/BookViewPane';
import ProgressBar from './components/ProgressBar';
import LoadingIndicator from './components/LoadingIndicator';
import RewriteChapterModal from './components/RewriteChapterModal'; // New Modal
import { MAX_RETRIES, RETRY_DELAY_MS } from './constants';


interface ReferenceFile {
  name: string;
  content: string;
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.USER_INPUT);
  const [userInputs, setUserInputs] = useState<UserInputs | null>(null);
  const [referenceFilesContent, setReferenceFilesContent] = useState<ReferenceFile[]>([]);
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [bookStructure, setBookStructure] = useState<BookStructure | null>(null);
  const [chapterTasks, setChapterTasks] = useState<ChapterTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading for outline/title
  const [isRegeneratingOutline, setIsRegeneratingOutline] = useState<boolean>(false); // Specific for outline regeneration action
  const [isAutoGeneratingChapters, setIsAutoGeneratingChapters] = useState<boolean>(false);
  const [activelyGeneratingChapterId, setActivelyGeneratingChapterId] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);

  const [rewriteModalData, setRewriteModalData] = useState<RewriteChapterModalData | null>(null);
  
  useEffect(() => {
    if (typeof process.env.API_KEY === 'undefined' || process.env.API_KEY === "") {
      console.error("CRITICAL: API_KEY environment variable is not set or is empty.");
      setApiKeyMissing(true);
    }
  }, []);


  const fullResetState = () => {
    setUserInputs(null);
    setReferenceFilesContent([]);
    setBookTitle(null);
    setBookStructure(null);
    setChapterTasks([]);
    setError(null);
    setCurrentStep(AppStep.USER_INPUT);
    setIsLoading(false);
    setIsRegeneratingOutline(false);
    setIsAutoGeneratingChapters(false);
    setActivelyGeneratingChapterId(null);
    setRewriteModalData(null);
  };

  const handleGoBackToInputsFromReview = () => {
    // Preserve userInputs and referenceFilesContent
    setBookTitle(null);
    setBookStructure(null);
    setChapterTasks([]);
    setError(null); 
    setIsLoading(false); 
    setIsRegeneratingOutline(false);
    setCurrentStep(AppStep.USER_INPUT);
  };
  
  const generateOutlineAndTitle = async (currentInputs: UserInputs, filesContent: ReferenceFile[], isRegeneration: boolean = false) => {
    if (apiKeyMissing) {
      setError("Application is not configured correctly. API Key is missing.");
      return;
    }
    
    if (isRegeneration) {
      setIsRegeneratingOutline(true);
    } else {
      setCurrentStep(AppStep.GENERATING_OUTLINE);
      setIsLoading(true);
    }
    setError(null); 
    
    if (!isRegeneration) {
      setBookStructure(null);
      setBookTitle(null);
      setChapterTasks([]);
    }

    const concatenatedRefTexts = filesContent.length > 0 
      ? filesContent.map(f => `Reference File: ${f.name}\nContent:\n${f.content}`).join("\n\n---\n\n")
      : "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        let accumulatedStructure = "";
        const stream = await geminiService.generateBookStructureStream(currentInputs, concatenatedRefTexts);
        for await (const chunk of stream) {
          accumulatedStructure += chunk.text;
        }

        if (!accumulatedStructure.trim()) {
          throw new Error(`Empty book structure received from AI (attempt ${attempt}).`);
        }
        
        const structure = geminiService.parseJsonFromText(accumulatedStructure);
        setBookStructure(structure); 

        const title = await geminiService.generateBookTitle(currentInputs, structure, concatenatedRefTexts);
        setBookTitle(title);
        
        setCurrentStep(AppStep.OUTLINE_REVIEW);
        if (isRegeneration) {
           setChapterTasks([]); 
        }
        setError(null); 
        
        if (isRegeneration) setIsRegeneratingOutline(false); else setIsLoading(false);
        return; 

      } catch (err) {
        const attemptError = err instanceof Error ? err.message : 'Failed to generate outline or title.';
        console.error(`Outline/Title generation attempt ${attempt} failed:`, attemptError);
        setError(attemptError); 
        
        if (attempt === MAX_RETRIES) {
          if (!isRegeneration) {
            setCurrentStep(AppStep.USER_INPUT); 
          }
          if (isRegeneration) setIsRegeneratingOutline(false); else setIsLoading(false);
          return; 
        }
        
        if (attempt < MAX_RETRIES) {
           console.log(`Retrying outline/title generation in ${RETRY_DELAY_MS}ms...`);
           await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
           if (!isRegeneration) {
             setBookStructure(null);
             setBookTitle(null);
           }
        }
      }
    }
    // Fallback if loop finishes unexpectedly (should be covered by returns)
    if (isRegeneration) setIsRegeneratingOutline(false); else setIsLoading(false);
  };


  const handleUserInputSubmit = (inputs: UserInputs, filesContent: ReferenceFile[]) => {
    setUserInputs(inputs);
    setReferenceFilesContent(filesContent);
    generateOutlineAndTitle(inputs, filesContent, false);
  };
  
  const handleRegenerateOutline = (regenerationPrompt: string) => {
    if (!userInputs) return;
    const updatedInputs = { ...userInputs, outlineRegenerationPrompt: regenerationPrompt };
    setUserInputs(updatedInputs); 
    generateOutlineAndTitle(updatedInputs, referenceFilesContent, true);
  };


  const flattenStructureToTasks = useCallback((structure: BookStructure): ChapterTask[] => {
    const tasks: ChapterTask[] = [];
    let order = 0;
    for (const [key, value] of Object.entries(structure)) {
      const sanitizedKey = key.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
      const id = `${sanitizedKey || 'chapter'}-${Date.now()}-${order}`; 
      order++;
      
      const chapterOutlineJson = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      
      tasks.push({ 
        id, 
        title: key, 
        description: chapterOutlineJson, 
        path: [key], 
        status: 'pending', 
        content: '' 
      });
    }
    return tasks;
  }, []);
  
  useEffect(() => {
    if (bookStructure && (currentStep === AppStep.OUTLINE_REVIEW || currentStep === AppStep.GENERATING_CHAPTERS)) {
       if(chapterTasks.length === 0 || (currentStep === AppStep.OUTLINE_REVIEW)) {
            setChapterTasks(flattenStructureToTasks(bookStructure));
       }
    }
  }, [bookStructure, currentStep, chapterTasks.length, flattenStructureToTasks]);

  const handleProceedToChapterGeneration = () => {
    if (bookStructure) {
      const currentTasks = flattenStructureToTasks(bookStructure);
      setChapterTasks(currentTasks);
      setCurrentStep(AppStep.GENERATING_CHAPTERS);
      setError(null); 
    }
  };

  const toggleAutoChapterGeneration = () => {
    if (isAutoGeneratingChapters) {
      setIsAutoGeneratingChapters(false); 
      // Do not clear activelyGeneratingChapterId here, allow current stream to finish
    } else {
      setIsAutoGeneratingChapters(true); 
      setError(null); 
    }
  };

  const handleOpenRewriteModal = (taskId: string) => {
    const task = chapterTasks.find(t => t.id === taskId);
    if (task) {
      if (isAutoGeneratingChapters) {
        setIsAutoGeneratingChapters(false); // Pause auto-generation if user wants to rewrite
      }
      setRewriteModalData({ taskId, chapterTitle: task.title });
    }
  };

  const handleCloseRewriteModal = () => {
    setRewriteModalData(null);
  };


  const handleGenerateChapterContent = useCallback(async (taskId: string, rewriteInstructions?: string) => {
    if (!userInputs || !bookStructure || apiKeyMissing) return;
    
    if (rewriteInstructions && isAutoGeneratingChapters) {
      console.warn("Manual rewrite requested while auto-generation is on. Pausing auto-generation.");
      setIsAutoGeneratingChapters(false); 
    }
    // If not a rewrite and auto-generation is off, don't proceed with this specific call path
    // (useEffect loop handles starting auto-generation)
    if (!rewriteInstructions && !isAutoGeneratingChapters) {
        return; 
    }

    const taskIndex = chapterTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    // Allow re-generation for 'error' status, or if it's a rewrite.
    // For 'pending', it's a new generation.
    // For 'done' or 'generating', only proceed if it's a rewrite.
    const currentTaskStatus = chapterTasks[taskIndex].status;
    if (!rewriteInstructions && (currentTaskStatus === 'done' || currentTaskStatus === 'generating')) {
        // If auto-generating and this task is already done/generating (and not a rewrite),
        // try to find the next pending task.
        if (isAutoGeneratingChapters && !activelyGeneratingChapterId) { 
            const nextTask = chapterTasks.find(task => task.status === 'pending');
            if(nextTask) handleGenerateChapterContent(nextTask.id); else setIsAutoGeneratingChapters(false);
        }
        return;
    }


    setActivelyGeneratingChapterId(taskId);
    // Reset content for new generation/rewrite, keep existing content if just updating status (e.g., initial pending to generating)
    setChapterTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'generating', errorMessage: undefined, content: rewriteInstructions || t.status === 'pending' ? '' : t.content } : t));

    const concatenatedRefTexts = referenceFilesContent.length > 0 
      ? referenceFilesContent.map(f => `Reference File: ${f.name}\nContent:\n${f.content}`).join("\n\n---\n\n")
      : "";

    let accumulatedContent = "";
    try {
      const taskToGenerate = chapterTasks[taskIndex];
      const previouslyGeneratedContent = chapterTasks
        .slice(0, taskIndex)
        .filter(t => t.status === 'done' && t.content)
        .map(t => `Chapter: ${t.title}\n${t.content}\n\n---END OF PREVIOUS CHAPTER---\n\n`)
        .join('');
      
      const fullBookStructureJson = JSON.stringify(bookStructure, null, 2);

      const stream = await geminiService.generateChapterContentStream(
        userInputs,
        taskToGenerate.title, 
        taskToGenerate.description, 
        fullBookStructureJson,
        previouslyGeneratedContent,
        concatenatedRefTexts,
        rewriteInstructions 
      );

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          accumulatedContent += text;
          setChapterTasks(prev => prev.map(t => t.id === taskId ? { ...t, content: accumulatedContent } : t));
        }
      }
      
      // Final update after stream completion
      setChapterTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done', content: accumulatedContent.trim() } : t));

    } catch (err) {
      console.error(`Error generating content stream for task ${taskId}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate chapter content.';
      setChapterTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', errorMessage, content: accumulatedContent } : t)); 
      setError(`Error in chapter: ${chapterTasks.find(t=>t.id === taskId)?.title || 'Unknown'}. ${errorMessage}`); 
      setIsAutoGeneratingChapters(false); // Stop auto-generation on error
    } finally {
      setActivelyGeneratingChapterId(null);
      if (rewriteInstructions) {
        setRewriteModalData(null); 
      }
      // Trigger next auto generation if mode is on and no rewrite was in progress
      // This logic is now primarily handled by the useEffect below
    }
  }, [userInputs, bookStructure, chapterTasks, isAutoGeneratingChapters, apiKeyMissing, referenceFilesContent, activelyGeneratingChapterId]); 

  useEffect(() => {
    // This effect manages the auto-generation queue
    if (currentStep === AppStep.GENERATING_CHAPTERS && isAutoGeneratingChapters && !activelyGeneratingChapterId && !apiKeyMissing && !rewriteModalData) {
      const nextTask = chapterTasks.find(task => task.status === 'pending' || task.status === 'error'); // Also retry errors in auto mode
      if (nextTask) {
        // If retrying an error task, clear its error message before starting
        if (nextTask.status === 'error') {
            setChapterTasks(prev => prev.map(t => t.id === nextTask.id ? {...t, errorMessage: undefined, content: ''} : t));
        }
        handleGenerateChapterContent(nextTask.id); 
      } else {
        // No more pending or error tasks, turn off auto-generation
        const allDoneOrGenerating = chapterTasks.every(t => t.status === 'done' || t.status === 'generating');
        if(allDoneOrGenerating && !chapterTasks.some(t => t.status === 'generating')) {
             setIsAutoGeneratingChapters(false); 
        }
      }
    }
  }, [currentStep, chapterTasks, isAutoGeneratingChapters, activelyGeneratingChapterId, handleGenerateChapterContent, apiKeyMissing, rewriteModalData]);


  const handleRewriteChapterSubmit = (instructions: string) => {
    if (rewriteModalData?.taskId) {
      // Clear previous content and error for the task being rewritten
      setChapterTasks(prev => prev.map(t => t.id === rewriteModalData.taskId ? {...t, content: '', errorMessage: undefined, status: 'pending'} : t));
      handleGenerateChapterContent(rewriteModalData.taskId, instructions);
    }
    setRewriteModalData(null); 
  };

  if (apiKeyMissing) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center text-center bg-slate-900 text-slate-100">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl">
          <h1 className="text-4xl font-extrabold text-red-500 mb-6">Configuration Error</h1>
          <p className="text-slate-300 text-lg mb-4">
            The <code>API_KEY</code> environment variable is not set or is invalid.
          </p>
          <p className="text-slate-400">
            Please ensure the API key is correctly configured for KBook AI to function.
            Refer to the setup instructions.
          </p>
        </div>
      </div>
    );
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case AppStep.USER_INPUT:
        return <UserInputPane 
                  onNext={handleUserInputSubmit} 
                  isLoading={isLoading} 
                  initialUserInputs={userInputs} 
                  initialReferenceFiles={referenceFilesContent} 
                />;
      case AppStep.GENERATING_OUTLINE:
        return <div className="flex flex-col items-center justify-center min-h-[50vh]"><LoadingIndicator text="Crafting your book's blueprint (this may take a moment)..." size="lg" /></div>;
      case AppStep.OUTLINE_REVIEW:
        return <OutlineReviewPane 
                  title={bookTitle} 
                  structure={bookStructure} 
                  chapterTasks={chapterTasks} 
                  onProceed={handleProceedToChapterGeneration} 
                  onGoBack={handleGoBackToInputsFromReview} 
                  onRegenerate={handleRegenerateOutline}
                  isLoading={isLoading} 
                  isRegenerating={isRegeneratingOutline}
                />;
      case AppStep.GENERATING_CHAPTERS:
        return <ChapterGenerationPane 
                  tasks={chapterTasks} 
                  onToggleAutoGeneration={toggleAutoChapterGeneration} 
                  isAutoGenerating={isAutoGeneratingChapters} 
                  activelyGeneratingChapterId={activelyGeneratingChapterId} 
                  onComplete={() => setCurrentStep(AppStep.VIEW_BOOK)} 
                  onGoBack={() => {
                    setIsAutoGeneratingChapters(false); // Stop auto generation when going back
                    setActivelyGeneratingChapterId(null); // Clear active chapter
                    setCurrentStep(AppStep.OUTLINE_REVIEW);
                  }}
                  onRequestRewriteChapter={handleOpenRewriteModal}
                />;
      case AppStep.VIEW_BOOK:
        return <BookViewPane title={bookTitle} chapters={chapterTasks} onStartOver={fullResetState} />;
      default:
        return <p>Unknown step</p>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col">
      <header className="text-center mb-4">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">
            KBook AI
          </span>
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Your AI Powered Book Creation Assistant</p>
      </header>
      
      {currentStep !== AppStep.USER_INPUT && <ProgressBar currentStep={currentStep} />}
      
      {error && (
        <div className="my-4 p-4 bg-red-800/50 border border-red-700 text-red-200 rounded-md text-center" role="alert">
          <strong>Error:</strong> {error}
          { (currentStep === AppStep.GENERATING_OUTLINE || currentStep === AppStep.OUTLINE_REVIEW || (currentStep === AppStep.USER_INPUT && (isLoading || isRegeneratingOutline))) && 
            <p className="text-sm">Outline generation failed. You might want to adjust inputs or try again. Retries were attempted.</p>}
          { currentStep === AppStep.GENERATING_CHAPTERS && 
            <p className="text-sm">Chapter generation encountered an issue. Automatic generation may have stopped. Review completed chapters or try rewriting. Retries were attempted for the failed chapter.</p>}
           {currentStep === AppStep.USER_INPUT && !isLoading && !isRegeneratingOutline && <p className="text-sm">Please review your inputs or try again. If the problem persists, check your API key or network connection.</p>}
        </div>
      )}
      
      <main className="flex-grow flex flex-col items-center justify-center w-full">
        {renderCurrentStep()}
      </main>

      {rewriteModalData && (
        <RewriteChapterModal
          isOpen={!!rewriteModalData}
          onClose={handleCloseRewriteModal}
          onSubmit={handleRewriteChapterSubmit}
          chapterTitle={rewriteModalData.chapterTitle}
        />
      )}

      <footer className="text-center mt-12 py-6 border-t border-slate-700">
        <p className="text-sm text-slate-500">KBook &copy; {new Date().getFullYear()}. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
