import { MapManager } from '../core/MapManager';
import { Game } from './Game';

export enum EditorTool {
    TERRAIN = 'terrain',
    STATION = 'station',
    CLEAR = 'clear'
}

export class EditorManager {
    private game: Game;
    private isActive: boolean = false;
    private selectedTool: EditorTool = EditorTool.TERRAIN;
    private selectedBrush: string = 'GRASS'; // Terrain type or Station type

    constructor(game: Game) {
        this.game = game;
    }

    public setActive(active: boolean): void {
        this.isActive = active;
        const editorUI = document.getElementById('editor-ui');
        if (editorUI) {
            editorUI.style.display = active ? 'block' : 'none';
        }

        // Hide other UI when in editor
        const gameUI = document.getElementById('ui-layer');
        if (gameUI) {
            gameUI.style.display = active ? 'none' : 'block';
        }
    }

    public isEditorActive(): boolean {
        return this.isActive;
    }

    public setTool(tool: EditorTool, brush: string): void {
        this.selectedTool = tool;
        this.selectedBrush = brush;
        console.log(`Tool: ${tool}, Brush: ${brush}`);
        this.updateUI();
    }

    public handleClick(x: number, y: number): void {
        if (!this.isActive) return;

        const map = this.game.map;
        const tile = map.getTile(x, y);
        if (!tile) return;

        if (this.selectedTool === EditorTool.TERRAIN) {
            // Paint terrain
            // Can't paint over stations/tracks easily without clearing first
            if (tile.trackType === 'none') {
                tile.terrainType = this.selectedBrush as any;
            }
        } else if (this.selectedTool === EditorTool.STATION) {
            // Place station
            if (tile.trackType === 'none') {
                // Force place station (bypass cost)
                map.restoreStation(x, y, this.selectedBrush);
            }
        } else if (this.selectedTool === EditorTool.CLEAR) {
            // Clear tile
            tile.trackType = 'none';
            tile.terrainType = 'GRASS';
            tile.bitmaskValue = 0;
            tile.stationType = undefined;
            tile.produces = [];
            tile.accepts = [];

            // Update neighbors to fix track connections
            // Update neighbors to fix track connections
            map.updateNeighbors(x, y);

            // Clear selected spawn if it matches
            if (this.game.selectedSpawnStation && this.game.selectedSpawnStation.x === x && this.game.selectedSpawnStation.y === y) {
                this.game.selectedSpawnStation = null;
                this.game.updateUI();
            }
        }
    }

    public setupUI(): void {
        // Bind buttons
        document.getElementById('tool-grass')?.addEventListener('click', () => this.setTool(EditorTool.TERRAIN, 'GRASS'));
        document.getElementById('tool-water')?.addEventListener('click', () => this.setTool(EditorTool.TERRAIN, 'WATER'));
        document.getElementById('tool-forest')?.addEventListener('click', () => this.setTool(EditorTool.TERRAIN, 'FOREST'));
        document.getElementById('tool-mountain')?.addEventListener('click', () => this.setTool(EditorTool.TERRAIN, 'MOUNTAIN'));

        document.getElementById('tool-city')?.addEventListener('click', () => this.setTool(EditorTool.STATION, 'CITY'));
        document.getElementById('tool-coal')?.addEventListener('click', () => this.setTool(EditorTool.STATION, 'COAL_MINE'));
        document.getElementById('tool-iron')?.addEventListener('click', () => this.setTool(EditorTool.STATION, 'IRON_MINE'));
        document.getElementById('tool-steel')?.addEventListener('click', () => this.setTool(EditorTool.STATION, 'STEEL_MILL'));
        document.getElementById('tool-factory')?.addEventListener('click', () => this.setTool(EditorTool.STATION, 'TOOL_FACTORY'));

        document.getElementById('tool-clear')?.addEventListener('click', () => this.setTool(EditorTool.CLEAR, 'CLEAR'));

        document.getElementById('editor-exit')?.addEventListener('click', () => {
            this.setActive(false);
            this.game.menuManager.setState('main_menu' as any); // Go back to main menu
        });

        document.getElementById('editor-save')?.addEventListener('click', () => {
            this.game.saveGame();
            alert('Map Saved!');
        });
    }

    private updateUI(): void {
        // Highlight active tool
        const buttons = document.querySelectorAll('.editor-btn');
        buttons.forEach(btn => btn.classList.remove('active'));

        let id = '';
        if (this.selectedTool === EditorTool.TERRAIN) {
            if (this.selectedBrush === 'GRASS') id = 'tool-grass';
            if (this.selectedBrush === 'WATER') id = 'tool-water';
            if (this.selectedBrush === 'FOREST') id = 'tool-forest';
            if (this.selectedBrush === 'MOUNTAIN') id = 'tool-mountain';
        } else if (this.selectedTool === EditorTool.STATION) {
            if (this.selectedBrush === 'CITY') id = 'tool-city';
            if (this.selectedBrush === 'COAL_MINE') id = 'tool-coal';
            if (this.selectedBrush === 'IRON_MINE') id = 'tool-iron';
            if (this.selectedBrush === 'STEEL_MILL') id = 'tool-steel';
            if (this.selectedBrush === 'TOOL_FACTORY') id = 'tool-factory';
        } else {
            id = 'tool-clear';
        }

        if (id) {
            document.getElementById(id)?.classList.add('active');
        }
    }
}
