"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '../layout'; // Seçili etkinlik ID'sini (slot) buradan alıyoruz
import { 
  UserCheck, RefreshCcw, Loader2, Clock, Check, ImageIcon 
} from 'lucide-react';

export default function PendingParticipantsPage() {
  const { selectedSlotId } = useAdmin(); // Admin panelindeki aktif slot/etkinlik ID'si
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Verileri Getir: Hem seçili etkinlik olacak hem de onayli_mi false olacak
  async function fetchPendingParticipants() {
    if (!selectedSlotId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('katilimcilar')
      .select('*')
      .eq('etkinlik_id', selectedSlotId) // Seçili etkinlik kontrolü
      .eq('onayli_mi', false)           // Sadece onaylanmamışlar
      .order('created_at', { ascending: false });
    
    if (!error && data) setParticipants(data);
    setLoading(false);
  }

  // Etkinlik (slot) değiştiğinde listeyi otomatik tazele
  useEffect(() => {
    fetchPendingParticipants();
  }, [selectedSlotId]);

  // 2. Onayla: Sütunu TRUE yap ve listeden kaldır
  async function approveUser(id: string) {
    const { error } = await supabase
      .from('katilimcilar')
      .update({ onayli_mi: true }) // Artık onaylı
      .eq('id', id);

    if (!error) {
      // Listeyi yerelde güncelle (onaylanan kişiyi ekrandan kaldır)
      setParticipants(prev => prev.filter(p => p.id !== id));
      alert("Katılımcı onaylandı!");
    } else {
      alert("Hata: " + error.message);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tighter text-white">Onay Bekleyenler</h1>
          <p className="text-slate-400 text-sm">Bu slot için onay bekleyen kayıtlar.</p>
        </div>
        <button onClick={fetchPendingParticipants} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white">
          <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
        ) : participants.length === 0 ? (
          <div className="text-center p-12 bg-slate-900/20 rounded-[2.5rem] border border-dashed border-white/10 text-white">
            <UserCheck className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 font-bold uppercase text-xs">Onay bekleyen kayıt yok.</p>
          </div>
        ) : participants.map((person) => (
          <div key={person.id} className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl flex justify-between items-center backdrop-blur-sm text-white">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-amber-500" />
                <h3 className="font-bold text-lg">{person.ad_soyad}</h3>
              </div>
              <p className="text-sm text-slate-400">{person.telefon}</p>
              
              {person.dekont_url && (
                <a 
                  href={person.dekont_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 text-[10px] font-bold hover:underline mt-2 pt-1 border-t border-white/5 w-fit"
                >
                  <ImageIcon size={12} /> DEKONTU GÖRÜNTÜLE
                </a>
              )}
            </div>
            
            <button 
              onClick={() => approveUser(person.id)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <Check size={18} />
              <span className="text-xs font-black">ONAYLA</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
