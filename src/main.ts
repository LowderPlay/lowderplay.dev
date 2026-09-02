import { canvas, scaleByPixelRatio } from "./fluid/canvas.ts";
import { isMobile } from "./fluid/config.ts";
import {
	correctDeltaX,
	correctDeltaY,
	pointer,
	splat,
	update,
} from "./fluid/render.ts";
import { initFrameBuffers } from "./fluid/shaders/shaders.ts";

// Declare global window property for toast notification
declare global {
	interface Window {
		showToast: (message: string) => void;
	}
}

// 1. Initialize WebGL Fluid Simulation
initFrameBuffers();
multipleSplats(Math.floor(Math.random() * 15) + 5);
update();

const shake = document.getElementById("shake")!;
if (isMobile()) {
	shake.style.opacity = "1";
}

function multipleSplats(amount: number) {
	for (let i = 0; i < amount; i++) {
		const x = Math.random();
		const y = Math.random();
		const dx = 4000 * (Math.random() - 0.5);
		const dy = 4000 * (Math.random() - 0.5);
		splat(x, y, dx, dy);
	}
}

// Pointer Move Event for Smoke Canvas
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") return;
	const posX = scaleByPixelRatio(e.pageX - window.scrollX);
	const posY = scaleByPixelRatio(e.pageY - window.scrollY);

	pointer.prevTexCoordX = pointer.texCoordX;
	pointer.prevTexCoordY = pointer.texCoordY;
	pointer.texCoordX = posX / canvas.width;
	pointer.texCoordY = 1.0 - posY / canvas.height;
	pointer.deltaX = correctDeltaX(pointer.texCoordX - pointer.prevTexCoordX);
	pointer.deltaY = correctDeltaY(pointer.texCoordY - pointer.prevTexCoordY);
	pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
});

// Device Motion Acceleration for Mobile Smoke
window.addEventListener("devicemotion", (event) => {
	if (!event.acceleration?.x || !event.acceleration?.y) return;
	const isX = Math.abs(event.acceleration.x) > 5;
	const isY = Math.abs(event.acceleration.y) > 5;
	if (isX || isY) {
		shake.style.opacity = "0";
		const x = 0.5 + event.acceleration.x / 30;
		const y = 0.5 + event.acceleration.y / 30;
		splat(x, y, event.acceleration.x * 300, event.acceleration.y * 300);
	} else if (event.acceleration.z && Math.abs(event.acceleration.z) > 5) {
		splat(0.5, 0.5, 200 * (Math.random() - 0.5), 200 * (Math.random() - 0.5));
	}
});

// 2. Project Category Filtering
const filterButtons = document.querySelectorAll<HTMLButtonElement>(
	".project-filter-btn",
);
const projectCards = document.querySelectorAll<HTMLElement>(".project-card");

filterButtons.forEach((btn) => {
	btn.addEventListener("click", () => {
		const filter = btn.getAttribute("data-filter");

		// Update active button text styles
		filterButtons.forEach((b) => {
			b.classList.remove("text-red-500", "font-bold", "underline");
			b.classList.add("text-zinc-400");
		});
		btn.classList.remove("text-zinc-400");
		btn.classList.add("text-red-500", "font-bold", "underline");

		// Show/Hide project cards
		projectCards.forEach((card) => {
			const category = card.getAttribute("data-category");
			if (filter === "all" || category === filter) {
				card.style.display = "block";
			} else {
				card.style.display = "none";
			}
		});

		// Trigger subtle smoke splat on tab switch
		multipleSplats(3);
	});
});

// 3. Global Toast Notification Helper
window.showToast = (message: string) => {
	const toast = document.getElementById("toast");
	const toastMsg = document.getElementById("toast-message");
	if (!toast || !toastMsg) return;

	toastMsg.textContent = message;
	toast.classList.remove("translate-y-20", "opacity-0");
	toast.classList.add("translate-y-0", "opacity-100");

	setTimeout(() => {
		toast.classList.remove("translate-y-0", "opacity-100");
		toast.classList.add("translate-y-20", "opacity-0");
	}, 2500);
};
