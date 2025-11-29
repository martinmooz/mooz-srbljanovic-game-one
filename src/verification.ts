import { TrackUtilities } from './core/TrackUtilities';
import { RevenueSimulator } from './simulation/RevenueSimulator';
import { TrainType } from './core/TrainActor';

function verifyBitmask() {
    console.log("--- Verifying TrackUtilities.calculateBitmask ---");

    // Test Case 1: No neighbors
    const neighbors1 = [false, false, false, false, false, false, false, false];
    const mask1 = TrackUtilities.calculateBitmask(neighbors1);
    console.log(`No neighbors: Expected 0, Got ${mask1} -> ${mask1 === 0 ? 'PASS' : 'FAIL'}`);

    // Test Case 2: North and South (Vertical Straight)
    // N=0, E=1, S=2, W=3
    const neighbors2 = [true, false, true, false, false, false, false, false];
    const mask2 = TrackUtilities.calculateBitmask(neighbors2);
    // Bits: N(1<<0) | S(1<<2) = 1 | 4 = 5
    console.log(`North & South: Expected 5, Got ${mask2} -> ${mask2 === 5 ? 'PASS' : 'FAIL'}`);

    // Test Case 3: All Cardinals (Crossing)
    const neighbors3 = [true, true, true, true, false, false, false, false];
    const mask3 = TrackUtilities.calculateBitmask(neighbors3);
    // Bits: 1 | 2 | 4 | 8 = 15
    console.log(`All Cardinals: Expected 15, Got ${mask3} -> ${mask3 === 15 ? 'PASS' : 'FAIL'}`);

    // Test Case 4: North-East Corner with Diagonal
    // N=true, E=true, NE=true
    const neighbors4 = [true, true, false, false, true, false, false, false];
    const mask4 = TrackUtilities.calculateBitmask(neighbors4);
    // Bits: N(1) | E(2) | NE(16) = 19
    console.log(`N, E, NE: Expected 19, Got ${mask4} -> ${mask4 === 19 ? 'PASS' : 'FAIL'}`);
}

function verifyRevenue() {
    console.log("\n--- Verifying RevenueSimulator.calculateRevenue ---");
    const simulator = new RevenueSimulator();
    const cargoValue = 1000;
    const distance = 100;
    const speed = 100; // 100 kph

    // T_Ideal = (100 * 20) / 100 = 20 days (based on our formula)
    const tIdeal = 20;

    // Test Case 1: On Time (T = T_Ideal)
    // P = 1 / (1 + (20/20)^2) = 1 / 2 = 0.5
    const rev1 = simulator.calculateRevenue(cargoValue, distance, tIdeal, speed);
    console.log(`On Time (${tIdeal} days): Expected ~500, Got ${rev1.toFixed(2)}`);

    // Test Case 2: Early (T = 10 days)
    // P = 1 / (1 + (10/20)^2) = 1 / (1 + 0.25) = 1 / 1.25 = 0.8
    const rev2 = simulator.calculateRevenue(cargoValue, distance, 10, speed);
    console.log(`Early (10 days): Expected ~800, Got ${rev2.toFixed(2)}`);

    // Test Case 3: Late (T = 40 days, 2x T_Ideal)
    // P = 1 / (1 + (40/20)^2) = 1 / (1 + 4) = 0.2
    const rev3 = simulator.calculateRevenue(cargoValue, distance, 40, speed);
    console.log(`Late (40 days): Expected ~200, Got ${rev3.toFixed(2)}`);

    // Test Case 4: Very Late (T = 100 days, 5x T_Ideal)
    // P = 1 / (1 + (100/20)^2) = 1 / (1 + 25) = 1 / 26 ~= 0.038
    const rev4 = simulator.calculateRevenue(cargoValue, distance, 100, speed);
    console.log(`Very Late (100 days): Expected ~38, Got ${rev4.toFixed(2)}`);
}

import { MapManager } from './core/MapManager';
import { TrainActor } from './core/TrainActor';

