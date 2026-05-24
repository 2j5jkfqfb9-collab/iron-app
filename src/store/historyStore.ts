import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutSession } from '@/types';

type HistoryState = {
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  updateNote: (id: string, note: string) => void;
  deleteSession: (id: string) => void;
  previousSession: (templateId: string, excludeId: string) => WorkoutSession | null;
};

export function clearHistory() {
  useHistoryStore.setState({ sessions: [] });
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (session) =>
        set((state) => ({ sessions: [session, ...state.sessions] })),

      updateNote: (id, note) =>
        set((state) => ({
          sessions: state.sessions.map((s) => s.id === id ? { ...s, note } : s),
        })),

      deleteSession: (id) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),

      previousSession: (templateId, excludeId) => {
        const { sessions } = get();
        return (
          sessions.find(
            (s) => s.templateId === templateId && s.id !== excludeId && s.endedAt != null,
          ) ?? null
        );
      },
    }),
    {
      name: 'iron-history',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
