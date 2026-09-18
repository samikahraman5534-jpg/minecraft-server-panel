// High Performance Sakura Petals Animation Engine (HTML5 Canvas)
class SakuraEngine {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.id = 'sakura-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '0';
    this.canvas.style.opacity = '0.9';

    document.body.prepend(this.canvas);

    this.petals = [];
    this.maxPetals = 45;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    for (let i = 0; i < this.maxPetals; i++) {
      this.petals.push(this.createPetal(true));
    }

    this.animate();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  createPetal(randomY = false) {
    const shades = [
      { r: 255, g: 183, b: 197 }, // Soft cherry pink
      { r: 255, g: 198, b: 212 }, // Pale sakura
      { r: 244, g: 114, b: 182 }, // Vibrant petal pink
      { r: 253, g: 164, b: 175 }, // Rose blossom
      { r: 255, g: 220, b: 230 }  // Light blossom white-pink
    ];
    const shade = shades[Math.floor(Math.random() * shades.length)];

    return {
      x: Math.random() * (this.width + 200) - 100,
      y: randomY ? Math.random() * this.height : -20,
      size: Math.random() * 8 + 7,
      speedX: Math.random() * 1.5 - 2.2, // Drift to bottom-left
      speedY: Math.random() * 1.2 + 0.8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 1.8,
      flip: Math.random() * Math.PI,
      flipSpeed: Math.random() * 0.03 + 0.01,
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.02 + 0.01,
      opacity: Math.random() * 0.4 + 0.5,
      color: shade
    };
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];

      p.swayOffset += p.swaySpeed;
      p.flip += p.flipSpeed;
      p.rotation += p.rotationSpeed;

      const swayX = Math.sin(p.swayOffset) * 1.2;
      p.x += p.speedX + swayX;
      p.y += p.speedY;

      // Draw Petal
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.scale(Math.cos(p.flip), 1);

      this.ctx.beginPath();
      // Draw realistic curved sakura petal shape
      const w = p.size;
      const h = p.size * 1.35;

      this.ctx.moveTo(0, -h / 2);
      this.ctx.bezierCurveTo(w / 2, -h / 2, w, 0, 0, h / 2);
      this.ctx.bezierCurveTo(-w, 0, -w / 2, -h / 2, 0, -h / 2);

      const grad = this.ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`);
      grad.addColorStop(1, `rgba(${p.color.r - 20}, ${p.color.g - 30}, ${p.color.b - 20}, ${p.opacity * 0.85})`);

      this.ctx.fillStyle = grad;
      this.ctx.shadowColor = 'rgba(244, 114, 182, 0.4)';
      this.ctx.shadowBlur = 4;
      this.ctx.fill();
      this.ctx.restore();

      // Reset if out of bounds
      if (p.y > this.height + 20 || p.x < -150 || p.x > this.width + 150) {
        this.petals[i] = this.createPetal(false);
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.sakuraEngine = new SakuraEngine();
});
