import {plausible} from '../analytics.ts';
import {canvas} from './canvas.ts';

export function getWebGLContext(canvas: HTMLCanvasElement) {
  const params = {alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false};

  let ctx = canvas.getContext('webgl2', params);
  let isWebGL2 = !!ctx;
  if (!isWebGL2)
    ctx = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);

  let gl = ctx! as WebGLRenderingContext | WebGL2RenderingContext;

  let supportLinearFiltering;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
  } else {
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  const halfFloatTexType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT :
    gl.getExtension('OES_texture_half_float')!.HALF_FLOAT_OES;
  let formatRGBA;
  let formatRG;
  let formatR;

  if (isWebGL2) {
    formatRGBA = getSupportedFormat(gl, (gl as WebGL2RenderingContext).RGBA16F, gl.RGBA, halfFloatTexType)!;
    formatRG = getSupportedFormat(gl, (gl as WebGL2RenderingContext).RG16F, (gl as WebGL2RenderingContext).RG, halfFloatTexType)!;
    formatR = getSupportedFormat(gl, (gl as WebGL2RenderingContext).R16F, (gl as WebGL2RenderingContext).RED, halfFloatTexType)!;
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)!;
    formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)!;
    formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)!;
  }

  plausible.trackPageview({}, {
    props: {
      webGl: isWebGL2 ? 'webgl2' : 'webgl',
      formatRGBA: formatRGBA == null ? 'not supported' : 'supported'
    }
  });

  return {
    gl,
    ext: {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering
    }
  };
}

function getSupportedFormat(gl: WebGL2RenderingContext | WebGLRenderingContext, internalFormat: number, format: number, type: number) {
  if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
    switch (internalFormat) {
      case (gl as WebGL2RenderingContext).R16F:
        return getSupportedFormat(gl, (gl as WebGL2RenderingContext).RG16F, (gl as WebGL2RenderingContext).RG, type);
      case (gl as WebGL2RenderingContext).RG16F:
        return getSupportedFormat(gl, (gl as WebGL2RenderingContext).RGBA16F, (gl as WebGL2RenderingContext).RGBA, type);
      default:
        return null;
    }
  }

  return {
    internalFormat,
    format
  }
}

function supportRenderTextureFormat(gl: WebGL2RenderingContext | WebGLRenderingContext, internalFormat: number, format: number, type: number) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

  let fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  return status == gl.FRAMEBUFFER_COMPLETE;
}

export function getResolution(resolution: number) {
  let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
  if (aspectRatio < 1)
    aspectRatio = 1.0 / aspectRatio;

  let min = Math.round(resolution);
  let max = Math.round(resolution * aspectRatio);

  if (gl.drawingBufferWidth > gl.drawingBufferHeight)
    return { width: max, height: min };
  else
    return { width: min, height: max };
}

const { gl, ext } = getWebGLContext(canvas);

export { gl, ext };
