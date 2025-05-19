// Define the types of components that can be inserted
export type ComponentType = 'text-field' | 'dropdown' | 'multi-text-field';

// Interface for the component metadata
export interface ComponentMetadata {
  id: string;
  type: ComponentType;
  label: string;
  attributes?: Record<string, any>;
}

/**
 * Utility class to store and manage component metadata
 */
class ComponentStore {
  private components: Map<string, ComponentMetadata>;

  constructor() {
    this.components = new Map();
  }

  /**
   * Add a new component to the store
   */
  addComponent(metadata: ComponentMetadata): void {
    this.components.set(metadata.id, metadata);
  }

  /**
   * Get a component by its ID
   */
  getComponent(id: string): ComponentMetadata | undefined {
    return this.components.get(id);
  }

  /**
   * Update a component's metadata
   */
  updateComponent(id: string, metadata: Partial<ComponentMetadata>): void {
    const existingComponent = this.components.get(id);
    if (existingComponent) {
      this.components.set(id, { ...existingComponent, ...metadata });
    }
  }

  /**
   * Remove a component from the store
   */
  removeComponent(id: string): boolean {
    return this.components.delete(id);
  }

  /**
   * Clear all components from the store
   */
  clearComponents(): void {
    this.components.clear();
  }

  /**
   * Get all components
   */
  getAllComponents(): ComponentMetadata[] {
    return Array.from(this.components.values());
  }

  /**
   * Get components by type
   */
  getComponentsByType(type: ComponentType): ComponentMetadata[] {
    return this.getAllComponents().filter(component => component.type === type);
  }
}

// Export a singleton instance
export const componentStore = new ComponentStore(); 