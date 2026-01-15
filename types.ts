export interface Coordinates {
  x: number;
  y: number;
}

export interface SessionConfig {
  year: number;
  trackId: string;
}

export interface TelemetryData {
  rpm: number;
  speed: number;
  gear: number;
  throttle: number; // 0-100
  brake: number; // 0-100
  drs: boolean;
  date: number; // timestamp
}

export interface DriverStatus {
  id: string;
  name: string;
  team: string;
  color: string;
  tyreCompound: string; // Changed from literal union to string to accept "SOFT", "MEDIUM", "HARD", "INTER", "WET"
  tyreAge: number;
}

// A snapshot of a driver at a specific moment in time
export interface DriverState extends DriverStatus, Coordinates, TelemetryData {
  lap: number; // Current lap number
  lapDistance: number; // meters
  totalDistance: number; // Total race distance covered (meters) - KEY FOR GAP CALC
  isPitting: boolean;
  currentSector: 1 | 2 | 3;
  justCompletedSector?: {
    sector: 1 | 2 | 3;
    time: string; // formatted time e.g. "23.4s"
  };
}

export interface RaceFrame {
  timestamp: number;
  drivers: DriverState[];
  leaderLap: number;
  sectorOwners: {
    1: string | null; // Driver ID
    2: string | null;
    3: string | null;
  };
  pittingDrivers: string[]; // List of IDs currently in pit
}

export interface TrackSector {
  id: number;
  startDist: number;
  endDist: number;
  fastestTeam?: string; // For sector dominance
}