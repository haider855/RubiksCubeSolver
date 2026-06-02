import type { CubeColour, CubeState, Face } from "../cube/index.js";
import { CubeFace } from "./CubeFace.js";

const NET_FACE_ORDER: Face[] = ["U", "L", "F", "R", "B", "D"];

type CubeNetProps = {
  cube: CubeState;
  onStickerChange: (face: Face, index: number, colour: CubeColour) => void;
  selectedColour: CubeColour;
};

export function CubeNet({ cube, onStickerChange, selectedColour }: CubeNetProps) {
  return (
    <div className="cube-net" aria-label="Cube net">
      {NET_FACE_ORDER.map((face) => (
        <CubeFace
          key={face}
          face={face}
          stickers={cube[face]}
          selectedColour={selectedColour}
          onStickerChange={onStickerChange}
        />
      ))}
    </div>
  );
}
