import React from 'react';
import { Loader2, Terminal, CheckCircle } from 'lucide-react';

interface BuildingScreenProps {
  projectTitle: string;
  currentStep: number;
  generatedCodeSnippet?: string;
}

const STEPS = [
    "Analyzing project requirements...",
    "Scaffolding application architecture...",
    "Generating component structure...",
    "Optimizing Tailwind CSS classes...",
    "Assembling final build..."
];

const BuildingScreen: React.FC<BuildingScreenProps> = ({ projectTitle, currentStep, generatedCodeSnippet }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
        </div>
        
        {/* Code Rain / Matrix Effect Background */}
        {generatedCodeSnippet && (
            <div className="absolute inset-0 z-0 opacity-20 overflow-hidden pointer-events-none">
                <div className="p-8 font-mono text-xs text-blue-300 whitespace-pre-wrap break-all leading-tight opacity-50">
                    {generatedCodeSnippet}
                </div>
                {/* Gradient overlay to fade bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            </div>
        )}

        <div className="relative z-10 flex flex-col items-center max-w-md w-full">
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
                <div className="w-20 h-20 bg-[#121214] border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent"></div>
                    <Loader2 size={40} className="text-blue-500 animate-spin" />
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 text-center">Building {projectTitle}</h2>
            <p className="text-gray-400 mb-8 text-center text-sm">Our AI architect is constructing your vision.</p>

            <div className="w-full bg-[#18181b]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-xs font-mono text-gray-500 border-b border-white/5 pb-2">
                    <Terminal size={12} />
                    <span>TERMINAL OUTPUT</span>
                </div>
                <div className="space-y-3 font-mono">
                    {STEPS.map((step, index) => (
                        <div 
                            key={index} 
                            className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                                index === currentStep 
                                    ? 'text-blue-400 translate-x-1 font-medium' 
                                    : index < currentStep 
                                        ? 'text-green-500/70' 
                                        : 'text-gray-600'
                            }`}
                        >
                            {index < currentStep ? (
                                <CheckCircle size={14} className="text-green-500 shrink-0" />
                            ) : index === currentStep ? (
                                <Loader2 size={14} className="animate-spin shrink-0" />
                            ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-gray-700 shrink-0"></div>
                            )}
                            <span className="truncate">{step}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default BuildingScreen;