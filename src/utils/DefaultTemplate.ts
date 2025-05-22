import { ComponentType, ComponentMetadata, componentStore } from './ComponentStore';

// Define the template data structure
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
const generateSectionId = (): string => {
  return `section-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const generateComponentId = (): string => {
  // Using fixed strings for IDs to ensure consistency
  return `walkthrough-component-${Math.floor(Math.random() * 1000)}`;
};

// Format component span for inclusion in content based on its type
const formatComponentSpan = (component: ComponentMetadata): string => {
  // Determine the appropriate styling class based on component type
  let styleClass = '';
  switch(component.type) {
    case 'text-field':
      styleClass = 'bg-blue-100 text-blue-800 border border-blue-300';
      break;
    case 'dropdown':
      styleClass = 'bg-green-100 text-green-800 border border-green-300';
      break;
    case 'multi-text-field':
      styleClass = 'bg-purple-100 text-purple-800 border border-purple-300';
      break;
    default:
      styleClass = 'bg-gray-100 text-gray-800 border border-gray-300';
  }
  
  return `<span id="${component.id}" data-component="true" data-type="${component.type}" data-id="${component.id}" title="Double-click to edit" contenteditable="false" class="relative inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium mx-1 group cursor-pointer ${styleClass}"><span>${component.label}</span><span data-action="delete" aria-hidden="true" class="ml-1.5 text-gray-500 hover:text-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">×</span></span>`;
};

// Create the walkthrough template
export const createWalkthroughTemplate = (): TemplateData => {
  // Clear the component store to ensure a clean state
  componentStore.clearComponents();
  
  // Create components array to store unique components
  const components: ComponentMetadata[] = [];
  
  // Create each component with a unique ID and variable name
  // User Name - Text Field
  const userNameComponent: ComponentMetadata = {
    id: 'walkthrough-userName-field',
    type: 'text-field',
    label: 'User Name',
    attributes: {
      variableName: 'userName'
    }
  };
  components.push(userNameComponent);
  
  // Template Purpose - Text Field
  const purposeComponent: ComponentMetadata = {
    id: 'walkthrough-purpose-field',
    type: 'text-field',
    label: 'Purpose of this template',
    attributes: {
      variableName: 'templatePurpose'
    }
  };
  components.push(purposeComponent);
  
  // Tool Feedback - Dropdown
  const feedbackComponent: ComponentMetadata = {
    id: 'walkthrough-feedback-dropdown',
    type: 'dropdown',
    label: 'Tool Feedback',
    attributes: {
      variableName: 'toolFeedback',
      options: [
        'Very Helpful 🌟',
        'Somewhat Helpful 🤔',
        'Needs Work 🛠️'
      ]
    }
  };
  components.push(feedbackComponent);
  
  // Feature Highlights - Multi Text Field
  const highlightsComponent: ComponentMetadata = {
    id: 'walkthrough-highlights-multitext',
    type: 'multi-text-field',
    label: 'Feature Highlights',
    attributes: {
      variableName: 'featureHighlights',
      options: [
        '💡 Reusable variables',
        '📤 Export / 📥 Import support',
        '🧩 Multi-section templates',
        '🎛️ Optional section toggles',
        '🔀 Rearranging sections with arrows'
      ]
    }
  };
  components.push(highlightsComponent);
  
  // Add each component to the store
  components.forEach(component => {
    componentStore.addComponent(component);
  });
  
  // Get variable names safely with fallbacks
  const userNameVar = userNameComponent.attributes?.variableName || 'userName';
  const purposeVar = purposeComponent.attributes?.variableName || 'templatePurpose';
  const feedbackVar = feedbackComponent.attributes?.variableName || 'toolFeedback';
  const highlightsVar = highlightsComponent.attributes?.variableName || 'featureHighlights';
  
  // Create sections
  const sections: Section[] = [];
  
  // Section 1: "🔒 Variable Input (Hidden)"
  const section1: Section = {
    id: generateSectionId(),
    title: '🔒 Variable Input (Hidden)',
    content: `
      <p><span id="${userNameComponent.id}" data-component="true" data-type="text-field" data-id="${userNameComponent.id}" title="Double-click to edit" contenteditable="false" class="relative inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium mx-1 group cursor-pointer bg-blue-100 text-blue-800 border border-blue-300"><span>User Name</span><span data-action="delete" aria-hidden="true" class="ml-1.5 text-gray-500 hover:text-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">×</span></span></p>
      <p><span id="${purposeComponent.id}" data-component="true" data-type="text-field" data-id="${purposeComponent.id}" title="Double-click to edit" contenteditable="false" class="relative inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium mx-1 group cursor-pointer bg-blue-100 text-blue-800 border border-blue-300"><span>Purpose of this template</span><span data-action="delete" aria-hidden="true" class="ml-1.5 text-gray-500 hover:text-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">×</span></span></p>
      <p><span id="${feedbackComponent.id}" data-component="true" data-type="dropdown" data-id="${feedbackComponent.id}" title="Double-click to edit" contenteditable="false" class="relative inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium mx-1 group cursor-pointer bg-green-100 text-green-800 border border-green-300"><span>Tool Feedback</span><span data-action="delete" aria-hidden="true" class="ml-1.5 text-gray-500 hover:text-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">×</span></span></p>
      <p><span id="${highlightsComponent.id}" data-component="true" data-type="multi-text-field" data-id="${highlightsComponent.id}" title="Double-click to edit" contenteditable="false" class="relative inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium mx-1 group cursor-pointer bg-purple-100 text-purple-800 border border-purple-300"><span>Feature Highlights</span><span data-action="delete" aria-hidden="true" class="ml-1.5 text-gray-500 hover:text-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">×</span></span></p>
    `,
    enabled: false
  };
  sections.push(section1);
  
  // Section 2: "📝 Text Fields + Variables"
  const section2: Section = {
    id: generateSectionId(),
    title: '📝 Text Fields + Variables',
    content: `
      <p>👋 Hello, {${userNameVar}}!</p>
      <p>Welcome to the template builder walkthrough. This demo is designed to show off the features of this app ✨</p>
      <p>You're currently using this template for: {${purposeVar}} 🛠️</p>
      <p>Try clicking 🔒 'Lock Template' and then ✅ 'Fill Template' to test how it all works.</p>
      <p>🗂️ You can also Export or Import templates using the buttons above!</p>
    `,
    enabled: true
  };
  sections.push(section2);
  
  // Section 3: "🔽 Dropdowns + Fill Mode"
  const section3: Section = {
    id: generateSectionId(),
    title: '🔽 Dropdowns + Fill Mode',
    content: `
      <p>🧠 Here's an example of a dropdown reference:</p>
      <p>Your feedback about the tool so far: {${feedbackVar}} 📊</p>
      <p>Switch between 🔒 'Lock' and ✅ 'Fill' mode to try it out!</p>
    `,
    enabled: true
  };
  sections.push(section3);
  
  // Section 4: "📋 Multi-Text + Referenced Variables"
  const section4: Section = {
    id: generateSectionId(),
    title: '📋 Multi-Text + Referenced Variables',
    content: `
      <p>🚀 Highlighted Features for {${userNameVar}}:</p>
      <p>{${highlightsVar}}</p>
      <p>The items above come from a multi-text field, and you can select more than one 🧩</p>
      <p>They even support variable references like this one ➡️ {${purposeVar}}!</p>
    `,
    enabled: false
  };
  sections.push(section4);
  
  // Create the template data object with the unique component list
  return {
    version: '1.0',
    sections,
    components
  };
};

// Function to check if the template editor is empty
export const isTemplateEmpty = (sections: Section[]): boolean => {
  if (!sections || sections.length === 0) return true;
  
  // Check if there's only one section with no content
  if (sections.length === 1) {
    const section = sections[0];
    return !section.content || section.content.trim() === '';
  }
  
  return false;
}; 