import React, { useState, useEffect } from 'react';
import { ComponentMetadata } from '../utils/ComponentStore';

// Import the Section interface from TemplateEditor or create it here
interface Section {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
}

interface FillTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: ComponentMetadata[];  // These are already in visual order from the editor
  sections: Section[];
  templateContent: string;
}

interface FieldValues {
  [key: string]: string | string[] | boolean[];
}

interface SectionState {
  [sectionId: string]: boolean;
}

// A simpler structure to map sections to their components
interface SectionComponentsMap {
  [sectionId: string]: ComponentMetadata[];
}

const FillTemplateModal: React.FC<FillTemplateModalProps> = ({ 
  isOpen, 
  onClose, 
  components,
  sections,
  templateContent
}) => {
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [formStep, setFormStep] = useState<'filling' | 'preview'>('filling');
  const [previewContent, setPreviewContent] = useState('');
  const [sectionStates, setSectionStates] = useState<SectionState>({});
  const [sectionComponentsMap, setSectionComponentsMap] = useState<SectionComponentsMap>({});
  
  // Initialize section states and map components when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened, initializing sections and components");
      
      // Initialize section states
      const initialSectionStates: SectionState = {};
      sections.forEach(section => {
        initialSectionStates[section.id] = section.enabled !== undefined ? section.enabled : true;
      });
      setSectionStates(initialSectionStates);
      
      // Create the section -> components mapping
      createSectionComponentsMap();
    }
  }, [isOpen, sections, components]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Create a direct mapping from each section to its components
  const createSectionComponentsMap = () => {
    // Initialize the map
    const newSectionComponentsMap: SectionComponentsMap = {};
    
    // Get all available component IDs
    const allComponentIds = components.map(comp => comp.id);
    
    // Process each section
    sections.forEach(section => {
      console.log(`Processing section: ${section.title} (${section.id})`);
      
      try {
        // Create a temporary DOM element to parse the section's HTML content
        const tempElement = document.createElement('div');
        tempElement.innerHTML = section.content;
        
        // Find all component elements in this section
        const componentElements = tempElement.querySelectorAll('[data-component]');
        console.log(`Found ${componentElements.length} component elements in section ${section.title}`);
        
        // Extract the component IDs
        const sectionComponentIds: string[] = [];
        componentElements.forEach(element => {
          const id = element.getAttribute('data-id');
          if (id) {
            sectionComponentIds.push(id);
            console.log(`Found component ID in section: ${id}`);
          }
        });
        
        // Match these IDs with the actual component metadata
        // It's critical that we check if each ID is in our available components
        const sectionComponents = components.filter(component => 
          sectionComponentIds.includes(component.id) && 
          allComponentIds.includes(component.id)
        );
        
        console.log(`Matched ${sectionComponents.length} components for section ${section.title}`);
        sectionComponents.forEach(comp => console.log(`- ${comp.id}: ${comp.label} (${comp.type})`));
        
        // Store the components for this section
        newSectionComponentsMap[section.id] = sectionComponents;
        console.log(`Final: Mapped ${sectionComponents.length} components to section ${section.title}`);
      } catch (error) {
        console.error(`Error processing section ${section.title}:`, error);
        newSectionComponentsMap[section.id] = [];
      }
    });
    
    // Update the state with the new mapping
    setSectionComponentsMap(newSectionComponentsMap);
    
    // Initialize field values for all components across all sections
    initializeFieldValues(newSectionComponentsMap);
  };
  
  // Initialize field values for all components
  const initializeFieldValues = (componentMap: SectionComponentsMap) => {
    const initialValues: FieldValues = {};
    
    // Process each section
    Object.values(componentMap).forEach(sectionComponents => {
      // Process each component in the section
      sectionComponents.forEach(component => {
        // Ensure component has attributes
        const componentAttributes = component.attributes || {};
        
        // Use variable name as key if available, otherwise use id
        const key = componentAttributes.variableName || component.id;
        
        // Initialize based on component type
        if (component.type === 'dropdown') {
          // For dropdown, use first option as default if available
          const options = Array.isArray(componentAttributes.options) ? componentAttributes.options : [];
          initialValues[key] = options.length > 0 ? options[0] : '';
        } else if (component.type === 'multi-text-field') {
          // For multi-text field, initialize boolean array for checklist
          const options = Array.isArray(componentAttributes.options) ? componentAttributes.options : [];
          // Initialize all options as unchecked (false)
          initialValues[key] = Array(options.length).fill(false);
        } else {
          // For text fields, initialize as empty string
          initialValues[key] = '';
        }
      });
    });
    
    setFieldValues(initialValues);
  };

  if (!isOpen) return null;
  
  // Toggle a section's enabled state
  const toggleSection = (sectionId: string) => {
    setSectionStates(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Handle changes to field values
  const handleFieldChange = (key: string, value: string | string[] | boolean[]) => {
    setFieldValues({
      ...fieldValues,
      [key]: value
    });
  };
  
  // Handle checkbox changes for multi-text fields
  const handleCheckboxChange = (key: string, index: number, checked: boolean) => {
    // Get current values, ensuring it's an array with proper type
    const currentValues = Array.isArray(fieldValues[key]) 
      ? [...(fieldValues[key] as boolean[])] 
      : [];
      
    // Ensure the array is long enough
    while (currentValues.length <= index) {
      currentValues.push(false);
    }
    
    // Update the value at the specific index
    currentValues[index] = checked;
    
    handleFieldChange(key, currentValues);
  };
  
  // Find variable references in text and replace them with their values
  const replaceVariableReferences = (text: string): string => {
    if (!text) return '';
    
    // Look for {variableName} patterns
    return text.replace(/\{([^}]+)\}/g, (match, variableName) => {
      // Check if we have a value for this variable
      if (fieldValues[variableName] !== undefined) {
        const value = fieldValues[variableName];
        
        // For array values, join with comma
        if (Array.isArray(value)) {
          // Check if this is a boolean array (from multi-text fields)
          const isBooleanArray = value.length > 0 && typeof value[0] === 'boolean';
          
          if (isBooleanArray) {
            // Cast to boolean array since we've verified the type
            const booleanArray = value as boolean[];
            
            // For boolean arrays (multi-text fields), find the selected options
            // Find the component with this variable name
            let foundOptions: string[] = [];
            
            // Look through all sections for the component
            Object.values(sectionComponentsMap).forEach(sectionComponents => {
              const component = sectionComponents.find(c => 
                (c.attributes?.variableName || c.id) === variableName
              );
              
              if (component && component.attributes?.options && Array.isArray(component.attributes.options)) {
                const options = component.attributes.options;
                const selectedOptions = options.filter((_, index) => 
                  index < booleanArray.length ? booleanArray[index] : false
                );
                foundOptions = selectedOptions;
              }
            });
            
            return foundOptions.length > 0 ? foundOptions.join(', ') : '[None selected]';
          }
          
          // For string arrays, join with comma
          return (value as string[]).join(', ');
        }
        
        // For scalar values, convert to string
        return value.toString();
      }
      
      // If no value found, return a placeholder
      return `[${variableName}]`;
    });
  };
  
  // Clean HTML content by removing UI elements like delete buttons
  const cleanHtmlContent = (html: string): string => {
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove all elements with aria-hidden="true" (like delete buttons)
    const hiddenElements = tempDiv.querySelectorAll('[aria-hidden="true"]');
    hiddenElements.forEach(el => el.remove());
    
    // Remove any data attributes that shouldn't be in the final output
    const components = tempDiv.querySelectorAll('[data-component]');
    components.forEach(component => {
      // Keep the ID but remove other data attributes
      const id = component.getAttribute('data-id');
      
      // Remove all attributes
      while (component.attributes.length > 0) {
        component.removeAttribute(component.attributes[0].name);
      }
      
      // Add back just the ID for tracking
      if (id) component.setAttribute('id', id);
      
      // Remove the contentEditable="false" which can cause issues when copying
      component.removeAttribute('contenteditable');
      
      // Convert to a simple span with consistent styling
      (component as HTMLElement).style.cssText = 
        'display: inline; font-weight: normal; background: none; border: none; padding: 0; margin: 0;';
    });
    
    // Replace <div> elements with <p> tags to better preserve paragraph breaks
    // This will help with the final text extraction for clipboard copying
    const divElements = tempDiv.querySelectorAll('div:not([data-component])');
    divElements.forEach(div => {
      // Check if it has content
      if (div.innerHTML.trim()) {
        // Create a new paragraph element
        const p = document.createElement('p');
        p.innerHTML = div.innerHTML;
        div.replaceWith(p);
      }
    });
    
    return tempDiv.innerHTML;
  };
  
  // Generate preview content
  const generatePreview = () => {
    let fullPreviewContent = '';
    
    // Process each section
    sections.forEach(section => {
      // Skip disabled sections
      if (!sectionStates[section.id]) {
        return;
      }
      
      // Clean the section content
      let cleanedSectionContent = cleanHtmlContent(section.content);
      
      // Get the components for this section
      const sectionComponents = sectionComponentsMap[section.id] || [];
      
      // Replace each component with its filled value
      sectionComponents.forEach(component => {
        // Ensure component has attributes
        const componentAttributes = component.attributes || {};
        
        const key = componentAttributes.variableName || component.id;
        const value = fieldValues[key] || '';
        
        // Replace the component HTML with the filled value
        const componentRegex = new RegExp(
          `<span[^>]*?id="${component.id}"[^>]*?>[\\s\\S]*?<\\/span>`, 'g'
        );
        
        let replacementValue = '';
        
        if (component.type === 'multi-text-field') {
          // For multi-text fields, get options and their checked status
          const options = Array.isArray(componentAttributes.options) ? componentAttributes.options : [];
          const checked = Array.isArray(fieldValues[key]) ? (fieldValues[key] as boolean[]) : Array(options.length).fill(false);
          
          // Get selected options
          const selectedOptions = options.filter((_, index) => 
            index < checked.length ? checked[index] : false
          );
          
          // Join selected options with line breaks
          replacementValue = selectedOptions.join('<br>');
        } else if (Array.isArray(value)) {
          // For other array values, join with line breaks
          replacementValue = (value as string[]).filter(v => v && v.trim()).join('<br>');
        } else {
          // For scalar values, convert to string and process variable references
          replacementValue = value ? replaceVariableReferences(value.toString()) : '';
        }
        
        cleanedSectionContent = cleanedSectionContent.replace(componentRegex, replacementValue);
      });
      
      // Process any remaining {variableName} references in the section text
      cleanedSectionContent = replaceVariableReferences(cleanedSectionContent);
      
      // Add the processed section content (without section title)
      fullPreviewContent += `<div class="mb-6">${cleanedSectionContent}</div>`;
    });
    
    setPreviewContent(fullPreviewContent);
    setFormStep('preview');
  };
  
  // Return to editing form
  const backToForm = () => {
    setFormStep('filling');
  };
  
  // Enable copying of the clean preview content with preserved formatting
  const copyToClipboard = () => {
    try {
      // Create a temporary container to process content section by section
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = previewContent;
      
      // Get all section divs in the preview content
      const sectionDivs = tempDiv.querySelectorAll('div.mb-6');
      const textSections: string[] = [];
      
      // Process each section to preserve paragraph breaks
      sectionDivs.forEach(sectionDiv => {
        // Get the HTML content and convert <br>, <p>, <div> to line breaks
        let sectionHtml = sectionDiv.innerHTML;
        
        // Create another temp element to handle HTML to text conversion
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = sectionHtml;
        
        // Replace <br> tags with newline placeholders
        const brElements = contentDiv.querySelectorAll('br');
        brElements.forEach(br => {
          br.replaceWith('\n');
        });
        
        // Convert block-level elements into text with line breaks
        const blockElements = contentDiv.querySelectorAll('p, div, li');
        blockElements.forEach(el => {
          // Add a newline after each block element's content
          const text = el.textContent?.trim();
          if (text) {
            el.textContent = text + '\n';
          }
        });
        
        // Get the processed text with line breaks preserved
        let sectionText = contentDiv.textContent || '';
        
        // Cleanup: normalize line breaks and trim extra whitespace
        sectionText = sectionText
          .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with double newline
          .trim();
        
        if (sectionText) {
          textSections.push(sectionText);
        }
      });
      
      // Join all sections with double newline for clear separation
      const finalText = textSections.join('\n\n');
      
      navigator.clipboard.writeText(finalText);
      alert('Content copied to clipboard with formatting preserved!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Could not copy to clipboard. Please try again.');
    }
  };
  
  // Debug summary
  console.log(`Fill Template Modal - Sections: ${sections.length}, Components: ${components.length}`);
  Object.entries(sectionComponentsMap).forEach(([sectionId, comps]) => {
    const section = sections.find(s => s.id === sectionId);
    console.log(`Section "${section?.title}" (${sectionId}): ${comps.length} components`);
  });
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {formStep === 'filling' ? (
          <>
            <h2 className="text-xl font-bold mb-6">Fill Template Fields</h2>
            
            {sections.length === 0 ? (
              <p className="text-gray-600 mb-4">No content to fill.</p>
            ) : (
              <div className="space-y-8">
                {sections.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {section.title || `Untitled Section ${sections.indexOf(section) + 1}`}
                      </h3>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sectionStates[section.id] || false}
                          onChange={() => toggleSection(section.id)}
                          className="form-checkbox h-5 w-5 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">Include this section</span>
                      </label>
                    </div>
                    
                    {/* Show component count for debugging */}
                    <div className="text-xs text-gray-500 mb-2">
                      Components in section: {(sectionComponentsMap[section.id] || []).length}
                    </div>
                    
                    {(!sectionComponentsMap[section.id] || sectionComponentsMap[section.id].length === 0) ? (
                      <p className="text-gray-500 italic text-sm">No fields in this section</p>
                    ) : (
                      <div className="space-y-6">
                        {(sectionComponentsMap[section.id] || []).map((component: ComponentMetadata) => {
                          // Ensure component has attributes
                          const componentAttributes = component.attributes || {};
                          const key = componentAttributes.variableName || component.id;
                          
                          return (
                            <div key={component.id} className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {component.label || ''}
                                {componentAttributes.variableName && 
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({componentAttributes.variableName})
                                  </span>
                                }
                              </label>
                              
                              {/* Text field input */}
                              {component.type === 'text-field' && (
                                <input
                                  type="text"
                                  value={(fieldValues[key] as string) || ''}
                                  onChange={(e) => handleFieldChange(key, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              )}
                              
                              {/* Dropdown select */}
                              {component.type === 'dropdown' && (
                                <select
                                  value={(fieldValues[key] as string) || ''}
                                  onChange={(e) => handleFieldChange(key, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {(Array.isArray(componentAttributes.options) ? componentAttributes.options : []).map((option: string, index: number) => (
                                    <option key={index} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              )}
                              
                              {/* Multi-text field as checkbox list */}
                              {component.type === 'multi-text-field' && (
                                <div className="space-y-2 mt-2">
                                  {(Array.isArray(componentAttributes.options) ? componentAttributes.options : []).map((option: string, index: number) => {
                                    const values = Array.isArray(fieldValues[key]) ? (fieldValues[key] as boolean[]) : [];
                                    const isChecked = index < values.length ? !!values[index] : false;
                                    
                                    return (
                                      <div key={index} className="flex items-center">
                                        <input
                                          type="checkbox"
                                          id={`${component.id}-option-${index}`}
                                          checked={isChecked}
                                          onChange={(e) => handleCheckboxChange(key, index, e.target.checked)}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label
                                          htmlFor={`${component.id}-option-${index}`}
                                          className="ml-2 block text-sm text-gray-700"
                                        >
                                          {option}
                                        </label>
                                      </div>
                                    );
                                  })}
                                  {(!componentAttributes.options || !Array.isArray(componentAttributes.options) || componentAttributes.options.length === 0) && (
                                    <p className="text-sm text-gray-500 italic">No options defined for this field.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={generatePreview}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
                disabled={Object.values(sectionComponentsMap).flat().length === 0}
              >
                Preview Result
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-6">Preview Result</h2>
            
            <div 
              className="border border-gray-300 rounded-lg p-4 min-h-[200px] mb-6 bg-gray-50 prose max-w-none" 
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={backToForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 focus:outline-none"
              >
                Back to Form
              </button>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FillTemplateModal; 