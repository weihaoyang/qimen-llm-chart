import type { Position } from "3meta";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import { PalaceCard } from "./palace-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type PalaceGridProps = {
  chart: NormalizedQimenChart;
  selectedPalace: Position | null;
  onSelectPalace: (position: Position) => void;
};

const GRID_ORDER: Position[] = [4, 9, 2, 3, 5, 7, 8, 1, 6];

const TERM_HELP = {
  值符: "值符为本局领神，所在宫位常作为判断全局主势的线索。",
  值使: "值使为本局所临之门，所在宫位常用来观察事情的执行与落点。",
  驿马: "驿马主移动、变化与往来，落宫提示事情可能出现的动向。",
  空亡: "空亡提示该宫之象暂时虚空或受阻，宜结合用神与时令一起判断。",
} as const;

export function PalaceGrid({
  chart,
  selectedPalace,
  onSelectPalace,
}: PalaceGridProps) {
  return (
    <TooltipProvider delayDuration={180} skipDelayDuration={120}>
      <div className="palace-grid-shell">
      <div className="palace-grid-shell__legend" aria-label="盘面索引">
        <span>
          {chart.raw.ju.type}
          {chart.raw.ju.number}局
        </span>
        <span>{chart.raw.yuan}元</span>
        <span>{chart.raw.season}</span>
        <span>{chart.raw.monthElement}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="palace-grid-shell__term">值符 {chart.raw.zhiFu.position}宫</span>
          </TooltipTrigger>
          <TooltipContent>{TERM_HELP.值符}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="palace-grid-shell__term">值使 {chart.raw.zhiShi.position}宫</span>
          </TooltipTrigger>
          <TooltipContent>{TERM_HELP.值使}</TooltipContent>
        </Tooltip>
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
    </TooltipProvider>
  );
}
