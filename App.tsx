import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import InputSection from './components/InputSection';
import ProjectDashboard from './components/ProjectDashboard';
import BuildingScreen from './components/BuildingScreen';
import Editor from './components/Editor';
import { Project } from './types';
import { X, Sparkles, Loader2, Send } from 'lucide-react';
import { streamIdeaResponse, streamAppCode } from './services/gemini';

type ViewState = 'home' | 'building' | 'editor';

function App() {
  // Initialize projects from localStorage
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
        const saved = localStorage.getItem('lovable_projects');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Filter out system templates to ensure a clean dashboard as requested
            return parsed.filter((p: Project) => p.category !== 'template');
        }
    } catch (e) {
        console.error("Error loading projects from storage:", e);
    }
    return [];
  });

  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [buildingStep, setBuildingStep] = useState(0);
  const [buildingCodeSnippet, setBuildingCodeSnippet] = useState(''); // New state for building screen visual
  
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');

  // Persist projects to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('lovable_projects', JSON.stringify(projects));
  }, [projects]);

  const handleSearch = async (prompt: string, imageBase64?: string, isRefinement = false) => {
    setIsGenerating(true);
    if (!isRefinement) {
        setShowModal(true);
        setAiResponse(""); 
        setOriginalPrompt(prompt);
    }
    
    // If refining, append to history (simplified context)
    const effectivePrompt = isRefinement 
        ? `Original Request: ${originalPrompt}\n\nCurrent Plan:\n${aiResponse}\n\nUser Feedback: ${prompt}\n\nPlease update the plan based on the feedback.` 
        : prompt;

    // If refining, clear response to show generation of new version
    if(isRefinement) setAiResponse("");

    try {
      const stream = streamIdeaResponse(effectivePrompt, imageBase64);
      
      for await (const chunk of stream) {
        setAiResponse((prev) => (prev || "") + chunk);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setAiResponse(null);
    setRefineText('');
  };

  const handleCreateProject = async () => {
    if (!aiResponse) return;

    // Robust title extraction: handles # Title, **Title**, or just Title
    const titleLine = aiResponse.split('\n').find(line => line.trim().length > 0 && !line.includes('Here is a')) || 'New Project';
    const cleanTitle = titleLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/:$/, '').trim();
    const finalTitle = cleanTitle.length > 40 ? cleanTitle.substring(0, 40) + '...' : cleanTitle;

    // Start building phase
    setBuildingStep(0); 
    setBuildingCodeSnippet('');
    setCurrentView('building');
    setShowModal(false);

    let code = '';
    let step = 0;

    try {
        // Generate Code Streaming
        const stream = streamAppCode(aiResponse);

        for await (const chunk of stream) {
            code += chunk;
            setBuildingCodeSnippet(prev => (prev + chunk).slice(-1000)); // Keep last 1000 chars for visual effect
            
            // Content-Aware Progress Tracking (Realistic)
            if ((code.includes('<!DOCTYPE') || code.includes('<html')) && step < 1) {
                step = 1;
                setBuildingStep(1);
            }
            if ((code.includes('<body') || code.includes('<main')) && step < 2) {
                step = 2;
                setBuildingStep(2);
            }
            const classCount = (code.match(/class="/g) || []).length;
            if (classCount > 15 && step < 3) {
                step = 3;
                setBuildingStep(3);
            }
        }

        // Clean up markdown
        code = code.replace(/```html/g, '').replace(/```/g, '').trim();

        // Validate code generation
        if (!code || code.length < 100 || code.includes("Error generating code")) {
            throw new Error("Generated code was empty or invalid");
        }

        // Step 4: Assembling (Finished)
        setBuildingStep(4);
        
        // Small delay to let user see the final checkmark
        await new Promise(resolve => setTimeout(resolve, 800));

        const newProject: Project = {
            id: Date.now().toString(),
            title: finalTitle,
            thumbnailUrl: '', 
            viewedAt: 'Just now',
            authorName: 'You',
            authorAvatar: '', 
            category: 'mine',
            code: code,
            chatHistory: [] // Initialize empty chat history
        };

        setProjects(prev => [newProject, ...prev]);
        setActiveProject(newProject);
        
        // Transition to Editor
        setCurrentView('editor');

    } catch (e) {
        console.error("Error creating project:", e);
        // Fallback to home if error
        setCurrentView('home');
        alert("Failed to generate project. Please try again.");
    }
  };

  const handleRefineSubmit = () => {
    if(!refineText.trim()) return;
    handleSearch(refineText, undefined, true);
    setRefineText('');
  };

  const handleEditorBack = () => {
      setCurrentView('home');
      setActiveProject(null);
  };

  const handleOpenProject = (project: Project) => {
      if (project.code) {
          setActiveProject(project);
          setCurrentView('editor');
      } else {
          alert("Project data unavailable.");
      }
  }

  // Called when code is updated inside the editor
  const handleProjectUpdate = (updatedProject: Project) => {
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      setActiveProject(updatedProject);
  };

  const handleDeleteProject = (projectId: string) => {
      if (window.confirm("Are you sure you want to delete this project?")) {
          setProjects(prev => prev.filter(p => p.id !== projectId));
      }
  };

  const handleRenameProject = (projectId: string, newTitle: string) => {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, title: newTitle } : p));
  };

  // Render Logic
  if (currentView === 'building') {
      // Robust title extraction again for the loader screen
      const titleLine = aiResponse?.split('\n').find(line => line.trim().length > 0 && !line.includes('Here is a')) || 'Project';
      const cleanTitle = titleLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/:$/, '').trim();
      const displayTitle = cleanTitle.length > 30 ? cleanTitle.substring(0, 30) + '...' : cleanTitle;
      
      return <BuildingScreen projectTitle={displayTitle} currentStep={buildingStep} generatedCodeSnippet={buildingCodeSnippet} />;
  }

  if (currentView === 'editor' && activeProject) {
      return (
        <Editor 
            project={activeProject} 
            onBack={handleEditorBack} 
            onUpdate={handleProjectUpdate}
        />
      );
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-white selection:bg-blue-500/30 overflow-hidden font-sans">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-pink-600/20 rounded-full blur-[130px] mix-blend-screen"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
          <div className="absolute bottom-[-20%] right-[10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Navbar */}
        <header className="px-8 py-6 flex justify-between items-center">
            <div className="text-xl font-bold tracking-tight flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
                <div className="w-3 h-3 bg-white rounded-full"></div>
                lovable.dev
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-blue-500 p-[1px]">
                 <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <span className="text-xs font-bold">You</span>
                 </div>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex flex-col items-center justify-center pt-6 pb-20">
            <InputSection 
                onSubmit={(p, img) => handleSearch(p, img)} 
                isGenerating={isGenerating} 
            />
            
            {/* Streaming Response Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#18181b]">
                            <div className="flex items-center gap-2 text-blue-400">
                                <Sparkles size={18} />
                                <span className="font-semibold text-sm uppercase tracking-wider">Plan Preview</span>
                            </div>
                            <button 
                                onClick={closeModal}
                                className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent bg-[#09090b]">
                            {!aiResponse && isGenerating && (
                                <div className="flex items-center gap-3 text-gray-400 italic">
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Architecting your idea...</span>
                                </div>
                            )}
                            
                            <div className={`markdown-content prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed ${isGenerating ? 'cursor-blink' : ''}`}>
                                <ReactMarkdown>{aiResponse || ''}</ReactMarkdown>
                            </div>
                        </div>

                        {/* Refinement Bar */}
                        <div className="p-3 bg-[#18181b] border-t border-white/5">
                            <div className="flex items-center gap-2 bg-[#27272a] rounded-lg px-3 py-2 border border-white/5 focus-within:border-blue-500/50 transition-colors">
                                <input 
                                    type="text"
                                    value={refineText}
                                    onChange={(e) => setRefineText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit()}
                                    placeholder="Refine this plan (e.g. 'Add a user profile page')"
                                    className="bg-transparent flex-grow text-sm text-white focus:outline-none placeholder-gray-500"
                                    disabled={isGenerating}
                                />
                                <button 
                                    onClick={handleRefineSubmit}
                                    disabled={!refineText.trim() || isGenerating}
                                    className="text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/5 bg-[#18181b] flex justify-end gap-3">
                            <button 
                                onClick={closeModal}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                disabled={isGenerating}
                                onClick={handleCreateProject}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>

        <ProjectDashboard 
            projects={projects} 
            onProjectClick={handleOpenProject}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
        />

      </div>
    </div>
  );
}

export default App;