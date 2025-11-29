export class TrackUtilities {
    /**
     * Calculates the bitmask for a tile based on its neighbors.
     * 
     * The bitmask is calculated using 8 bits:
     * Bits 0-3: Cardinal directions (North, East, South, West)
     * Bits 4-7: Diagonal directions (North-East, South-East, South-West, North-West)
     * 
     * @param neighborTracks An array of 8 booleans representing the presence of a track in the following order:
     *                       [N, E, S, W, NE, SE, SW, NW]
     * @returns The calculated bitmask value.
     */
    public static calculateBitmask(neighborTracks: boolean[]): number {
        if (neighborTracks.length !== 8) {
            throw new Error("neighborTracks array must contain exactly 8 boolean values.");
        }

        let bitmask = 0;

        // Cardinal directions (Bits 0-3: N, E, S, W)
        if (neighborTracks[0]) bitmask |= 1 << 0; // North
        if (neighborTracks[1]) bitmask |= 1 << 1; // East
        if (neighborTracks[2]) bitmask |= 1 << 2; // South
        if (neighborTracks[3]) bitmask |= 1 << 3; // West

        // Diagonal directions (Bits 4-7: NE, SE, SW, NW)
        // Note: Diagonals usually only matter if the adjacent cardinals are also present, 
        // but for raw bitmasking we just map them directly as requested.
        if (neighborTracks[4]) bitmask |= 1 << 4; // North-East
        if (neighborTracks[5]) bitmask |= 1 << 5; // South-East
        if (neighborTracks[6]) bitmask |= 1 << 6; // South-West
        if (neighborTracks[7]) bitmask |= 1 << 7; // North-West

        return bitmask;
    }
}
