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
  const activePosition = selectedPalace ?? 5;
  const activePalace = chart.palaceMap[activePosition];
  const activeHeavenlyStem = Array.isArray(activePalace.heavenlyStem)
    ? activePalace.heavenlyStem.join("/")
    : activePalace.heavenlyStem;
  const activeEarthlyStem = Array.isArray(activePalace.earthlyStem)
    ? activePalace.earthlyStem.join("/")
    : activePalace.earthlyStem;
  const activeBranches = Array.isArray(activePalace.earthBranch)
    ? activePalace.earthBranch.join("/")
    : activePalace.earthBranch;

  return (
    <div className="palace-grid-shell">
      <div className="palace-grid-shell__hud">
        <div className="palace-grid-shell__intro">
          <h2>九宫主盘</h2>
          <p>{chart.input.datetime}</p>
        </div>

        <div className="palace-grid-shell__focus">
          <div className="palace-grid-shell__focus-title">
            <span>当前聚焦</span>
            <strong>
              {activePalace.position} 宫 · {activePalace.trigram}
            </strong>
          </div>

          <div className="palace-grid-shell__focus-core">
            <div>
              <span>八门</span>
              <strong>{activePalace.gate}</strong>
            </div>
            <div>
              <span>九星</span>
              <strong>{activePalace.star}</strong>
            </div>
            <div>
              <span>八神</span>
              <strong>{activePalace.deity}</strong>
            </div>
            <div>
              <span>宫势</span>
              <strong>{activePalace.gatePressure}</strong>
            </div>
          </div>

          <div className="palace-grid-shell__focus-meta">
            <span>天盘 {activeHeavenlyStem}</span>
            <span>地盘 {activeEarthlyStem}</span>
            <span>地支 {activeBranches}</span>
            <span>
              旺衰 {activePalace.status?.star ?? "无"} / {activePalace.status?.gate ?? "无"}
            </span>
          </div>
        </div>
      </div>

      <div className="palace-grid-shell__legend">
        <span>
          {chart.raw.ju.type}
          {chart.raw.ju.number}局
        </span>
        <span>{chart.raw.yuan}元</span>
        <span>{chart.raw.season}</span>
        <span>{chart.raw.monthElement}</span>
        <span>值符 {chart.raw.zhiFu.position}宫</span>
        <span>值使 {chart.raw.zhiShi.position}宫</span>
      </div>

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
