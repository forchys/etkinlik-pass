"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserCheck, XCircle, RefreshCcw, Loader2, Clock, Check, ImageIcon 
} from 'lucide-react';

export default function PendingParticipantsPage() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingParticipants();
  }, []);

  async function fetchPendingParticipants() {
    setLoading(true);
    // Sadece onayli_mi sütunu FALSE olanları getir
    const { data, error } = await supabase
      .from('katilimcilar')
      .select('*')
      .eq('onayli_mi', false)
      .order('created_at', { ascending: false });
    
    if (!error && data) setParticipants(data);
    setLoading(false);
  }

  async function approveUser(id: string) {
    const { error } = await supabase
      .from('katilimcilar')
      .update({ onayli_mi: true })
      .eq('id', id);

    if (!error) {
      // Listeden kaldır (çünkü artık onaylı)
      setParticipants(prev => prev.filter(p => p.id !== id));
      alert("Katılımcı başarıyla onaylandı!");
    } else {
      alert("Hata: " + error.message);
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tighter">Onay Bekleyenler</h1>
          <p className="text-slate-400 text-sm">Kayıt olmuş ama henüz onaylanmamış kişiler.</p>
        </div>
        <button onClick={fetchPendingParticipants} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
          <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
        ) : participants.length === 0 ? (
          <div className="text-center p-12 bg-slate-900/20 rounded-[2.5rem] border border-dashed border-white/10">
            <UserCheck className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 font-bold uppercase text-xs">Onay bekleyen kimse yok.</p>
          </div>
        ) : participants.map((person) => (
          <div key={person.id} className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl flex justify-between items-center backdrop-blur-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-amber-500" />
                <h3 className="font-bold text-lg">{person.ad_soyad}</h3>
              </div>
              <p className="text-sm text-slate-400">{person.telefon}</p>
              <p className="text-[10px] text-slate-500 uppercase font-mono">ID: {person.id} | Slot: {person.etkinlik_id || person.slot_id || 'Belirtilmemiş'}</p>
              
              {/* Dekont Görüntüleme Yeniliği */}
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
              <span className="text-xs">ONAYLA</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
