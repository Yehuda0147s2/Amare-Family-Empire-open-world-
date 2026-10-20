import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { sound } from '../game/audio.ts';
import {
  BuildingData,
  CityChunk,
  GameState,
  PlayerStats,
  Vector3D,
  AmareNPCData,
  RadarEntity,
} from '../game/types.ts';
import {
  findActiveInteriorRoom,
  generateChunk,
} from '../game/city-generator.ts';
import {
  applyEMPEffect,
  calculateGlobalAlert,
  updateDrone,
} from '../game/anita-ai.ts';
import {
  createInitialPhysicsState,
  PlayerInput,
  updatePlayerPhysics,
} from '../game/player-controller.ts';
import { executeMeleeStrike } from '../game/combat.ts';
import { AMARE_LIST } from '../game/amare-lore.ts';

interface GameCanvasProps {
  gameState: GameState;
  onStatsUpdate: (stats: PlayerStats) => void;
  onTriggerGameOver: () => void;
  onTriggerVictory: () => void;
  onInteractionPrompt: (prompt: string | null) => void;
  onOpenAmareDialogue: (npc: AmareNPCData) => void;
  activeSeed: number;
  activeAmareBuff: string | null;
}

// Scratch math objects to prevent per-frame GC
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecCam = new THREE.Vector3();

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  onStatsUpdate,
  onTriggerGameOver,
  onTriggerVictory,
  onInteractionPrompt,
  onOpenAmareDialogue,
  activeSeed,
  activeAmareBuff,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Mutable refs to decouple React reconciliation from 60fps loop
  const stateRef = useRef({
    gameState,
    onStatsUpdate,
    onTriggerGameOver,
    onTriggerVictory,
    onInteractionPrompt,
    onOpenAmareDialogue,
    activeAmareBuff,
    cameraAngleY: 0,
    cameraPitch: 0.25,
    cameraDistance: 6.5,
    isPointerLocked: false,
    input: {
      moveX: 0,
      moveZ: 0,
      sprint: false,
      jumpPressed: false,
      jumpHeld: false,
      interactPressed: false,
      empPressed: false,
      attackLightPressed: false,
      attackHeavyPressed: false,
      wakePressed: false,
      dashPressed: false,
    } as PlayerInput,
    stats: {
      hp: 100,
      maxHp: 100,
      empEnergy: 100,
      maxEmpEnergy: 100,
      anitaAlertLevel: 0,
      nodesHacked: 0,
      totalNodesRequired: 3,
      terminalsAccessed: 0,
      datashardsCollected: 0,
      score: 0,
      inInterior: false,
      currentBuildingId: null,
      currentFloor: 0,
      activeAmareBuff: null,
      amareBuffTimer: 0,
      combo: 0,
      comboTimer: 0,
      isAwake: true,
      isDodging: false,
      isAttacking: false,
      attackType: null,
      lastCombatFeedback: null,
    } as PlayerStats,
  });

  // Keep stateRef fresh without causing re-renders
  stateRef.current.gameState = gameState;
  stateRef.current.onStatsUpdate = onStatsUpdate;
  stateRef.current.onTriggerGameOver = onTriggerGameOver;
  stateRef.current.onTriggerVictory = onTriggerVictory;
  stateRef.current.onInteractionPrompt = onInteractionPrompt;
  stateRef.current.onOpenAmareDialogue = onOpenAmareDialogue;
  stateRef.current.activeAmareBuff = activeAmareBuff;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.012);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      350
    );
    camera.position.set(0, 25, 45);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Procedural Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.65);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff1e6, 1.2);
    dirLight.position.set(30, 60, 20);
    if (!isHeadless) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 150;
      dirLight.shadow.camera.left = -50;
      dirLight.shadow.camera.right = 50;
      dirLight.shadow.camera.top = 50;
      dirLight.shadow.camera.bottom = -50;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    scene.add(dirLight);

    // Anita Citadel Core Red Beacon Light
    const anitaCoreLight = new THREE.PointLight(0xef4444, 3.5, 90, 1.2);
    anitaCoreLight.position.set(0, 45, 0);
    scene.add(anitaCoreLight);

    // 6. Ground & City Grid Generation
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Generate 3x3 Chunks surrounding center
    const loadedChunks: CityChunk[] = [];
    const allBuildings: BuildingData[] = [];

    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const chunk = generateChunk(cx, cz, activeSeed);
        loadedChunks.push(chunk);
        allBuildings.push(...chunk.buildings);
      }
    }

    // Ground Plane with Cyber Grid
    const groundGeo = new THREE.PlaneGeometry(300, 300, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090e17,
      roughness: 0.8,
      metalness: 0.2,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = !isHeadless;
    worldGroup.add(groundMesh);

    // Road Networks
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x181e28,
      roughness: 0.5,
      metalness: 0.1,
    });
    const roadLineMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    loadedChunks.forEach((chunk) => {
      chunk.roads.forEach((road) => {
        const len = Math.hypot(road.end.x - road.start.x, road.end.z - road.start.z);
        const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(road.width, len), roadMat);
        roadMesh.rotation.x = -Math.PI / 2;
        const midX = (road.start.x + road.end.x) / 2;
        const midZ = (road.start.z + road.end.z) / 2;
        roadMesh.position.set(midX, 0.02, midZ);
        if (road.start.z === road.end.z) {
          roadMesh.rotation.z = Math.PI / 2;
        }
        roadMesh.receiveShadow = !isHeadless;
        worldGroup.add(roadMesh);

        // Neon road stripes
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.3, len), roadLineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(midX, 0.025, midZ);
        if (road.start.z === road.end.z) stripe.rotation.z = Math.PI / 2;
        worldGroup.add(stripe);
      });
    });

    // 7. Procedural Buildings (3-12 composite group meshes)
    const buildingMeshes: { data: BuildingData; group: THREE.Group }[] = [];
    const doorMeshes: { id: string; mesh: THREE.Mesh; open: boolean }[] = [];
    const interactiveObjects: {
      id: string;
      position: Vector3D;
      type: 'terminal' | 'door' | 'crate' | 'node' | 'amare_npc';
      targetId: string;
      mesh: THREE.Object3D;
      npcData?: AmareNPCData;
    }[] = [];

    allBuildings.forEach((bld) => {
      const bldGroup = new THREE.Group();
      bldGroup.position.set(bld.position.x, 0, bld.position.z);

      const halfW = bld.size.x;
      const halfH = bld.size.y;
      const halfD = bld.size.z;

      // Part 1: Main Tower Hull
      const towerGeo = new THREE.BoxGeometry(halfW, halfH, halfD);
      const towerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bld.color),
        roughness: 0.6,
        metalness: 0.35,
      });
      const towerMesh = new THREE.Mesh(towerGeo, towerMat);
      towerMesh.position.y = halfH / 2;
      towerMesh.castShadow = !isHeadless;
      towerMesh.receiveShadow = !isHeadless;
      bldGroup.add(towerMesh);

      // Part 2: Beveled Roof Cap / Mechanical Penthouse
      const roofCapGeo = new THREE.BoxGeometry(halfW * 0.85, 2.5, halfD * 0.85);
      const roofCapMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.4,
        metalness: 0.7,
      });
      const roofCap = new THREE.Mesh(roofCapGeo, roofCapMat);
      roofCap.position.y = halfH + 1.25;
      bldGroup.add(roofCap);

      // Part 3: Neon Window Strips / Facade Accent
      const stripeGeo = new THREE.BoxGeometry(halfW + 0.1, 0.4, halfD + 0.1);
      const stripeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(bld.accentColor),
      });
      for (let f = 1; f < bld.floors; f++) {
        const floorStripe = new THREE.Mesh(stripeGeo, stripeMat);
        floorStripe.position.y = f * 4;
        bldGroup.add(floorStripe);
      }

      // Part 4: Rooftop Antenna or Anita Uplink
      if (bld.hasAntenna) {
        const antennaPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.18, 6, 8),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 })
        );
        antennaPole.position.y = halfH + 5.5;
        bldGroup.add(antennaPole);

        const antennaBeacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        antennaBeacon.position.y = halfH + 8.5;
        bldGroup.add(antennaBeacon);
      }

      // Part 5: Enterable Ground Entrance & Interior Rooms
      if (bld.isEnterable && bld.entrancePosition) {
        // Entrance Portal Frame
        const frameGeo = new THREE.BoxGeometry(3.0, 3.4, 0.6);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5 });
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        frameMesh.position.set(0, 1.7, halfD / 2 + 0.2);
        bldGroup.add(frameMesh);

        // Sliding Blast Door
        const doorGeo = new THREE.BoxGeometry(2.4, 3.0, 0.2);
        const doorMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.3,
          metalness: 0.7,
        });
        const doorMesh = new THREE.Mesh(doorGeo, doorMat);
        doorMesh.position.set(0, 1.5, halfD / 2 + 0.2);
        bldGroup.add(doorMesh);
        doorMeshes.push({ id: bld.id, mesh: doorMesh, open: false });

        interactiveObjects.push({
          id: `door_${bld.id}`,
          position: bld.entrancePosition,
          type: 'door',
          targetId: bld.id,
          mesh: doorMesh,
        });

        // Interior Rooms: Furniture & Terminals
        bld.interiorRooms.forEach((room) => {
          room.furniture.forEach((furn) => {
            if (furn.type === 'server_rack') {
              const rackGroup = new THREE.Group();
              const rackBody = new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 2.8, 1.0),
                new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 })
              );
              rackBody.position.y = 1.4;
              rackGroup.add(rackBody);

              // Glowing terminal screen
              const screenMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.8, 0.6),
                new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
              );
              screenMesh.position.set(0, 1.6, 0.52);
              rackGroup.add(screenMesh);

              rackGroup.position.set(furn.position.x, furn.position.y, furn.position.z);
              scene.add(rackGroup);

              interactiveObjects.push({
                id: furn.id,
                position: furn.position,
                type: 'terminal',
                targetId: furn.id,
                mesh: screenMesh,
              });
            } else if (furn.type === 'crate') {
              const crateMesh = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 1.2, 1.2),
                new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.3 })
              );
              crateMesh.position.set(furn.position.x, furn.position.y + 0.6, furn.position.z);
              scene.add(crateMesh);

              interactiveObjects.push({
                id: furn.id,
                position: furn.position,
                type: 'crate',
                targetId: furn.id,
                mesh: crateMesh,
              });
            }
          });
        });
      }

      worldGroup.add(bldGroup);
      buildingMeshes.push({ data: bld, group: bldGroup });
    });

    // 7b. Amare Family 3D Resistance NPCs with Holographic Resonance Auras
    AMARE_LIST.forEach((npc) => {
      const npcGroup = new THREE.Group();
      npcGroup.position.set(npc.position.x, 0, npc.position.z);

      // Resonance Ground Ring
      const ringGeo = new THREE.RingGeometry(0.85, 1.25, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(npc.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.03;
      npcGroup.add(ringMesh);

      // Body / Robed Resistance Armor (Composite mesh)
      const bodyGeo = new THREE.CylinderGeometry(0.3, 0.45, 1.4, 8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.6,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = 0.7;
      bodyMesh.castShadow = !isHeadless;
      npcGroup.add(bodyMesh);

      // Head
      const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.y = 1.55;
      npcGroup.add(headMesh);

      // Holographic Visor in NPC Color
      const visorGeo = new THREE.BoxGeometry(0.25, 0.1, 0.2);
      const visorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(npc.color) });
      const visorMesh = new THREE.Mesh(visorGeo, visorMat);
      visorMesh.position.set(0, 1.56, 0.14);
      npcGroup.add(visorMesh);

      // Floating Resonance Crest Emblem above head
      const crestGeo = new THREE.OctahedronGeometry(0.24);
      const crestMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(npc.color),
        wireframe: true,
      });
      const crestMesh = new THREE.Mesh(crestGeo, crestMat);
      crestMesh.position.y = 2.15;
      npcGroup.add(crestMesh);

      scene.add(npcGroup);

      interactiveObjects.push({
        id: `npc_${npc.id}`,
        position: npc.position,
        type: 'amare_npc',
        targetId: npc.id,
        mesh: npcGroup,
        npcData: npc,
      });
    });

    // 8. Composite Protagonist 3D Mesh: Kaelen (10 distinct parts)
    const playerGroup = new THREE.Group();
    scene.add(playerGroup);

    // Torso / Armored Exosuit
    const torsoMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.85, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 })
    );
    torsoMesh.position.y = 1.15;
    torsoMesh.castShadow = !isHeadless;
    playerGroup.add(torsoMesh);

    // Jet Thruster Pack on back
    const jetpackMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.65, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.85 })
    );
    jetpackMesh.position.set(0, 1.2, -0.25);
    playerGroup.add(jetpackMesh);

    // Thruster exhaust nozzles (emissive cyan)
    const nozzleMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const nozzleL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8), nozzleMat);
    nozzleL.position.set(-0.14, 0.82, -0.25);
    playerGroup.add(nozzleL);
    const nozzleR = nozzleL.clone();
    nozzleR.position.x = 0.14;
    playerGroup.add(nozzleR);

    // Head / Tactical Helmet
    const headMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.42, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 })
    );
    headMesh.position.y = 1.8;
    headMesh.castShadow = !isHeadless;
    playerGroup.add(headMesh);

    // Visor: Holographic Cyan Glint
    const visorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe })
    );
    visorMesh.position.set(0, 1.82, 0.2);
    playerGroup.add(visorMesh);

    // Limbs: Articulated Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.18, 0.42, 0);
    playerGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.18, 0.42, 0);
    playerGroup.add(rightLeg);

    // Left & Right Arms
    const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.5 });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.45, 1.2, 0);
    playerGroup.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.45, 1.2, 0);
    playerGroup.add(rightArm);

    // Wrist EMP Emitter / Hack Tool (on right arm)
    const empEmitterMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.16, 0.25),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    empEmitterMesh.position.set(0.45, 0.95, 0.15);
    playerGroup.add(empEmitterMesh);

    // Cyber Plasma Katana Blade (mounted on right forearm)
    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(0.48, 0.85, 0.18);
    bladeGroup.rotation.x = Math.PI / 4;

    const bladeHiltMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const bladeHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.32, 8), bladeHiltMat);
    bladeHilt.rotation.x = Math.PI / 2;
    bladeGroup.add(bladeHilt);

    const bladeBeamMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const bladeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.065, 1.15), bladeBeamMat);
    bladeBeam.position.set(0, 0, 0.65);
    bladeGroup.add(bladeBeam);

    const bladePointLight = new THREE.PointLight(0x00f2fe, 1.2, 4.5);
    bladePointLight.position.set(0, 0, 0.65);
    bladeGroup.add(bladePointLight);

    playerGroup.add(bladeGroup);

    // Slashing Energy Sweep Arc (Crescent)
    const slashArcGeo = new THREE.RingGeometry(1.2, 3.2, 32, 1, 0, Math.PI * 0.75);
    slashArcGeo.rotateX(-Math.PI / 2);
    const slashArcMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const slashArcMesh = new THREE.Mesh(slashArcGeo, slashArcMat);
    slashArcMesh.visible = false;
    scene.add(slashArcMesh);
    let slashArcTimer = 0;

    // Hit Spark Particle Pool
    const sparkCount = 35;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities: { x: number; y: number; z: number; life: number }[] = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = -100;
      sparkPositions[i * 3 + 2] = 0;
      sparkVelocities.push({ x: 0, y: 0, z: 0, life: 0 });
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 0.35,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkPoints);

    const triggerSparks = (x: number, y: number, z: number, colorHex: number = 0x00f2fe) => {
      sparkMat.color.set(colorHex);
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 8;
        sparkPositions[i * 3] = x;
        sparkPositions[i * 3 + 1] = y;
        sparkPositions[i * 3 + 2] = z;
        sparkVelocities[i] = {
          x: Math.cos(angle) * speed,
          y: 2 + Math.random() * 6,
          z: Math.sin(angle) * speed,
          life: 0.35 + Math.random() * 0.25,
        };
      }
      sparkGeo.attributes.position.needsUpdate = true;
    };

    // Player Ground Contact Shadow Disc
    const playerShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.65, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    playerShadow.rotation.x = -Math.PI / 2;
    playerShadow.position.y = 0.02;
    scene.add(playerShadow);

    // EMP Shockwave Visual Ring
    const empRingGeo = new THREE.RingGeometry(0.2, 0.8, 32);
    empRingGeo.rotateX(-Math.PI / 2);
    const empRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const empRingMesh = new THREE.Mesh(empRingGeo, empRingMat);
    scene.add(empRingMesh);
    let empAnimTimer = 0;

    // 9. Anita Surveillance Drones (Composite 7-part meshes with spotlight cones)
    const droneObjects: { data: import('../game/types.ts').AnitaDrone; group: THREE.Group; spotlight: THREE.SpotLight; coneMesh: THREE.Mesh }[] = [];

    // Spawn 4 Anita Drones around the city
    const initialDrones: import('../game/types.ts').AnitaDrone[] = [
      {
        id: 'drone_citadel_01',
        position: { x: 0, y: 7, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        patrolCenter: { x: 0, y: 7, z: 0 },
        patrolRadius: 18,
        angle: 0,
        state: 'patrol',
        detectionProgress: 0,
        disabledTimer: 0,
        spotlightAngle: 0,
        health: 100,
      },
      {
        id: 'drone_hab_02',
        position: { x: 40, y: 8, z: 40 },
        velocity: { x: 0, y: 0, z: 0 },
        patrolCenter: { x: 40, y: 8, z: 40 },
        patrolRadius: 22,
        angle: Math.PI / 2,
        state: 'patrol',
        detectionProgress: 0,
        disabledTimer: 0,
        spotlightAngle: Math.PI,
        health: 100,
      },
      {
        id: 'drone_industrial_03',
        position: { x: -40, y: 7.5, z: 35 },
        velocity: { x: 0, y: 0, z: 0 },
        patrolCenter: { x: -40, y: 7.5, z: 35 },
        patrolRadius: 20,
        angle: Math.PI,
        state: 'patrol',
        detectionProgress: 0,
        disabledTimer: 0,
        spotlightAngle: 0,
        health: 100,
      },
      {
        id: 'drone_slum_04',
        position: { x: -35, y: 6.5, z: -35 },
        velocity: { x: 0, y: 0, z: 0 },
        patrolCenter: { x: -35, y: 6.5, z: -35 },
        patrolRadius: 16,
        angle: Math.PI * 1.5,
        state: 'patrol',
        detectionProgress: 0,
        disabledTimer: 0,
        spotlightAngle: Math.PI / 2,
        health: 100,
      },
    ];

    initialDrones.forEach((dData) => {
      const dGroup = new THREE.Group();

      // Drone Core
      const coreMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.3, metalness: 0.9 })
      );
      dGroup.add(coreMesh);

      // Anita Ominous Red Eye
      const eyeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      eyeMesh.position.set(0, 0, 0.45);
      dGroup.add(eyeMesh);

      // Rotors
      const rotorArmGeo = new THREE.BoxGeometry(1.6, 0.08, 0.15);
      const rotorArmMat = new THREE.MeshStandardMaterial({ color: 0x44403c });
      const rotorArm = new THREE.Mesh(rotorArmGeo, rotorArmMat);
      dGroup.add(rotorArm);

      // Spotlight Cone Projection Mesh
      const coneGeo = new THREE.ConeGeometry(3.5, 7.0, 16, 1, true);
      coneGeo.rotateX(Math.PI / 2);
      coneGeo.translate(0, -3.5, 0);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      dGroup.add(coneMesh);

      // Real Spotlight
      const spotLight = new THREE.SpotLight(0xef4444, 2.0, 20, Math.PI / 4, 0.5, 1);
      spotLight.position.set(0, 0, 0);
      spotLight.target.position.set(0, -7, 0);
      dGroup.add(spotLight);
      dGroup.add(spotLight.target);

      dGroup.position.set(dData.position.x, dData.position.y, dData.position.z);
      scene.add(dGroup);

      droneObjects.push({ data: dData, group: dGroup, spotlight: spotLight, coneMesh });
    });

    // 10. Anita Defense Turrets
    const turretObjects: { data: import('../game/types.ts').AnitaTurret; group: THREE.Group; beamMesh: THREE.Mesh }[] = [];
    const initialTurrets: import('../game/types.ts').AnitaTurret[] = [
      {
        id: 'turret_gate_01',
        position: { x: 12, y: 0, z: -10 },
        rotationY: 0,
        range: 16,
        active: true,
        hacked: false,
        aimAngle: 0,
        telegraphTimer: 0,
        cooldownTimer: 0,
      },
      {
        id: 'turret_citadel_02',
        position: { x: -12, y: 0, z: 10 },
        rotationY: Math.PI,
        range: 18,
        active: true,
        hacked: false,
        aimAngle: 0,
        telegraphTimer: 0,
        cooldownTimer: 0,
      },
    ];

    initialTurrets.forEach((tData) => {
      const tGroup = new THREE.Group();
      tGroup.position.set(tData.position.x, 0, tData.position.z);

      // Turret Base
      const baseMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.1, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.3 })
      );
      baseMesh.position.y = 0.3;
      tGroup.add(baseMesh);

      // Turret Head
      const headMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.6, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 })
      );
      headMesh.position.y = 0.9;
      tGroup.add(headMesh);

      // Laser telegraph sightline
      const beamMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 15, 6),
        new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.0 })
      );
      beamMesh.rotation.x = Math.PI / 2;
      beamMesh.position.set(0, 0.9, 7.5);
      tGroup.add(beamMesh);

      scene.add(tGroup);
      turretObjects.push({ data: tData, group: tGroup, beamMesh });
    });

    // 11. Physics & Animation Setup
    const physicsState = createInitialPhysicsState(0, 20); // Spawn in open street facing Anita Citadel

    // Keyboard, Mouse, and Virtual Input Listeners
    const keysPressed = new Set<string>();
    const virtualInput = {
      moveX: 0,
      moveZ: 0,
      sprint: false,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.add(e.code);

      if (e.code === 'KeyE') {
        stateRef.current.input.interactPressed = true;
      }
      if (e.code === 'KeyF') {
        stateRef.current.input.empPressed = true;
      }
      if (e.code === 'Space') {
        stateRef.current.input.jumpPressed = true;
        stateRef.current.input.jumpHeld = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        stateRef.current.input.sprint = true;
      }
      if (e.code === 'KeyJ' || e.code === 'KeyX') {
        stateRef.current.input.attackLightPressed = true;
      }
      if (e.code === 'KeyK') {
        stateRef.current.input.attackHeavyPressed = true;
      }
      if (e.code === 'KeyC' || e.code === 'ControlLeft') {
        stateRef.current.input.dashPressed = true;
      }
      if (e.code === 'KeyZ' || e.code === 'KeyR') {
        stateRef.current.input.wakePressed = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);

      if (e.code === 'Space') {
        stateRef.current.input.jumpHeld = false;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        stateRef.current.input.sprint = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (stateRef.current.isPointerLocked) {
        stateRef.current.cameraAngleY -= e.movementX * 0.0028;
        stateRef.current.cameraPitch = Math.max(
          -0.4,
          Math.min(1.1, stateRef.current.cameraPitch + e.movementY * 0.0028)
        );
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (stateRef.current.gameState === 'playing') {
        if (!stateRef.current.isPointerLocked) {
          container.requestPointerLock?.();
        }
        if (e.button === 0) {
          stateRef.current.input.attackLightPressed = true;
        } else if (e.button === 2) {
          e.preventDefault();
          stateRef.current.input.attackHeavyPressed = true;
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (stateRef.current.gameState === 'playing') {
        e.preventDefault();
      }
    };

    const onPointerLockChange = () => {
      stateRef.current.isPointerLocked = document.pointerLockElement === container;
    };

    const onBlur = () => {
      keysPressed.clear();
      virtualInput.moveX = 0;
      virtualInput.moveZ = 0;
      virtualInput.sprint = false;
      stateRef.current.input.moveX = 0;
      stateRef.current.input.moveZ = 0;
      stateRef.current.input.sprint = false;
      stateRef.current.input.jumpHeld = false;
    };

    // Virtual Touch Events from Mobile / Tablet Controller
    const onVirtualMove = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        virtualInput.moveX = detail.moveX;
        virtualInput.moveZ = detail.moveZ;
      }
    };

    const onVirtualLook = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        stateRef.current.cameraAngleY -= detail.deltaX * 0.0055;
        stateRef.current.cameraPitch = Math.max(
          -0.4,
          Math.min(1.1, stateRef.current.cameraPitch + detail.deltaY * 0.0055)
        );
      }
    };

    const onVirtualSprint = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail !== undefined) {
        virtualInput.sprint = !!detail.sprint;
      }
    };

    const onVirtualAttack = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === 'heavy') {
        stateRef.current.input.attackHeavyPressed = true;
      } else {
        stateRef.current.input.attackLightPressed = true;
      }
    };

    const onVirtualWake = () => {
      stateRef.current.input.wakePressed = true;
    };

    const onVirtualDash = () => {
      stateRef.current.input.dashPressed = true;
    };

    const onVirtualJump = () => {
      stateRef.current.input.jumpPressed = true;
      stateRef.current.input.jumpHeld = true;
      setTimeout(() => {
        stateRef.current.input.jumpHeld = false;
      }, 160);
    };

    const onVirtualInteract = () => {
      stateRef.current.input.interactPressed = true;
    };

    const onVirtualEmp = () => {
      stateRef.current.input.empPressed = true;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('blur', onBlur);

    window.addEventListener('virtual-move', onVirtualMove);
    window.addEventListener('virtual-look', onVirtualLook);
    window.addEventListener('virtual-sprint', onVirtualSprint);
    window.addEventListener('virtual-attack', onVirtualAttack);
    window.addEventListener('virtual-wake', onVirtualWake);
    window.addEventListener('virtual-dash', onVirtualDash);
    window.addEventListener('virtual-jump', onVirtualJump);
    window.addEventListener('virtual-interact', onVirtualInteract);
    window.addEventListener('virtual-emp', onVirtualEmp);

    // Resize handling
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Pre-warm shaders
    renderer.compile(scene, camera);

    // 12. Main Simulation & Render Loop
    let lastTime = performance.now();
    let animFrameId: number;
    let cameraOrbitAngle = 0;
    let runDistance = 0;
    let statSyncTimer = 0;

    const clockTick = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const currentGameState = stateRef.current.gameState;

      if (currentGameState === 'title') {
        // Live World Camera Flyover
        cameraOrbitAngle += 0.22 * dt;
        const orbitRadius = 45;
        camera.position.x = Math.sin(cameraOrbitAngle) * orbitRadius;
        camera.position.z = Math.cos(cameraOrbitAngle) * orbitRadius;
        camera.position.y = 22 + Math.sin(cameraOrbitAngle * 2) * 4;
        camera.lookAt(0, 10, 0);

        // Keep drones idling
        droneObjects.forEach(({ data, group }) => {
          data.angle += 0.4 * dt;
          group.position.x = data.patrolCenter.x + Math.cos(data.angle) * data.patrolRadius;
          group.position.z = data.patrolCenter.z + Math.sin(data.angle) * data.patrolRadius;
          group.rotation.y = data.angle + Math.PI / 2;
        });

        renderer.render(scene, camera);
        animFrameId = requestAnimationFrame(clockTick);
        return;
      }

      if (currentGameState === 'playing') {
        // Collect keyboard movement intent blended with virtual touch input
        let moveX = virtualInput.moveX;
        let moveZ = virtualInput.moveZ;
        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) moveZ += 1;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) moveZ -= 1;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) moveX -= 1;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) moveX += 1;

        stateRef.current.input.moveX = Math.max(-1, Math.min(1, moveX));
        stateRef.current.input.moveZ = Math.max(-1, Math.min(1, moveZ));
        stateRef.current.input.sprint =
          virtualInput.sprint || keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight');

        // Step Avatar Physics
        const { jumped, usedEmp, dashed, wokeUp, attacked } = updatePlayerPhysics(
          physicsState,
          stateRef.current.input,
          allBuildings,
          stateRef.current.cameraAngleY,
          dt
        );

        if (jumped) {
          sound.playJump();
        }

        // Handle Dash / Evade
        if (dashed) {
          sound.playDodge();
          stateRef.current.stats.lastCombatFeedback = 'TACTICAL EVADE // THRUSTERS BURST';
          nozzleMat.color.set(0xf59e0b);
          setTimeout(() => nozzleMat.color.set(0x00f2fe), 260);
        }

        // Handle Wake Up / Stand Up
        if (wokeUp) {
          sound.playWakeUp();
          stateRef.current.stats.lastCombatFeedback = 'CHASSIS REBOOTED // COMBAT STANCE ACTIVE';
        }

        // Handle Melee / Cyber Blade Combat Strike
        if (attacked) {
          sound.playCyberSlash();
          const isHeavy = attacked === 'heavy';
          bladeBeamMat.color.set(isHeavy ? 0xf59e0b : 0x00f2fe);
          bladePointLight.color.set(isHeavy ? 0xf59e0b : 0x00f2fe);
          bladePointLight.intensity = isHeavy ? 3.5 : 2.0;

          // Slash sweep arc visual in front of avatar
          slashArcMesh.visible = true;
          slashArcMat.color.set(isHeavy ? 0xf97316 : 0x38bdf8);
          slashArcMat.opacity = 0.95;
          slashArcTimer = isHeavy ? 0.38 : 0.24;
          slashArcMesh.rotation.y = physicsState.rotationY;
          slashArcMesh.position.set(
            physicsState.position.x,
            physicsState.position.y + 1.2,
            physicsState.position.z
          );

          // Execute strike math against drones & turrets
          const combatRes = executeMeleeStrike(
            physicsState.position,
            physicsState.rotationY,
            attacked,
            droneObjects.map((d) => d.data),
            stateRef.current.activeAmareBuff,
            stateRef.current.stats.combo,
            turretObjects.map((t) => t.data)
          );

          stateRef.current.stats.combo = combatRes.newCombo;
          stateRef.current.stats.comboTimer = 3.5;

          const totalHits = combatRes.hitDroneIds.length + (combatRes.hitTurretIds?.length || 0);
          if (totalHits > 0) {
            if (isHeavy || combatRes.isCrit) {
              sound.playHeavyHit();
            } else {
              sound.playMeleeHit();
            }

            stateRef.current.stats.score += combatRes.totalDamageDealt * 5;
            const critTag = combatRes.isCrit ? 'CRIT! ' : '';
            stateRef.current.stats.lastCombatFeedback = `${critTag}-${combatRes.damage} DMG [${combatRes.newCombo}x STREAK]`;

            // Trigger hit sparks and visual flash on struck drones
            combatRes.hitDroneIds.forEach((id) => {
              const droneObj = droneObjects.find((d) => d.data.id === id);
              if (droneObj) {
                const core = droneObj.group.children[0] as THREE.Mesh;
                if (core && core.material) {
                  (core.material as THREE.MeshStandardMaterial).color.set(0xffffff);
                  setTimeout(() => {
                    if (core.material) (core.material as THREE.MeshStandardMaterial).color.set(0x1c1917);
                  }, 120);
                }
                triggerSparks(
                  droneObj.data.position.x,
                  droneObj.data.position.y,
                  droneObj.data.position.z,
                  isHeavy ? 0xf59e0b : 0x00f2fe
                );
              }
            });

            combatRes.destroyedDroneIds.forEach(() => {
              sound.playLand();
              stateRef.current.stats.score += 350;
              stateRef.current.stats.lastCombatFeedback = 'ANITA DRONE DESTROYED! +350 PTS';
            });

            combatRes.hitTurretIds?.forEach((id) => {
              const turretObj = turretObjects.find((t) => t.data.id === id);
              if (turretObj) {
                triggerSparks(turretObj.data.position.x, 1.0, turretObj.data.position.z, 0xf43f5e);
              }
            });

            combatRes.destroyedTurretIds?.forEach(() => {
              sound.playLand();
              stateRef.current.stats.score += 500;
              stateRef.current.stats.lastCombatFeedback = 'DEFENSE TURRET DESTROYED! +500 PTS';
            });
          }
        }

        // Animate Slashing Arc
        if (slashArcTimer > 0) {
          slashArcTimer -= dt;
          slashArcMat.opacity = Math.max(0, slashArcTimer / 0.35);
          slashArcMesh.rotation.y += 3.5 * dt;
        } else {
          slashArcMesh.visible = false;
          slashArcMat.opacity = 0;
        }

        // Animate Spark Particles
        let hasActiveSparks = false;
        for (let i = 0; i < sparkCount; i++) {
          if (sparkVelocities[i].life > 0) {
            hasActiveSparks = true;
            sparkVelocities[i].life -= dt;
            sparkPositions[i * 3] += sparkVelocities[i].x * dt;
            sparkPositions[i * 3 + 1] += sparkVelocities[i].y * dt;
            sparkPositions[i * 3 + 2] += sparkVelocities[i].z * dt;
            sparkVelocities[i].y -= 9.8 * dt; // gravity
          } else {
            sparkPositions[i * 3 + 1] = -100;
          }
        }
        if (hasActiveSparks) {
          sparkGeo.attributes.position.needsUpdate = true;
        }

        // Combo Timer Decay
        if (stateRef.current.stats.comboTimer > 0) {
          stateRef.current.stats.comboTimer = Math.max(0, stateRef.current.stats.comboTimer - dt);
          if (stateRef.current.stats.comboTimer === 0) {
            stateRef.current.stats.combo = 0;
          }
        }

        // Handle EMP trigger
        if (usedEmp) {
          if (stateRef.current.stats.empEnergy >= 30) {
            stateRef.current.stats.empEnergy -= 30;
            sound.playEMPPulse();

            // Trigger visual shockwave ring
            empRingMesh.position.set(physicsState.position.x, 0.1, physicsState.position.z);
            empAnimTimer = 0.5;

            // Stun drones & turrets
            applyEMPEffect(
              droneObjects.map((d) => d.data),
              turretObjects.map((t) => t.data),
              physicsState.position,
              20,
              8.0
            );
          }
        }

        // Animate EMP visual shockwave
        if (empAnimTimer > 0) {
          empAnimTimer -= dt;
          const progress = 1 - empAnimTimer / 0.5;
          const currentScale = 1 + progress * 22;
          empRingMesh.scale.set(currentScale, currentScale, 1);
          (empRingMesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
        } else {
          (empRingMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        }

        // Regenerate EMP Energy gradually (enhanced by Natan Amare Overclocked EMP)
        const empRate =
          stateRef.current.activeAmareBuff === 'Overclocked EMP' ||
          stateRef.current.activeAmareBuff === 'Harmonic Unity'
            ? 24
            : 8;
        if (stateRef.current.stats.empEnergy < stateRef.current.stats.maxEmpEnergy) {
          stateRef.current.stats.empEnergy = Math.min(
            stateRef.current.stats.maxEmpEnergy,
            stateRef.current.stats.empEnergy + empRate * dt
          );
        }

        // Tesfaye Amare Unwavering Hope passive health regeneration
        if (
          stateRef.current.activeAmareBuff === 'Unwavering Hope' ||
          stateRef.current.activeAmareBuff === 'Harmonic Unity'
        ) {
          stateRef.current.stats.hp = Math.min(
            stateRef.current.stats.maxHp,
            stateRef.current.stats.hp + 2.5 * dt
          );
        }

        // Sync Player Mesh Position & Rotation
        playerGroup.position.set(physicsState.position.x, physicsState.position.y, physicsState.position.z);
        playerGroup.rotation.y = physicsState.rotationY;

        // Shadow disc follows ground
        playerShadow.position.set(physicsState.position.x, 0.02, physicsState.position.z);

        // Gait, Wake, and Attack Avatar Animations
        const horizSpeed = Math.hypot(physicsState.velocity.x, physicsState.velocity.z);

        if (physicsState.wakeTimer > 0) {
          // Kneeling to Standing Wake Animation
          const wakeProg = Math.max(0, Math.min(1, 1 - physicsState.wakeTimer / 0.6));
          torsoMesh.position.y = 0.75 + wakeProg * 0.4;
          headMesh.position.y = 1.35 + wakeProg * 0.45;
          leftLeg.position.set(-0.18, 0.22 + wakeProg * 0.2, 0);
          rightLeg.position.set(0.18, 0.22 + wakeProg * 0.2, 0);
          leftLeg.rotation.x = (1 - wakeProg) * 0.9;
          rightLeg.rotation.x = -(1 - wakeProg) * 0.9;
          leftArm.rotation.x = (1 - wakeProg) * 0.4;
          rightArm.rotation.x = (1 - wakeProg) * 0.4;
          (visorMesh.material as THREE.MeshBasicMaterial).color.set(
            wakeProg < 0.6 ? 0xf59e0b : 0x00f2fe
          );
        } else if (physicsState.isAttacking) {
          // Dynamic Attack Slash Swing
          const isHeavy = physicsState.attackType === 'heavy';
          const maxDur = isHeavy ? 0.52 : 0.28;
          const animProg = Math.max(0, Math.min(1, physicsState.attackAnimTimer / maxDur));

          rightArm.rotation.x = -Math.PI * 0.7 + animProg * 0.5;
          rightArm.rotation.y = 0.6 - animProg * 0.4;
          leftArm.rotation.x = 0.4;
          torsoMesh.rotation.y = (1 - animProg) * 0.3;
        } else if (horizSpeed > 0.5 && physicsState.isGrounded) {
          // Running / Sprinting Gait
          runDistance += horizSpeed * dt;
          torsoMesh.position.y = 1.15 + Math.sin(runDistance * 4) * 0.06;
          torsoMesh.rotation.y = 0;
          headMesh.position.y = 1.8 + Math.sin(runDistance * 4) * 0.06;

          leftLeg.position.set(-0.18, 0.42, 0);
          rightLeg.position.set(0.18, 0.42, 0);
          leftLeg.rotation.x = Math.sin(runDistance * 4) * 0.6;
          rightLeg.rotation.x = -Math.sin(runDistance * 4) * 0.6;
          leftArm.rotation.x = -Math.sin(runDistance * 4) * 0.5;
          rightArm.rotation.x = Math.sin(runDistance * 4) * 0.5;
          rightArm.rotation.y = 0;

          if (Math.sin(runDistance * 4) > 0.95) {
            sound.playFootstep();
          }
        } else {
          // Standing Idle Ready Pose
          torsoMesh.position.y = 1.15;
          torsoMesh.rotation.y = 0;
          headMesh.position.y = 1.8;
          leftLeg.position.set(-0.18, 0.42, 0);
          rightLeg.position.set(0.18, 0.42, 0);
          leftLeg.rotation.x = 0;
          rightLeg.rotation.x = 0;
          leftArm.rotation.x = 0;
          rightArm.rotation.x = 0;
          rightArm.rotation.y = 0;
          (visorMesh.material as THREE.MeshBasicMaterial).color.set(0x00f2fe);
        }

        // Blade glow dimming when idle
        if (!physicsState.isAttacking) {
          bladePointLight.intensity = THREE.MathUtils.lerp(bladePointLight.intensity, 0.6, dt * 6);
        }

        // Check if player is inside an enterable interior
        const activeInterior = findActiveInteriorRoom(physicsState.position, allBuildings);
        stateRef.current.stats.inInterior = activeInterior !== null;
        stateRef.current.stats.currentBuildingId = activeInterior?.building.id || null;
        stateRef.current.stats.currentFloor = activeInterior?.room.floor || 0;

        // 13. Update Anita AI Drones
        let activeAlertDrones = 0;
        droneObjects.forEach(({ data, group, spotlight, coneMesh }) => {
          const res = updateDrone(data, physicsState.position, stateRef.current.stats.inInterior, dt);
          if (res.triggeredAlert) {
            sound.playAlertKlaxon();
          }
          if (data.state === 'alert') activeAlertDrones++;

          // Sync 3D Mesh
          group.position.set(data.position.x, data.position.y, data.position.z);
          group.rotation.y = data.spotlightAngle;

          // Update colors based on state
          const eyeMesh = group.children[1] as THREE.Mesh;
          const coneMat = coneMesh.material as THREE.MeshBasicMaterial;

          if (data.state === 'disabled') {
            (eyeMesh.material as THREE.MeshBasicMaterial).color.set(0x475569);
            spotlight.color.set(0x334155);
            spotlight.intensity = 0.2;
            coneMat.opacity = 0.02;
          } else if (data.state === 'alert') {
            (eyeMesh.material as THREE.MeshBasicMaterial).color.set(0xff0000);
            spotlight.color.set(0xff0000);
            spotlight.intensity = 3.5;
            coneMat.color.set(0xff0000);
            coneMat.opacity = 0.35;
          } else {
            (eyeMesh.material as THREE.MeshBasicMaterial).color.set(0xef4444);
            spotlight.color.set(0xef4444);
            spotlight.intensity = 1.5;
            coneMat.color.set(0xef4444);
            coneMat.opacity = 0.12;
          }
        });

        // Update Anita Global Alert Level (reduced by Selam Amare Serenity Aegis)
        const alertMultiplier = (stateRef.current.activeAmareBuff === 'Serenity Aegis') ? 0.4 : 1.0;
        stateRef.current.stats.anitaAlertLevel = calculateGlobalAlert(
          stateRef.current.stats.anitaAlertLevel,
          activeAlertDrones * alertMultiplier,
          dt
        );

        // Anita Defense Turrets logic
        turretObjects.forEach(({ data, group, beamMesh }) => {
          if (!data.active) {
            (beamMesh.material as THREE.MeshBasicMaterial).opacity = 0;
            return;
          }

          const dist = Math.hypot(
            physicsState.position.x - data.position.x,
            physicsState.position.z - data.position.z
          );

          if (dist < data.range && !stateRef.current.stats.inInterior) {
            // Aim at player
            const angle = Math.atan2(
              physicsState.position.x - data.position.x,
              physicsState.position.z - data.position.z
            );
            data.aimAngle = angle;
            group.rotation.y = angle;

            data.telegraphTimer += dt;
            (beamMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.8, data.telegraphTimer);

            if (data.telegraphTimer > 1.2) {
              // Turret shot!
              const dmg = (stateRef.current.activeAmareBuff === 'Spiritual Bastion') ? 0 : 18;
              stateRef.current.stats.hp = Math.max(0, stateRef.current.stats.hp - dmg);
              sound.playLand(); // Impact sound
              data.telegraphTimer = 0;

              if (stateRef.current.stats.hp <= 0) {
                stateRef.current.onTriggerGameOver();
              }
            }
          } else {
            data.telegraphTimer = 0;
            (beamMesh.material as THREE.MeshBasicMaterial).opacity = 0;
          }
        });

        // 14. Interactions Check
        let nearestInteractable: (typeof interactiveObjects)[0] | null = null;
        let nearestDist = 3.2;

        interactiveObjects.forEach((obj) => {
          const d = Math.hypot(
            physicsState.position.x - obj.position.x,
            physicsState.position.z - obj.position.z
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearestInteractable = obj;
          }
        });

        if (nearestInteractable) {
          const item = nearestInteractable as (typeof interactiveObjects)[0];
          if (item.type === 'amare_npc' && item.npcData) {
            stateRef.current.onInteractionPrompt(`[E] Speak with ${item.npcData.name} ("${item.npcData.epithet}")`);
          } else if (item.type === 'door') {
            stateRef.current.onInteractionPrompt('[E] Toggle Blast Door');
          } else if (item.type === 'terminal') {
            stateRef.current.onInteractionPrompt('[E] Hack Anita Mainframe Node');
          } else if (item.type === 'crate') {
            stateRef.current.onInteractionPrompt('[E] Retrieve Datashard');
          }
        } else {
          stateRef.current.onInteractionPrompt(null);
        }

        // Execute Interaction
        if (stateRef.current.input.interactPressed && nearestInteractable) {
          const item = nearestInteractable as (typeof interactiveObjects)[0];
          if (item.type === 'amare_npc' && item.npcData) {
            sound.playDoorSlide();
            stateRef.current.onOpenAmareDialogue(item.npcData);
          } else if (item.type === 'door') {
            const doorEntry = doorMeshes.find((dm) => dm.id === item.targetId);
            if (doorEntry) {
              doorEntry.open = !doorEntry.open;
              doorEntry.mesh.position.y = doorEntry.open ? 4.2 : 1.5;
              sound.playDoorSlide();
            }
          } else if (item.type === 'terminal') {
            sound.playHackSuccess();
            stateRef.current.stats.nodesHacked++;
            stateRef.current.stats.terminalsAccessed++;
            const scoreBonus = (stateRef.current.activeAmareBuff === 'Solidarity Link') ? 500 : 250;
            stateRef.current.stats.score += scoreBonus;
            // Disable terminal glow
            ((item.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(0x10b981); // Green hacked

            // Check victory condition
            if (stateRef.current.stats.nodesHacked >= stateRef.current.stats.totalNodesRequired) {
              stateRef.current.onTriggerVictory();
            }
          } else if (item.type === 'crate') {
            sound.playHackSuccess();
            stateRef.current.stats.datashardsCollected++;
            const shardScore = (stateRef.current.activeAmareBuff === 'Solidarity Link') ? 200 : 100;
            stateRef.current.stats.score += shardScore;
            stateRef.current.stats.empEnergy = stateRef.current.stats.maxEmpEnergy; // Recharge
            item.mesh.visible = false;
          }
        }

        // Reset edge-triggered inputs
        stateRef.current.input.interactPressed = false;
        stateRef.current.input.jumpPressed = false;
        stateRef.current.input.empPressed = false;
        stateRef.current.input.attackLightPressed = false;
        stateRef.current.input.attackHeavyPressed = false;
        stateRef.current.input.wakePressed = false;
        stateRef.current.input.dashPressed = false;

        // 15. Smooth Camera Follow
        const camYaw = stateRef.current.cameraAngleY;
        const camPitch = stateRef.current.cameraPitch;
        const camDist = stateRef.current.cameraDistance;

        const targetCamX = physicsState.position.x - Math.sin(camYaw) * Math.cos(camPitch) * camDist;
        const targetCamZ = physicsState.position.z - Math.cos(camYaw) * Math.cos(camPitch) * camDist;
        const targetCamY = physicsState.position.y + 1.8 + Math.sin(camPitch) * camDist;

        // Exponential camera damping
        const camDamp = 1 - Math.exp(-14 * dt);
        camera.position.x += (targetCamX - camera.position.x) * camDamp;
        camera.position.y += (targetCamY - camera.position.y) * camDamp;
        camera.position.z += (targetCamZ - camera.position.z) * camDamp;

        _vecCam.set(physicsState.position.x, physicsState.position.y + 1.6, physicsState.position.z);
        camera.lookAt(_vecCam);

        // Sync stats with React throttled at ~10Hz
        statSyncTimer += dt;
        if (statSyncTimer >= 0.1) {
          statSyncTimer = 0;

          // Build Tactical Radar Entities for Minimap
          const radarEntities: RadarEntity[] = [
            ...droneObjects.map((d) => ({
              id: d.data.id,
              type: 'drone' as const,
              x: d.data.position.x,
              z: d.data.position.z,
              state: d.data.state,
            })),
            ...turretObjects.map((t) => ({
              id: t.data.id,
              type: 'turret' as const,
              x: t.data.position.x,
              z: t.data.position.z,
              state: t.data.active ? 'active' : 'disabled',
            })),
            ...interactiveObjects.map((obj) => ({
              id: obj.id,
              type: obj.type as 'node' | 'crate' | 'amare_npc',
              x: obj.position.x,
              z: obj.position.z,
              name: obj.npcData?.name,
            })),
          ];

          stateRef.current.stats.radarEntities = radarEntities;
          stateRef.current.stats.playerPos = { ...physicsState.position };
          stateRef.current.stats.playerYaw = physicsState.rotationY;
          stateRef.current.stats.isAwake = physicsState.isAwake;
          stateRef.current.stats.isDodging = physicsState.isDashing;
          stateRef.current.stats.isAttacking = physicsState.isAttacking;
          stateRef.current.stats.attackType = physicsState.attackType;

          stateRef.current.onStatsUpdate({ ...stateRef.current.stats });
        }
      }

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(clockTick);
    };

    animFrameId = requestAnimationFrame(clockTick);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);

      window.removeEventListener('virtual-move', onVirtualMove);
      window.removeEventListener('virtual-look', onVirtualLook);
      window.removeEventListener('virtual-sprint', onVirtualSprint);
      window.removeEventListener('virtual-attack', onVirtualAttack);
      window.removeEventListener('virtual-wake', onVirtualWake);
      window.removeEventListener('virtual-dash', onVirtualDash);
      window.removeEventListener('virtual-jump', onVirtualJump);
      window.removeEventListener('virtual-interact', onVirtualInteract);
      window.removeEventListener('virtual-emp', onVirtualEmp);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
    };
  }, [activeSeed]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full absolute inset-0 cursor-crosshair overflow-hidden select-none"
      data-testid="game-canvas"
    />
  );
};
