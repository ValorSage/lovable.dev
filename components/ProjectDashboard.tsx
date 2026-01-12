import React, { useState, useMemo } from 'react';
import { Project, Tab } from '../types';
import ProjectCard from './ProjectCard';
import { ArrowRight } from 'lucide-react';

interface ProjectDashboardProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newTitle: string) => void;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projects, onProjectClick, onDeleteProject, onRenameProject }) => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.RECENTLY_VIEWED);

  const filteredProjects = useMemo(() => {
    switch (activeTab) {
      case Tab.MY_PROJECTS:
        return projects.filter(p => p.category === 'mine');
      case Tab.SHARED_WITH_ME:
        return projects.filter(p => p.category === 'shared');
      case Tab.TEMPLATES:
        return projects.filter(p => p.category === 'template');
      case Tab.RECENTLY_VIEWED:
      default:
        // For recently viewed, we show all (simulating history) for now
        return projects;
    }
  }, [activeTab, projects]);

  return (
    <div className="w-full bg-[#09090b] min-h-[60vh] rounded-t-[32px] border-t border-white/10 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] p-6 md:p-10 animate-slide-up relative z-10 transition-all duration-500">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {Object.values(Tab).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#27272a] text-white border border-white/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Removed non-functional 'Browse all' button */}
      </div>

      {/* Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {filteredProjects.map((project) => (
            <ProjectCard 
                key={project.id} 
                project={project} 
                onClick={onProjectClick}
                onDelete={onDeleteProject}
                onRename={onRenameProject}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 animate-fade-in border-2 border-dashed border-white/5 rounded-2xl">
          <p>No projects found in this view.</p>
          {activeTab === Tab.MY_PROJECTS && (
              <p className="text-sm mt-2 text-gray-600">Create a new project above to get started!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;