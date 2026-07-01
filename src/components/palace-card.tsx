import type { Palace } from "3meta";
import { cn } from "@/lib/utils";

type PalaceCardProps = {
  palace: Palace;
  hiddenStem?: string;
  isSelected: boolean;
  onSelect: () => void;
};

export function PalaceCard({
  palace,
  hiddenStem,
  isSelected,
  onSelect,
}: PalaceCardProps) {
  return (
    <button
      type="button"
      className={cn("palace-card", isSelected && "is-selected")}
      onClick={onSelect}
    >
      <div className="palace-card__header">
        <div>
          <p className="palace-card__index">{palace.position} 宫</p>
          <h3>{palace.trigram}</h3>
        </div>
        <div className="palace-card__status">
          <span>{palace.innerOuter}</span>
          <strong>{palace.gatePressure}</strong>
        </div>
      </div>

      <div className="palace-card__core">
        <div>
          <span>九星</span>
          <strong>{palace.star}</strong>
        </div>
        <div>
          <span>八门</span>
          <strong>{palace.gate}</strong>
        </div>
      </div>

      <dl className="palace-card__facts">
        <div>
          <dt>八神</dt>
          <dd>{palace.deity}</dd>
        </div>
        <div>
          <dt>天盘干</dt>
          <dd>{Array.isArray(palace.heavenlyStem) ? palace.heavenlyStem.join("/") : palace.heavenlyStem}</dd>
        </div>
        <div>
          <dt>地盘干</dt>
          <dd>{Array.isArray(palace.earthlyStem) ? palace.earthlyStem.join("/") : palace.earthlyStem}</dd>
        </div>
        <div>
          <dt>暗干</dt>
          <dd>{hiddenStem ?? "无"}</dd>
        </div>
        <div>
          <dt>地支</dt>
          <dd>{Array.isArray(palace.earthBranch) ? palace.earthBranch.join("/") : palace.earthBranch}</dd>
        </div>
        <div>
          <dt>旺衰</dt>
          <dd>{palace.status?.star ?? "无"} / {palace.status?.gate ?? "无"}</dd>
        </div>
      </dl>

      <div className="palace-card__flags">
        {palace.isZhiFu ? <span>值符</span> : null}
        {palace.isZhiShi ? <span>值使</span> : null}
        {palace.isPostHorse ? <span>驿马</span> : null}
        {palace.voidness.hasVoidness ? <span>空亡</span> : null}
      </div>
    </button>
  );
}
