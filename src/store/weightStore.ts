import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

type WeightStore = {
  entries: WeightEntry[];
  addEntry: (weightKg: number) => void;
  deleteEntry: (id: string) => void;
};

export const useWeightStore = create<WeightStore>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (weightKg) =>
        set((s) => ({
          entries: [
            { id: `w-${Date.now()}`, date: new Date().toISOString(), weightKg },
            ...s.entries,
          ],
        })),
      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'iron-weight', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
