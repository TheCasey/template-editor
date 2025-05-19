import React, { useRef, useState, useEffect, ChangeEvent } from 'react';
import { componentStore, ComponentType, ComponentMetadata } from '../utils/ComponentStore';
import ComponentModal from './ComponentModal';
import FillTemplateModal from './FillTemplateModal';

// Define the template data structure for export/import
interface TemplateData {
  version: string;
  content: string;
  components: ComponentMetadata[];
}

const TemplateEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [components, setComponents] = useState<ComponentMetadata[]>([]);
  const [hasContent, setHasContent] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentMetadata | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [fillModalOpen, setFillModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Clear error message after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);
  
  // Handle focus on editor when clicking outside of components
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If clicked inside the editor but not on a component, focus the editor
      if (editorRef.current?.contains(target) && !target.hasAttribute('data-component') && !isLocked) {
        editorRef.current.focus();
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isLocked]);

  // Check for content in the editor to hide/show placeholder
  useEffect(() => {
    const checkContent = () => {
      if (editorRef.current) {
        // Check if the editor has any content
        const hasText = editorRef.current.textContent ? editorRef.current.textContent.trim().length > 0 : false;
        const hasElements = editorRef.current.childElementCount > 0;
        setHasContent(hasText || hasElements);
      }
    };
    
    // Check initially
    checkContent();
    
    // Add event listeners to detect content changes
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('input', checkContent);
      editor.addEventListener('DOMNodeInserted', checkContent);
    }
    
    return () => {
      if (editor) {
        editor.removeEventListener('input', checkContent);
        editor.removeEventListener('DOMNodeInserted', checkContent);
      }
    };
  }, []);

  // Set up double-click and right-click handlers for components
  useEffect(() => {
    const handleComponentInteraction = (e: MouseEvent) => {
      // If template is locked, prevent interactions
      if (isLocked) {
        e.preventDefault();
        return;
      }
      
      const target = e.target as HTMLElement;
      const componentElement = findComponentElement(target);
      
      if (componentElement && (e.type === 'dblclick' || e.type === 'contextmenu')) {
        // Prevent default context menu on right-click
        if (e.type === 'contextmenu') {
          e.preventDefault();
        }
        
        const componentId = componentElement.getAttribute('data-id');
        if (componentId) {
          const component = componentStore.getComponent(componentId);
          if (component) {
            setSelectedComponent(component);
            setModalOpen(true);
          }
        }
      }
    };
    
    // Improved function to find the closest component element
    const findComponentElement = (element: HTMLElement | null): HTMLElement | null => {
      if (!element) return null;
      
      // Check if the element itself is a component
      if (element.hasAttribute('data-component')) {
        return element;
      }
      
      // Check if it's a child of a component (like a label span or delete button)
      let parent: HTMLElement | null = element.parentElement;
      while (parent) {
        if (parent.hasAttribute('data-component')) {
          return parent;
        }
        parent = parent.parentElement;
      }
      
      return null;
    };
    
    // Add global click handlers to capture events regardless of target
    const handleGlobalClick = (e: MouseEvent) => {
      if (e.type === 'dblclick' || e.type === 'contextmenu') {
        handleComponentInteraction(e);
      }
    };
    
    // Add event listeners to the document instead of just the editor
    document.addEventListener('dblclick', handleGlobalClick);
    document.addEventListener('contextmenu', handleGlobalClick);
    
    return () => {
      document.removeEventListener('dblclick', handleGlobalClick);
      document.removeEventListener('contextmenu', handleGlobalClick);
    };
  }, [isLocked]);

  // Update editor's contentEditable state when template is locked/unlocked
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.contentEditable = isLocked ? 'false' : 'true';
      
      // Apply visual indication of locked state
      if (isLocked) {
        editorRef.current.classList.add('bg-gray-50', 'cursor-not-allowed');
        editorRef.current.classList.remove('bg-white');
      } else {
        editorRef.current.classList.remove('bg-gray-50', 'cursor-not-allowed');
        editorRef.current.classList.add('bg-white');
      }
    }
  }, [isLocked]);

  // Function to scan the editor and get a list of visible component IDs in their visual order
  const getVisibleComponentIds = (): string[] => {
    if (!editorRef.current) return [];
    
    // Find all component elements in the editor
    const componentElements = editorRef.current.querySelectorAll('[data-component]');
    
    // Extract IDs from component elements
    const visibleIds: string[] = [];
    componentElements.forEach(element => {
      const id = element.getAttribute('data-id');
      if (id) {
        visibleIds.push(id);
      }
    });
    
    return visibleIds;
  };

  // Function to get component IDs in the order they appear in the editor DOM
  const getOrderedVisibleComponentIds = (): string[] => {
    if (!editorRef.current) return [];
    
    // Get all components in the editor in the exact order they appear in the DOM
    // This preserves the visual ordering that the user sees
    const componentElements = editorRef.current.querySelectorAll('[data-component]');
    
    // Convert NodeList to Array and extract ordered IDs
    return Array.from(componentElements)
      .map(element => element.getAttribute('data-id'))
      .filter((id): id is string => id !== null); // Filter out any null values
  };

  // Function to toggle template lock state
  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  // Function to get component styles based on type
  const getComponentStyles = (type: ComponentType): string => {
    const baseStyles = 'transition-all duration-200 hover:shadow-md hover:scale-105 hover:opacity-90';
    
    switch(type) {
      case 'text-field':
        return `${baseStyles} bg-blue-100 text-blue-800 border border-blue-300`;
      case 'dropdown':
        return `${baseStyles} bg-green-100 text-green-800 border border-green-300`;
      case 'multi-text-field':
        return `${baseStyles} bg-purple-100 text-purple-800 border border-purple-300`;
      default:
        return `${baseStyles} bg-gray-100 text-gray-800 border border-gray-300`;
    }
  };
  
  // Function to check if selection is inside editor
  const isSelectionInsideEditor = (): boolean => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return false;
    
    const range = selection.getRangeAt(0);
    return !!editorRef.current.contains(range.commonAncestorContainer);
  };
  
  // Function to place cursor at the end of the editor
  const moveCursorToEndOfEditor = () => {
    if (!editorRef.current) return;
    
    // Focus the editor
    editorRef.current.focus();
    
    // Create a new range at the end of the editor
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false); // Collapse to end
    
    // Apply the range to the selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };
  
  // Function to insert component at current cursor position
  const insertComponent = (type: ComponentType) => {
    // Don't allow inserting components if template is locked
    if (isLocked) return;
    
    // First, check if current selection is inside the editor
    if (!isSelectionInsideEditor()) {
      // Selection is not inside editor, show error and move cursor to end
      setErrorMessage("Click inside the editor first to insert a field");
      
      // Focus editor and move cursor to end
      moveCursorToEndOfEditor();
      return;
    }
    
    // Generate unique ID
    const id = `component-${Date.now()}`;
    
    // Create label based on type
    let label = '';
    // Initialize attributes with default values
    let attributes: Record<string, any> = { variableName: '' };
    
    switch(type) {
      case 'text-field':
        label = 'Text Field';
        break;
      case 'dropdown':
        label = 'Dropdown: Status';
        // Initialize dropdown with empty options array
        attributes.options = [];
        break;
      case 'multi-text-field':
        label = 'Multi Text Field';
        // Initialize multi-text field with empty options array
        attributes.options = [];
        break;
    }
    
    // Create new component metadata
    const newComponent: ComponentMetadata = {
      id,
      type,
      label,
      attributes,
    };
    
    // Add to ComponentStore
    componentStore.addComponent(newComponent);
    
    // Update local state
    setComponents([...components, newComponent]);
    
    // Get current selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      // Get the current range
      const range = selection.getRangeAt(0);
      
      // Create the component element
      const componentElement = document.createElement('span');
      componentElement.id = id;
      componentElement.className = `relative inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getComponentStyles(type)} mx-1 group cursor-pointer`;
      componentElement.contentEditable = 'false';
      componentElement.setAttribute('data-component', 'true');
      componentElement.setAttribute('data-type', type);
      componentElement.setAttribute('data-id', id);
      componentElement.setAttribute('title', 'Double-click to edit'); // Add hint for users
      
      // Create label and delete button
      const labelSpan = document.createElement('span');
      labelSpan.textContent = label;
      componentElement.appendChild(labelSpan);
      
      // Create delete button (with aria-hidden to exclude from copied content)
      const deleteButton = document.createElement('span');
      deleteButton.className = 'ml-1.5 text-gray-500 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity';
      deleteButton.textContent = '×';
      deleteButton.setAttribute('data-action', 'delete');
      deleteButton.setAttribute('aria-hidden', 'true'); // Hide from assistive tech and copy operations
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLocked) {
          removeComponent(id, componentElement);
        }
      });
      componentElement.appendChild(deleteButton);
      
      // Insert the component
      range.deleteContents();
      range.insertNode(componentElement);
      
      // Add a space after the component if needed
      const spaceNode = document.createTextNode('\u00A0');
      range.setStartAfter(componentElement);
      range.insertNode(spaceNode);
      
      // Move cursor after the inserted component and space
      range.setStartAfter(spaceNode);
      range.setEndAfter(spaceNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Ensure editor maintains focus
      editorRef.current.focus();
    }
  };

  // Function to open fill template modal
  const openFillTemplate = () => {
    // Get all available components from the store
    const allComponents = componentStore.getAllComponents();
    
    // Get ordered list of visible component IDs
    const orderedVisibleIds = getOrderedVisibleComponentIds();
    
    console.log(`Found ${orderedVisibleIds.length} visible components in editor`);
    
    // Filter and sort components to match the visual order in the editor
    const orderedVisibleComponents = orderedVisibleIds
      .map(id => allComponents.find(comp => comp.id === id))
      .filter((comp): comp is ComponentMetadata => comp !== undefined);
    
    // Update the components state with only the visible ones in correct order
    setComponents(orderedVisibleComponents);
    
    // Open the fill modal
    setFillModalOpen(true);
  };

  // Function to export template to a JSON file
  const exportTemplate = () => {
    // Get ordered visible component IDs
    const orderedVisibleIds = getOrderedVisibleComponentIds();
    
    // Get all components from store
    const allComponents = componentStore.getAllComponents();
    
    // Filter and sort components to match the visual order in the editor
    const orderedVisibleComponents = orderedVisibleIds
      .map(id => allComponents.find(comp => comp.id === id))
      .filter((comp): comp is ComponentMetadata => comp !== undefined);
    
    // Create template data object
    const templateData: TemplateData = {
      version: '1.0',
      content: editorRef.current?.innerHTML || '',
      components: orderedVisibleComponents
    };
    
    // Convert to JSON and create downloadable data
    const jsonData = JSON.stringify(templateData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show success message
    setErrorMessage("Template exported successfully");
  };
  
  // Function to import template from a JSON file
  const importTemplate = (e: ChangeEvent<HTMLInputElement>) => {
    // Check if file is selected
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        // Parse the JSON content
        const templateData = JSON.parse(event.target?.result as string) as TemplateData;
        
        // Validate the template data structure
        if (!templateData.content || !Array.isArray(templateData.components)) {
          throw new Error('Invalid template file format');
        }
        
        // Clear existing components from store
        componentStore.clearComponents();
        
        // Sanitize and add imported components to store
        const sanitizedComponents = templateData.components.map(component => {
          // Ensure all required fields exist with valid default values
          const sanitized: ComponentMetadata = {
            id: component.id,
            type: component.type,
            label: component.label || '',
            attributes: {
              ...(component.attributes || {}),
              variableName: component.attributes?.variableName || '',
            }
          };
          
          // Ensure options arrays exist for dropdown and multi-text fields
          if (component.type === 'dropdown' || component.type === 'multi-text-field') {
            if (sanitized.attributes) {
              sanitized.attributes.options = sanitized.attributes.options || [];
            }
          }
          
          return sanitized;
        });
        
        // Add sanitized components to store
        sanitizedComponents.forEach(component => {
          componentStore.addComponent(component);
        });
        
        // Update editor content
        if (editorRef.current) {
          editorRef.current.innerHTML = templateData.content;
        }
        
        // Update components state
        setComponents(sanitizedComponents);
        
        // Show success message
        setErrorMessage("Template imported successfully");
      } catch (error) {
        console.error('Error importing template:', error);
        setErrorMessage("Error importing template. Invalid format.");
      }
    };
    
    reader.onerror = () => {
      setErrorMessage("Error reading template file");
    };
    
    // Read the file as text
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  };
  
  // Function to trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Function to save component changes from modal
  const handleSaveComponent = (updatedMetadata: ComponentMetadata) => {
    // Don't allow updates if template is locked
    if (isLocked) {
      setModalOpen(false);
      setSelectedComponent(null);
      return;
    }
    
    // Ensure the updated metadata has valid values for all fields
    const sanitizedMetadata: ComponentMetadata = {
      ...updatedMetadata,
      id: updatedMetadata.id,
      type: updatedMetadata.type,
      label: updatedMetadata.label || '',
      attributes: {
        ...(updatedMetadata.attributes || {}),
        variableName: updatedMetadata.attributes?.variableName || '',
      }
    };
    
    // Ensure options arrays exist for dropdown and multi-text fields
    if (updatedMetadata.type === 'dropdown' || updatedMetadata.type === 'multi-text-field') {
      // We know attributes exists because we initialize it above
      if (sanitizedMetadata.attributes) {
        sanitizedMetadata.attributes.options = sanitizedMetadata.attributes.options || [];
      }
    }
    
    // Update component in store
    componentStore.updateComponent(sanitizedMetadata.id, sanitizedMetadata);
    
    // Update component in DOM
    const componentElement = document.getElementById(sanitizedMetadata.id);
    if (componentElement) {
      // Update the label text
      const labelSpan = componentElement.querySelector('span:not([data-action="delete"])');
      if (labelSpan) {
        labelSpan.textContent = sanitizedMetadata.label;
      }
    }
    
    // Update local state
    setComponents(components.map(comp => 
      comp.id === sanitizedMetadata.id ? sanitizedMetadata : comp
    ));
    
    // Close modal
    setModalOpen(false);
    setSelectedComponent(null);
  };

  // Function to remove a component
  const removeComponent = (id: string, element?: HTMLElement) => {
    // Don't allow removal if template is locked
    if (isLocked) return;
    
    // Remove from store
    componentStore.removeComponent(id);
    
    // Remove from DOM
    if (element) {
      element.remove();
    } else {
      const componentElement = document.getElementById(id);
      if (componentElement) {
        componentElement.remove();
      }
    }
    
    // Update local state
    setComponents(components.filter(comp => comp.id !== id));
  };

  // Function to get all data from the editor including components in their visual order
  const getEditorData = () => {
    // Get ordered visible component IDs
    const orderedVisibleIds = getOrderedVisibleComponentIds();
    
    // Get all components from store
    const allComponents = componentStore.getAllComponents();
    
    // Filter and sort components to match the visual order in the editor
    const orderedVisibleComponents = orderedVisibleIds
      .map(id => allComponents.find(comp => comp.id === id))
      .filter((comp): comp is ComponentMetadata => comp !== undefined);
    
    return {
      content: editorRef.current?.innerHTML || '',
      components: orderedVisibleComponents
    };
  };
  
  // Make the function available for external use
  (window as any).getEditorData = getEditorData;
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Hidden file input for importing templates */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={importTemplate} 
        accept=".json"
        className="hidden" 
      />
      
      <div className="flex items-center justify-between bg-gray-200 p-3 shadow-sm">
        <div className="flex space-x-4">
          <button 
            onClick={() => insertComponent('text-field')}
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none shadow transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLocked}
          >
            Insert Text Field
          </button>
          <button
            onClick={() => insertComponent('dropdown')}
            className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none shadow transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLocked}
          >
            Insert Dropdown
          </button>
          <button
            onClick={() => insertComponent('multi-text-field')}
            className={`px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none shadow transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLocked}
          >
            Insert Multi-Text Field
          </button>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={exportTemplate}
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 focus:outline-none shadow transition-colors"
            title="Save template as JSON file"
          >
            Export
          </button>
          <button
            onClick={triggerFileInput}
            className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 focus:outline-none shadow transition-colors"
            title="Load template from JSON file"
          >
            Import
          </button>
          <button
            onClick={toggleLock}
            className={`px-4 py-2 rounded focus:outline-none shadow transition-colors ${
              isLocked 
                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
          >
            {isLocked ? 'Unlock Template' : 'Lock Template'}
          </button>
          <button
            onClick={openFillTemplate}
            className={`px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 focus:outline-none shadow transition-colors ${
              components.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={components.length === 0}
          >
            Fill Template
          </button>
        </div>
      </div>
      <div className="flex-grow p-6">
        {/* Error message toast */}
        {errorMessage && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-md">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
        
        <div className="relative">
          <div
            ref={editorRef}
            contentEditable
            className="p-6 bg-white border border-gray-300 rounded-lg min-h-[60vh] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-left"
            suppressContentEditableWarning
          />
          {!hasContent && (
            <div 
              ref={placeholderRef}
              className="absolute top-6 left-6 text-gray-400 pointer-events-none"
            >
              Start typing your template here...
            </div>
          )}
        </div>
      </div>
      
      {/* Component Edit Modal */}
      <ComponentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedComponent(null);
        }}
        onSave={handleSaveComponent}
        component={selectedComponent}
      />
      
      {/* Fill Template Modal */}
      <FillTemplateModal
        isOpen={fillModalOpen}
        onClose={() => setFillModalOpen(false)}
        components={components}
        templateContent={editorRef.current?.innerHTML || ''}
      />
    </div>
  );
};

export default TemplateEditor; 