import { FACE_CENTRE_INDEX } from "../cube/constants.js";
import type { CubeColour, Face, FaceStickers } from "../cube/index.js";
import { FACE_LABELS } from "./cubeDisplay.js";
import { Sticker } from "./Sticker.js";

type CubeFaceProps = {
  face: Face;
  stickers: FaceStickers;
  onStickerChange: (face: Face, index: number, colour: CubeColour) => void;
  selectedColour: CubeColour;
};

export function CubeFace({
  face,
  stickers,
  onStickerChange,
  selectedColour,
}: CubeFaceProps) {
  return (
    <div className={`cube-face cube-face-${face.toLowerCase()}`}>
      <div className="face-label">{FACE_LABELS[face]}</div>
      <div className="sticker-grid" aria-label={`${FACE_LABELS[face]} face`}>
        {stickers.map((colour, index) => (
          <Sticker
            key={`${face}-${index}`}
            colour={colour}
            face={face}
            index={index}
            isCentre={index === FACE_CENTRE_INDEX}
            onSelect={() => onStickerChange(face, index, selectedColour)}
          />
        ))}
      </div>
    </div>
  );
}
