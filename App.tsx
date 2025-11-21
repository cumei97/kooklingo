
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Languages, 
  Settings, 
  Moon, 
  Sun, 
  Monitor, 
  Upload, 
  Search, 
  Star, 
  Sparkles,
  FileText,
  X,
  Check,
  PlayCircle,
  Type as TypeIcon,
  StopCircle,
  Volume2,
  Trash2,
  Plus,
  Filter,
  Cloud,
  Globe,
  MessageCircle,
  RotateCcw,
  ArrowRight,
  Repeat,
  Layers
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, AppSettings, AnalyzedSentence, VocabItem, TopikLevel, IdolQuote, WordAnalysis } from './types';
import { analyzeContentWithGemini, generateArticleWithGemini, getIdolQuote, searchVocab } from './services/geminiService';
import InteractiveText from './components/InteractiveText';

// --- Helper Components ---

const Spinner = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const AddWordModal = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  uiText 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (word: WordAnalysis) => void; 
  uiText: any 
}) => {
  const [formData, setFormData] = useState<Partial<WordAnalysis>>({
    word: '',
    meaning: '',
    original: '',
    pronunciation: '',
    pos: 'Noun',
    level: TopikLevel.BEGINNER,
    example: '',
    exampleTranslation: '',
    usageNote: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.word || !formData.meaning) return;

    const newWord: WordAnalysis = {
      word: formData.word,
      original: formData.original || formData.word, // Default to word if original not provided
      pronunciation: formData.pronunciation || '',
      hanja: null,
      pos: formData.pos || 'Noun',
      level: formData.level as TopikLevel,
      meaning: formData.meaning,
      example: formData.example || '',
      exampleTranslation: formData.exampleTranslation || '',
      usageNote: formData.usageNote || ''
    };
    onAdd(newWord);
    onClose();
    setFormData({
      word: '', meaning: '', original: '', pronunciation: '', pos: 'Noun', 
      level: TopikLevel.BEGINNER, example: '', exampleTranslation: '', usageNote: ''
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold dark:text-white">{uiText.addWordTitle}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Korean Word *</label>
              <input 
                required
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.word}
                onChange={e => setFormData({...formData, word: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Meaning *</label>
              <input 
                required
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.meaning}
                onChange={e => setFormData({...formData, meaning: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Level</label>
              <select 
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.level}
                onChange={e => setFormData({...formData, level: e.target.value as TopikLevel})}
              >
                <option value={TopikLevel.BEGINNER}>Beginner (Topik I)</option>
                <option value={TopikLevel.INTERMEDIATE}>Intermediate (Topik II 3-4)</option>
                <option value={TopikLevel.ADVANCED}>Advanced (Topik II 5-6)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">POS</label>
              <input 
                 className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                 placeholder="e.g. Noun, Verb"
                 value={formData.pos}
                 onChange={e => setFormData({...formData, pos: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Dictionary Form (Original)</label>
            <input 
               className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
               value={formData.original}
               onChange={e => setFormData({...formData, original: e.target.value})}
            />
          </div>

           <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Example Sentence</label>
            <textarea 
               className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
               rows={2}
               value={formData.example}
               onChange={e => setFormData({...formData, example: e.target.value})}
            />
          </div>
           <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Example Translation</label>
            <textarea 
               className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
               rows={2}
               value={formData.exampleTranslation}
               onChange={e => setFormData({...formData, exampleTranslation: e.target.value})}
            />
          </div>

          <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90">
            {uiText.add}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Localization Dictionary ---
const uiTranslations: Record<string, any> = {
  zh: {
    nav: {
      translator: "智能翻译",
      article: "AI文章",
      vocab: "生词本",
      idol: "爱豆语录",
      flashcards: "记忆闪卡"
    },
    header: {
      translator: "交互式翻译",
      translatorDesc: "输入文本或上传文件，获取深度TOPIK分析。",
      article: "分级阅读生成",
      articleDesc: "生成适合您等级的学习材料。",
      vocab: "我的生词本",
      vocabDesc: "按等级复习和管理您的词汇，或搜索新词。",
      idol: "爱豆语录",
      idolDesc: "输入爱豆名字和关键词，获取专属语录。",
      flashcards: "记忆闪卡",
      flashcardsDesc: "通过随机抽取的闪卡复习生词。"
    },
    buttons: {
      analyze: "开始分析",
      generate: "生成文章",
      clear: "清除",
      add: "添加",
      search: "搜索",
      manualAdd: "手动添加",
      searchOnline: "在线搜索",
      searchLocal: "本地搜索",
      flip: "翻转",
      next: "下一个",
      restart: "重新开始",
      shuffle: "打乱"
    },
    labels: {
      enterText: "输入韩语文本或上传文件...",
      enterTopic: "输入文章主题 (例如: 韩国旅行)...",
      enterIdol: "输入爱豆名字 (例如: 田柾国)",
      enterQuote: "输入关键词或句子 (例如: 努力, 梦想)...",
      all: "全部",
      beginner: "初级",
      intermediate: "中级",
      advanced: "高级",
      noVocab: "生词本还是空的",
      noResults: "没有找到相关结果",
      vocabSearchPlaceholder: "搜索...",
      added: "已添加",
      koToCn: "韩语 -> 中文",
      cnToKo: "中文 -> 韩语",
      emptyFlashcards: "生词本是空的，请先添加单词！"
    },
    wordCard: {
      example: "例句",
      note: "笔记",
      addWordTitle: "添加生词",
      original: "原型",
      context: "原文"
    },
    settings: {
      tone: "语体/敬语",
      dialect: "方言",
      formal: "最高敬语 (合朔体)",
      polite: "一般敬语 (哈哟体)",
      casual: "平语 (哈体)",
      standard: "标准语 (首尔)",
      busan: "釜山/庆尚道",
      jeju: "济州岛",
      jeolla: "全罗道",
      chungcheong: "忠清道"
    }
  },
  en: {
    nav: {
      translator: "Smart Translator",
      article: "AI Articles",
      vocab: "Wordbook",
      idol: "Idol Quotes",
      flashcards: "Flashcards"
    },
    header: {
      translator: "Interactive Translator",
      translatorDesc: "Translate text or files to Korean with deep analysis.",
      article: "Level-Based Article Generator",
      articleDesc: "Generate study material tailored to your level.",
      vocab: "My TOPIK Wordbook",
      vocabDesc: "Review your vocabulary or search for new words.",
      idol: "Idol Quotes",
      idolDesc: "Get quotes from your favorite idol based on keywords.",
      flashcards: "Flashcards",
      flashcardsDesc: "Review your vocabulary with random flashcards."
    },
    buttons: {
      analyze: "Analyze",
      generate: "Generate",
      clear: "Clear",
      add: "Add",
      search: "Search",
      manualAdd: "Manual Add",
      searchOnline: "Search Online",
      searchLocal: "Local Search",
      flip: "Flip",
      next: "Next",
      restart: "Restart",
      shuffle: "Shuffle"
    },
    labels: {
      enterText: "Enter text or upload file...",
      enterTopic: "Enter topic (e.g. Travel in Korea)...",
      enterIdol: "Idol Name (e.g. Jungkook)",
      enterQuote: "Enter keyword or sentence (e.g. Dreams, Love)...",
      all: "All",
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
      noVocab: "No vocabulary saved yet",
      noResults: "No results found",
      vocabSearchPlaceholder: "Search...",
      added: "Added",
      koToCn: "Korean -> Meaning",
      cnToKo: "Meaning -> Korean",
      emptyFlashcards: "Wordbook is empty. Add words first!"
    },
    wordCard: {
      example: "Example",
      note: "Note",
      addWordTitle: "Add New Word",
      original: "Original",
      context: "In Text"
    },
    settings: {
      tone: "Tone/Politeness",
      dialect: "Dialect",
      formal: "Formal High",
      polite: "Polite Standard",
      casual: "Casual/Plain",
      standard: "Standard (Seoul)",
      busan: "Busan/Gyeongsang",
      jeju: "Jeju",
      jeolla: "Jeolla",
      chungcheong: "Chungcheong"
    }
  }
};

// --- Main App Component ---

export default function App() {
  // Settings & Localization
  const [settings, setSettings] = useState<AppSettings>({
    language: 'zh', // Default to Chinese
    theme: 'system'
  });
  const t = uiTranslations[settings.language === 'zh' ? 'zh' : 'en'];

  // UI State
  const [activeTab, setActiveTab] = useState<'translator' | 'article' | 'vocab' | 'idol' | 'flashcards'>('translator');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- Independent Data State for each module ---
  
  // 1. Translator Module State
  const [transInputText, setTransInputText] = useState('');
  const [transInputFile, setTransInputFile] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const [transResult, setTransResult] = useState<AnalyzedSentence | null>(null);
  const [transPoliteness, setTransPoliteness] = useState('polite');
  const [transDialect, setTransDialect] = useState('standard');

  // 2. Article Module State
  const [articleTopic, setArticleTopic] = useState('');
  const [articleResult, setArticleResult] = useState<AnalyzedSentence | null>(null);

  // 3. Idol Module State
  const [idolConfig, setIdolConfig] = useState({ name: '', text: '' });
  const [idolResult, setIdolResult] = useState<IdolQuote | null>(null);

  // 4. Vocab Module State
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabFilterLevel, setVocabFilterLevel] = useState<'ALL' | TopikLevel>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Vocab Online Search State
  const [isOnlineSearch, setIsOnlineSearch] = useState(false);
  const [onlineSearchResults, setOnlineSearchResults] = useState<WordAnalysis[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // 5. Flashcards State
  const [flashcardMode, setFlashcardMode] = useState<'KO_TO_CN' | 'CN_TO_KO'>('KO_TO_CN');
  const [flashQueue, setFlashQueue] = useState<VocabItem[]>([]);
  const [currentFlashIndex, setCurrentFlashIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Vocab from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('klingua_vocab');
    if (saved) {
        setVocabList(JSON.parse(saved));
    }
  }, []);

  // Save Vocab to LocalStorage
  useEffect(() => {
    localStorage.setItem('klingua_vocab', JSON.stringify(vocabList));
  }, [vocabList]);

  // Theme Handling
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Initialize Flashcards when entering tab
  useEffect(() => {
    if (activeTab === 'flashcards' && vocabList.length > 0) {
        resetFlashcards();
    }
  }, [activeTab]);

  const getTargetLanguageName = () => {
    const langObj = SUPPORTED_LANGUAGES.find(l => l.code === settings.language);
    return langObj ? langObj.name : 'Chinese (Simplified)';
  };

  // --- Handlers ---

  const handleAnalyze = async () => {
    if (!transInputText && !transInputFile) return;
    setIsLoading(true);
    setError(null);
    try {
      const input = transInputFile ? { mimeType: transInputFile.mimeType, data: transInputFile.data } : transInputText;
      const result = await analyzeContentWithGemini(
        input, 
        getTargetLanguageName(),
        { politeness: transPoliteness, dialect: transDialect }
      );
      setTransResult(result);
    } catch (e) {
      setError("Failed to analyze content. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateArticle = async () => {
    if (!articleTopic) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateArticleWithGemini(articleTopic, getTargetLanguageName());
      setArticleResult(result);
    } catch (e) {
      setError("Failed to generate article. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdolChat = async () => {
    if (!idolConfig.name || !idolConfig.text) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getIdolQuote(idolConfig.text, idolConfig.name, getTargetLanguageName());
      setIdolResult(result);
    } catch (e) {
      setError("Idol is busy right now (API Error). Try again later!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVocabSearch = async () => {
    if (!vocabSearch || !isOnlineSearch) return;
    setIsSearchingOnline(true);
    setError(null);
    try {
      const results = await searchVocab(vocabSearch, getTargetLanguageName());
      setOnlineSearchResults(results);
    } catch (e) {
      setError("Failed to search vocabulary online. Please try again.");
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        setTransInputFile({
          name: file.name,
          data: base64String,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const addToVocab = (word: WordAnalysis) => {
    setVocabList(prev => {
      if (prev.some(item => item.word === word.word)) return prev;
      return [...prev, { ...word, id: Date.now().toString(), dateAdded: Date.now() }];
    });
  };

  const removeFromVocab = (id: string) => {
    setVocabList(prev => prev.filter(item => item.id !== id));
  };

  const resetFlashcards = () => {
    const shuffled = [...vocabList].sort(() => 0.5 - Math.random());
    setFlashQueue(shuffled);
    setCurrentFlashIndex(0);
    setIsCardFlipped(false);
  };

  const nextFlashcard = () => {
    if (currentFlashIndex < flashQueue.length - 1) {
        setCurrentFlashIndex(prev => prev + 1);
        setIsCardFlipped(false);
    } else {
        // End of session, maybe restart?
        resetFlashcards();
    }
  };

  const playAudio = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // --- Renderers ---

  const renderHeader = (title: string, desc: string) => (
    <div className="mb-8 text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
      <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary font-sans tracking-tight">
        {title}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">{desc}</p>
    </div>
  );

  const renderTranslator = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      {renderHeader(t.header.translator, t.header.translatorDesc)}
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="space-y-4">
          {/* Settings Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.settings.tone}</label>
              <select 
                value={transPoliteness} 
                onChange={(e) => setTransPoliteness(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border-none text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary"
              >
                <option value="formal">{t.settings.formal}</option>
                <option value="polite">{t.settings.polite}</option>
                <option value="casual">{t.settings.casual}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.settings.dialect}</label>
              <select 
                value={transDialect} 
                onChange={(e) => setTransDialect(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border-none text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary"
              >
                <option value="standard">{t.settings.standard}</option>
                <option value="busan">{t.settings.busan}</option>
                <option value="jeju">{t.settings.jeju}</option>
                <option value="jeolla">{t.settings.jeolla}</option>
                <option value="chungcheong">{t.settings.chungcheong}</option>
              </select>
            </div>
          </div>

          {transInputFile ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <FileText className="text-primary" />
                <span className="font-medium dark:text-white truncate max-w-xs">{transInputFile.name}</span>
              </div>
              <button onClick={() => setTransInputFile(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                <X size={18} />
              </button>
            </div>
          ) : (
            <textarea
              className="w-full h-40 p-4 bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-primary focus:ring-0 transition-all resize-none dark:text-white"
              placeholder={t.labels.enterText}
              value={transInputText}
              onChange={(e) => setTransInputText(e.target.value)}
            />
          )}
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="Upload File"
              >
                <Upload size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".txt,.pdf,.docx"
                onChange={handleFileUpload}
              />
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={(!transInputText && !transInputFile) || isLoading}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? <Spinner /> : <><Sparkles size={18} /> {t.buttons.analyze}</>}
            </button>
          </div>
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}
        </div>
      </div>

      {transResult && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
               <div>
                  <h3 className="text-lg font-semibold text-gray-400 uppercase tracking-wider">Korean Analysis</h3>
                  <div className="flex gap-2 mt-1">
                     <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{transPoliteness}</span>
                     {transDialect !== 'standard' && <span className="text-xs px-2 py-0.5 rounded bg-secondary/10 text-secondary font-medium">{transDialect}</span>}
                  </div>
               </div>
               <button 
                onClick={() => playAudio(transResult.koreanText)}
                className={`p-2 rounded-full transition-colors ${isSpeaking ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-primary'}`}
               >
                 {isSpeaking ? <StopCircle size={24} /> : <Volume2 size={24} />}
               </button>
            </div>
            <InteractiveText 
              words={transResult.words} 
              onAddToVocab={addToVocab} 
              uiText={{
                example: t.wordCard.example, 
                add: t.buttons.add, 
                note: t.wordCard.note
              }}
            />
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-l-4 border-secondary">
              <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Translation</h4>
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{transResult.translation}</p>
            </div>
        </div>
      )}
    </div>
  );

  const renderArticle = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      {renderHeader(t.header.article, t.header.articleDesc)}
      
      <div className="flex gap-4 mb-8">
         <div className="flex-1 relative">
           <input
            type="text"
            className="w-full p-4 pl-12 bg-white dark:bg-gray-800 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-primary dark:text-white"
            placeholder={t.labels.enterTopic}
            value={articleTopic}
            onChange={(e) => setArticleTopic(e.target.value)}
          />
          <TypeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
         </div>
         <button 
            onClick={handleGenerateArticle}
            disabled={!articleTopic || isLoading}
            className="px-6 bg-secondary hover:bg-secondary/90 text-white rounded-2xl font-bold shadow-lg shadow-secondary/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <Spinner /> : <><BookOpen size={20} /> {t.buttons.generate}</>}
         </button>
      </div>
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
          {error}
        </div>
      )}

      {articleResult && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-300">
           <div className="flex justify-between items-center mb-6">
             <div className="flex gap-2">
               <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">Beginner</span>
               <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Intermediate</span>
               <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">Advanced</span>
             </div>
             <button 
                onClick={() => playAudio(articleResult.koreanText)}
                className="flex items-center gap-2 text-primary hover:underline"
               >
                 <PlayCircle size={18} /> Listen to Article
             </button>
           </div>
           
           <InteractiveText 
             words={articleResult.words} 
             onAddToVocab={addToVocab}
             uiText={{
                example: t.wordCard.example, 
                add: t.buttons.add, 
                note: t.wordCard.note
              }}
           />

           <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
             <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
               <Languages size={18} className="text-secondary" /> 
               Translation
             </h4>
             <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{articleResult.translation}</p>
           </div>
        </div>
      )}
    </div>
  );

  const renderVocab = () => {
    // Local Filtering
    const filtered = vocabList.filter(item => {
      const matchesSearch = item.word.includes(vocabSearch) || item.meaning.includes(vocabSearch);
      const matchesLevel = vocabFilterLevel === 'ALL' || item.level === vocabFilterLevel;
      return matchesSearch && matchesLevel;
    });

    return (
      <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
        {renderHeader(t.header.vocab, t.header.vocabDesc)}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm">
          
          {/* Search Section */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
               <button 
                 onClick={() => setIsOnlineSearch(false)}
                 className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${!isOnlineSearch ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400'}`}
               >
                 <Search size={14} /> {t.buttons.searchLocal}
               </button>
               <button 
                 onClick={() => setIsOnlineSearch(true)}
                 className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${isOnlineSearch ? 'bg-white dark:bg-gray-600 shadow-sm text-secondary' : 'text-gray-500 dark:text-gray-400'}`}
               >
                 <Cloud size={14} /> {t.buttons.searchOnline}
               </button>
            </div>

            <div className="relative w-full md:w-64 flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-primary dark:text-white transition-all"
                  placeholder={t.labels.vocabSearchPlaceholder}
                  value={vocabSearch}
                  onChange={(e) => setVocabSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isOnlineSearch) handleVocabSearch();
                  }}
                />
              </div>
              {isOnlineSearch && (
                <button 
                  onClick={handleVocabSearch}
                  disabled={isSearchingOnline || !vocabSearch}
                  className="px-3 bg-secondary text-white rounded-xl hover:bg-secondary/90"
                >
                  {isSearchingOnline ? <Spinner /> : <Search size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* Filter Section (Only visible for Local Search) */}
          {!isOnlineSearch && (
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <Filter size={18} className="text-gray-400 mr-1" />
              {[
                { label: t.labels.all, value: 'ALL' },
                { label: t.labels.beginner, value: TopikLevel.BEGINNER },
                { label: t.labels.intermediate, value: TopikLevel.INTERMEDIATE },
                { label: t.labels.advanced, value: TopikLevel.ADVANCED }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setVocabFilterLevel(filter.value as any)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    vocabFilterLevel === filter.value 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <button 
                onClick={() => setShowAddModal(true)}
                className="ml-2 px-4 py-1.5 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600 transition-all flex items-center gap-1 whitespace-nowrap shadow-md"
              >
                <Plus size={16} /> {t.buttons.manualAdd}
              </button>
            </div>
          )}
        </div>

        {error && isOnlineSearch && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
              {error}
            </div>
        )}

        {/* CONTENT AREA */}
        {isOnlineSearch ? (
          /* Online Search Results */
          <div className="space-y-4">
            {onlineSearchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {onlineSearchResults.map((item, idx) => {
                   const isAdded = vocabList.some(v => v.word === item.word);
                   return (
                    <div 
                      key={idx} 
                      className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white font-kr">{item.word}</h3>
                            <button onClick={() => playAudio(item.word)} className="text-gray-400 hover:text-primary transition-colors">
                              <Volume2 size={18} />
                            </button>
                        </div>
                        <button 
                          onClick={() => !isAdded && addToVocab(item)}
                          disabled={isAdded}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            isAdded 
                            ? 'bg-green-100 text-green-600 cursor-default' 
                            : 'bg-primary text-white hover:bg-primary/90'
                          }`}
                        >
                          {isAdded ? t.labels.added : t.buttons.add}
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4 text-xs">
                         <span className={`px-2 py-1 rounded font-bold ${
                            item.level === TopikLevel.BEGINNER ? 'bg-yellow-100 text-yellow-800' : 
                            item.level === TopikLevel.INTERMEDIATE ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.level.replace('TOPIK ', '')}
                          </span>
                          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono">{item.pos}</span>
                      </div>
                      <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-2">{item.meaning}</p>
                      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20 -mx-6 -mb-6 p-4 rounded-b-2xl">
                         <div className="text-sm text-gray-600 dark:text-gray-300 font-kr leading-relaxed">
                            <span className="text-xs font-bold text-gray-400 block mb-1 uppercase">{t.wordCard.example}</span>
                            {item.example}
                          </div>
                      </div>
                    </div>
                   )
                })}
              </div>
            ) : (
               isSearchingOnline ? null : (
                 <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Cloud size={48} className="mb-4 opacity-20" />
                    <p>{t.labels.noResults}</p>
                 </div>
               )
            )}
          </div>
        ) : (
          /* Local Vocab List */
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <BookOpen size={48} className="mb-4 opacity-20" />
              <p>{t.labels.noVocab}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {filtered.map(item => (
                <div 
                  key={item.id} 
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-2">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${
                        item.level === TopikLevel.BEGINNER ? 'bg-yellow-100 text-yellow-800' : 
                        item.level === TopikLevel.INTERMEDIATE ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {item.level === TopikLevel.BEGINNER ? t.labels.beginner : 
                         item.level === TopikLevel.INTERMEDIATE ? t.labels.intermediate : t.labels.advanced}
                      </span>
                     <button 
                      onClick={() => removeFromVocab(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="Delete"
                     >
                       <Trash2 size={18} />
                     </button>
                  </div>

                  {/* Dual Audio Section: Original vs Context */}
                  <div className="grid grid-cols-2 gap-4 mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div>
                        <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">{t.wordCard.original}</p>
                        <div className="flex items-center gap-2">
                           <h3 className="text-xl font-bold text-gray-800 dark:text-white font-kr">{item.original}</h3>
                           <button onClick={(e) => playAudio(item.original, e)} className="text-gray-400 hover:text-primary transition-colors">
                              <Volume2 size={16} />
                           </button>
                        </div>
                    </div>
                    {item.word !== item.original && (
                        <div>
                            <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">{t.wordCard.context}</p>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-medium text-gray-600 dark:text-gray-300 font-kr">{item.word}</span>
                                <button onClick={(e) => playAudio(item.word, e)} className="text-gray-400 hover:text-primary transition-colors">
                                    <Volume2 size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3 text-xs">
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono">
                        {item.pos}
                      </span>
                      {item.hanja && (
                        <span className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-serif border border-gray-200 dark:border-gray-600">
                          {item.hanja}
                        </span>
                      )}
                  </div>

                  <div className="flex-grow space-y-3">
                     <p className="text-lg text-gray-700 dark:text-gray-200 font-medium">{item.meaning}</p>
                     
                     {item.usageNote && (
                       <div className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-2 rounded border border-blue-100 dark:border-blue-800/30 leading-relaxed">
                         <span className="font-bold mr-1">{t.wordCard.note}:</span>
                         {item.usageNote}
                       </div>
                     )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20 -mx-6 -mb-6 p-4 rounded-b-2xl">
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-sm text-gray-600 dark:text-gray-300 font-kr leading-relaxed">
                        <span className="text-xs font-bold text-gray-400 block mb-1 uppercase">{t.wordCard.example}</span>
                        {item.example}
                      </div>
                      <button onClick={(e) => playAudio(item.example, e)} className="mt-1 text-gray-400 hover:text-primary shrink-0">
                        <Volume2 size={16} />
                      </button>
                    </div>
                    {item.exampleTranslation && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{item.exampleTranslation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        <AddWordModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          onAdd={addToVocab}
          uiText={t.wordCard}
        />
      </div>
    );
  };

  const renderFlashcards = () => {
      if (flashQueue.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <Layers size={64} className="text-gray-300" />
                <h3 className="text-xl font-bold text-gray-500">{t.labels.emptyFlashcards}</h3>
                <button onClick={() => setActiveTab('vocab')} className="text-primary hover:underline font-bold">
                    Go to Vocab
                </button>
            </div>
          );
      }

      const card = flashQueue[currentFlashIndex];
      const showKoreanFront = flashcardMode === 'KO_TO_CN';

      // Determine what to show on front vs back based on mode
      const FrontContent = showKoreanFront ? (
        <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-bold font-kr mb-4">{card.original}</h2>
            <div className="flex justify-center gap-2">
               <button 
                onClick={(e) => playAudio(card.original, e)} 
                className="p-3 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
               >
                 <Volume2 size={24} />
               </button>
            </div>
        </div>
      ) : (
        <div className="text-center">
             <h2 className="text-2xl md:text-4xl font-bold mb-4">{card.meaning}</h2>
             <p className="text-sm text-gray-500 uppercase tracking-widest">Definition</p>
        </div>
      );

      const BackContent = showKoreanFront ? (
         <div className="text-center space-y-4 w-full max-w-lg">
             <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200">{card.meaning}</h3>
             <div className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-500">{card.pos}</div>
             {card.usageNote && (
                 <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                     {card.usageNote}
                 </div>
             )}
             <div className="pt-4 border-t border-gray-100 dark:border-gray-700 text-left">
                 <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t.wordCard.example}</p>
                 <div className="flex justify-between items-start">
                    <p className="font-kr text-lg text-gray-800 dark:text-white">{card.example}</p>
                    <button onClick={(e) => playAudio(card.example, e)} className="text-gray-400 hover:text-primary ml-2"><Volume2 size={18} /></button>
                 </div>
                 <p className="text-sm text-gray-500 italic mt-1">{card.exampleTranslation}</p>
             </div>
         </div>
      ) : (
        <div className="text-center space-y-4 w-full max-w-lg">
             <h2 className="text-4xl md:text-6xl font-bold font-kr text-primary mb-2">{card.original}</h2>
             <div className="flex justify-center gap-2 mb-4">
               <button 
                onClick={(e) => playAudio(card.original, e)} 
                className="p-3 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
               >
                 <Volume2 size={24} />
               </button>
            </div>
             <div className="pt-4 border-t border-gray-100 dark:border-gray-700 text-left bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                 <p className="font-kr text-lg text-gray-800 dark:text-white">{card.example}</p>
                 <p className="text-sm text-gray-500 italic mt-1">{card.exampleTranslation}</p>
             </div>
        </div>
      );

      return (
        <div className="max-w-3xl mx-auto h-full flex flex-col items-center pb-20">
             {renderHeader(t.header.flashcards, t.header.flashcardsDesc)}

             {/* Controls */}
             <div className="w-full flex justify-between items-center mb-6">
                <button 
                    onClick={() => setFlashcardMode(prev => prev === 'KO_TO_CN' ? 'CN_TO_KO' : 'KO_TO_CN')}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <RotateCcw size={16} />
                    {flashcardMode === 'KO_TO_CN' ? t.labels.koToCn : t.labels.cnToKo}
                </button>
                <div className="text-sm font-mono text-gray-400">
                    {currentFlashIndex + 1} / {flashQueue.length}
                </div>
             </div>

             {/* Card Area */}
             <div 
               className="w-full max-w-xl aspect-[4/5] md:aspect-[4/3] perspective-1000 relative cursor-pointer group"
               onClick={() => setIsCardFlipped(!isCardFlipped)}
             >
                <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isCardFlipped ? 'rotate-y-180' : ''} shadow-2xl rounded-3xl`}>
                    
                    {/* Front */}
                    <div className="absolute inset-0 bg-white dark:bg-gray-800 backface-hidden rounded-3xl flex flex-col items-center justify-center p-8 border border-gray-100 dark:border-gray-700">
                        <div className="absolute top-4 left-4 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-bold text-gray-500">
                            {flashcardMode === 'KO_TO_CN' ? 'KOREAN' : 'MEANING'}
                        </div>
                        {FrontContent}
                        <p className="absolute bottom-6 text-sm text-gray-400 animate-pulse">{t.buttons.flip}</p>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 bg-white dark:bg-gray-800 backface-hidden rotate-y-180 rounded-3xl flex flex-col items-center justify-center p-8 border border-primary/20 dark:border-primary/20 ring-2 ring-primary/5">
                         <div className="absolute top-4 left-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                            {flashcardMode === 'KO_TO_CN' ? 'MEANING' : 'KOREAN'}
                        </div>
                        {BackContent}
                    </div>
                </div>
             </div>

             {/* Nav Buttons */}
             <div className="mt-8 flex gap-4">
                 <button 
                    onClick={resetFlashcards}
                    className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                    title={t.buttons.shuffle}
                 >
                     <Repeat size={24} />
                 </button>
                 <button 
                    onClick={nextFlashcard}
                    className="flex-grow px-12 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
                 >
                     {t.buttons.next} <ArrowRight size={20} />
                 </button>
             </div>
        </div>
      );
  };

  const renderIdol = () => (
    <div className="space-y-8 max-w-4xl mx-auto">
      {renderHeader(t.header.idol, t.header.idolDesc)}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
           <div>
             <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">{t.labels.enterIdol}</label>
             <input
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-secondary dark:text-white transition-colors"
                placeholder="e.g. Jungkook"
                value={idolConfig.name}
                onChange={(e) => setIdolConfig({ ...idolConfig, name: e.target.value })}
             />
           </div>
           <div>
             <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">{t.labels.enterQuote}</label>
             <textarea
                className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-secondary dark:text-white transition-colors resize-none"
                placeholder={t.labels.enterQuote}
                value={idolConfig.text}
                onChange={(e) => setIdolConfig({ ...idolConfig, text: e.target.value })}
             />
           </div>
           <button 
              onClick={handleIdolChat}
              disabled={!idolConfig.name || !idolConfig.text || isLoading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50"
            >
              {isLoading ? <Spinner /> : <><Sparkles className="inline mr-2" size={18} /> Get Quote</>}
           </button>
           {error && (
             <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
               {error}
             </div>
           )}
        </div>

        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl shadow-2xl text-white flex flex-col justify-center items-center text-center min-h-[300px] border border-gray-700">
           {!idolResult ? (
             <div className="text-gray-500 space-y-4">
               <Star className="mx-auto opacity-20" size={64} />
               <p>Enter an idol and keyword to get a quote.</p>
             </div>
           ) : (
             <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="inline-block p-2 bg-white/10 rounded-full mb-2">
                 <Sparkles className="text-yellow-300" size={24} />
               </div>
               
               <div className="relative group cursor-pointer p-4 hover:bg-white/5 rounded-xl transition-all" onClick={() => playAudio(idolResult.koreanQuote)}>
                   <div className="flex items-center justify-center gap-3 mb-2">
                       <button 
                        className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors shadow-lg"
                        title="Play Audio"
                       >
                           <Volume2 size={24} />
                       </button>
                       <span className="text-xs text-gray-400 uppercase tracking-widest">Listen</span>
                   </div>
                  <p className="text-2xl md:text-3xl font-bold font-kr leading-relaxed">"{idolResult.koreanQuote}"</p>
               </div>
               
               <p className="text-lg text-gray-300 italic border-t border-white/10 pt-4 mt-2">
                 {idolResult.translation}
               </p>
               
               <div className="bg-black/30 p-4 rounded-xl backdrop-blur-sm border border-white/10 text-left mt-6">
                 <p className="text-xs font-bold text-gray-400 uppercase mb-2">Context</p>
                 <p className="text-sm text-gray-200">{idolResult.context}</p>
               </div>

               {idolResult.keywords && idolResult.keywords.length > 0 && (
                 <div className="mt-4 text-left">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Keywords</p>
                    <InteractiveText 
                      words={idolResult.keywords} 
                      onAddToVocab={addToVocab}
                      uiText={{
                        example: t.wordCard.example, 
                        add: t.buttons.add, 
                        note: t.wordCard.note
                      }}
                    />
                 </div>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold">K</div>
            <span className="font-bold text-xl tracking-tight dark:text-white">K-Linguo</span>
          </div>
          
          <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {[
              { id: 'translator', label: t.nav.translator, icon: Languages },
              { id: 'article', label: t.nav.article, icon: BookOpen },
              { id: 'vocab', label: t.nav.vocab, icon: Star },
              { id: 'flashcards', label: t.nav.flashcards, icon: Layers },
              { id: 'idol', label: t.nav.idol, icon: Sparkles },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id 
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative group">
              <select 
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="appearance-none bg-transparent pl-2 pr-8 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer focus:outline-none"
              >
                 {SUPPORTED_LANGUAGES.map(lang => (
                   <option key={lang.code} value={lang.code}>{lang.name}</option>
                 ))}
              </select>
              <Languages size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <button 
              onClick={() => setSettings({...settings, theme: settings.theme === 'dark' ? 'light' : 'dark'})}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-300"
            >
              {settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile Nav (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
        <div className="flex justify-around p-2">
           {[
              { id: 'translator', icon: Languages },
              { id: 'article', icon: BookOpen },
              { id: 'vocab', icon: Star },
              { id: 'flashcards', icon: Layers },
              { id: 'idol', icon: Sparkles },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`p-3 rounded-xl transition-colors ${
                  activeTab === item.id ? 'bg-primary/10 text-primary' : 'text-gray-400'
                }`}
              >
                <item.icon size={24} />
              </button>
            ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 pb-24 md:pb-8">
        {activeTab === 'translator' && renderTranslator()}
        {activeTab === 'article' && renderArticle()}
        {activeTab === 'vocab' && renderVocab()}
        {activeTab === 'flashcards' && renderFlashcards()}
        {activeTab === 'idol' && renderIdol()}
      </main>
      
      {/* Custom Styles for 3D Flip */}
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
}
