import {canvas, scaleByPixelRatio} from './fluid/canvas.ts';
import {initFrameBuffers} from './fluid/shaders/shaders.ts';
import {correctDeltaX, correctDeltaY, pointer, splat, update} from './fluid/render.ts';

initFrameBuffers();
multipleSplats(Math.floor(Math.random() * 20) + 5);

update();

function multipleSplats(amount: number) {
  for (let i = 0; i < amount; i++) {
    const x = Math.random();
    const y = Math.random();
    const dx = 5000 * (Math.random() - 0.5);
    const dy = 5000 * (Math.random() - 0.5);
    splat(x, y, dx, dy);
  }
}

document.body.addEventListener('pointermove', e => {
  if(e.pointerType === "touch") return;
  let posX = scaleByPixelRatio(e.pageX);
  let posY = scaleByPixelRatio(e.pageY);

  pointer.prevTexCoordX = pointer.texCoordX;
  pointer.prevTexCoordY = pointer.texCoordY;
  pointer.texCoordX = posX / canvas.width;
  pointer.texCoordY = 1.0 - posY / canvas.height;
  pointer.deltaX = correctDeltaX(pointer.texCoordX - pointer.prevTexCoordX);
  pointer.deltaY = correctDeltaY(pointer.texCoordY - pointer.prevTexCoordY);
  pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
});

window.addEventListener("devicemotion", (event) => {
  if (!event.acceleration?.x || !event.acceleration?.y) return;
  const isX = Math.abs(event.acceleration.x) > 5;
  const isY = Math.abs(event.acceleration.y) > 5;
  if(isX || isY) {
    const x = 0.5 + event.acceleration.x / 30;
    const y = 0.5 + event.acceleration.y / 30;
    splat(x, y, event.acceleration.x * 300, event.acceleration.y * 300);
  } else if(event.acceleration.z && Math.abs(event.acceleration.z) > 5) {
    splat(0.5, 0.5, 200 * (Math.random() - 0.5), 200 * (Math.random() - 0.5));
  }
});

