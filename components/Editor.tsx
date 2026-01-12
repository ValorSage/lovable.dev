import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Project, ChatMessage } from '../types';
import { 
  ArrowLeft, Play, Code, Smartphone, Monitor, Download, 
  File, MoreHorizontal, Loader2, Send, Plus, Trash2, 
  FolderOpen, AlertCircle, Save, X, Edit3, Settings
} from 'lucide-react';
import { streamCodeEdit } from '../services/gemini';

declare const Prism: any;

interface EditorProps {
  project: Project;
  onBack: () => void;
  onUpdate: (project: Project) => void;
}

interface VirtualFile {
  id: string;
  name: string;
  language: 'html' | 'css' | 'javascript';
  content: string;
}

type EditorView = 'preview' | 'code';
type DeviceType = 'desktop' | 'mobile';

// Helper to extract CSS/JS from HTML to populate VFS initially
const parseProjectCode = (fullHtml: string): VirtualFile[] => {
    const files: VirtualFile[] = [];
    
    // 1. HTML (Main)
    // We strip style/script tags for the "clean" index.html in the editor, 
    // BUT for simplicity in this V1 IDE, we will keep them if they are small.
    // However, to show the "File System" feature, let's extract explicit large blocks.
    
    let htmlContent = fullHtml;
    let cssContent = "";
    let jsContent = "";

    // Extract content inside <style> tags (simple regex)
    const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
        cssContent = styleMatch[1].trim();
        // Don't remove from HTML in this implementation to prevent breaking structure 
        // if the user doesn't expect it, but for a "Clean" VFS, we might.
        // For now, we will create a 'styles.css' with this content for editing.
    }

    // Extract content inside <script> tags (that don't have src)
    const scriptMatch = fullHtml.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
        jsContent = scriptMatch[1].trim();
    }

    files.push({ id: '1', name: 'index.html', language: 'html', content: fullHtml }); // Keep full HTML as source of truth for now
    
    // If we wanted to enforce separation:
    if (cssContent.length > 0) {
        files.push({ id: '2', name: 'styles.css', language: 'css', content: cssContent });
    }
    if (jsContent.length > 0) {
        files.push({ id: '3', name: 'script.js', language: 'javascript', content: jsContent });
    }

    return files;
};

// Helper to bundle files back into a single HTML string for Preview
const bundlePreview = (files: VirtualFile[]): string => {
    const indexHtml = files.find(f => f.name === 'index.html')?.content || '';
    const styles = files.filter(f => f.language === 'css').map(f => f.content).join('\n');
    const scripts = files.filter(f => f.language === 'javascript').map(f => f.content).join('\n');

    // Simple injection logic
    let bundled = indexHtml;
    
    // Inject CSS
    if (styles.trim()) {
        if (bundled.includes('</head>')) {
            bundled = bundled.replace('</head>', `<style>${styles}</style></head>`);
        } else {
            bundled += `<style>${styles}</style>`;
        }
    }

    // Inject JS
    if (scripts.trim()) {
        if (bundled.includes('</body>')) {
            bundled = bundled.replace('</body>', `<script>${scripts}</script></body>`);
        } else {
            bundled += `<script>${scripts}</script>`;
        }
    }
    
    return bundled;
};

