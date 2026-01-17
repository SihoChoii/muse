import { Effect } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

const fragmentShader = `
uniform float strength;
uniform float granularity;
uniform vec2 resolution;

const float sampleBayer[16] = float[](
    0.0/16.0, 12.0/16.0, 3.0/16.0, 15.0/16.0,
    8.0/16.0, 4.0/16.0, 11.0/16.0, 7.0/16.0,
    2.0/16.0, 14.0/16.0, 1.0/16.0, 13.0/16.0,
    10.0/16.0, 6.0/16.0, 9.0/16.0, 5.0/16.0
);

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Pixelate UV coordinates for dither pattern stability
    vec2 size = resolution / granularity;
    vec2 pixelUV = floor(uv * size);
    
    // Calculate Bayer matrix index
    int x = int(mod(pixelUV.x, 4.0));
    int y = int(mod(pixelUV.y, 4.0));
    int index = y * 4 + x;
    
    // Get threshold and shift to -0.5 to 0.5 range
    float threshold = sampleBayer[index] - 0.5;
    
    // Apply dither to input color
    // We add the threshold scaled by strength
    vec3 dithered = inputColor.rgb + threshold * strength;
    
    outputColor = vec4(dithered, inputColor.a);
}
`;

export class DitherEffectImpl extends Effect {
    constructor({ strength = 0.5, granularity = 1.0 } = {}) {
        super(
            'DitherEffect',
            fragmentShader,
            {
                uniforms: new Map([
                    ['strength', new Uniform(strength)],
                    ['granularity', new Uniform(granularity)],
                    ['resolution', new Uniform(new Vector2(1, 1))]
                ])
            }
        );
    }

    update(renderer, inputBuffer, deltaTime) {
        this.uniforms.get('resolution').value.set(inputBuffer.width, inputBuffer.height);
    }
}
