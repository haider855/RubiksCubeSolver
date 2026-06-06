import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { CubeState, Face, Move } from "../../cube/index.js";
import { CubeModel } from "./CubeModel.js";

type CubeSceneProps = {
  activeMove: string | null;
  baseCube: CubeState;
  currentMoveIndex: number;
  moves: Move[];
  onStickerClick: (face: Face, index: number) => void;
  sceneBackground: string;
};

export function CubeScene({
  activeMove,
  baseCube,
  currentMoveIndex,
  moves,
  onStickerClick,
  sceneBackground,
}: CubeSceneProps) {
  return (
    <Canvas
      camera={{ position: [4, 4, 6], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      shadows
    >
      <color attach="background" args={[sceneBackground]} />
      <ambientLight intensity={1.8} />
      <directionalLight castShadow intensity={2.2} position={[4, 6, 5]} />
      <Suspense fallback={null}>
        <CubeModel
          activeMove={activeMove}
          baseCube={baseCube}
          currentMoveIndex={currentMoveIndex}
          moves={moves}
          onStickerClick={onStickerClick}
        />
      </Suspense>
      <OrbitControls enablePan={false} maxDistance={9} minDistance={5} />
    </Canvas>
  );
}
