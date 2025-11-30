import { Route, RouteStop } from '../core/Route';

export class RouteManager {
    private routes: Route[] = [];

    constructor() {
        // Load routes from storage if needed (future)
    }

    public createRoute(name: string, color: string): Route {
        const newRoute: Route = {
            id: this.generateId(),
            name: name,
            stops: [],
            color: color,
            assignedTrains: []
        };
        this.routes.push(newRoute);
        return newRoute;
    }

    public deleteRoute(id: string): void {
        this.routes = this.routes.filter(r => r.id !== id);
        // Logic to unassign trains from this route should be handled elsewhere or here
    }

    public getRoute(id: string): Route | undefined {
        return this.routes.find(r => r.id === id);
    }

    public getAllRoutes(): Route[] {
        return this.routes;
    }

    public addStop(routeId: string, x: number, y: number): void {
        const route = this.getRoute(routeId);
        if (route) {
            route.stops.push({ x, y });
        }
    }

    public removeStop(routeId: string, index: number): void {
        const route = this.getRoute(routeId);
        if (route && index >= 0 && index < route.stops.length) {
            route.stops.splice(index, 1);
        }
    }

    private generateId(): string {
        return 'route_' + Math.random().toString(36).substr(2, 9);
    }
}
