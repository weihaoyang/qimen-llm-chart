import { CausalGraphNode } from '../types';

export interface StrategyMeta {
  id: string;
  name: string;
  description: string;
  type: 'CORE' | 'TACTICAL' | 'DEFENSIVE' | 'DESTRUCTIVE';
  costDescription: string;
  successSignal: string;
  estimatedSurvivalProb: number;
  assignedAssetIds: string[];
}

interface GameState {
  // Global Modals and States
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  
  // Game Data
  cards: CausalGraphNode[];
  strategies: StrategyMeta[];
  
  // Actions
  addCard: (card: CausalGraphNode) => void;
  setCards: (cards: CausalGraphNode[]) => void;
  addStrategy: (strategy: StrategyMeta) => void;
}

// The reference prototype shipped a zustand store, but the mounted Next.js
// experience keeps its state in App.tsx so we do not add a second client-side
// persistence truth. Keep a tiny compatible store for any auxiliary prototype
// component that imports it.
let state: Pick<GameState, 'activeModal' | 'cards' | 'strategies'> = {
  activeModal: null,
  cards: [],
  strategies: [],
};

export const useGameStore = (() => state) as (() => typeof state) & {
  getState: () => typeof state;
  setState: (next: Partial<typeof state>) => void;
};
useGameStore.getState = () => state;
useGameStore.setState = (next) => { state = { ...state, ...next }; };
