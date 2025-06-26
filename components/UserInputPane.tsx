
import React, { useState, useEffect } from 'react';
import { UserInputs, LanguageOption, GenerationMode } from '../types';
import { AVAILABLE_LANGUAGES } from '../constants';
import DetailedCustomizationModal, { ValueMapItem } from './DetailedCustomizationModal';

interface ReferenceFile {
  name: string;
  content: string;
}

interface UserInputPaneProps {
  onNext: (inputs: UserInputs, referenceFileContents: ReferenceFile[]) => void;
  isLoading: boolean;
  initialUserInputs: UserInputs | null;
  initialReferenceFiles: ReferenceFile[];
}

interface ModalConfig {
  type: 'level'; // Only 'level' is needed now for the modal
  title: string;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  valueLabelFormatter?: (value: number, valueMap?: ValueMapItem[]) => string;
  valueMap?: ValueMapItem[];
  allowDirectInput?: boolean;
  directInputSuffix?: string;
}

const DEFAULT_CONTENT_LENGTH = 7000;
const MIN_CONTENT_LENGTH = 200;
const MAX_CONTENT_LENGTH = 20000;
const CONTENT_LENGTH_STEP = 100;

const MIN_CHAPTERS = 6;
const MAX_CHAPTERS = 20;
const DEFAULT_CHAPTERS = 12;


const READING_LEVEL_DESCRIPTIVE_MAP: ValueMapItem[] = [
  { value: 2, label: "Kindergarten" },
  { value: 4, label: "Middle School" },
  { value: 5, label: "Standard" },
  { value: 6, label: "Adult" }, // Added "Adult"
  { value: 7, label: "High School" },
  { value: 8, label: "College" },
  { value: 10, label: "Graduate School" },
];

const READING_LEVEL_PRESETS = {
  kindergarten: READING_LEVEL_DESCRIPTIVE_MAP.find(rl => rl.label === "Kindergarten")!.value,
  middle: READING_LEVEL_DESCRIPTIVE_MAP.find(rl => rl.label === "Middle School")!.value,
  standard: READING_LEVEL_DESCRIPTIVE_MAP.find(rl => rl.label === "Standard")!.value,
  adult: READING_LEVEL_DESCRIPTIVE_MAP.find(rl => rl.label === "Adult")!.value, // Added "Adult" preset
  high: READING_LEVEL_DESCRIPTIVE_MAP.find(rl => rl.label === "High School")!.value,
  college: READING_LEVEL_DESCRIPTIVE_MAP.find(rl => rl.label === "College")!.value,
  graduate: READING_LEVEL_DESCRIPTIVE_MAP.find(rl => rl.label === "Graduate School")!.value,
};


