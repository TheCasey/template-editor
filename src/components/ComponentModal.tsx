import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ComponentMetadata } from '../utils/ComponentStore';

interface ComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: ComponentMetadata) => void;
  component: ComponentMetadata | null;
}

const ComponentModal: React.FC<ComponentModalProps> = ({ isOpen, onClose, onSave, component }) => {
  const [label, setLabel] = useState('');
  const [variableName, setVariableName] = useState('');
  const [options, setOptions] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset form state when component changes
  useEffect(() => {
    if (component) {
      // Ensure label is never undefined
      setLabel(component.label || '');
      // Ensure variableName is never undefined
      setVariableName(component.attributes?.variableName || '');
      
      if (component.type === 'dropdown' || component.type === 'multi-text-field') {
        // Ensure options is never undefined
        const optionsArray = component.attributes?.options || [];
        setOptions(optionsArray.join('\n'));
      } else {
        // Reset options for other component types
        setOptions('');
      }
    } else {
      // Default values when no component is selected
      setLabel('');
      setVariableName('');
      setOptions('');
    }
  }, [component]);

  // Handle outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Add event listeners for modal interactions
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClickOutside, handleKeyDown]);

  if (!isOpen || !component) return null;

  const handleSave = () => {
    if (!component) return;

    const updatedMetadata: ComponentMetadata = {
      ...component,
      label: label || '',  // Ensure label is never undefined
      attributes: {
        ...(component.attributes || {}),  // Ensure attributes object exists
        variableName: variableName || '',  // Ensure variableName is never undefined
      }
    };

    if (component.type === 'dropdown' || component.type === 'multi-text-field') {
      // Process options even if empty
      const optionsList = options.split('\n').filter(opt => opt.trim());
      
      updatedMetadata.attributes = {
        ...updatedMetadata.attributes,
        options: optionsList,
      };
    }

    onSave(updatedMetadata);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
      >
        <h2 className="text-xl font-bold mb-4">
          Edit {component.type === 'text-field' ? 'Text Field' : 
               component.type === 'dropdown' ? 'Dropdown' : 'Multi-Text Field'}
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            type="text"
            value={label || ''}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Variable Name (optional)</label>
          <input
            type="text"
            value={variableName || ''}
            onChange={(e) => setVariableName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {(component.type === 'dropdown' || component.type === 'multi-text-field') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {component.type === 'dropdown' ? 'Dropdown Options' : 'Checkbox Options'} (one per line)
            </label>
            <textarea
              value={options || ''}
              onChange={(e) => setOptions(e.target.value)}
              rows={4}
              placeholder={component.type === 'dropdown' 
                ? "Enter dropdown options (one per line)"
                : "Enter checkbox options (one per line)"}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {component.type === 'dropdown' 
                ? "These will appear as dropdown choices in the form." 
                : "Users will be able to select multiple options from this list."}
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComponentModal; 