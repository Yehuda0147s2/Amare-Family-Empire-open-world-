export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type DistrictTheme = 'neon_hab' | 'citadel_core' | 'industrial_grid' | 'underground_slum';

export type WeatherType = 'acid_rain' | 'neon_smog' | 'clear_cyber_night' | 'anita_lockdown';

export type AmareCharacterId =
  | 'tesfaye'
  | 'selam'
  | 'liya'
  | 'yonatan'
  | 'malak'
  | 'kalev'
  | 'natan'
  | 'mangesha'
  | 'hannah';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox3D {
  min: Vector3D;
  max: Vector3D;
}

export interface AmareNPCData {
  id: AmareCharacterId;
  name: string;
  epithet: string;
  role: string;
  lore: string;
  dialogue: string[];
  buffName: string;
  buffDescription: string;
  color: string;
  position: Vector3D;
  sanctuaryName: string;
}

export interface InteriorFurniture {
  id: string;
  type: 'desk' | 'server_rack' | 'crate' | 'holo_display' | 'generator' | 'chair' | 'locker';
  position: Vector3D;
  rotationY: number;
  interactive?: boolean;
  hacked?: boolean;
}

export interface InteriorRoom {
  id: string;
  floor: number;
  bounds: BoundingBox3D;
  doorPosition: Vector3D;
  doorOpen: boolean;
  hasTerminal: boolean;
  terminalHacked: boolean;
  hasLoot: boolean;
  lootCollected: boolean;
  furniture: InteriorFurniture[];
}

export interface BuildingData {
  id: string;
  district: DistrictTheme;
  position: Vector3D;
  size: Vector3D; // width, height, depth
  floors: number;
  color: string;
  accentColor: string;
  isEnterable: boolean;
  entrancePosition?: Vector3D;
  interiorRooms: InteriorRoom[];
  hasRooftopAccess: boolean;
  hasAntenna: boolean;
}

export interface CityChunk {
  chunkX: number;
  chunkZ: number;
  seed: number;
  district: DistrictTheme;
  buildings: BuildingData[];
  roads: {
    start: Vector3D;
    end: Vector3D;
    width: number;
  }[];
  props: {
    type: 'street_lamp' | 'neon_sign' | 'barrier' | 'debris' | 'vent' | 'cable';
    position: Vector3D;
    rotationY: number;
  }[];
  anitaNodes: {
    id: string;
    position: Vector3D;
    hacked: boolean;
    type: 'radar' | 'jammer' | 'subcore';
  }[];
}

export interface AnitaDrone {
  id: string;
  position: Vector3D;
  velocity: Vector3D;
  patrolCenter: Vector3D;
  patrolRadius: number;
  angle: number;
  state: 'patrol' | 'alert' | 'charging' | 'disabled';
  detectionProgress: number; // 0 to 1
  disabledTimer: number;
  spotlightAngle: number;
  health: number;
}

export interface AnitaTurret {
  id: string;
  position: Vector3D;
  rotationY: number;
  range: number;
  active: boolean;
  hacked: boolean;
  aimAngle: number;
  telegraphTimer: number;
  cooldownTimer: number;
  health?: number;
  maxHealth?: number;
}

export interface RadarEntity {
  id: string;
  type: 'player' | 'drone' | 'turret' | 'amare_npc' | 'node' | 'crate';
  x: number;
  z: number;
  rotation?: number;
  state?: string;
  name?: string;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  empEnergy: number;
  maxEmpEnergy: number;
  anitaAlertLevel: number; // 0 to 100
  nodesHacked: number;
  totalNodesRequired: number;
  terminalsAccessed: number;
  datashardsCollected: number;
  score: number;
  inInterior: boolean;
  currentBuildingId: string | null;
  currentFloor: number;
  activeAmareBuff: string | null;
  amareBuffTimer: number;
  combo: number;
  comboTimer: number;
  isAwake: boolean;
  isDodging: boolean;
  isAttacking: boolean;
  attackType: 'light' | 'heavy' | null;
  playerPos?: Vector3D;
  playerYaw?: number;
  radarEntities?: RadarEntity[];
  lastCombatFeedback?: string | null;
}

export interface AssetDiscoveryItem {
  id: string;
  name: string;
  source: 'Poly Haven' | 'Blender Procedural' | 'Godot MeshLib' | 'Resistance Vault';
  license: 'CC0' | 'MIT' | 'Custom Game CC';
  category: 'architecture' | 'props' | 'electronics' | 'vehicles' | 'characters';
  triangles: number;
  lodLevels: number;
  format: 'GLB' | 'glTF' | 'Procedural GDScript' | 'Blender Python';
  status: 'Ready' | 'Optimized' | 'Extracted' | 'Streamable';
  downloadUrl?: string;
  description: string;
}