function verifyMapAndMovement() {
    console.log("\n--- Verifying MapManager & TrainActor ---");
    const map = new MapManager(10, 10);

    // Place a simple horizontal track: (0,0) -> (1,0) -> (2,0)
    map.placeTrack(0, 0);
    map.placeTrack(1, 0);
    map.placeTrack(2, 0);

    // Verify bitmasks
    // (0,0) has neighbor East (1,0). Mask should be 2 (E).
    const t0 = map.getTile(0, 0);
    console.log(`Tile (0,0) Mask: Expected 2 (E), Got ${t0?.bitmaskValue} -> ${t0?.bitmaskValue === 2 ? 'PASS' : 'FAIL'}`);

    // (1,0) has neighbors West (0,0) and East (2,0). Mask should be 8(W) | 2(E) = 10.
    const t1 = map.getTile(1, 0);
    console.log(`Tile (1,0) Mask: Expected 10 (W|E), Got ${t1?.bitmaskValue} -> ${t1?.bitmaskValue === 10 ? 'PASS' : 'FAIL'}`);

    // Verify Movement
    // Place train at (0,0)
    const train = new TrainActor(0, 0, TrainType.NORMAL, 0); // Normal train, StartTime 0

    // Tick 1: Should pick direction E (1) and move
    train.tick(map, 1.0);
    // We don't expose direction easily, but let's check position after enough ticks.
    // Distance to next tile is 1.0 (from 0.0 to 1.0? Or 0.5 to 1.5? Logic says progress 0.5 start).
    // Let's tick enough to move to (1,0).
    // Start 0.5. Need +0.5 to reach 1.0. Speed 0.1. Needs 5 ticks.

    for (let i = 0; i < 6; i++) {
        train.tick(map, 1.0);
    }

    console.log(`Train Position after ~6 ticks: Expected (1,0), Got (${train.x},${train.y}) -> ${train.x === 1 && train.y === 0 ? 'PASS' : 'FAIL'}`);
}

import { EconomyManager } from './core/EconomyManager';

function verifyEconomy() {
    console.log("\n--- Verifying Economy & Stations ---");
    const economy = new EconomyManager(1000);
    const map = new MapManager(10, 10);

    // 1. Buy Track ($50)
    const success1 = map.placeTrack(0, 0, economy);
    console.log(`Buy Track: Expected Success, Balance 950. Got ${success1}, ${economy.getBalance()} -> ${success1 && economy.getBalance() === 950 ? 'PASS' : 'FAIL'}`);

    // 2. Buy Station ($200)
    const success2 = map.placeStation(5, 5, economy);
    console.log(`Buy Station: Expected Success, Balance 750. Got ${success2}, ${economy.getBalance()} -> ${success2 && economy.getBalance() === 750 ? 'PASS' : 'FAIL'}`);

    // 3. Insufficient Funds
    // Drain money
    economy.deduct(740); // Balance 10
    const success3 = map.placeTrack(1, 0, economy); // Cost 50
    console.log(`Buy Track (Poor): Expected Fail, Balance 10. Got ${success3}, ${economy.getBalance()} -> ${!success3 && economy.getBalance() === 10 ? 'PASS' : 'FAIL'}`);

    // 4. Revenue
    economy.add(100); // Balance 110
    console.log(`Add Revenue: Expected 110. Got ${economy.getBalance()} -> ${economy.getBalance() === 110 ? 'PASS' : 'FAIL'}`);
}

function verifyNavigationBug() {
    console.log("\n--- Verifying Navigation Bug (Vertical) ---");
    const map = new MapManager(10, 10);
    // Track: (0,0) -> (0,1) -> (0,2) [Station]
    map.placeTrack(0, 0);
    map.placeTrack(0, 1);
    map.placeStation(0, 2);

    const train = new TrainActor(0, 0, TrainType.NORMAL, 0); // Normal train, StartTime 0
    // Tick 1: Train should move East to (1,0)
    // Train at (0,0). Mask South(4). Valid: South.
    train.tick(map, 1.0); // Move to 0,1
    console.log(`Tick 1: Pos (${train.x},${train.y}). Expected (0,1).`);

    // Tick 2: Train at (0,1). Neighbors: North(0,0), South(0,2)[Station].
    // Mask: North(1) | South(4) = 5.
    // Valid Directions: North(0), South(2).
    // BUG: validDirections[0] is 0 (North). It will pick North and bounce back!
    train.tick(map, 1.0); // Move to ?
    console.log(`Tick 2: Pos (${train.x},${train.y}). Expected (0,2) [Station].`);

    if (train.x === 0 && train.y === 2) {
        console.log("Result: PASS (Reached Station)");
    } else {
        console.log("Result: FAIL (Did not reach Station - Likely Bounced)");
    }
}

import { TimeManager } from './core/TimeManager';

function verifyTimeSystem() {
    console.log("\n--- Verifying Time System ---");
    const time = new TimeManager();

    // 1. Tick
    time.tick(12); // 12 seconds = 0.5 days
    console.log(`Tick 12s: Expected 0.5 days. Got ${time.getGameTimeDays()} -> ${time.getGameTimeDays() === 0.5 ? 'PASS' : 'FAIL'}`);

    // 2. Speed
    time.setSpeed(2.0);
    time.tick(12); // 12 real seconds * 2 = 24 game seconds = 1 day. Total 1.5 days.
    console.log(`Tick 12s (2x): Expected 1.5 days. Got ${time.getGameTimeDays()} -> ${time.getGameTimeDays() === 1.5 ? 'PASS' : 'FAIL'}`);
}

verifyBitmask();
verifyRevenue();
verifyMapAndMovement();
verifyEconomy();
verifyNavigationBug();
verifyTimeSystem();
