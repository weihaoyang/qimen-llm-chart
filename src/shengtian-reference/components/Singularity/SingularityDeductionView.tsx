import React from 'react';
import { BattlefieldState, DecisionDNARecord } from '../../types';
import { Phase1Reassessment } from '../BreakthroughMode/Phase1Reassessment';
import { Phase2CognitiveWarfare } from '../BreakthroughMode/Phase2CognitiveWarfare';
import { Phase3SandTable } from '../BreakthroughMode/Phase3SandTable';
import { Phase4Autopsy } from '../BreakthroughMode/Phase4Autopsy';

interface SingularityDeductionViewProps {
  battlefield: BattlefieldState;
  battleId: string;
  onUpdateBattlefield: React.Dispatch<React.SetStateAction<BattlefieldState>>;
  onExitSingularityMode: () => void;
  onSaveDNARecord: (record: DecisionDNARecord) => Promise<void> | void;
}

/** Product entry point for the four-stage, battle-scoped breakthrough flow. */
export const SingularityDeductionView: React.FC<SingularityDeductionViewProps> = ({
  battlefield,
  onUpdateBattlefield,
  onExitSingularityMode,
  onSaveDNARecord,
}) => {
  const advancePhase = (phase: 1 | 2 | 3 | 4) => {
    onUpdateBattlefield((previous) => ({ ...previous, breakthroughPhase: phase }));
  };

  switch (battlefield.breakthroughPhase) {
    case 2:
      return <Phase2CognitiveWarfare battlefield={battlefield} onUpdateBattlefield={onUpdateBattlefield} onProceedToPhase3={() => advancePhase(3)} />;
    case 3:
      return <Phase3SandTable battlefield={battlefield} onUpdateBattlefield={onUpdateBattlefield} onProceedToPhase4={() => advancePhase(4)} />;
    case 4:
      return <Phase4Autopsy battlefield={battlefield} onSaveDNARecord={onSaveDNARecord} onReturnToStandardMode={onExitSingularityMode} />;
    case 1:
    default:
      return <Phase1Reassessment battlefield={battlefield} onUpdateBattlefield={onUpdateBattlefield} onProceedToPhase2={() => advancePhase(2)} />;
  }
};
