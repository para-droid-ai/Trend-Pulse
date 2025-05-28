import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { topicStreamAPI } from '../services/api';
import TopicStreamForm from '../components/TopicStreamForm';
import TopicStreamWidget from '../components/TopicStreamWidget';
import { format, parseISO } from 'date-fns';
import MarkdownRenderer from '../components/MarkdownRenderer';
import DeepDiveChat from '../components/DeepDiveChat';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import ThemeSelector from '../components/ThemeSelector';
import StreamSidebar from '../components/StreamSidebar';
import StreamLoadingOverlay from '../components/StreamLoadingOverlay';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { toggleDarkMode } = useTheme();
  const [topicStreams, setTopicStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('trendpulse-view-mode') || 'grid');
  const [summaries, setSummaries] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [newlyCreatedStreamId, setNewlyCreatedStreamId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStream, setSelectedStream] = useState(null);
  
  // Additional state variables
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showThemeSelectorModal, setShowThemeSelectorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [creatingStream, setCreatingStream] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationMessage, setCreationMessage] = useState('');
  const [isMacOs, setIsMacOs] = useState(false);
  
  // Simplified drag state variables without DnD
  const [draggedStreamId, setDraggedStreamId] = useState(null);
  const [dragOverStreamId, setDragOverStreamId] = useState(null);
  const [dragInsertionIndex, setDragInsertionIndex] = useState(null);

  // Add ref for stream scrolling
  const streamRefs = useRef({});

  // Function to scroll to a specific stream
  const scrollToStream = (streamId) => {
    const streamElement = streamRefs.current[streamId];
    if (streamElement) {
      streamElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Handle stream selection from sidebar
  const handleStreamSelect = useCallback((stream) => {
    setSelectedStream(stream);
    setTimeout(() => {
      scrollToStream(stream.id);
    }, 100);
  }, []);

  // Helper function for intuitive view mode switching (Apple-style UX)
  const changeViewMode = (newMode) => {
    // If form is open, close it when switching views for intuitive UX
    if (showForm) {
      setShowForm(false);
      // Optional: Could add a subtle toast notification here for user feedback
      // but Apple design philosophy prefers invisible, predictable interactions
    }
    setViewMode(newMode);
  };
  
  // Keyboard shortcuts for power users
  useKeyboardShortcuts([
    {
      key: 'cmd+alt+n',
      action: () => setShowForm(true),
      description: 'Create new stream'
    },
    {
      key: 'cmd+1', 
      action: () => changeViewMode('list'),
      description: 'Switch to list view'
    },
    {
      key: 'cmd+2',
      action: () => changeViewMode('grid'), 
      description: 'Switch to grid view'
    },
    {
      key: 'cmd+3',
      action: () => changeViewMode('mobile'),
      description: 'Switch to feed view'
    },
    {
      key: 'cmd+r',
      action: () => fetchTopicStreams(),
      description: 'Refresh streams'
    },
    {
      key: 'cmd+alt+t',
      action: () => setShowThemeSelectorModal(true),
      description: 'Open theme selector'
    },
    {
      key: 'cmd+b',
      action: () => setSidebarOpen(!sidebarOpen),
      description: 'Toggle sidebar'
    },
    {
      key: 'escape',
      action: () => {
        if (showForm) setShowForm(false);
        if (showDeepDive) {
          setShowDeepDive(false);
          setSelectedSummary(null);
        }
        if (showKeyboardHelp) setShowKeyboardHelp(false);
        if (error) clearError();
        if (sidebarOpen) setSidebarOpen(false);
      },
      description: 'Close modals/forms'
    },
    {
      key: 'cmd+?',
      action: () => setShowKeyboardHelp(true),
      description: 'Show keyboard shortcuts'
    },
    {
      key: 'cmd+/',
      action: () => setShowKeyboardHelp(true),
      description: 'Show keyboard shortcuts'
    }
  ]);

  // Effect to detect OS for dynamic tooltips
  useEffect(() => {
    setIsMacOs(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  // Fetch summaries from all streams and combine them
  const fetchAllSummaries = useCallback(async () => {
    if (topicStreams.length === 0) return;
    
    setLoadingSummaries(true);
    
    try {
      // Fetch summaries for each stream
      const summariesPromises = topicStreams.map(stream => 
        // Add a check here to ensure the stream object is valid and has an id
        stream && stream.id ? 
        topicStreamAPI.getSummaries(stream.id)
          .then(summaries => summaries.map(summary => ({
            ...summary,
            streamQuery: stream.query,
            streamId: stream.id,
            detail_level: stream.detail_level,
            // Ensure we have a valid date for sorting
            created_at: summary.created_at || new Date().toISOString()
          })))
        .catch(err => {
          console.error(`Failed to fetch summaries for stream ${stream.id}:`, err);
          // Return an empty array for this stream if fetching fails
          return [];
        })
        : Promise.resolve([]) // If stream is invalid, resolve with an empty array
      );
      
      const results = await Promise.all(summariesPromises);
      
      // Flatten the array of arrays and sort by created_at (newest first)
      const combinedSummaries = results
        .flat()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setSummaries(combinedSummaries);
    } catch (err) {
      console.error('Failed to fetch all summaries:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoadingSummaries(false);
    }
  }, [topicStreams]);

  // Save the stream order to localStorage
  const saveStreamOrder = (streams) => {
    try {
      const orderMap = streams.reduce((acc, stream, index) => {
        acc[stream.id] = index;
        return acc;
      }, {});
      localStorage.setItem('streamOrder', JSON.stringify(orderMap));
    } catch (err) {
      console.error('Failed to save stream order:', err);
    }
  };

  // Load ordered streams based on saved order (now used as secondary sort)
  const getOrderedStreams = (streams, currentSortMode, currentSortDirection) => {
    try {
      const savedOrder = localStorage.getItem('streamOrder');
      const orderMap = savedOrder ? JSON.parse(savedOrder) : {};

      // Create a copy of streams to sort
      return [...streams].sort((a, b) => {
        // Get timestamps or default to epoch for consistent sorting
        const dateA = a.last_updated ? new Date(a.last_updated) : new Date(0);
        const dateB = b.last_updated ? new Date(b.last_updated) : new Date(0);

        // Get manual order indices or default to Infinity
        const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : Infinity;
        const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : Infinity;

        if (currentSortMode === 'last_updated') {
          // Primary sort by last_updated
          let primarySortResult = 0;
          if (currentSortDirection === 'desc') {
              primarySortResult = dateB.getTime() - dateA.getTime();
          } else {
              primarySortResult = dateA.getTime() - dateB.getTime();
          }

          // Secondary sort by manual order if last_updated is the same
          if (primarySortResult === 0) {
              return orderA - orderB; // Always sort manual order ascending within same update time
          }
          return primarySortResult;

        } else { // 'manual' sort mode
          // Primary sort by manual order
          const manualSortResult = orderA - orderB;

          // Secondary sort by last_updated descending if manual order is the same (or both don't have manual order)
          if (manualSortResult === 0) {
             return dateB.getTime() - dateA.getTime(); // Newest first as secondary
          }
          return manualSortResult;
        }
      });
    } catch (err) {
      console.error('Failed to load stream order for sorting:', err);
      // Fallback to sorting only by last_updated descending if localStorage fails
       return [...streams].sort((a, b) => {
           const dateA = a.last_updated ? new Date(a.last_updated) : new Date(0);
           const dateB = b.last_updated ? new Date(b.last_updated) : new Date(0);
           return dateB.getTime() - dateA.getTime(); // Default to newest first
       });
    }
  };

  const fetchTopicStreams = useCallback(async () => {
    setLoading(true);
    setError('');
    console.log("Fetching topic streams...");
    try {
      const data = await topicStreamAPI.getAll();
      console.log("Received data from API:", data);
      if (!Array.isArray(data)) {
          console.error("API did not return an array for topic streams:", data);
          throw new Error("Invalid data format received from API.");
      }
      console.log(`Setting ${data.length} topic streams.`);
      // Apply sorting based on the current sort mode and direction
      const orderedStreams = getOrderedStreams(data, 'last_updated', 'desc');
      // Filter out any potentially invalid stream objects before setting state
      const validStreams = orderedStreams.filter(stream => stream && stream.id !== undefined && stream.id !== null);

      // Get the IDs of the valid streams received from the backend
      const validStreamIds = new Set(validStreams.map(stream => stream.id));
      // Get the IDs from the current localStorage order
      const savedOrder = localStorage.getItem('streamOrder');
      if (savedOrder) {
        try {
          const orderMap = JSON.parse(savedOrder);
          const savedOrderIds = Object.keys(orderMap).map(id => parseInt(id, 10));
          // Check if any ID in localStorage order is NOT in the valid streams list
          const hasStaleIds = savedOrderIds.some(id => !validStreamIds.has(id));

          if (hasStaleIds) {
            console.log("Detected stale stream IDs in localStorage order. Clearing streamOrder.");
            localStorage.removeItem('streamOrder');
            // Re-fetch and re-order based on the now-cleared localStorage (will just use backend order)
            const reOrderedStreams = getOrderedStreams(data, 'last_updated', 'desc');
            // Add an explicit filter to remove known problematic stream IDs (1, 2, 11)
            const finalStreams = reOrderedStreams.filter(stream => ![1, 2, 11].includes(stream.id));
            setTopicStreams(finalStreams);
             if (finalStreams.length > 0 && !selectedStream) {
              console.log("Attempting to select first stream after clearing localStorage:", finalStreams[0]);
              setSelectedStream(finalStreams[0]);
              console.log("First stream selected after clearing localStorage.");
            }
            return; // Exit the function after clearing and setting
          }
        } catch (e) {
          console.error("Failed to parse streamOrder from localStorage:", e);
          // If parsing fails, treat it as stale and clear
          localStorage.removeItem('streamOrder');
        }
      }

      // If no stale IDs or no saved order, just set the valid streams
      // Add an explicit filter to remove known problematic stream IDs (1, 2, 11)
      const finalStreams = validStreams.filter(stream => ![1, 2, 11].includes(stream.id));
      setTopicStreams(finalStreams);
      if (finalStreams.length > 0 && !selectedStream) {
        console.log("Attempting to select first stream:", finalStreams[0]);
        setSelectedStream(finalStreams[0]);
        console.log("First stream selected.");
      } else {
          console.log("No streams to select or stream already selected.");
      }
      console.log("fetchTopicStreams completed successfully.");
    } catch (err) {
      console.error("Error during fetchTopicStreams try block:", err);
      setError('Failed to load topic streams. Please try again.'); 
    } finally {
      setLoading(false);
      console.log("fetchTopicStreams finished.");
    }
  }, [selectedStream]);

  // Refresh summaries when a new stream is created, updated, or deleted
  const refreshSummaries = useCallback(() => {
    if (viewMode === 'mobile') {
      fetchAllSummaries();
    }
  }, [viewMode, fetchAllSummaries]);

  useEffect(() => {
    fetchTopicStreams();
  }, [fetchTopicStreams]);

  // Ensure currentMobileIndex is valid when topicStreams changes
  useEffect(() => {
    if (topicStreams.length > 0 && currentMobileIndex >= topicStreams.length) {
      setCurrentMobileIndex(0);
    }
    
    // Only fetch all summaries if mobile view is active and summaries are not yet loaded
    if (viewMode === 'mobile' && topicStreams.length > 0 && summaries.length === 0) {
      fetchAllSummaries();
    }
  }, [topicStreams, currentMobileIndex, fetchAllSummaries, summaries.length, viewMode]);

  const handleCreateStream = useCallback(async (newStream) => {
    setCreatingStream(true);
    setCreationProgress(0);
    setCreationMessage('Initializing stream creation...');
    
    // Array of 40 creative loading messages
    const loadingMessages = [
      'Awakening AI consciousness for your topic...',
      'Sprinkling digital fairy dust on data streams...',
      'Teaching neural networks to dream about your content...',
      'Consulting the oracle of infinite knowledge...',
      'Weaving threads of wisdom into your stream...',
      'Summoning the data spirits from the cloud realm...',
      'Crafting algorithmic poetry from raw information...',
      'Unleashing cyber-hounds to hunt for insights...',
      'Building bridges across the information multiverse...',
      'Distilling essence of knowledge into liquid insights...',
      'Conducting symphony of synchronized data flows...',
      'Painting masterpieces with pixels of information...',
      'Brewing the perfect blend of AI and intuition...',
      'Launching nano-bots to explore content galaxies...',
      'Crystallizing thoughts into streams of pure data...',
      'Choreographing a ballet of bits and bytes...',
      'Harvesting wisdom from the digital wilderness...',
      'Forging neural pathways through information space...',
      'Decoding the DNA of your chosen topic...',
      'Assembling constellations of connected concepts...',
      'Tuning quantum frequencies to your interests...',
      'Sculpting information architecture from digital clay...',
      'Pollinating ideas across the knowledge ecosystem...',
      'Engineering serendipity into your content stream...',
      'Translating chaos into beautiful data symphonies...',
      'Cultivating gardens of curated intelligence...',
      'Spinning silk threads of semantic connections...',
      'Architecting castles in the cloud of knowledge...',
      'Brewing potions of personalized insights...',
      'Calibrating telescopes to peer into data futures...',
      'Weaving magic carpets of contextual understanding...',
      'Planting seeds in the fertile soil of information...',
      'Conducting archaeological digs through data layers...',
      'Harmonizing melodies of machine learning magic...',
      'Crystallizing liquid intelligence into solid streams...',
      'Commissioning artists to paint with pure data...',
      'Training digital butterflies to pollinate insights...',
      'Constructing lighthouses to guide content discovery...',
      'Summoning genies from the lamp of limitless learning...',
      'Finalizing the symphony of your personalized stream...'
    ];
    
    let currentProgress = 0;
    let isCompleted = false;
    let currentMessageIndex = 0;
    
    // Function to update progress smoothly over 35 seconds
    const updateProgress = () => {
      if (isCompleted) return;
      
      // Increment progress by small amounts to reach 95% over ~33 seconds
      const progressIncrement = 95 / (35 * 1000 / 200); // 200ms intervals
      currentProgress = Math.min(currentProgress + progressIncrement, 95);
      setCreationProgress(currentProgress);
      
      // Don't complete the progress bar until the API call is done
      if (currentProgress < 95) {
        setTimeout(updateProgress, 200);
      }
    };
    
    // Function to cycle through random messages every 2-3 seconds
    const updateMessage = () => {
      if (isCompleted) return;
      
      currentMessageIndex = Math.floor(Math.random() * loadingMessages.length);
      setCreationMessage(loadingMessages[currentMessageIndex]);
      
      // Random interval between 2-4 seconds
      const nextInterval = 2000 + Math.random() * 2000;
      setTimeout(updateMessage, nextInterval);
    };
    
    // Start progress and message updates
    updateProgress();
    updateMessage();

    try {
      const createdStream = await topicStreamAPI.create(newStream);
      
      // Mark as completed and finish the progress bar quickly
      isCompleted = true;
      setCreationMessage('Success! Stream created and first summary generated.');
      
      // Complete the progress bar quickly if it's not already at 100%
      const finishProgress = () => {
        setCreationProgress(prev => {
          if (prev >= 100) return 100;
          const newProgress = Math.min(prev + 5, 100);
          if (newProgress < 100) {
            setTimeout(finishProgress, 50);
          }
          return newProgress;
        });
      };
      finishProgress();
      
      // Wait a moment to show success message
      setTimeout(() => {
        setTopicStreams(prevStreams => [createdStream, ...prevStreams]);
        setSelectedStream(createdStream);
        setShowForm(false);
        setCreatingStream(false);
        setCreationProgress(0);
        setCreationMessage('');
        refreshSummaries();
      }, 1500);

    } catch (error) {
      console.error('Error creating stream:', error);
      isCompleted = true;
      setCreatingStream(false);
      setCreationProgress(0);
      setCreationMessage('');
      setError('Failed to create stream. Please try again.');
    }
  }, [refreshSummaries]);

  const handleDeleteStream = useCallback(async (id) => {
    console.log('🎯 Dashboard handleDeleteStream called with ID:', id);
    setError('');
    try {
      console.log('🌐 Making API call to delete stream:', id);
      await topicStreamAPI.delete(id);
      console.log('✅ API call successful, updating state');
      const updatedStreams = topicStreams.filter(stream => stream.id !== id);
      setTopicStreams(updatedStreams);
      
      if (selectedStream?.id === id) {
        setSelectedStream(updatedStreams.length > 0 ? updatedStreams[0] : null);
      }
      
      // Update summaries by removing ones from the deleted stream
      setSummaries(prev => prev.filter(summary => summary.streamId !== id));
      console.log('🎉 Stream delete complete');
    } catch (err) {
      console.error('❌ Delete stream failed:', err);
      setError(`Failed to delete topic stream: ${err.response?.data?.detail || 'Unknown error'}`);
      console.error(err);
    }
  }, [topicStreams, selectedStream]);

  const handleUpdateStream = useCallback(async (id, updatedData) => {
    try {
      const updatedApiStream = await topicStreamAPI.update(id, updatedData);
      setTopicStreams(prevStreams => 
        prevStreams.map(stream => 
          stream.id === id ? updatedApiStream : stream
        )
      );
      if (selectedStream?.id === id) {
        setSelectedStream(updatedApiStream);
      }
      refreshSummaries();
      return updatedApiStream; 
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to update topic stream.';
      console.error('Update stream error in Dashboard:', err);
      setError(errorMsg);
      throw err; 
    }
  }, [selectedStream, refreshSummaries]);

  const handleUpdateNow = useCallback(async (id) => {
    try {
      console.log(`Calling update-now API for stream ${id}`);
      const newSummary = await topicStreamAPI.updateNow(id);
      console.log(`Update-now API successful for stream ${id}`);
      
      if (newSummary.content && newSummary.content.includes("No new information is available")) {
        setError('No new information is available since the last update.');
      } else {
        setSummaries(prev => [
          {
            ...newSummary,
            streamQuery: topicStreams.find(s => s.id === id)?.query || '', 
            streamId: id,
          },
          ...prev
        ]);
      }
      
      const updatedStream = await topicStreamAPI.getById(id);

      setTopicStreams(prevStreams => {
          const streamsCopy = [...prevStreams];
          const streamIndex = streamsCopy.findIndex(s => s.id === id);
          if (streamIndex > -1) {
              streamsCopy[streamIndex] = updatedStream;
          }
          const sortedStreams = getOrderedStreams(streamsCopy, 'last_updated', 'desc');
          return sortedStreams.filter(stream => ![1, 2, 11].includes(stream.id));
      });

      return newSummary; 

    } catch (err) {
      console.error(`Update now error for ID ${id}:`, err);
      if (err.response) {
        setError(err.response.data?.detail || err.message || 'Failed to update stream. Please try again.');
      } else {
        setError(err.message || 'Failed to update stream. Please try again.');
      }
      throw err;
    }
  }, [topicStreams]);

  // Simplified drag-and-drop functions - still using HTML5 native drag and drop
  const handleDragStart = useCallback((e, streamId) => {
    setDraggedStreamId(streamId);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  }, []);

  const handleDragEnd = (e) => {
    setDraggedStreamId(null);
    setDragOverStreamId(null);
    setDragInsertionIndex(null);
    e.target.style.opacity = '1';
  };

  const handleDragOver = (e, streamId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (streamId !== draggedStreamId) {
      const streams = getOrderedStreams(topicStreams, 'manual', 'asc');
      const targetIndex = streams.findIndex(stream => stream.id === streamId);
      
      // Calculate mouse position relative to the target element
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseY = e.clientY;
      const elementMiddle = rect.top + rect.height / 2;
      
      // Determine insertion index based on mouse position
      let insertionIndex;
      if (mouseY < elementMiddle) {
        // Insert before target
        insertionIndex = targetIndex;
      } else {
        // Insert after target
        insertionIndex = targetIndex + 1;
      }
      
      setDragOverStreamId(streamId);
      setDragInsertionIndex(insertionIndex);
    }
  };

  // Enhanced container drag over that calculates position based on mouse Y coordinate
  const handleContainerDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedStreamId) {
      const streams = getOrderedStreams(topicStreams, 'manual', 'asc');
      const container = e.currentTarget;
      const containerRect = container.getBoundingClientRect();
      const mouseY = e.clientY;
      
      // Get all stream elements to calculate their positions
      const streamElements = container.querySelectorAll('[data-stream-id]');
      let insertionIndex = streams.length; // Default to end
      
      // Find the correct insertion point based on mouse position
      for (let i = 0; i < streamElements.length; i++) {
        const element = streamElements[i];
        const elementRect = element.getBoundingClientRect();
        const elementTop = elementRect.top;
        const elementMiddle = elementTop + elementRect.height / 2;
        
        if (mouseY < elementTop) {
          // Mouse is above this element, insert before it
          insertionIndex = i;
          break;
        } else if (mouseY < elementMiddle) {
          // Mouse is in the upper half of this element, insert before it
          insertionIndex = i;
          break;
        } else if (mouseY < elementRect.bottom) {
          // Mouse is in the lower half of this element, insert after it
          insertionIndex = i + 1;
          break;
        }
      }
      
      // Special case: if mouse is above the first element or container is empty
      if (streamElements.length > 0) {
        const firstElementRect = streamElements[0].getBoundingClientRect();
        if (mouseY < firstElementRect.top) {
          insertionIndex = 0;
        }
      }
      
      setDragInsertionIndex(insertionIndex);
      setDragOverStreamId(null);
    }
  };

  const handleDrop = (e, targetStreamId) => {
    e.preventDefault();
    if (draggedStreamId && dragInsertionIndex !== null) {
      // Reorder the streams based on insertion index
      const streams = getOrderedStreams(topicStreams, 'manual', 'asc');
      const draggedStreamIndex = streams.findIndex(stream => stream.id === draggedStreamId);
      
      if (draggedStreamIndex !== -1) {
        const newTopicStreams = [...streams];
      const [draggedStream] = newTopicStreams.splice(draggedStreamIndex, 1);
        
        // Adjust insertion index if removing item from before the insertion point
        let finalInsertionIndex = dragInsertionIndex;
        if (draggedStreamIndex < dragInsertionIndex) {
          finalInsertionIndex--;
        }
        
        newTopicStreams.splice(finalInsertionIndex, 0, draggedStream);
      
      setTopicStreams(newTopicStreams);
      // Save the new order to localStorage
      saveStreamOrder(newTopicStreams);
      }
    }
    setDraggedStreamId(null);
    setDragOverStreamId(null);
    setDragInsertionIndex(null);
  };

  // Simplified container drop that uses the calculated insertion index
  const handleContainerDrop = (e) => {
    e.preventDefault();
    if (draggedStreamId && dragInsertionIndex !== null) {
      const streams = getOrderedStreams(topicStreams, 'manual', 'asc');
      const draggedStreamIndex = streams.findIndex(stream => stream.id === draggedStreamId);
      
      if (draggedStreamIndex !== -1) {
        const newTopicStreams = [...streams];
        const [draggedStream] = newTopicStreams.splice(draggedStreamIndex, 1);
        
        // Adjust insertion index if removing item from before the insertion point
        let finalInsertionIndex = dragInsertionIndex;
        if (draggedStreamIndex < dragInsertionIndex) {
          finalInsertionIndex--;
        }
        
        newTopicStreams.splice(finalInsertionIndex, 0, draggedStream);
        
        setTopicStreams(newTopicStreams);
        saveStreamOrder(newTopicStreams);
      }
    }
    setDraggedStreamId(null);
    setDragOverStreamId(null);
    setDragInsertionIndex(null);
  };

  // Render a single summary item for the mobile feed
  const renderSummaryItem = (summary) => {
    return (
      <div key={summary.id} className="p-3 mb-4 border rounded-lg shadow-sm bg-card border-border">
        {/* Summary Header */}
        <div className="border-b border-border sticky top-[69px] bg-card z-10 pb-3">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-foreground line-clamp-2 max-w-[80%] Camino text-ellipsis overflow-hidden" title={summary.streamQuery}>{summary.streamQuery}</h3>
            {/* Combine Timestamp and Deep Dive button in a right-aligned container */}
            <div className="flex flex-col items-end flex-shrink-0">
              {/* Time Since Last Update tag */}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-black dark:text-white font-medium">
                {summary.created_at ? format(parseISO(summary.created_at), 'MMM d, yyyy h:mm a') : ''}
              </span>
              {/* Deep Dive Chat button */}
              <button
                onClick={() => {
                  setShowDeepDive(true);
                  setSelectedSummary(summary);
                }}
                className="text-xs text-white px-2 py-1 rounded-full mt-1 bg-[#2ccebb] hover:opacity-90"
              >
                Deep Dive Chat
              </button>
            </div>
          </div>
          
          {/* Stream Actions and additional info badges - Now on the same line */}
          <div className="flex flex-wrap items-center gap-2">
             {/* Model Badge */}
             {summary.model && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-100 bg-[#4f46e5]">
                {summary.model}
              </span>
            )}
             {/* Detail Level Badge - use stream's detail level */}
             {summary.detail_level && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-100 bg-[#6366f1]">
                {summary.detail_level}
              </span>
            )}

            {/* Update and View All buttons - Moved here */}
            {/* Update button */}
            <button
              onClick={() => {
                const stream = topicStreams.find(s => s.id === summary.streamId);
                if (stream) handleUpdateNow(stream.id);
              }}
              className="px-2 py-1 text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Update
            </button>

            {/* View All button */}
            <button
              onClick={() => {
                const streamIndex = topicStreams.findIndex(s => s.id === summary.streamId);
                if (streamIndex >= 0) {
                  changeViewMode('list');
                  setSelectedStream(topicStreams[streamIndex]);
                }
              }}
              className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
            >
              View All
            </button>
          </div>
        </div>
        
        {/* Summary Content */}
        <div className="p-4 pt-2">
          {/* Thoughts (experimental) section */}
          {summary.thoughts && (
            <div className="mb-4 p-3 rounded-md bg-muted dark:bg-[#4b4a49]">
              <div className="mb-2 text-sm font-medium text-muted-foreground">
                Thoughts (experimental)
              </div>
              <div className="prose-sm prose max-w-none dark:prose-invert">
                <MarkdownRenderer content={summary.thoughts} sources={summary.sources} />
              </div>
            </div>
          )}
          <div className="prose-sm prose max-w-none dark:prose-invert">
            <MarkdownRenderer content={summary.content || ''} sources={summary.sources} />
          </div>
        </div>
        
        {/* Summary Sources */}
        {summary.sources && summary.sources.length > 0 && (
          <div className="px-4 pb-4">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Sources:</div>
            <div className="flex flex-wrap gap-1">
              {summary.sources.map((source, index) => (
                <a
                  key={index}
                  href={typeof source === 'string' ? source : source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground bg-muted hover:bg-muted/80 px-2 py-1 rounded-full truncate max-w-[200px]"
                  title={typeof source === 'string' ? source : (source.url || source)}
                >
                  {typeof source === 'string' 
                    ? source 
                    : (source.name || source.url || source)}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const clearError = () => {
    setError('');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Stream Sidebar */}
      <StreamSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        streams={getOrderedStreams(topicStreams, 'manual', 'asc')}
        selectedStream={selectedStream}
        onSelectStream={handleStreamSelect}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onContainerDragOver={handleContainerDragOver}
        onContainerDrop={handleContainerDrop}
        draggedStreamId={draggedStreamId}
        dragOverStreamId={dragOverStreamId}
        dragInsertionIndex={dragInsertionIndex}
        onCreateNew={() => setShowForm(true)}
        onDeleteStream={handleDeleteStream}
        onUpdateNow={handleUpdateNow}
      />
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-h-screen overflow-x-hidden">
        {/* Enhanced Header */}
        <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left side with sidebar toggle and Logo */}
              <div className="flex items-center space-x-3">
                {/* Sidebar Toggle Button */}
              <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 transition-all duration-200 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-105 active:scale-95"
                  title={isMacOs ? 'Toggle Sidebar (⌘B)' : 'Toggle Sidebar (Ctrl+B)'}
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
                
                {/* Logo and Title */}
                <div 
                  className="flex items-center space-x-3 cursor-pointer group"
                  onClick={() => window.location.href = '/'}
                >
                  <img 
                    src="/trendpulse_logo_1.svg" 
                    alt="TrendPulse" 
                    className="w-8 h-8 transition-transform group-hover:scale-105" 
                  />
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">
                      TrendPulse
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Welcome back, {user?.email}
                    </p>
            </div>
                </div>
              </div>

              {/* Center Controls */}
              <div className="flex items-center space-x-6">
                {/* 3-Position View Mode Slider */}
                <div className="relative flex items-center p-1 border rounded-lg bg-muted/50 view-mode-slider">
                  {/* Sliding background indicator */}
                  <div 
                    className="absolute rounded-md shadow-sm top-1 bottom-1 bg-primary view-mode-slider-indicator"
                    style={{
                      width: '32%',
                      left: viewMode === 'list' ? '2%' : viewMode === 'grid' ? '34%' : '66%'
                    }}
                  />
                  
                  {/* List View */}
            <button
                    onClick={() => changeViewMode('list')}
                    className={`relative z-10 px-3 py-1.5 text-xs font-medium rounded-md flex items-center space-x-1.5 view-mode-button ${
                      viewMode === 'list' 
                        ? 'text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="List View"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12h11M9 6h11M9 18h11M5 12h.01M5 6h.01M5 18h.01"/>
                    </svg>
                    <span className="hidden sm:inline">List</span>
            </button>
                  
                  {/* Grid View */}
            <button
                    onClick={() => changeViewMode('grid')}
                    className={`relative z-10 px-3 py-1.5 text-xs font-medium rounded-md flex items-center space-x-1.5 view-mode-button ${
                      viewMode === 'grid' 
                        ? 'text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Grid View"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                    </svg>
                    <span className="hidden sm:inline">Grid</span>
            </button>

                  {/* Mobile/Feed View */}
            <button 
                    onClick={() => changeViewMode('mobile')}
                    className={`relative z-10 px-3 py-1.5 text-xs font-medium rounded-md flex items-center space-x-1.5 view-mode-button ${
                      viewMode === 'mobile' 
                        ? 'text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Feed View"
            >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
                      <path d="M9 22V12h6v10"/>
                    </svg>
                    <span className="hidden sm:inline">Feed</span>
            </button>
          </div>
        </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-3">
                {/* Theme Selector */}
                <ThemeSelector 
                  isOpen={showThemeSelectorModal} 
                  onClose={() => setShowThemeSelectorModal(false)}
                  onToggleRequest={() => setShowThemeSelectorModal(prev => !prev)}
                />

                {/* Keyboard shortcuts button */}
              <button 
                  onClick={() => setShowKeyboardHelp(true)}
                  className="p-2 transition-all duration-200 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-105 active:scale-95"
                  title={isMacOs ? 'Keyboard Shortcuts (⌘?)' : 'Keyboard Shortcuts (Ctrl+?)'}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
              </button>

                {/* Sign out button */}
                <button 
                  onClick={logout}
                  className="px-4 py-2 transition-all duration-200 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 active:scale-95"
                >
                  Sign Out
                </button>
                  </div>
                </div>
                  </div>

          {/* Progress indicator for loading states */}
          {loading && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-muted overflow-hidden">
              <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
                </div>
          )}
        </header>

        {/* Main Content */}
        <main 
          className="flex-1 px-4 py-8 overflow-x-hidden overflow-y-auto sm:px-6 lg:px-8"
        >
          {/* Error Display with enhanced design */}
          {error && (
            <div className="flex items-start p-4 mb-6 space-x-3 duration-300 border rounded-lg bg-destructive/10 border-destructive/20 animate-in slide-in-from-top-2">
              <svg className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{error}</p>
                    </div>
                    <button
              onClick={clearError}
              className="p-1 transition-colors rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                  >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
                  </button>
                </div>
          )}
                    
          {/* Success Display with Apple-style design */}
          {successMessage && (
            <div className="flex items-start p-4 mb-6 space-x-3 duration-300 border border-green-200 rounded-lg bg-green-50 dark:bg-green-950/30 dark:border-green-800/30 animate-in slide-in-from-top-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">{successMessage}</p>
                      </div>
                      <button
              onClick={() => setSuccessMessage('')}
              className="p-1 transition-colors rounded-md text-green-600/60 hover:text-green-600 dark:text-green-400/60 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                      >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
                      </button>
                    </div>
                    )}

          {/* Create Stream Form */}
          {showForm && (
            <div className="relative mb-8 overflow-hidden duration-300 border shadow-sm bg-card border-border rounded-xl animate-in slide-in-from-top-2">
              {!creatingStream ? (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-foreground">Create New Topic Stream</h2>
                    <button
                      onClick={() => setShowForm(false)}
                      className="p-2 transition-colors rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <TopicStreamForm 
                    onSubmit={handleCreateStream}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              ) : (
                <div className="relative min-h-[500px]">
                  <StreamLoadingOverlay 
                    message={creationMessage}
                    subMessage="This may take a few moments as we set up your personalized AI search"
                    progress={creationProgress}
                    isModal={true}
                  />
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-muted/50 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Content based on view mode */}
              {viewMode === 'mobile' ? (
                <div 
                  key={`mobile-view-${viewMode}`} 
                  className="w-full max-w-full overflow-x-hidden mobile-feed-view"
                >
                  {summaries.length > 0 ? (
                    <div className="w-full max-w-full space-y-6">
                      {summaries.map((summary) => renderSummaryItem(summary))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {loadingSummaries ? (
                        [1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse bg-card rounded-xl p-4 border min-h-[200px]">
                            <div className="flex space-x-3">
                              <div className="w-10 h-10 rounded-full bg-muted"></div>
                              <div className="flex-1 space-y-2">
                                <div className="w-3/4 h-4 rounded bg-muted"></div>
                                <div className="w-1/2 h-3 rounded bg-muted"></div>
                                <div className="w-2/3 h-3 rounded bg-muted"></div>
                              </div>
                            </div>
                            <div className="mt-4 space-y-2">
                              <div className="w-full h-3 rounded bg-muted"></div>
                              <div className="w-5/6 h-3 rounded bg-muted"></div>
                              <div className="w-4/5 h-3 rounded bg-muted"></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center">
                          <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z"/>
                          </svg>
                          <p className="text-muted-foreground">No summaries available yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  key={`${viewMode}-view-${topicStreams.length}`} 
                  className="w-full max-w-full overflow-x-hidden streams-view"
                >
                  {topicStreams.length === 0 ? (
                    <div className="py-16 text-center">
                      <svg className="w-16 h-16 mx-auto mb-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z"/>
                      </svg>
                      <h3 className="mb-2 text-xl font-semibold text-foreground">No Topic Streams Yet</h3>
                      <p className="mb-6 text-muted-foreground">Create your first topic stream to start tracking trends</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center px-6 py-3 space-x-2 font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 hover-lift"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                        <span>Create First Stream</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {viewMode === 'grid' && (
                        <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
                          {getOrderedStreams(topicStreams, 'manual', 'asc').map((stream) => (
                            <div
                              key={stream.id}
                              ref={el => streamRefs.current[stream.id] = el}
                              className={`transition-all duration-300 ${
                                selectedStream?.id === stream.id
                                  ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                                  : ''
                              } w-full`}
                            >
                              <TopicStreamWidget stream={stream} onDelete={handleDeleteStream} onUpdate={handleUpdateStream} isGridView={true} onDragStart={(e) => handleDragStart(e, stream.id)} onDragEnd={handleDragEnd} onDragOver={(e) => handleDragOver(e, stream.id)} onDrop={(e) => handleDrop(e, stream.id)} isDraggedOver={dragOverStreamId === stream.id} isDragging={draggedStreamId === stream.id} isNewlyCreated={newlyCreatedStreamId === stream.id} isSelected={selectedStream?.id === stream.id} />
                            </div>
                          ))}
                        </div>
                      )}
                      {viewMode === 'list' && (
                        <div className={'space-y-6'}>
                          {selectedStream ? (
                            <div
                              key={selectedStream.id}
                              ref={el => streamRefs.current[selectedStream.id] = el}
                              className={`transition-all duration-300 w-full`}
                            >
                              <TopicStreamWidget stream={selectedStream} onDelete={handleDeleteStream} onUpdate={handleUpdateStream} isGridView={false} onDragStart={(e) => handleDragStart(e, selectedStream.id)} onDragEnd={handleDragEnd} onDragOver={(e) => handleDragOver(e, selectedStream.id)} onDrop={(e) => handleDrop(e, selectedStream.id)} isDraggedOver={dragOverStreamId === selectedStream.id} isDragging={draggedStreamId === selectedStream.id} isNewlyCreated={newlyCreatedStreamId === selectedStream.id} isSelected={true} />
                            </div>
                          ) : (
                            <div className="py-16 text-center text-muted-foreground">
                              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                              Select a stream from the sidebar to view its content.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Deep Dive Chat Modal */}
          {showDeepDive && selectedSummary && (
            <div 
              className="fixed duration-300 bg-black/50 backdrop-blur-sm animate-in fade-in"
              style={{ 
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
              }}
              onClick={() => {
                setShowDeepDive(false);
                setSelectedSummary(null);
              }}
              >
              <div 
                className="duration-300 shadow-xl bg-card rounded-xl animate-in slide-in-from-bottom-4"
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '80vh',
                  maxWidth: '64rem',
                  maxHeight: '90vh',
                  margin: '0',
                  overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
              >
                 <DeepDiveChat 
                  summary={selectedSummary}
                  onClose={() => {
                    setShowDeepDive(false);
                    setSelectedSummary(null);
                  }}
                  />
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Help Modal */}
          {showKeyboardHelp && (
            <KeyboardShortcutsHelp
              isOpen={showKeyboardHelp}
              onClose={() => setShowKeyboardHelp(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;