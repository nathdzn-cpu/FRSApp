import { create } from "zustand";

interface FormState {
  jobForm: any; // Using 'any' for flexibility, can be refined with JobFormValues type
  setJobForm: (data: any) => void;
  clearJobForm: () => void;
}

export const useFormStore = create<FormState>((set) => ({
  jobForm: null,
  setJobForm: (data) => set({ jobForm: data }),
  clearJobForm: () => set({ jobForm: null }),
}));