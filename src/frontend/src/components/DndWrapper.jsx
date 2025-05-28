import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

/**
 * A wrapper component that provides DnD functionality
 * This isolation can help prevent React 19 compatibility issues
 */
export default function DndWrapper({ children }) {
  try {
    // Attempt to render with DndProvider
    return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
  } catch (error) {
    // Fallback to just rendering children without DnD functionality
    console.error('Failed to initialize drag and drop:', error);
    return <>{children}</>;
  }
} 