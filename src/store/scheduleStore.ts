import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 0 = Monday … 6 = Sunday
type ScheduleStore = {
  schedule: Record<number, string | null>;
  setDayTemplate: (day: number, templateId: string | null) => void;
};

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set) => ({
      schedule: {},
      setDayTemplate: (day, templateId) =>
        set((s) => ({ schedule: { ...s.schedule, [day]: templateId } })),
    }),
    { name: 'iron-schedule', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
