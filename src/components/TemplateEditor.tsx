import React, { useRef, useState, useEffect, ChangeEvent, useCallback } from 'react';
import { componentStore, ComponentType, ComponentMetadata } from '../utils/ComponentStore';
import ComponentModal from './ComponentModal';
import FillTemplateModal from './FillTemplateModal';

// Define the template data structure for export/import
interface TemplateData {
  version: string;
  sections: Section[];
  components: ComponentMetadata[];
}

// Define the section data structure
interface Section {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
}

// Create ID generators for sections and components to ensure uniqueness
let sectionIdCounter = 0;
const generateSectionId = (): string => {
  return `section-${Date.now()}-${sectionIdCounter++}`;
};

let componentIdCounter = 0;
const generateComponentId = (): string => {
  return `component-${Date.now()}-${componentIdCounter++}`;
};

const TemplateEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [components, setComponents] = useState<ComponentMetadata[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [hasContent, setHasContent] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentMetadata | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [fillModalOpen, setFillModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false); // Track if we've already initialized
  
  // Function to create a new section with guaranteed unique ID
  const addSection = useCallback(() => {
    const newSection: Section = {
      id: generateSectionId(),
      title: `Section ${sections.length + 1}`,
      content: '',
      enabled: true
    };
    
    setSections(prevSections => [...prevSections, newSection]);
  }, [sections.length]);
  
  // Initialize with a default section if none exists, but only once
  useEffect(() => {
    // Only add a default section if we have no sections AND we haven't initialized yet
    if (sections.length === 0 && !initialized) {
      const defaultSection: Section = {
        id: generateSectionId(),
        title: 'Section 1',
        content: '',
        enabled: true
      };
      
      setSections([defaultSection]);
      setInitialized(true);
    }
  }, [sections.length, initialized]);
  
  // Effect to handle populating section content after import or changes
  useEffect(() => {
    // Skip if no sections exist
    if (sections.length === 0) {
      return;
    }
    
    let injectionCompleted = false;
    
    // First attempt - try immediate injection
    const injectSectionContent = () => {
      sections.forEach(section => {
        // Skip sections with no content
        if (!section.content || section.content.trim() === '') {
          return;
        }
        
        // Find the section element in the DOM
        const sectionElement = document.getElementById(section.id);
        if (!sectionElement) {
          console.warn(`Could not find DOM element for section ${section.id}`);
          return;
        }
        
        // Only set the HTML if it's different from current content
        if (sectionElement.innerHTML !== section.content) {
          console.log(`Injecting content into section ${section.id}`);
          sectionElement.innerHTML = section.content;
          
          // Process components to ensure they're styled correctly
          processImportedComponents(sectionElement);
          injectionCompleted = true;
        }
      });
      
      // Update hasContent flag based on first section
      if (sections.length > 0 && sections[0].content) {
        setHasContent(sections[0].content.trim().length > 0);
      }
    };
    
    // Try immediate injection
    injectSectionContent();
    
    // Also set up a delayed injection as a fallback
    const timeoutId = setTimeout(() => {
      if (!injectionCompleted) {
        console.log("Attempting delayed content injection");
        injectSectionContent();
      }
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [sections]); // Run whenever sections change
  
  // Function to update a section's title
  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, title } : section
    ));
  };
  
  // Function to update a section's content
  const updateSectionContent = (sectionId: string, content: string) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, content } : section
    ));
  };
  
  // Function to remove a section
  const removeSection = (sectionId: string) => {
    // Don't allow removing the last section
    if (sections.length <= 1) {
      setErrorMessage("Cannot remove the last section");
      return;
    }
    
    setSections(sections.filter(section => section.id !== sectionId));
  };
  
  // Function to toggle a section's enabled state
  // Used in the section state management for future functionality 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars  
  const toggleSectionEnabled = (sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, enabled: !section.enabled } : section
    ));
  };
  
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
  // This function is no longer used directly, but kept for documentation purposes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // Get all visible components across all sections
    const visibleComponentIds: string[] = [];
    
    // Process each section to find components
    sections.forEach(section => {
      const sectionElement = document.getElementById(section.id);
      if (!sectionElement) return;
      
      // Find all components in this section
      const componentElements = sectionElement.querySelectorAll('[data-component]');
      
      // Extract IDs and add them to our list
      Array.from(componentElements).forEach(element => {
        const id = element.getAttribute('data-id');
        if (id) {
          visibleComponentIds.push(id);
        }
      });
    });
    
    console.log(`Found ${visibleComponentIds.length} components across all sections`);
    return visibleComponentIds;
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
  
  // Function to insert component at current cursor position
  const insertComponent = (type: ComponentType) => {
    // Don't allow inserting components if template is locked
    if (isLocked) return;
    
    // First, check if current selection is inside any of the section editors
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      setErrorMessage("Click inside a section first to insert a field");
      return;
    }
    
    const range = selection.getRangeAt(0);
    const sectionElement = findSectionElement(range.commonAncestorContainer as HTMLElement);
    
    if (!sectionElement) {
      setErrorMessage("Click inside a section first to insert a field");
      return;
    }
    
    // Generate unique ID
    const id = generateComponentId();
    
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
        // Initialize dropdown with empty options array and default options
        attributes.options = ['Option 1', 'Option 2', 'Option 3'];
        break;
      case 'multi-text-field':
        label = 'Multi Text Field';
        // Initialize multi-text field with empty options array and default options
        attributes.options = ['Item 1', 'Item 2', 'Item 3'];
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
    deleteButton.className = 'ml-1.5 text-gray-500 hover:text-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity';
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
    
    // Ensure section content gets updated in the state
    const sectionId = sectionElement.id;
    if (sectionId) {
      const sectionContent = sectionElement.innerHTML;
      updateSectionContent(sectionId, sectionContent);
    }
    
    // Ensure section maintains focus
    sectionElement.focus();
  };

  // Function to find the section element from a given node
  const findSectionElement = (node: Node | null): HTMLElement | null => {
    if (!node) return null;
    
    // Check if the node is an element
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      
      // Check if it's one of our sections (has an ID starting with 'section-')
      if (element.id && element.id.startsWith('section-')) {
        return element;
      }
    }
    
    // Look up the tree
    if (node.parentNode) {
      return findSectionElement(node.parentNode);
    }
    
    return null;
  };
  
  // Function to open fill template modal
  const openFillTemplate = () => {
    // Get all available components from the store
    const allComponents = componentStore.getAllComponents();
    
    // Before opening the modal, ensure that all sections' content is up-to-date
    // This is crucial for finding all components in all sections
    sections.forEach(section => {
      const sectionElement = document.getElementById(section.id);
      if (!sectionElement) return;
      
      // Update the section content in the state
      const sectionContent = sectionElement.innerHTML;
      updateSectionContent(section.id, sectionContent);
    });
    
    // Get ordered list of visible component IDs from all sections
    const orderedVisibleIds = getOrderedVisibleComponentIds();
    
    console.log(`Found ${orderedVisibleIds.length} visible components in editor`);
    orderedVisibleIds.forEach(id => {
      const comp = allComponents.find(c => c.id === id);
      if (comp) {
        console.log(`- ${id}: ${comp.label} (${comp.type})`);
      } else {
        console.log(`- ${id}: Component not found in store!`);
      }
    });
    
    // Filter and sort components to match the visual order in the editor
    const orderedVisibleComponents = orderedVisibleIds
      .map(id => allComponents.find(comp => comp.id === id))
      .filter((comp): comp is ComponentMetadata => comp !== undefined);
    
    console.log(`Passing ${orderedVisibleComponents.length} components to Fill Template modal`);
    
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
      sections: sections.map(section => ({
        ...section,
        // Get the current content from the DOM for each section
        content: document.getElementById(section.id)?.innerHTML || section.content
      })),
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
        if (!templateData.sections || !Array.isArray(templateData.components)) {
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
            if (!sanitized.attributes) {
              sanitized.attributes = {};
            }
            
            // Ensure options is always an array
            if (!sanitized.attributes.options || !Array.isArray(sanitized.attributes.options)) {
              sanitized.attributes.options = component.type === 'dropdown' 
                ? ['Option 1', 'Option 2', 'Option 3'] 
                : ['Item 1', 'Item 2', 'Item 3'];
            }
          }
          
          return sanitized;
        });
        
        // Add sanitized components to store
        sanitizedComponents.forEach(component => {
          componentStore.addComponent(component);
        });
        
        // Update sections with imported data
        if (Array.isArray(templateData.sections) && templateData.sections.length > 0) {
          // Sanitize imported sections
          const sanitizedSections = templateData.sections.map(section => ({
            id: section.id || generateSectionId(),
            title: section.title || '',
            content: section.content || '',
            enabled: section.enabled !== undefined ? section.enabled : true
          }));
          
          // Update sections state
          setSections(sanitizedSections);
          
          // Add a default section if none were imported
          if (sanitizedSections.length === 0) {
            addSection();
          }
          
          // After a short delay, directly inject section content to handle the DOM update
          // This is a fallback in case the useEffect doesn't trigger properly
          setTimeout(() => {
            sanitizedSections.forEach(section => {
              const sectionElement = document.getElementById(section.id);
              if (sectionElement && section.content) {
                console.log(`Direct injection into section ${section.id} during import`);
                sectionElement.innerHTML = section.content;
                
                // Immediately scan for any component elements in the injected content
                processImportedComponents(sectionElement);
              }
            });
          }, 200);
        } else {
          // If no sections in imported template, create a default one with the content
          const newSection: Section = {
            id: generateSectionId(),
            title: 'Imported Content',
            content: '',
            enabled: true
          };
          
          setSections([newSection]);
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
  
  // Helper function to process components in imported content
  const processImportedComponents = (parentElement: HTMLElement) => {
    // Find all component elements - some may have data-component attribute, others may just have an ID
    const allSpans = parentElement.querySelectorAll('span');
    const processedIds = new Set<string>();
    let processedCount = 0;
    
    // First, try to find elements with data-component attribute
    const componentElements = parentElement.querySelectorAll('[data-component]');
    console.log(`Found ${componentElements.length} elements with data-component in content`);
    
    // Process elements with the data-component attribute
    componentElements.forEach(componentEl => {
      const id = componentEl.getAttribute('data-id');
      if (!id) return;
      
      processElement(componentEl as HTMLElement, id);
      processedIds.add(id);
      processedCount++;
    });
    
    // Next, look for elements that have IDs matching components in the store
    // but might be missing the data-component attribute
    allSpans.forEach(span => {
      const id = span.getAttribute('id');
      if (!id || processedIds.has(id)) return;
      
      // Check if this ID exists in the component store
      const component = componentStore.getComponent(id);
      if (component) {
        console.log(`Found component by ID: ${id} (${component.type})`);
        processElement(span as HTMLElement, id);
        processedIds.add(id);
        processedCount++;
      }
    });
    
    console.log(`Processed ${processedCount} total components in content`);
    
    // Helper function to process a single component element
    function processElement(span: HTMLElement, id: string) {
      // Get the component metadata from store
      const component = componentStore.getComponent(id);
      if (!component) {
        console.warn(`Component ${id} not found in store during processing`);
        return;
      }
      
      // Re-apply proper styling and attributes to the component element
      // Set component attributes
      span.setAttribute('data-component', 'true');
      span.setAttribute('data-type', component.type);
      span.setAttribute('data-id', id);
      span.setAttribute('title', 'Double-click to edit'); 
      span.id = id; // Ensure ID is set
      span.contentEditable = 'false';
      
      // Apply correct styling
      span.className = `relative inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getComponentStyles(component.type)} mx-1 group cursor-pointer`;
      
      // Update the label text if needed
      let labelSpan = span.querySelector('span:not([data-action="delete"])');
      if (!labelSpan) {
        // Create label span if it doesn't exist
        labelSpan = document.createElement('span');
        span.textContent = ''; // Clear existing text
        span.appendChild(labelSpan);
      }
      labelSpan.textContent = component.label;
      
      // Add delete button if missing
      if (!span.querySelector('[data-action="delete"]')) {
        const deleteButton = document.createElement('span');
        deleteButton.className = 'ml-1.5 text-gray-500 hover:text-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity';
        deleteButton.textContent = '×';
        deleteButton.setAttribute('data-action', 'delete');
        deleteButton.setAttribute('aria-hidden', 'true'); 
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!isLocked) {
            removeComponent(id, span);
          }
        });
        span.appendChild(deleteButton);
      }
    }
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
      // We know attributes exists because we initialize it above, but TypeScript might not
      const attributes = sanitizedMetadata.attributes || {};
      sanitizedMetadata.attributes = attributes;
      
      if (!attributes.options || !Array.isArray(attributes.options)) {
        // Provide default options if missing
        attributes.options = updatedMetadata.type === 'dropdown' 
          ? ['Option 1', 'Option 2', 'Option 3'] 
          : ['Item 1', 'Item 2', 'Item 3'];
      } else if (attributes.options.length === 0) {
        // If empty array, add default options
        attributes.options = updatedMetadata.type === 'dropdown' 
          ? ['Option 1', 'Option 2', 'Option 3'] 
          : ['Item 1', 'Item 2', 'Item 3'];
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
    
    // Get the latest content from each section
    const currentSections = sections.map(section => {
      const sectionElement = document.getElementById(section.id);
      return {
        ...section,
        content: sectionElement ? sectionElement.innerHTML : section.content
      };
    });
    
    return {
      sections: currentSections,
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
      <div className="flex-grow p-6 overflow-y-auto">
        {/* Error message toast */}
        {errorMessage && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-md">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
        
        {/* Sections Container */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={section.id} className="bg-white border border-gray-300 rounded-lg shadow-sm">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 bg-gray-50 rounded-t-lg">
                <div className="flex-grow">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className={`px-2 py-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full ${isLocked ? 'cursor-not-allowed' : ''}`}
                    placeholder="Section Title (optional)"
                    disabled={isLocked}
                  />
                </div>
                <div className="flex items-center">
                  {sections.length > 1 && (
                    <button
                      onClick={() => removeSection(section.id)}
                      className={`ml-2 text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-red-50 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Remove section"
                      disabled={isLocked}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Section Content */}
              <div
                id={section.id}
                ref={index === 0 ? editorRef : null}
                contentEditable={!isLocked}
                className={`p-6 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left ${
                  isLocked ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                }`}
                suppressContentEditableWarning
                onInput={(e) => {
                  const content = (e.target as HTMLDivElement).innerHTML;
                  updateSectionContent(section.id, content);
                  setHasContent(content.trim().length > 0);
                }}
              />
              
              {/* Placeholder for empty sections */}
              {((!section.content || section.content.trim() === '') || (index === 0 && !hasContent)) && (
                <div 
                  ref={index === 0 ? placeholderRef : undefined}
                  className="absolute mt-[-80px] ml-6 text-gray-400 pointer-events-none"
                >
                  {index === 0 ? "Start typing your template here..." : "Empty section..."}
                </div>
              )}
            </div>
          ))}
          
          {/* Add Section Button */}
          <button
            onClick={addSection}
            className={`mt-4 flex items-center justify-center w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 focus:outline-none transition-colors ${
              isLocked ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isLocked}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Section
          </button>
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
        sections={sections}
        templateContent={editorRef.current?.innerHTML || ''}
      />
    </div>
  );
};

export default TemplateEditor; 