const UserInputPane: React.FC<UserInputPaneProps> = ({ onNext, isLoading, initialUserInputs, initialReferenceFiles }) => {
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState('zh');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('advanced'); 
  
  const [contentLength, setContentLength] = useState<number>(DEFAULT_CONTENT_LENGTH); 
  const [readingLevel, setReadingLevel] = useState<number>(READING_LEVEL_PRESETS.standard);
  const [numberOfChapters, setNumberOfChapters] = useState<number>(DEFAULT_CHAPTERS);

  const [localReferenceFiles, setLocalReferenceFiles] = useState<ReferenceFile[]>([]);
  const [fileReadError, setFileReadError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  useEffect(() => {
    if (initialUserInputs) {
      setSubject(initialUserInputs.subject);
      setLanguage(initialUserInputs.language);
      setAdditionalInfo(initialUserInputs.additionalInfo);
      setGenerationMode(initialUserInputs.generationMode);
      setContentLength(initialUserInputs.contentLength);
      setReadingLevel(initialUserInputs.readingLevel);
      setNumberOfChapters(initialUserInputs.numberOfChapters);
    } else {
      setSubject('');
      setLanguage('zh');
      setAdditionalInfo('');
      setGenerationMode('advanced');
      setContentLength(DEFAULT_CONTENT_LENGTH);
      setReadingLevel(READING_LEVEL_PRESETS.standard);
      setNumberOfChapters(DEFAULT_CHAPTERS);
    }
    setLocalReferenceFiles(initialReferenceFiles || []);
  }, [initialUserInputs, initialReferenceFiles]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim() && numberOfChapters >= MIN_CHAPTERS) {
      onNext({ subject, language, additionalInfo, generationMode, contentLength, readingLevel, numberOfChapters }, localReferenceFiles);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setFileReadError(null);
      const newlyReadFilesPromises = Array.from(files).map(async file => {
        try {
          const content = await readFileAsText(file);
          return { name: file.name, content };
        } catch (error) {
          console.error(`Failed to read ${file.name}:`, error);
          setFileReadError(prevError => 
            (prevError ? prevError + "; " : "") + `Error reading ${file.name}. Please ensure it's a valid .txt file.`
          );
          return null;
        }
      });

      const results = (await Promise.all(newlyReadFilesPromises)).filter(Boolean) as ReferenceFile[];
      
      setLocalReferenceFiles(prevFiles => {
        const updatedFiles = [...prevFiles];
        results.forEach(newFile => {
          const existingIndex = updatedFiles.findIndex(f => f.name === newFile.name);
          if (existingIndex !== -1) {
            updatedFiles[existingIndex] = newFile;
          } else {
            updatedFiles.push(newFile);
          }
        });
        return updatedFiles;
      });
      event.target.value = '';
    }
  };

  const handleRemoveFile = (fileNameToRemove: string) => {
    setLocalReferenceFiles(prevFiles => prevFiles.filter(file => file.name !== fileNameToRemove));
  };


  const openModal = (type: 'level') => { // Only 'level' type modal
    if (type === 'level') { 
      setModalConfig({
        type,
        title: 'Customize Reading Level',
        currentValue: readingLevel,
        min: 1, 
        max: 10,
        step: 1,
        valueMap: READING_LEVEL_DESCRIPTIVE_MAP,
        valueLabelFormatter: (val, vMap = READING_LEVEL_DESCRIPTIVE_MAP) => {
            let closest = vMap[0];
            for (const item of vMap) {
                if (Math.abs(item.value - val) < Math.abs(closest.value - val)) {
                    closest = item;
                }
                if (Math.abs(item.value - val) === Math.abs(closest.value - val) && item.value <= val) {
                    closest = item;
                }
            }
            const exactMatch = vMap.find(item => item.value === val);
            return exactMatch ? exactMatch.label : `~${closest.label} (Level ${val}/10)`;
        },
        allowDirectInput: false, 
      });
    }
    setIsModalOpen(true);
  };

  const handleModalApply = (newValue: number) => {
    if (modalConfig?.type === 'level') {
      setReadingLevel(newValue);
    }
  };
  
  const getDropdownValue = (type: 'level', currentValue: number): string => { // Only 'level'
    if (type === 'level') { 
        const presets = READING_LEVEL_PRESETS;
        for (const [key, value] of Object.entries(presets)) {
          if (value === currentValue) return key;
        }
    }
    return "custom"; 
  };

  const getReadingLevelLabel = (value: number): string => {
    const found = READING_LEVEL_DESCRIPTIVE_MAP.find(item => item.value === value);
    if (found) return found.label;
    
    let closestLabel = `Level ${value}/10`; 
    let closest = READING_LEVEL_DESCRIPTIVE_MAP[0];
    for (const item of READING_LEVEL_DESCRIPTIVE_MAP) {
        if (Math.abs(item.value - value) < Math.abs(closest.value - value)) {
            closest = item;
        }
        if (Math.abs(item.value - value) === Math.abs(closest.value - value) && item.value <= value) {
            closest = item;
        }
    }
    if (closest) closestLabel = `~${closest.label} (Level ${value}/10)`;
    
    return closestLabel;
  };


  return (
    <>
      <div className="w-full max-w-2xl mx-auto p-6 bg-slate-800 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-sky-400 mb-8">Let's Create Your Book!</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-300 mb-1">
              Book Subject / Topic
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"
              placeholder="e.g., The History of Space Exploration"
              required
              aria-required="true"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-slate-300 mb-1">
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-100"
              >
                {AVAILABLE_LANGUAGES.map((lang: LanguageOption) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="generationMode" className="block text-sm font-medium text-slate-300 mb-1">
                Generation Mode
              </label>
              <select
                id="generationMode"
                value={generationMode}
                onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-100"
              >
                <option value="normal">Normal (Faster, Good Quality)</option>
                <option value="advanced">Advanced (Slower, Higher Quality)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="contentLengthSlider" className="block text-sm font-medium text-slate-300 mb-1">
              Chapter Length: <span className="font-bold text-sky-400">{contentLength.toLocaleString()} words</span>
            </label>
            <input
              type="range"
              id="contentLengthSlider"
              min={MIN_CONTENT_LENGTH}
              max={MAX_CONTENT_LENGTH}
              step={CONTENT_LENGTH_STEP}
              value={contentLength}
              onChange={(e) => setContentLength(Number(e.target.value))}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-sky-500"
              aria-label={`Chapter length, current value ${contentLength} words`}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{MIN_CONTENT_LENGTH.toLocaleString()} words</span>
                <span>{MAX_CONTENT_LENGTH.toLocaleString()} words</span>
            </div>
          </div>

          <div>
            <label htmlFor="readingLevel" className="block text-sm font-medium text-slate-300 mb-1">
              Reading Level
            </label>
            <div className="flex items-center space-x-2">
              <select
                id="readingLevel"
                value={getDropdownValue('level', readingLevel)}
                  onChange={(e) => {
                  const val = e.target.value;
                  if (val === "custom") {
                      openModal('level');
                  } else {
                      setReadingLevel(READING_LEVEL_PRESETS[val as keyof typeof READING_LEVEL_PRESETS]);
                  }
                }}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-100"
              >
                {Object.entries(READING_LEVEL_PRESETS).map(([key, value]) => {
                  const desc = READING_LEVEL_DESCRIPTIVE_MAP.find(item => item.value === value);
                  return <option key={key} value={key}>{desc ? desc.label : `Level ${value}`}</option>;
                })}
                {getDropdownValue('level', readingLevel) === 'custom' && (
                  <option value="custom">Custom ({getReadingLevelLabel(readingLevel)})</option>
                )}
              </select>
                <button type="button" onClick={() => openModal('level')} className="p-2 text-sky-400 hover:text-sky-300" aria-label="Customize reading level">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 hero-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.108 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.11v1.093c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.78.93l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.149-.894c-.07-.424-.384-.764-.78-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.019.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.93l.149-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="numberOfChaptersSlider" className="block text-sm font-medium text-slate-300 mb-1">
              Number of Chapters: <span className="font-bold text-sky-400">{numberOfChapters}</span>
            </label>
            <input
              type="range"
              id="numberOfChaptersSlider"
              min={MIN_CHAPTERS}
              max={MAX_CHAPTERS}
              step="1"
              value={numberOfChapters}
              onChange={(e) => setNumberOfChapters(Number(e.target.value))}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-sky-500"
              aria-label={`Number of chapters, current value ${numberOfChapters}`}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{MIN_CHAPTERS} chapters</span>
                <span>{MAX_CHAPTERS} chapters</span>
            </div>
          </div>

          <div>
            <label htmlFor="additionalInfo" className="block text-sm font-medium text-slate-300 mb-1">
              Additional Instructions (Optional)
            </label>
            <textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"
              placeholder="e.g., Target audience is young adults, focus on visual storytelling..."
              aria-label="Additional instructions for the book generation"
            />
          </div>

          <div>
            <label htmlFor="referenceFiles" className="block text-sm font-medium text-slate-300 mb-1">
              Reference Texts (Optional, .txt files)
            </label>
            <input
              type="file"
              id="referenceFiles"
              multiple
              accept=".txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-sky-50 hover:file:bg-sky-700 cursor-pointer"
              aria-describedby="reference-files-description"
            />
            <p id="reference-files-description" className="mt-1 text-xs text-slate-500">
              Upload .txt files to provide additional context or specific information for the AI.
            </p>
            {fileReadError && (
              <p className="mt-2 text-xs text-red-400" role="alert">{fileReadError}</p>
            )}
            {localReferenceFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-medium text-slate-400">Uploaded files:</h4>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  {localReferenceFiles.map(file => (
                    <li key={file.name} className="text-sm text-slate-300 flex justify-between items-center bg-slate-700 px-2 py-1 rounded-md">
                      <span className="truncate" title={file.name}>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.name)}
                        className="ml-2 p-1 text-red-400 hover:text-red-300"
                        aria-label={`Remove ${file.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 hero-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>


          <button
            type="submit"
            disabled={isLoading || !subject.trim() || numberOfChapters < MIN_CHAPTERS}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {isLoading ? 'Generating...' : 'Start Creating Outline'}
          </button>
        </form>
      </div>
      {isModalOpen && modalConfig && modalConfig.type === 'level' && (
        <DetailedCustomizationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onApply={handleModalApply}
          title={modalConfig.title}
          initialValue={modalConfig.currentValue}
          min={modalConfig.min}
          max={modalConfig.max}
          step={modalConfig.step}
          valueLabelFormatter={modalConfig.valueLabelFormatter}
          valueMap={modalConfig.valueMap}
          allowDirectInput={modalConfig.allowDirectInput}
          directInputSuffix={modalConfig.directInputSuffix}
        />
      )}
    </>
  );
};

export default UserInputPane;