const Editor: React.FC<EditorProps> = ({ project, onBack, onUpdate }) => {
  const [viewMode, setViewMode] = useState<EditorView>('preview');
  const [device, setDevice] = useState<DeviceType>('desktop');
  
  // File System State
  const [files, setFiles] = useState<VirtualFile[]>(() => parseProjectCode(project.code || ''));
  const [activeFileId, setActiveFileId] = useState<string>(files[0]?.id || '1');
  const [explorerOpen, setExplorerOpen] = useState(true);

  // Editor State
  const [chatInput, setChatInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(project.chatHistory || []);
  const [problems, setProblems] = useState<string[]>([]);
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Derived
  const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);
  
  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isEditing]);

  // Syntax Highlighting Effect
  useEffect(() => {
    if (activeFile && preRef.current) {
        if (typeof Prism !== 'undefined') {
            Prism.highlightElement(preRef.current.querySelector('code'));
        }
    }
  }, [activeFile?.content, activeFile?.language, viewMode]);

  // Sync Scroll between textarea and pre
  const handleScroll = () => {
      if (textareaRef.current && preRef.current) {
          preRef.current.scrollTop = textareaRef.current.scrollTop;
          preRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
  };

  // Live Preview Update (Debounced)
  useEffect(() => {
      const timeout = setTimeout(() => {
          if (iframeRef.current) {
              const bundled = bundlePreview(files);
              iframeRef.current.srcdoc = bundled;
              
              // Basic Problem Check
              const newProblems = [];
              if (bundled.includes('<div class="')) {
                  // Example check (weak)
              }
              if (!bundled.includes('<!DOCTYPE html>')) newProblems.push("Warning: Missing DOCTYPE declaration.");
              setProblems(newProblems);
          }
      }, 800);
      return () => clearTimeout(timeout);
  }, [files]);

  // File Operations
  const handleFileChange = (newContent: string) => {
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: newContent } : f));
  };

  const handleCreateFile = () => {
      const name = prompt("Enter file name (e.g., page2.html, style.css):");
      if (!name) return;
      
      let lang: 'html' | 'css' | 'javascript' = 'html';
      if (name.endsWith('.css')) lang = 'css';
      if (name.endsWith('.js')) lang = 'javascript';

      const newFile: VirtualFile = {
          id: Date.now().toString(),
          name,
          language: lang,
          content: lang === 'html' ? '<!-- New Page -->' : '/* New Style */'
      };
      setFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (files.length <= 1) {
          alert("Cannot delete the last file.");
          return;
      }
      if (window.confirm("Delete this file?")) {
          setFiles(prev => prev.filter(f => f.id !== id));
          if (activeFileId === id) {
              setActiveFileId(files.find(f => f.id !== id)?.id || '');
          }
      }
  };

  // AI & Save Logic
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isEditing) return;

    const userMsg = chatInput;
    setChatInput('');
    setIsEditing(true);
    setViewMode('preview'); // Switch to preview to see changes

    const newHistoryUser: ChatMessage[] = [...chatHistory, { role: 'user', text: userMsg }];
    setChatHistory(newHistoryUser);
    onUpdate({ ...project, chatHistory: newHistoryUser });

    setChatHistory(prev => [...prev, { role: 'model', text: 'Analyzing project structure and applying changes...' }]);

    try {
        // We send the "bundled" code to AI to maintain context of the whole app
        const currentBundled = bundlePreview(files);
        
        let updatedCode = "";
        const stream = streamCodeEdit(currentBundled, userMsg);
        
        for await (const chunk of stream) {
            updatedCode += chunk;
        }
        updatedCode = updatedCode.replace(/```html/g, '').replace(/```/g, '').trim();

        if (updatedCode && updatedCode.length > 50) {
            // Update the Index HTML with the new Full Code
            // In a real advanced IDE, we would diff and distribute changes to css/js files.
            // For stability here, we update index.html mostly, but we re-parse.
            
            const newFiles = parseProjectCode(updatedCode);
            // Merge strategy: replace index.html, keep others if they look custom, 
            // OR just replace everything since AI generates full file. 
            // Let's replace index.html content and keep aux files if they weren't absorbed.
            
            setFiles(prev => {
                const newIndex = newFiles.find(f => f.name === 'index.html');
                return prev.map(f => {
                    if (f.name === 'index.html' && newIndex) {
                        return { ...f, content: newIndex.content };
                    }
                    return f;
                });
            });

            const successMsg: ChatMessage = { role: 'model', text: 'Code updated successfully.' };
            const finalHistory = [...newHistoryUser, successMsg];
            setChatHistory(finalHistory);
            
            // Persist
            onUpdate({ 
                ...project, 
                code: updatedCode,
                chatHistory: finalHistory
            });

        } else {
             throw new Error("Generated code invalid");
        }
    } catch (e) {
        console.error(e);
        const errorMsg: ChatMessage = { role: 'model', text: 'Error applying changes.' };
        setChatHistory(prev => [...prev, errorMsg]);
    } finally {
        setIsEditing(false);
    }
  };

  const handleSave = () => {
      const finalCode = bundlePreview(files);
      onUpdate({ ...project, code: finalCode });
      alert("Project saved successfully!");
  };

  const handleFormat = () => {
      // Basic indentation fix
      if (!activeFile) return;
      // Very naive formatter for demo purposes
      // In prod, use Prettier via worker
      const lines = activeFile.content.split('\n');
      const formatted = lines.map(l => l.trim()).join('\n'); // Too aggressive?
      // Let's just alert for now
      alert("Auto-format applied (Simulated)");
  };

  return (
    <div className="fixed inset-0 bg-[#09090b] flex flex-col z-40 font-sans text-white overflow-hidden">
        
        {/* Header */}
        <header className="h-12 border-b border-white/10 bg-[#09090b] flex items-center justify-between px-4 shrink-0 z-50">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={16} />
                </button>
                <div className="flex items-center gap-2 select-none">
                    <span className="text-sm font-semibold text-gray-200">{project.title}</span>
                    <span className="text-xs text-gray-600 px-2 py-0.5 border border-white/5 rounded-full">v1.0</span>
                </div>
            </div>

            {/* Center Tabs */}
            <div className="flex bg-[#18181b] rounded-md p-1 border border-white/5">
                <button 
                    onClick={() => setViewMode('code')}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${viewMode === 'code' ? 'bg-[#27272a] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <Code size={14} /> Code
                </button>
                <button 
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${viewMode === 'preview' ? 'bg-[#27272a] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <Play size={14} /> Preview
                </button>
            </div>

            <div className="flex items-center gap-2">
                 <button onClick={handleSave} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md" title="Save Project">
                    <Save size={16} />
                 </button>
                 <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2 shadow-sm">
                    <Download size={14} /> Export
                 </button>
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-grow flex overflow-hidden">
            
            {/* VIEW: CODE EDITOR MODE */}
            <div className={`flex w-full h-full ${viewMode === 'preview' ? 'hidden' : 'flex'}`}>
                
                {/* File Explorer Sidebar */}
                {explorerOpen && (
                    <div className="w-60 bg-[#09090b] border-r border-white/10 flex flex-col shrink-0 animate-slide-right">
                        <div className="p-3 border-b border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Explorer</span>
                            <button onClick={handleCreateFile} className="text-gray-500 hover:text-white"><Plus size={14} /></button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2">
                            {files.map(file => (
                                <div 
                                    key={file.id}
                                    onClick={() => setActiveFileId(file.id)}
                                    className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer mb-1 transition-colors ${activeFileId === file.id ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <File size={14} className={activeFileId === file.id ? 'text-blue-500' : 'text-gray-500'} />
                                        <span className="truncate">{file.name}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteFile(file.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-500 rounded"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {/* Problems Panel (Mini) */}
                        <div className="p-3 border-t border-white/5 bg-[#0c0c0e]">
                             <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
                                <AlertCircle size={12} /> Problems
                             </div>
                             {problems.length > 0 ? (
                                 problems.map((p, i) => <div key={i} className="text-[10px] text-yellow-500 truncate">• {p}</div>)
                             ) : (
                                 <div className="text-[10px] text-green-600">No issues detected</div>
                             )}
                        </div>
                    </div>
                )}

                {/* Code Area */}
                <div className="flex-grow flex flex-col bg-[#1e1e1e] relative min-w-0">
                    
                    {/* Editor Tabs / Toolbar */}
                    <div className="h-9 bg-[#18181b] border-b border-white/5 flex items-center px-4 justify-between">
                         <div className="flex items-center h-full">
                            {files.map(file => (
                                <div 
                                    key={file.id}
                                    onClick={() => setActiveFileId(file.id)}
                                    className={`h-full flex items-center gap-2 px-3 text-xs border-r border-white/5 cursor-pointer ${activeFileId === file.id ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500' : 'text-gray-500 hover:bg-[#27272a]'}`}
                                >
                                    <span>{file.name}</span>
                                    {activeFileId === file.id && <button className="hover:text-red-400"><X size={10} /></button>}
                                </div>
                            ))}
                         </div>
                         <div className="flex items-center gap-3">
                             <button onClick={handleFormat} className="text-gray-500 hover:text-white" title="Format Code">
                                <Edit3 size={14} />
                             </button>
                             <button onClick={() => setExplorerOpen(!explorerOpen)} className="text-gray-500 hover:text-white" title="Toggle Explorer">
                                <FolderOpen size={14} />
                             </button>
                         </div>
                    </div>

                    {/* Editor Surface */}
                    <div className="relative flex-grow w-full overflow-hidden code-editor-container bg-[#1e1e1e]">
                        {/* Line Numbers */}
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#1e1e1e] border-r border-white/5 text-right pr-3 pt-[10px] text-gray-600 font-mono text-[14px] leading-[1.5] select-none z-10">
                            {activeFile?.content.split('\n').map((_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </div>

                        {/* Textarea for Input */}
                        <textarea
                            ref={textareaRef}
                            value={activeFile?.content || ''}
                            onChange={(e) => handleFileChange(e.target.value)}
                            onScroll={handleScroll}
                            className="code-editor-textarea pl-16 custom-scrollbar"
                            spellCheck="false"
                        />

                        {/* Pre/Code for Syntax Highlighting */}
                        <pre 
                            ref={preRef}
                            aria-hidden="true" 
                            className={`code-editor-pre pl-16 custom-scrollbar language-${activeFile?.language || 'html'}`}
                        >
                            <code className={`language-${activeFile?.language || 'html'}`}>
                                {activeFile?.content || ''}
                            </code>
                        </pre>
                    </div>
                </div>
            </div>

            {/* VIEW: PREVIEW MODE */}
            <div className={`flex w-full h-full ${viewMode === 'preview' ? 'flex' : 'hidden'}`}>
                {/* Chat Sidebar */}
                <div className="w-80 border-r border-white/10 bg-[#09090b] flex flex-col z-10 shrink-0">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Architect</span>
                        <Settings size={14} className="text-gray-500 cursor-pointer" />
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                        {chatHistory.length === 0 && (
                            <div className="text-center text-gray-500 mt-10 text-sm">
                                <p>Describe changes naturally.</p>
                                <p className="mt-2 text-xs text-gray-600">"Make the header sticky", "Change button color to red"</p>
                            </div>
                        )}

                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-2">
                                    {msg.role === 'model' ? (
                                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold">L</div>
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-[10px]">You</div>
                                    )}
                                    <span className="text-[10px] text-gray-500 uppercase">
                                        {msg.role === 'model' ? 'Assistant' : 'You'}
                                    </span>
                                </div>
                                
                                <div className={`ml-7 text-sm leading-relaxed p-3 rounded-lg border ${msg.role === 'model' ? 'bg-[#18181b] border-white/5 text-gray-200' : 'bg-blue-600/10 border-blue-600/20 text-blue-100'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-[#09090b] border-t border-white/10">
                            <div className="relative">
                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={isEditing ? "AI is working..." : "Ask for changes..."}
                                disabled={isEditing}
                                className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-white/20 disabled:opacity-50 transition-all focus:ring-1 focus:ring-blue-500/50"
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isEditing}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors disabled:opacity-0 shadow-lg shadow-blue-500/20"
                            >
                                {isEditing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            </button>
                            </div>
                        </div>
                </div>

                {/* Preview Canvas */}
                <div className="flex-grow bg-[#18181b] flex flex-col overflow-hidden relative">
                    {/* Device Toolbar */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-[#09090b] border border-white/10 rounded-full p-1 shadow-xl backdrop-blur-md">
                        <button 
                            onClick={() => setDevice('desktop')}
                            className={`p-2 rounded-full transition-all ${device === 'desktop' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Monitor size={16} />
                        </button>
                        <button 
                            onClick={() => setDevice('mobile')}
                            className={`p-2 rounded-full transition-all ${device === 'mobile' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Smartphone size={16} />
                        </button>
                    </div>

                    <div className="flex-grow flex items-center justify-center p-8 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px]">
                        <div 
                            className={`bg-white transition-all duration-500 shadow-2xl overflow-hidden border border-white/10 relative ${
                                device === 'mobile' 
                                    ? 'w-[375px] h-[812px] rounded-[3rem] border-[8px] border-[#27272a]' 
                                    : 'w-full h-full rounded-xl border border-white/5'
                            }`}
                        >
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
                                    <div className="bg-[#18181b] p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center">
                                        <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
                                        <span className="text-sm font-medium text-white">Generating Changes...</span>
                                    </div>
                                </div>
                            )}
                            
                            <iframe 
                                ref={iframeRef}
                                title="Project Preview"
                                className="w-full h-full bg-white"
                                sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Editor;