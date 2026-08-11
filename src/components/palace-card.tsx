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
  const statusFlags = [
    palace.isZhiFu ? "值符" : null,
    palace.isZhiShi ? "值使" : null,
    palace.isPostHorse ? "驿马" : null,
    palace.voidness.hasVoidness ? "空亡" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <button
      type="button"
      className={cn(
        "palace-card",
        isSelected && "is-selected",
        palace.position === 5 && "is-center",
        palace.isZhiFu && "is-zhifu",
        palace.isZhiShi && "is-zhishi",
        palace.isPostHorse && "is-posthorse",
        palace.voidness.hasVoidness && "has-voidness",
      )}
      onClick={onSelect}
    >
      <div className="palace-card__topline">
        <div className="palace-card__header">
          <div className="palace-card__identity">
            <p className="palace-card__index">{palace.position}宫</p>
            <h3>{palace.trigram}</h3>
            <span>{palace.innerOuter}</span>
          </div>
          <div className="palace-card__status">
            {[palace.gatePressure, ...statusFlags].filter(Boolean).map((flag) => (
              <strong key={flag}>{flag}</strong>
            ))}
          </div>
        </div>

        <div className="palace-card__primary">
          <div className="palace-card__primary-item palace-card__primary-item--star">
            <span>星</span>
            <strong>{palace.star}</strong>
          </div>
          <div className="palace-card__primary-item palace-card__primary-item--gate">
            <span>门</span>
            <strong>{palace.gate}</strong>
          </div>
          <div className="palace-card__primary-item palace-card__primary-item--deity">
            <span>神</span>
            <strong>{palace.deity}</strong>
          </div>
        </div>
      </div>

      <dl className="palace-card__facts">
        <div className="palace-card__fact palace-card__fact--heaven">
          <dt>天</dt>
          <dd>{Array.isArray(palace.heavenlyStem) ? palace.heavenlyStem.join("/") : palace.heavenlyStem}</dd>
        </div>
        <div className="palace-card__fact palace-card__fact--earth">
          <dt>地</dt>
          <dd>{Array.isArray(palace.earthlyStem) ? palace.earthlyStem.join("/") : palace.earthlyStem}</dd>
        </div>
        <div className="palace-card__fact palace-card__fact--hidden">
          <dt>暗</dt>
          <dd>{hiddenStem ?? "无"}</dd>
        </div>
        <div className="palace-card__fact palace-card__fact--branch">
          <dt>支</dt>
          <dd>{Array.isArray(palace.earthBranch) ? palace.earthBranch.join("/") : palace.earthBranch}</dd>
        </div>
        <div className="palace-card__fact palace-card__fact--status">
          <dt>势</dt>
          <dd>{palace.status?.star ?? "无"} / {palace.status?.gate ?? "无"}</dd>
        </div>
      </dl>

    </button>
  );
}
