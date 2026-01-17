import React from 'react';

export interface VisualizerModule {
    id: string;
    name: string;
    description?: string;
    thumbnail: string; // URL or path
    component: React.ComponentType<any>;
    controls: React.ComponentType<any>;
}
