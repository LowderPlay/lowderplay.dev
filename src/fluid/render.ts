import {
  advectionProgram,
  blit,
  blurProgram,
  clearProgram,
  curl,
  curlProgram,
  displayMaterial,
  ditheringTexture,
  divergence,
  divergenceProgram,
  dye,
  FrameBufferObject,
  gradientSubtractProgram,
  initFrameBuffers,
  pressure,
  pressureProgram,
  splatProgram,
  velocity,
  vorticityProgram
} from './shaders/shaders.ts';
import {config} from './config.ts';
import {applyBloom, bloom} from './shaders/bloom.ts';
import {applySunRays, sunRays, sunRaysTemp} from './shaders/sunRays.ts';
import {ext, gl} from './glContext.ts';
import {canvas, resizeCanvas} from './canvas.ts';

export class Pointer {
  public texCoordX = 0;
  public texCoordY = 0;
  public prevTexCoordX = 0;
  public prevTexCoordY = 0;
  public deltaX = 0;
  public deltaY = 0;
  public moved = false;
}

export const pointer = new Pointer();

function applyInputs() {
  if (pointer.moved) {
    pointer.moved = false;
    splatPointer(pointer);
  }
}

let lastUpdateTime = Date.now();
export function update() {
  const dt = calcDeltaTime();
  if (resizeCanvas())
    initFrameBuffers();
  applyInputs();
  step(dt);
  render(null);
  requestAnimationFrame(update);
}

function calcDeltaTime() {
  let now = Date.now();
  let dt = (now - lastUpdateTime) / 1000;
  dt = Math.min(dt, 0.016666);
  lastUpdateTime = now;
  return dt;
}

function step(dt: number) {
  gl.disable(gl.BLEND);

  curlProgram.bind();
  gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
  blit(curl);

  vorticityProgram.bind();
  gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
  gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
  gl.uniform1f(vorticityProgram.uniforms.dt, dt);
  blit(velocity.write);
  velocity.swap();

  divergenceProgram.bind();
  gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
  blit(divergence);

  clearProgram.bind();
  gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
  gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
  blit(pressure.write);
  pressure.swap();

  pressureProgram.bind();
  gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
  for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
    gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
    blit(pressure.write);
    pressure.swap();
  }

  gradientSubtractProgram.bind();
  gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
  gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
  blit(velocity.write);
  velocity.swap();

  advectionProgram.bind();
  gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  if (!ext.supportLinearFiltering)
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
  let velocityId = velocity.read.attach(0);
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
  gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
  gl.uniform1f(advectionProgram.uniforms.dt, dt);
  gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
  blit(velocity.write);
  velocity.swap();

  if (!ext.supportLinearFiltering)
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
  gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
  blit(dye.write);
  dye.swap();
}

function render(target: FrameBufferObject | null) {
  if (config.BLOOM)
    applyBloom(dye.read, bloom);
  if (config.SUN_RAYS) {
    applySunRays(dye.read, dye.write, sunRays);
    blur(sunRays, sunRaysTemp, 1);
  }

  gl.disable(gl.BLEND);

  drawDisplay(target);
}

function drawDisplay(target: FrameBufferObject | null) {
  let width = target == null ? gl.drawingBufferWidth : target.width;
  let height = target == null ? gl.drawingBufferHeight : target.height;

  displayMaterial.bind();
  if (config.SHADING) {
    gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
  }
  gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
  if (config.BLOOM) {
    gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
  }
  if (config.DITHERING) {
    gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2));
    let scale = getTextureScale(ditheringTexture, width, height);
    gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
  }
  if (config.SUN_RAYS) {
    gl.uniform1i(displayMaterial.uniforms.uSunrays, sunRays.attach(3));
  }
  blit(target);
}

function blur(target: FrameBufferObject, temp: FrameBufferObject, iterations: number) {
  blurProgram.bind();
  for (let i = 0; i < iterations; i++) {
    gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
    gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
    blit(temp);

    gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
    gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
    blit(target);
  }
}

export function splatPointer(pointer: Pointer) {
  let dx = pointer.deltaX * config.SPLAT_FORCE;
  let dy = pointer.deltaY * config.SPLAT_FORCE;
  splat(pointer.texCoordX, pointer.texCoordY, dx, dy);
}

export function splat(x: number, y: number, dx: number, dy: number) {
  splatProgram.bind();
  gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
  gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
  gl.uniform2f(splatProgram.uniforms.point, x, y);
  gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
  gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
  blit(velocity.write);
  velocity.swap();

  gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
  const {r, g, b} = config.COLOR;
  gl.uniform3f(splatProgram.uniforms.color, r, g, b);
  blit(dye.write);
  dye.swap();
}

function correctRadius(radius: number) {
  let aspectRatio = canvas.width / canvas.height;
  if (aspectRatio > 1)
    radius *= aspectRatio;
  return radius;
}

export function correctDeltaX(delta: number) {
  let aspectRatio = canvas.width / canvas.height;
  if (aspectRatio < 1) delta *= aspectRatio;
  return delta;
}

export function correctDeltaY(delta: number) {
  let aspectRatio = canvas.width / canvas.height;
  if (aspectRatio > 1) delta /= aspectRatio;
  return delta;
}

function getTextureScale(texture: { width: number, height: number }, width: number, height: number) {
  return {
    x: width / texture.width,
    y: height / texture.height
  };
}