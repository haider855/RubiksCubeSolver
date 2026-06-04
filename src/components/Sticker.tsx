import type { CSSProperties } from "react";
import type { CubeColour, Face } from "../cube/index.js";
import { COLOUR_LABELS, COLOUR_SWATCHES, FACE_LABELS } from "./cubeDisplay.js";

type StickerProps = {
  colour: CubeColour;
  face: Face;
  index: number;
  isCentre: boolean;
  onSelect: () => void;
  isReadOnly?: boolean;
};

export function Sticker({
  colour,
  face,
  index,
  isCentre,
  onSelect,
  isReadOnly = false,
}: StickerProps) {
  return (
    <button
      type="button"
      className={`sticker${isCentre ? " centre" : ""}${
        isReadOnly ? " read-only" : ""
      }`}
      style={{ "--sticker-colour": COLOUR_SWATCHES[colour] } as CSSProperties}
      aria-label={`${FACE_LABELS[face]} sticker ${index + 1}: ${COLOUR_LABELS[colour]}${
        isCentre ? " fixed centre" : ""
      }`}
      disabled={isCentre || isReadOnly}
      onClick={onSelect}
    />
  );
}
