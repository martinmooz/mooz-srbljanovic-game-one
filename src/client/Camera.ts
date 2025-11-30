export class Camera {
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1;

    // Target values for smooth interpolation
    private targetX: number = 0;
    private targetY: number = 0;
    private targetZoom: number = 1;

    private minZoom: number = 0.5;
    private maxZoom: number = 2.0;

    // Lerp factor (0.1 = slow, 0.5 = fast)
    private lerpFactor: number = 0.1;

    constructor(initialX: number, initialY: number) {
        this.x = initialX;
        this.y = initialY;
        this.targetX = initialX;
        this.targetY = initialY;
    }

    public update() {
        // Smoothly interpolate current values towards targets
        this.x += (this.targetX - this.x) * this.lerpFactor;
        this.y += (this.targetY - this.y) * this.lerpFactor;
        this.zoom += (this.targetZoom - this.zoom) * this.lerpFactor;

        // Snap if very close to avoid micro-jitter
        if (Math.abs(this.targetX - this.x) < 0.1) this.x = this.targetX;
        if (Math.abs(this.targetY - this.y) < 0.1) this.y = this.targetY;
        if (Math.abs(this.targetZoom - this.zoom) < 0.001) this.zoom = this.targetZoom;
    }

    public move(dx: number, dy: number) {
        this.targetX += dx;
        this.targetY += dy;
    }

    public setPosition(x: number, y: number) {
        this.targetX = x;
        this.targetY = y;
    }

    public setZoom(zoom: number, centerX: number, centerY: number) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this.targetZoom = newZoom;
    }

    public zoomIn(amount: number) {
        this.targetZoom = Math.min(this.maxZoom, this.targetZoom + amount);
    }

    public zoomOut(amount: number) {
        this.targetZoom = Math.max(this.minZoom, this.targetZoom - amount);
    }
}
