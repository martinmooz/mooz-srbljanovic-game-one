export interface RouteStop {
    x: number;
    y: number;
}

export interface Route {
    id: string;
    name: string;
    stops: RouteStop[];
    color: string;
    assignedTrains: string[];
}
