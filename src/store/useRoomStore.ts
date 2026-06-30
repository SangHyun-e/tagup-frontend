import { create } from 'zustand';
import { Room } from '../types';

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  setCurrentRoom: (room: Room | null) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoom: null,
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((s) => ({ rooms: [room, ...s.rooms.filter((r) => r.id !== room.id)] })),
  setCurrentRoom: (room) => set({ currentRoom: room }),
}));
