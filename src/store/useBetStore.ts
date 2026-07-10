import { create } from 'zustand';
import { Bet } from '../types';
import { api } from '../lib/api';

interface BetState {
  bets: Bet[];
  loading: boolean;
  fetchBets: (roomId: number) => Promise<void>;
  addBet: (bet: Bet) => void;
  updateBet: (bet: Bet) => void;
  clearBets: () => void;
}

export const useBetStore = create<BetState>((set) => ({
  bets: [],
  loading: false,

  fetchBets: async (roomId: number) => {
    set({ loading: true });
    try {
      const bets = await api.get<Bet[]>(`/api/v1/rooms/${roomId}/bets`);
      set({ bets: bets ?? [] });
    } catch {
      set({ bets: [] });
    } finally {
      set({ loading: false });
    }
  },

  addBet: (bet) => set((s) => ({ bets: [bet, ...s.bets] })),

  updateBet: (bet) =>
    set((s) => ({ bets: s.bets.map((b) => (b.id === bet.id ? bet : b)) })),

  clearBets: () => set({ bets: [] }),
}));
