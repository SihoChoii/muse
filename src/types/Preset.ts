export interface Preset {
    id: string;
    name: string;
    visualizerId: string;
    version: number;
    createdAt: number;
    updatedAt: number;
    data: {
        visualizerConfig: any; // Specific config for the visualizer (e.g., CD speed, colors)
        globalEffects: any; // From useFxStore (Bloom, Glitch, etc.)
        lighting: any; // Future: Atmosphere settings
        background: any; // Future: Background settings
    };
}
