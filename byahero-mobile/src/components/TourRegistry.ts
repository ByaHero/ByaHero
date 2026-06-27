import { useState, useEffect } from 'react';

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type RegistryListener = (layouts: Record<string, LayoutRect>) => void;

class TourRegistry {
  private layouts: Record<string, LayoutRect> = {};
  private listeners = new Set<RegistryListener>();

  setLayout(key: string, rect: LayoutRect) {
    const prev = this.layouts[key];
    if (
      prev &&
      prev.x === rect.x &&
      prev.y === rect.y &&
      prev.width === rect.width &&
      prev.height === rect.height
    ) {
      return;
    }
    this.layouts[key] = rect;
    this.listeners.forEach(listener => listener({ ...this.layouts }));
  }

  getLayout(key: string): LayoutRect | undefined {
    return this.layouts[key];
  }

  subscribe(listener: RegistryListener) {
    this.listeners.add(listener);
    listener({ ...this.layouts });
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const tourRegistry = new TourRegistry();

export function useTourLayouts() {
  const [layouts, setLayouts] = useState<Record<string, LayoutRect>>({});

  useEffect(() => {
    return tourRegistry.subscribe(setLayouts);
  }, []);

  return layouts;
}

export const handleTourLayout = (key: string, ref: any) => {
  ref?.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
    if (width > 0 && height > 0) {
      tourRegistry.setLayout(key, { x, y, width, height });
    }
  });
};
