import type { Position } from "3meta";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import { PalaceCard } from "./palace-card";

type PalaceGridProps = {
  chart: NormalizedQimenChart;
  selectedPalace: Position | null;
  onSelectPalace: (position: Position) => void;
};

const GRID_ORDER: Position[] = [4, 9, 2, 3, 5, 7, 8, 1, 6];

export function PalaceGrid({
  chart,
  selectedPalace,
  onSelectPalace,
}: PalaceGridProps) {
  return (
    <div className="palace-grid-shell">
      <div className="palace-grid">
        {GRID_ORDER.map((position) => {
          const palace = chart.palaceMap[position];
          return (
            <PalaceCard
              key={position}
              palace={palace}
              hiddenStem={chart.hiddenStemsByPalace[position]}
              isSelected={selectedPalace === position}
              onSelect={() => onSelectPalace(position)}
            />
          );
        })}
      </div>
    </div>
  );
}
