import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UnitStore = {
  unit: 'kg' | 'lb';
  toggle: () => void;
  weeklyGoal: number;
  setWeeklyGoal: (n: number) => void;
};

export const useUnitStore = create<UnitStore>()(
  persist(
    (set) => ({
      unit: 'kg',
      toggle: () => set((s) => ({ unit: s.unit === 'kg' ? 'lb' : 'kg' })),
      weeklyGoal: 3,
      setWeeklyGoal: (n) => set({ weeklyGoal: n }),
    }),
    { name: 'iron-unit', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
