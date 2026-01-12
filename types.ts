export interface Project {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  viewedAt: string;
  authorName: string;
  authorAvatar: string;
  category: 'mine' | 'shared' | 'template';
  code?: string; // The generated HTML code for the project
  chatHistory?: ChatMessage[];
}

export enum Tab {
  RECENTLY_VIEWED = 'Recently viewed',
  MY_PROJECTS = 'My projects',
  SHARED_WITH_ME = 'Shared with me',
  TEMPLATES = 'Templates'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}