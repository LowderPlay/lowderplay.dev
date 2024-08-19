import {ext} from './glContext.ts';

let config = {
  COLOR: {r: 1.5, g: 0, b: 0},
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 0.8,
  VELOCITY_DISSIPATION: 0.1,
  PRESSURE: 0.07,
  PRESSURE_ITERATIONS: 20,
  CURL: 2,
  SPLAT_RADIUS: 0.03,
  SPLAT_FORCE: 10000,
  SHADING: true,
  DITHERING: true,
  BLOOM: true,
  BLOOM_ITERATIONS: 8,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUN_RAYS: true,
  SUN_RAYS_RESOLUTION: 196,
  SUN_RAYS_WEIGHT: 1.0,
};

if (isMobile()) {
  config.DYE_RESOLUTION = 512;
}
if (!ext.supportLinearFiltering) {
  config.DYE_RESOLUTION = 512;
  config.SHADING = false;
  config.BLOOM = false;
  config.SUN_RAYS = false;
}

function isMobile () {
  return /Mobi|Android/i.test(navigator.userAgent);
}

export {config};