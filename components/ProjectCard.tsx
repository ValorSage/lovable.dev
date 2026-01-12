import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { MoreHorizontal, Star, Trash2, Edit, Check, X } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onDelete, onRename }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editTitle, setEditTitle] = useState(project.title);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setShowMenu(false);
          }
      };
      if (showMenu) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Focus input when renaming starts
  useEffect(() => {
      if (isRenaming && inputRef.current) {
          inputRef.current.focus();
      }
  }, [isRenaming]);

  const handleMenuClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(!showMenu);
  };

  const handleRenameSubmit = (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) e.stopPropagation();
      if (editTitle.trim()) {
          onRename(project.id, editTitle);
      } else {
          setEditTitle(project.title); // Revert if empty
      }
      setIsRenaming(false);
  };

  const handleRenameCancel = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditTitle(project.title);
      setIsRenaming(false);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleRenameSubmit(e);
      if (e.key === 'Escape') {
          setEditTitle(project.title);
          setIsRenaming(false);
      }
  };

  return (
    <div 
        onClick={() => !isRenaming && onClick(project)}
        className="group relative flex flex-col bg-[#1C1C1E] hover:bg-[#2C2C2E] transition-colors rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-white/10"
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-[16/10] bg-[#2C2C2E] overflow-hidden">
        {project.thumbnailUrl ? (
          <img 
            src={project.thumbnailUrl} 
            alt={project.title} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-40 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
           <div className="w-full h-full flex items-center justify-center text-gray-500 group-hover:opacity-40 transition-opacity bg-gradient-to-br from-gray-800 to-black">
             <span className="text-4xl">✨</span>
           </div>
        )}
        
        {/* Open Button (Visible on Hover) */}
        {!isRenaming && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                <button className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-xl hover:scale-105 transition-transform">
                    Open Project
                </button>
            </div>
        )}
        
        {/* Star Icon */}
        <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100 z-10" onClick={(e) => e.stopPropagation()}>
            <Star size={16} />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col gap-1 relative">
        <div className="flex justify-between items-start min-h-[24px]">
          {isRenaming ? (
              <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                  <input 
                      ref={inputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="bg-[#09090b] text-white text-sm px-2 py-1 rounded border border-blue-500/50 focus:outline-none w-full"
                  />
                  <button onClick={handleRenameSubmit} className="text-green-400 hover:bg-green-400/10 p-1 rounded">
                      <Check size={14} />
                  </button>
                  <button onClick={handleRenameCancel} className="text-red-400 hover:bg-red-400/10 p-1 rounded">
                      <X size={14} />
                  </button>
              </div>
          ) : (
              <h3 className="text-white font-medium text-sm truncate pr-4">{project.title}</h3>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden border border-black/20">
                {project.authorAvatar ? (
                    <img src={project.authorAvatar} alt={project.authorName} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[10px] text-white font-bold">{project.authorName.charAt(0)}</span>
                )}
            </div>
            <div className="flex flex-col">
                 <span className="text-gray-400 text-xs">{project.authorName}</span>
            </div>
        </div>
        <p className="text-gray-500 text-xs mt-0.5">Viewed {project.viewedAt}</p>
        
        {/* Context Menu Trigger */}
        <div className="absolute bottom-4 right-4 text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded z-20" onClick={handleMenuClick}>
             <MoreHorizontal size={16} />
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
            <div ref={menuRef} className="absolute bottom-10 right-0 w-32 bg-[#1f1f22] border border-white/10 rounded-lg shadow-xl overflow-hidden z-30 animate-fade-in">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); setIsRenaming(true); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 flex items-center gap-2"
                >
                    <Edit size={12} /> Rename
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                >
                    <Trash2 size={12} /> Delete
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;