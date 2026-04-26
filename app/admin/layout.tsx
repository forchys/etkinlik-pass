"use client";
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, Lock, Plus, Camera, ShieldCheck, 
  Settings2, LayoutGrid, X, Power, Film, Theater, Trophy, 
  Calendar, MapPin, Loader2, Save, Armchair, Link2 
} from 'lucide-react';

// Sayfalar arası veri paylaşımı için Context oluşturuyoruz
const AdminContext = createContext<any>(null);
export const useAdmin = () => useContext(AdminContext);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- SLOT YÖNETİMİ STATE'LERİ ---
  const [eventSlots, setEventSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number>(1); 
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null);

  const ADMIN_PASSWORD = "flickbaba31";

  const fetchEventSlots = async () => {
    const { data } = await supabase
      .from('etkinlik_ayarlari')
      .select('*')
      .order('slot_id', { ascending: true });
    if (data) setEventSlots(data);
  };

  const updateLocalSlot = (id: string, field: string, value: any) => {
    setEventSlots(prev => prev.map(slot => {
      if (slot.id === id) {
        if (field === 'is_active' && value === false) {
          return { 
            ...slot, 
            is_active: false,
            event_name: "Çok Yakında",
            event_date: "bilinmiyor",
            event_location: "bilinmiyor"
          };
        }
        return { ...slot, [field]: value };
      }
      return slot;
    }));
  };

  const handleUpdateSlot = async (slot: any) => {
    setSavingSlotId(slot.id);
    const { error } = await supabase
      .from('etkinlik_ayarlari')
      .update({
        event_name: slot.event_name,
        event_date: slot.event_date,
        event_location: slot.event_location,
        event_type: slot.event_type,
        is_active: slot.is_active,
        has_seating: slot.has_seating,
        whatsapp_link: slot.whatsapp_link,
        is_paid: slot.is_paid // Yeni alan eklendi
      })
      .eq('id', slot.id);

    if (error) alert("Hata: " + error.message);
    setSavingSlotId(null);
  };

  const fetchParticipants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('katilimcilar')
      .select('*')
      .eq('etkinlik_id', selectedSlotId)
      .order('ad_soyad', { ascending: true });
    if (!error && data) setParticipants(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) fetchParticipants();
  }, [selectedSlotId, isAuthenticated]);

  useEffect(() => {
    const authStatus = localStorage.getItem('flick_admin_auth');
    if (authStatus === 'true') setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('flick_admin_auth', 'true');
      setIsAuthenticated(true);
    } else alert("Hatalı şifre!");
  };

  const handleLogout = () => { localStorage.removeItem('flick_admin_auth'); setIsAuthenticated(false); };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchEventSlots();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-slate-900/40 border border-white/5 p-10 rounded-[2.5rem] text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"><Lock size={32} /></div>
          <h1 className="text-2xl font-black mb-8">Flick Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="Şifre" className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none text-center" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <button type="submit" className="w-full bg-blue-600 p-5 rounded-2xl font-bold uppercase text-xs tracking-widest">Giriş</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <AdminContext.Provider value={{
      participants, setParticipants, fetchParticipants, loading,
      eventSlots, selectedSlotId,
      isAuthenticated
    }}>
      <main className="min-h-screen bg-[#020617] text-white p-4 font-sans flex flex-col items-center">
        
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-xl">
            <div className="w-full max-w-5xl bg-slate-950 border border-white/10 rounded-[2.5rem] sm:rounded-[3rem] flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
              
              {/* Sabit Başlık */}
              <div className="flex justify-between items-center p-6 sm:p-8 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">Etkinlik Slotları</h2>
                  <p className="text-[10px] text-slate-500 font-bold tracking-widest">AKTİF SLOTLARI DÜZENLE</p>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="bg-slate-900 p-3 rounded-2xl hover:bg-rose-500/20 hover:text-rose-500 transition-all">
                  <X size={24} />
                </button>
              </div>

              {/* Kaydırılabilir İçerik Alanı */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {eventSlots.map((slot) => (
                    <div key={slot.id} className={`p-5 sm:p-6 rounded-[2rem] border transition-all duration-500 ${slot.is_active ? 'bg-slate-900/40 border-blue-500/30' : 'bg-slate-900/10 border-white/5 opacity-60'}`}>
                      
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <span className="text-[10px] font-black bg-blue-600/20 text-blue-500 px-3 py-1 rounded-lg">SLOT #{slot.slot_id}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateLocalSlot(slot.id, 'has_seating', !slot.has_seating)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[8px] font-black transition-all ${slot.has_seating ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                          >
                            <Armchair size={12} /> {slot.has_seating ? 'KOLTUK AÇIK' : 'KOLTUK KAPALI'}
                          </button>
                          <button 
                            onClick={() => updateLocalSlot(slot.id, 'is_active', !slot.is_active)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[8px] font-black transition-all ${slot.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                          >
                            <Power size={14} /> {slot.is_active ? 'AKTİF' : 'PASİF'}
                          </button>
                        </div>
                      </div>

                      <div className={`space-y-4 ${!slot.is_active && 'pointer-events-none opacity-50'}`}>
                        <button 
                          onClick={() => updateLocalSlot(slot.id, 'is_paid', !slot.is_paid)}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[9px] font-black transition-all border ${slot.is_paid ? 'bg-amber-600/10 border-amber-600/20 text-amber-500' : 'bg-emerald-600/10 border-emerald-600/20 text-emerald-500'}`}
                        >
                          {slot.is_paid ? 'ÜCRETLİ ETKİNLİK (DEKONT İSTER)' : 'ÜCRETSİZ ETKİNLİK (DEKONT İSTEMEZ)'}
                        </button>

                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'cinema', icon: <Film size={16}/> },
                            { id: 'theater', icon: <Theater size={16}/> },
                            { id: 'social', icon: <Users size={16}/> },
                            { id: 'quiz', icon: <Trophy size={16}/> }
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => updateLocalSlot(slot.id, 'event_type', t.id)}
                              className={`p-3 rounded-xl flex flex-col items-center gap-1 border transition-all ${slot.event_type === t.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}
                            >
                              {t.icon}
                              <span className="text-[8px] font-bold uppercase">{t.id}</span>
                            </button>
                          ))}
                        </div>

                        <input placeholder="Etkinlik Adı" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500/50" value={slot.event_name || ''} onChange={(e) => updateLocalSlot(slot.id, 'event_name', e.target.value)} />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input placeholder="Tarih" className="w-full bg-slate-950 border border-white/5 p-4 pl-10 rounded-2xl text-[10px] font-bold outline-none" value={slot.event_date || ''} onChange={(e) => updateLocalSlot(slot.id, 'event_date', e.target.value)} />
                          </div>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input placeholder="Konum" className="w-full bg-slate-950 border border-white/5 p-4 pl-10 rounded-2xl text-[10px] font-bold outline-none" value={slot.event_location || ''} onChange={(e) => updateLocalSlot(slot.id, 'event_location', e.target.value)} />
                          </div>
                        </div>
                        
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                          <input placeholder="WhatsApp Grup Linki" className="w-full bg-slate-950 border border-white/5 p-4 pl-10 rounded-2xl text-[10px] font-bold outline-none" value={slot.whatsapp_link || ''} onChange={(e) => updateLocalSlot(slot.id, 'whatsapp_link', e.target.value)} />
                        </div>
                      </div>

                      <button 
                        disabled={savingSlotId === slot.id}
                        onClick={() => handleUpdateSlot(slot)}
                        className="w-full bg-white text-black p-4 rounded-2xl font-black text-[10px] tracking-widest mt-6 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        {savingSlotId === slot.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        GÜNCELLE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-lg flex justify-between items-center bg-slate-900/40 p-5 rounded-[2rem] border border-white/5 mb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl"><ShieldCheck size={24} /></div>
            <div><h1 className="text-lg font-bold uppercase">Flick Admin</h1><button onClick={handleLogout} className="text-[10px] text-rose-500 font-bold uppercase">Çıkış</button></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="bg-slate-800 p-3 rounded-2xl text-blue-400"><Settings2 size={22} /></button>
            <Link href="/admin/add" className={`${pathname === '/admin/add' ? 'bg-emerald-600' : 'bg-slate-800'} p-3 rounded-2xl`}><Plus size={22} /></Link>
            <Link href="/admin/list" className={`${pathname === '/admin/list' ? 'bg-blue-600' : 'bg-slate-800'} p-3 rounded-2xl relative`}><Users size={22} /></Link>
            <Link href="/admin/scanner" className={`${pathname === '/admin/scanner' ? 'bg-blue-600' : 'bg-slate-800'} p-3 rounded-2xl`}><Camera size={22} /></Link>
            <Link href="/admin/pending" className={`${pathname === '/admin/pending' ? 'bg-blue-600' : 'bg-slate-800'} p-3 rounded-2xl`}><ShieldCheck size={20} /></Link>
          </div>
        </div>

        <div className="w-full max-w-lg grid grid-cols-4 gap-2 mb-6">
          {[1, 2, 3, 4].map((num) => (
            <button 
              key={num}
              onClick={() => setSelectedSlotId(num)}
              className={`py-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${
                selectedSlotId === num 
                ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)] scale-105 z-10' 
                : 'bg-slate-900/40 border-white/5 text-slate-500 hover:bg-slate-800'
              }`}
            >
              <LayoutGrid size={14} className={selectedSlotId === num ? 'text-white' : 'text-slate-600'} />
              <span className="text-[9px] font-black uppercase">Slot {num}</span>
            </button>
          ))}
        </div>

        <div className="w-full max-w-lg flex flex-col gap-6">
          {children}
        </div>

        <style jsx global>{`
          #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
          #reader { border: none !important; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.2); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.4); }
        `}</style>
      </main>
    </AdminContext.Provider>
  );
}
