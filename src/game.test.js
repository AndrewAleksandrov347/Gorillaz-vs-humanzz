import { describe, it, expect, vi } from 'vitest';

// Setup DOM elements required by game.js
function setupDOM() {
  document.body.innerHTML = `
    <canvas id="gameCanvas"></canvas>
    <div id="score"></div>
    <div id="lives"></div>
    <div id="gameOverScreen"></div>
    <div id="finalScore"></div>
    <button id="restartButton"></button>
    <div id="messageBox"></div>
  `;
}

describe('game initialization', () => {
  it('attaches to canvas element', async () => {
    vi.useFakeTimers();
    global.requestAnimationFrame = vi.fn();
    setupDOM();

    await import('./game.js');

    const canvas = document.getElementById('gameCanvas');
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(450);
  });
});
