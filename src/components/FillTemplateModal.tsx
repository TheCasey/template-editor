import React, { useState, useEffect } from 'react';
import { ComponentMetadata } from '../utils/ComponentStore';

interface FillTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: ComponentMetadata[];  // These are already in visual order from the editor
  templateContent: string;
}

interface FieldValues {
  [key: string]: string | string[] | boolean[];
}

const FillTemplateModal: React.FC<FillTemplateModalProps> = ({ 
  isOpen, 
  onClose, 
  components,
  templateContent
}) => {
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [formStep, setFormStep] = useState<'filling' | 'preview'>('filling');
  const [previewContent, setPreviewContent] = useState('');
  const [visibleComponents, setVisibleComponents] = useState<ComponentMetadata[]>([]);

  // Extract visible component IDs from the template content and maintain their order
  useEffect(() => {
    if (isOpen) {
      // Parse the template content to find visible component IDs
      const parser = new DOMParser();
      const doc = parser.parseFromString(templateContent, 'text/html');
      const componentElements = doc.querySelectorAll('[data-component]');
      
      // Extract IDs from component elements
      const visibleIds = new Set<string>();
      componentElements.forEach(element => {
        const id = element.getAttribute('data-id');
        if (id) {
          visibleIds.add(id);
        }
      });
      
      // Filter components to only include those with visible IDs
      // Maintain the order of components as passed from the parent
      // (They are already ordered by their visual appearance in the editor)
      const visible = components.filter(component => visibleIds.has(component.id));
      setVisibleComponents(visible);
      
      console.log(`Using ${visible.length} components in their visual order`);
    }
  }, [isOpen, components, templateContent]);

  // Initialize field values when visible components change
  useEffect(() => {
    const initialValues: FieldValues = {};
    visibleComponents.forEach(component => {
      // Ensure component has attributes
      const componentAttributes = component.attributes || {};
      
      // Use variable name as key if available, otherwise use id
      const key = componentAttributes.variableName || component.id;
      
      if (component.type === 'dropdown') {
        // For dropdown, use first option as default if available
        const options = componentAttributes.options || [];
        initialValues[key] = options.length > 0 ? options[0] : '';
      } else if (component.type === 'multi-text-field') {
        // For multi-text field, initialize boolean array for checklist
        const options = componentAttributes.options || [];
        // Initialize all options as unchecked (false)
        initialValues[key] = options.map(() => false);
      } else {
        // For text fields, initialize as empty string
        initialValues[key] = '';
      }
    });
    
    setFieldValues(initialValues);
    
    // Reset to filling step when modal is opened
    setFormStep('filling');
  }, [visibleComponents]);

  if (!isOpen) return null;
  
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
    
    return tempDiv.innerHTML;
  };
  
  // Generate preview content
  const generatePreview = () => {
    // First, clean the HTML to remove UI elements
    let cleanedHtml = cleanHtmlContent(templateContent);
    
    // Replace each component with its filled value
    visibleComponents.forEach(component => {
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
        const options = componentAttributes.options || [];
        const checked = (fieldValues[key] as boolean[]) || options.map(() => false);
        
        // Get selected options
        const selectedOptions = options.filter((_: string, index: number) => 
          index < checked.length ? checked[index] : false
        );
        
        // Join selected options with line breaks
        replacementValue = selectedOptions.join('<br>');
      } else if (Array.isArray(value)) {
        // For other array values, join with line breaks
        replacementValue = (value as string[]).filter(v => v && v.trim()).join('<br>');
      } else {
        // For scalar values
        replacementValue = value ? value.toString() : '';
      }
      
      cleanedHtml = cleanedHtml.replace(componentRegex, replacementValue);
    });
    
    setPreviewContent(cleanedHtml);
    setFormStep('preview');
  };
  
  // Enable copying of the clean preview content
  const copyToClipboard = () => {
    try {
      // Get only the text content (no HTML)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = previewContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      navigator.clipboard.writeText(textContent);
      alert('Content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Could not copy to clipboard. Please try again.');
    }
  };
  
  // Return to editing form
  const backToForm = () => {
    setFormStep('filling');
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {formStep === 'filling' ? (
          <>
            <h2 className="text-xl font-bold mb-6">Fill Template Fields</h2>
            
            {visibleComponents.length === 0 ? (
              <p className="text-gray-600 mb-4">No fields to fill. Your template has no visible components.</p>
            ) : (
              <div className="space-y-6">
                {visibleComponents.map((component) => {
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
                          {(componentAttributes.options || []).map((option: string, index: number) => (
                            <option key={index} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {/* Multi-text field as checkbox list */}
                      {component.type === 'multi-text-field' && (
                        <div className="space-y-2 mt-2">
                          {(componentAttributes.options || []).map((option: string, index: number) => {
                            const values = (fieldValues[key] as boolean[]) || [];
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
                          {(componentAttributes.options || []).length === 0 && (
                            <p className="text-sm text-gray-500 italic">No options defined for this field.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                disabled={visibleComponents.length === 0}
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