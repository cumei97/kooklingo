import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WordAnalysis, TopikLevel } from '../types';
import { Plus, Volume2 } from 'lucide-react';

interface Props {
  words: WordAnalysis[];
  onAddToVocab: (word: WordAnalysis) => void;
  uiText: {
    example: string;
    add: string;
    note: string;
  };
}

const InteractiveText: React.FC<Props> = ({ words, onAddToVocab, uiText }) => {
  // Separate states for hover (transient) and locked (persistent via click)
  const [hoveredWord, setHoveredWord] = useState<{ word: WordAnalysis; rect: DOMRect } | null>(null);
  const [lockedWord, setLockedWord] = useState<{ word: WordAnalysis; rect: DOMRect } | null>(null);

  // The word to actually display is the locked one if it exists, otherwise the hovered one
  const activeDisplay = lockedWord || hoveredWord;
  
  // Handle click outside/scroll to close tooltip
  useEffect(() => {
    const handleGlobalEvents = (event: Event) => {
      // Close on scroll or resize to avoid position drift
      if (event.type === 'scroll' || event.type === 'resize') {
        setLockedWord(null);
        setHoveredWord(null);
        return;
      }
      // Close on click outside
      const target = event.target as Element;
      if (lockedWord && !target.closest('.interactive-word-tooltip') && !target.closest('.interactive-word')) {
        setLockedWord(null);
      }
    };

    window.addEventListener('scroll', handleGlobalEvents, true); // Capture phase for scrolling containers
    window.addEventListener('resize', handleGlobalEvents);
    document.addEventListener('mousedown', handleGlobalEvents);

    return () => {
      window.removeEventListener('scroll', handleGlobalEvents, true);
      window.removeEventListener('resize', handleGlobalEvents);
      document.removeEventListener('mousedown', handleGlobalEvents);
    };
  }, [lockedWord]);
  
  const getLevelStyles = (level: TopikLevel) => {
    switch (level) {
      case TopikLevel.BEGINNER: 
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-b-2 border-yellow-400';
      case TopikLevel.INTERMEDIATE:
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-b-2 border-green-400';
      case TopikLevel.ADVANCED: 
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-b-2 border-purple-400';
      default: 
        return 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800';
    }
  };

  const getTooltipHeaderClass = (level: TopikLevel) => {
    switch(level) {
        case TopikLevel.BEGINNER:
            return 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/40';
        case TopikLevel.INTERMEDIATE:
            return 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40';
        case TopikLevel.ADVANCED:
            return 'bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40';
        default:
            return 'bg-gray-50 dark:bg-gray-700';
    }
  };

  const getBadgeClass = (level: TopikLevel) => {
      switch(level) {
          case TopikLevel.BEGINNER: return 'bg-yellow-400 text-yellow-900';
          case TopikLevel.INTERMEDIATE: return 'bg-green-500 text-white';
          case TopikLevel.ADVANCED: return 'bg-purple-400 text-white';
          default: return 'bg-gray-200 text-gray-600';
      }
  };

  const handleMouseEnter = (event: React.MouseEvent<HTMLSpanElement>, word: WordAnalysis) => {
    if (lockedWord) return; // Don't change if locked
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredWord({ word, rect });
  };

  const handleMouseLeave = () => {
    setHoveredWord(null);
  };

  const handleClick = (event: React.MouseEvent<HTMLSpanElement>, word: WordAnalysis) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    // Single click locks the word
    setLockedWord({ word, rect });
    setHoveredWord(null); // Clear hover so it doesn't interfere
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    // Double click unlocks/closes
    setLockedWord(null);
    setHoveredWord(null);
  };

  const playAudio = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const Tooltip = () => {
    if (!activeDisplay) return null;

    const { word, rect } = activeDisplay;
    
    // Calculate position - centered horizontally, preferably above, flip if not enough space
    const tooltipWidth = 320; 
    const gap = 8;
    
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.top - gap; 

    // Adjust horizontal
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) left = window.innerWidth - tooltipWidth - 10;

    // Adjust vertical (Render below if top is too close to edge)
    const isBelow = rect.top < 300; // Simple heuristic
    const topPos = isBelow ? rect.bottom + gap : rect.top - gap;

    const style: React.CSSProperties = {
        position: 'fixed',
        left: `${left}px`,
        top: `${topPos}px`,
        transform: isBelow ? 'none' : 'translateY(-100%)',
        zIndex: 9999,
    };

    return createPortal(
      <div 
        className="interactive-word-tooltip w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200"
        style={style}
      >
        {/* Header with Gradient */}
        <div className={`px-4 py-3 flex justify-between items-start ${getTooltipHeaderClass(word.level)}`}>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white font-kr">{word.original}</h3>
              <button 
                onClick={(e) => playAudio(word.word, e)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                title="Listen"
              >
                <Volume2 size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-kr">{word.pronunciation}</span>
                {word.hanja && <span className="text-sm text-gray-500 dark:text-gray-400 font-serif">({word.hanja})</span>}
            </div>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-sm ${getBadgeClass(word.level)}`}>
            {word.level.replace('TOPIK ', '')}
          </span>
        </div>
        
        <div className="p-4 space-y-3 text-left">
          
          {/* Meaning & POS */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{word.pos}</span>
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-100 text-base">{word.meaning}</p>
          </div>

          {/* Usage Note */}
          {word.usageNote && (
              <div className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-2 rounded border border-blue-100 dark:border-blue-800/50 leading-relaxed">
                <span className="font-bold mr-1">{uiText.note}:</span>{word.usageNote}
              </div>
          )}

          {/* Example */}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1 font-bold">{uiText.example}</p>
            <p className="font-kr text-gray-800 dark:text-gray-200 text-sm mb-1 leading-relaxed">{word.example}</p>
            {word.exampleTranslation && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">{word.exampleTranslation}</p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToVocab(word);
              setLockedWord(null);
              setHoveredWord(null);
            }}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={16} /> {uiText.add}
          </button>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className="leading-loose text-lg font-kr break-words text-justify">
        {words.map((word, idx) => (
          <span key={idx} className="relative inline-block mx-0.5 interactive-word">
            <span
              className={`cursor-pointer rounded px-1 py-0.5 transition-all duration-200 ${getLevelStyles(word.level)}`}
              onMouseEnter={(e) => handleMouseEnter(e, word)}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => handleClick(e, word)}
              onDoubleClick={(e) => handleDoubleClick(e)}
            >
              {word.word}
            </span>
          </span>
        ))}
      </div>
      <Tooltip />
    </>
  );
};

export default InteractiveText;