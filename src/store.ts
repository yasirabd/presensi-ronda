import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { db } from './client';

type Room = { id: string; name: string; role: string };
type State = {
  ready: boolean; session: Session | null; recovery: boolean;
  rooms: Room[]; current: string; loading: boolean; error: string;
  sessionChanged: (session: Session | null, recovery?: boolean) => void;
  refresh: (preferred?: string) => Promise<void>; choose: (id: string) => void;
};
let request = 0;
export const useWorkspace = create<State>((set, get) => ({
  ready: false, session: null, recovery: false, rooms: [], current: '', loading: false, error: '',
  sessionChanged(session, recovery) {
    const changed = get().session?.user.id !== session?.user.id;
    if (changed) request++;
    set({ ready: true, session, recovery: recovery ?? (changed ? false : get().recovery),
      ...(changed ? { rooms: [], current: '', loading: !!session, error: '' } : {}) });
  },
  choose(id) { if (get().rooms.some(room => room.id === id)) set({ current: id }); },
  async refresh(preferred) {
    const user = get().session?.user.id;
    if (!user) return;
    const sequence = ++request;
    set({ loading: true, error: '' });
    const { data, error } = await db.from('memberships').select('rt_id,role,room:communities!inner(name)').eq('user_id', user);
    if (request !== sequence || get().session?.user.id !== user) return;
    if (error) { set({ loading: false, error: 'Ruang RT belum dapat dimuat. Periksa koneksi lalu coba lagi.' }); return; }
    const rooms = (data || []).map(row => {
      const room = Array.isArray(row.room) ? row.room[0] : row.room;
      return { id: String(row.rt_id), name: room.name as string, role: String(row.role) };
    }).sort((a,b) => a.name.localeCompare(b.name,'id'));
    const current = rooms.find(room => room.id === preferred) ?? rooms.find(room => room.id === get().current) ?? rooms[0];
    set({ rooms, current: current?.id || '', loading: false });
  },
}));
