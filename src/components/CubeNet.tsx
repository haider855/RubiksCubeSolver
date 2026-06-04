import type { CubeColour, CubeState, Face } from "../cube/index.js";
import { CubeFace } from "./CubeFace.js";

const NET_FACE_ORDER: Face[] = ["U", "L", "F", "R", "B", "D"];

type CubeNetProps = {
  cube: CubeState;
  onStickerChange: (face: Face, index: number, colour: CubeColour) => void;
  selectedColour: CubeColour;
  ariaLabel?: string;
  isReadOnly?: boolean;
};

export function CubeNet({
  cube,
  onStickerChange,
  selectedColour,
  ariaLabel = "Cube net",
  isReadOnly = false,
}: CubeNetProps) {
  return (
    <div className="cube-net" aria-label={ariaLabel}>
      {NET_FACE_ORDER.map((face) => (
        <CubeFace
          key={face}
          face={face}
          stickers={cube[face]}
          selectedColour={selectedColour}
          onStickerChange={onStickerChange}
          isReadOnly={isReadOnly}
        />
      ))}
    </div>
  );
}
