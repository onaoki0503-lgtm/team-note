import { createContext, useContext } from 'react';
import type { CurrentUser } from './db';
import type { SharedBoard } from './teamnoteCloud';
export interface SharedIdeasValue {
  enabled: boolean; board: SharedBoard | null; error: string; connected: boolean;
  profile: CurrentUser | null;
  post: (text: string) => Promise<boolean>;
  like: (id: string, liked: boolean) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  updateProfile: (profile: CurrentUser) => Promise<boolean>;
  logout: () => Promise<void>;
}
export const disabled: SharedIdeasValue = { enabled: false, board: null, profile: null, error: '', connected: false, post: async () => false, like: async () => false, remove: async () => false, updateProfile: async () => false, logout: async () => {} };
export const SharedIdeasContext = createContext<SharedIdeasValue>(disabled);
export const useSharedIdeas = () => useContext(SharedIdeasContext);
