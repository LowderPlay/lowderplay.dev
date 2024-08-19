import {blit, compileShader, createFBO, FrameBufferObject} from './shaders.ts';
import {ext, getResolution, gl} from '../glContext.ts';
import {config} from '../config.ts';
import {Program} from './program.ts';
import {baseVertexShader} from './sources/base.ts';

const sunRaysMaskShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float br = max(c.r, max(c.g, c.b));
        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
        gl_FragColor = c;
    }
`);
const sunRaysShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;

    #define ITERATIONS 16

    void main () {
        float Density = 0.3;
        float Decay = 0.95;
        float Exposure = 0.7;

        vec2 coord = vUv;
        vec2 dir = vUv - 0.5;

        dir *= 1.0 / float(ITERATIONS) * Density;
        float illuminationDecay = 1.0;

        float color = texture2D(uTexture, vUv).a;

        for (int i = 0; i < ITERATIONS; i++)
        {
            coord -= dir;
            float col = texture2D(uTexture, coord).a;
            color += col * illuminationDecay * weight;
            illuminationDecay *= Decay;
        }

        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
`);
export const sunRaysMaskProgram = new Program(baseVertexShader, sunRaysMaskShader);
export const sunRaysProgram = new Program(baseVertexShader, sunRaysShader);
export let sunRays: FrameBufferObject;
export let sunRaysTemp: FrameBufferObject;

export function initSunRaysFrameBuffers() {
  let res = getResolution(config.SUN_RAYS_RESOLUTION);

  const texType = ext.halfFloatTexType;
  const r = ext.formatR;
  const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

  sunRays = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
  sunRaysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
}

export function applySunRays(source: FrameBufferObject, mask: FrameBufferObject, destination: FrameBufferObject) {
  gl.disable(gl.BLEND);
  sunRaysMaskProgram.bind();
  gl.uniform1i(sunRaysMaskProgram.uniforms.uTexture, source.attach(0));
  blit(mask);

  sunRaysProgram.bind();
  gl.uniform1f(sunRaysProgram.uniforms.weight, config.SUN_RAYS_WEIGHT);
  gl.uniform1i(sunRaysProgram.uniforms.uTexture, mask.attach(0));
  blit(destination);
}