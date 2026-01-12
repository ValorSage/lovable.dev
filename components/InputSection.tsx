import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Paperclip, MessageSquare, Mic, Plus, LayoutTemplate, Image as ImageIcon, X, Check, MicOff, Zap, Layout, Database, Smartphone, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { generateVibeIdeas } from '../services/gemini';

interface InputSectionProps {
  onSubmit: (prompt: string, imageBase64?: string) => void;
  isGenerating: boolean;
}

const THEMES = ['Modern', 'Brutalist', 'Playful', 'Corporate', 'Minimal'];

const QUICK_ACTIONS = [
    { label: 'Landing Page', icon: Layout, prompt: "Create a high-conversion landing page for..." },
    { label: 'Admin Dashboard', icon: Database, prompt: "Build an admin dashboard to manage..." },
    { label: 'Mobile App', icon: Smartphone, prompt: "Design a mobile-first app for..." },
    { label: 'Internal Tool', icon: Zap, prompt: "Create an internal tool to automate..." },
];

const InputSection: React.FC<InputSectionProps> = ({ onSubmit, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Vibe State
  const [vibeIdeas, setVibeIdeas] = useState<string[]>([]);
  const [isLoadingVibes, setIsLoadingVibes] = useState(false);
  const [showVibeMenu, setShowVibeMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const vibeMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt((prev) => prev ? `${prev} ${transcript}` : transcript);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
        alert("Voice input is not supported in this browser.");
        return;
    }
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        recognitionRef.current.start();
    }
  };

  const handleSend = useCallback(() => {
    if ((!prompt.trim() && !selectedFile) || isGenerating) return;
    
    // Construct the prompt with theme info
    let finalPrompt = prompt;
    
    if (selectedTheme) {
        finalPrompt += ` [Style: ${selectedTheme}]`;
    }
      
    // Pass the raw file preview (base64) if it exists
    onSubmit(finalPrompt, filePreview || undefined);
    
    setPrompt(''); 
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Keep theme selected
  }, [prompt, selectedFile, filePreview, selectedTheme, isGenerating, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Read file as data URL for preview and sending
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleQuickAction = (actionPrompt: string) => {
      setPrompt(actionPrompt + " ");
      setShowPlusMenu(false);
      textareaRef.current?.focus();
  };

  const handleVibesClick = async () => {
      // If we already have ideas and menu is open, just toggle close
      if (showVibeMenu) {
          setShowVibeMenu(false);
          return;
      }

      // If we have ideas but menu is closed, open it
      if (vibeIdeas.length > 0) {
          setShowVibeMenu(true);
          return;
      }

      // Fetch new ideas
      setIsLoadingVibes(true);
      const ideas = await generateVibeIdeas();
      setVibeIdeas(ideas);
      setIsLoadingVibes(false);
      setShowVibeMenu(true);
  };

  const handleVibeSelect = (idea: string) => {
      setPrompt(idea);
      setShowVibeMenu(false);
      
      // Auto-select a random theme to match the "Vibe"
      if (!selectedTheme) {
        const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
        setSelectedTheme(randomTheme);
      }

      textareaRef.current?.focus();
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
            setShowThemeMenu(false);
        }
        if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
            setShowPlusMenu(false);
        }
        if (vibeMenuRef.current && !vibeMenuRef.current.contains(event.target as Node) && !(event.target as Element).closest('#vibe-btn')) {
             setShowVibeMenu(false);
        }
    };
    
    if (showThemeMenu || showPlusMenu || showVibeMenu) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showThemeMenu, showPlusMenu, showVibeMenu]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 relative z-20 flex flex-col items-center">
        {/* Pill Label / Vibe Button */}
        <div className="mb-8 animate-fade-in-up relative">
            <button 
                id="vibe-btn"
                onClick={handleVibesClick}
                disabled={isLoadingVibes}
                className={`cursor-pointer bg-white/10 hover:bg-white/15 border border-white/10 rounded-full pl-4 pr-3 py-1.5 text-sm text-gray-200 backdrop-blur-md transition-all flex items-center gap-2 shadow-sm group active:scale-95 ${isLoadingVibes ? 'opacity-80' : ''}`}
            >
                {isLoadingVibes ? (
                    <Loader2 size={14} className="animate-spin text-blue-400" />
                ) : (
                    <Sparkles size={14} className={`text-yellow-400 group-hover:rotate-12 transition-transform`} />
                )}
                <span>{isLoadingVibes ? "Generating vibes..." : "Your 2025 Lovable Vibes are here"}</span>
                <span className="text-gray-400 group-hover:translate-x-1 transition-transform flex items-center">
                  <ArrowRight size={14} />
                </span>
            </button>

            {/* Vibe Dropdown Menu */}
            {showVibeMenu && vibeIdeas.length > 0 && (
                <div 
                    ref={vibeMenuRef}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-[#1f1f22]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in origin-top"
                >
                    <div className="p-2">
                        <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                            <span>Fresh Ideas</span>
                            <button onClick={handleVibesClick} className="hover:text-white transition-colors">
                                <span className="sr-only">Refresh</span>
                            </button>
                        </div>
                        <div className="space-y-1">
                            {vibeIdeas.map((idea, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleVibeSelect(idea)}
                                    className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-blue-500/10 hover:border-blue-500/20 border border-transparent rounded-xl transition-all duration-200 group relative overflow-hidden"
                                >
                                    <span className="relative z-10">{idea}</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-semibold text-white mb-8 tracking-tight text-center drop-shadow-lg leading-tight">
            Got an idea, <span className="font-arabic text-blue-400">طـهـي</span>?
        </h1>

        {/* Input Container */}
        <div className={`w-full bg-[#18181b]/90 backdrop-blur-xl border rounded-3xl p-3 shadow-2xl transition-all duration-300 
            ${isGenerating ? 'border-blue-500/50 shadow-blue-500/10' : 'border-white/10 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10'} 
            ${isListening ? 'ring-2 ring-red-500/50' : ''}
        `}>
            <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask Lovable to create an internal tool that..."}
                disabled={isGenerating}
                className="w-full bg-transparent text-white text-lg placeholder-gray-500 px-3 py-2 min-h-[60px] max-h-[200px] resize-none focus:outline-none scrollbar-hide disabled:opacity-50 placeholder:text-gray-500"
                rows={1}
            />
            
            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
            />

            <div className="flex items-center justify-between mt-2 px-1 relative">
                <div className="flex items-center gap-2">
                    {/* Plus Button with Menu */}
                    <div className="relative" ref={plusMenuRef}>
                        <button 
                            onClick={() => setShowPlusMenu(!showPlusMenu)}
                            className={`cursor-pointer p-2 rounded-full transition-colors ${showPlusMenu ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        >
                            <Plus size={20} />
                        </button>

                         {/* Quick Actions Dropdown */}
                         {showPlusMenu && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-[#1f1f22] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in-up">
                                <div className="p-1.5">
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Start with</div>
                                    {QUICK_ACTIONS.map((action) => (
                                        <button
                                            key={action.label}
                                            onClick={() => handleQuickAction(action.prompt)}
                                            className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-3 group transition-colors"
                                        >
                                            <action.icon size={16} className="text-blue-400 group-hover:text-blue-300" />
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Attach Button */}
                    <button 
                        onClick={handleAttachClick}
                        className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium ${selectedFile ? 'bg-blue-500/20 border-blue-500/30 text-blue-200 hover:bg-blue-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/5'}`}
                    >
                        {selectedFile ? <ImageIcon size={16} /> : <Paperclip size={16} />}
                        <span className="truncate max-w-[150px]">{selectedFile ? selectedFile.name : 'Attach'}</span>
                        {selectedFile && (
                             <div role="button" onClick={clearAttachment} className="hover:text-white p-0.5 rounded-full hover:bg-white/20 ml-1">
                                <X size={12} />
                            </div>
                        )}
                    </button>
                    
                    {/* Theme Button */}
                    <div className="relative" ref={themeMenuRef}>
                        <button 
                            onClick={() => setShowThemeMenu(!showThemeMenu)}
                            className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium ${selectedTheme ? 'bg-purple-500/20 border-purple-500/30 text-purple-200 hover:bg-purple-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/5'}`}
                        >
                            <LayoutTemplate size={16} />
                            {selectedTheme || 'Theme'}
                            {selectedTheme && (
                                <div role="button" onClick={(e) => { e.stopPropagation(); setSelectedTheme(null); }} className="hover:text-white p-0.5 rounded-full hover:bg-white/20 ml-1">
                                    <X size={12} />
                                </div>
                            )}
                        </button>
                        
                        {/* Theme Dropdown */}
                        {showThemeMenu && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-[#1f1f22] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in-up">
                                <div className="p-1.5">
                                    {THEMES.map(theme => (
                                        <button
                                            key={theme}
                                            onClick={() => { setSelectedTheme(theme); setShowThemeMenu(false); }}
                                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-between group"
                                        >
                                            {theme}
                                            {selectedTheme === theme && <Check size={14} className="text-purple-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                     <button 
                        onClick={handleSend}
                        disabled={(!prompt.trim() && !selectedFile) || isGenerating}
                        className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                            (prompt.trim() || selectedFile) 
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-[#27272a] text-gray-500 cursor-not-allowed'
                        }`}
                     >
                        {isGenerating ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <MessageSquare size={18} fill="currentColor" />
                        )}
                        <span>{isGenerating ? 'Thinking' : 'Chat'}</span>
                    </button>
                     <button 
                        onClick={handleMicClick}
                        className={`cursor-pointer p-2.5 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                     >
                        {isListening ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default InputSection;