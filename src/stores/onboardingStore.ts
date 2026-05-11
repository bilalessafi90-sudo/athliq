import { create } from 'zustand';
import { OnboardingData, FitnessGoal, ExperienceLevel, WeightUnit } from '../types';

interface OnboardingStore {
  data: OnboardingData;
  currentStep: number;
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  toggleEquipment: (id: string) => void;
  toggleDietary: (id: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

const initialData: OnboardingData = {
  name: '',
  fitness_goal: null,
  age: null,
  height: null,
  weight: null,
  experience_level: null,
  available_equipment: [],
  preferred_days_per_week: 3,
  dietary_preferences: [],
  weight_unit: 'kg',
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  data: initialData,
  currentStep: 0,
  setField: (key, value) =>
    set((s) => ({ data: { ...s.data, [key]: value } })),
  toggleEquipment: (id) =>
    set((s) => ({
      data: {
        ...s.data,
        available_equipment: s.data.available_equipment.includes(id)
          ? s.data.available_equipment.filter((e) => e !== id)
          : [...s.data.available_equipment, id],
      },
    })),
  toggleDietary: (id) =>
    set((s) => ({
      data: {
        ...s.data,
        dietary_preferences: s.data.dietary_preferences.includes(id)
          ? s.data.dietary_preferences.filter((d) => d !== id)
          : [...s.data.dietary_preferences, id],
      },
    })),
  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
  prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),
  reset: () => set({ data: initialData, currentStep: 0 }),
}));
