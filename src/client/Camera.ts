export class Camera {
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1;

    private minZoom: number = 0.5;
    private maxZoom: number = 2.0;

    constructor(initialX: number, initialY: number) {
        this.x = initialX;
        this.y = initialY;
    }

    public move(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }

    public setZoom(zoom: number, centerX: number, centerY: number) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));

        // Zoom towards center
        const scaleChange = newZoom - this.zoom;
        // This is a simplified zoom, we might need more complex math for precise mouse-centered zoom
        // For now, let's just clamp.

        this.zoom = newZoom;
    }

    public zoomIn(amount: number) {
        this.zoom = Math.min(this.maxZoom, this.zoom + amount);
    }

    public zoomOut(amount: number) {
        this.zoom = Math.max(this.minZoom, this.zoom - amount);
    }
}
