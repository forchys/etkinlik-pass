"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '../layout';
import { 
  UserCheck, RefreshCcw, Loader2, Clock, Check, ImageIcon, AlertTriangle 
} from 'lucide-react';

export default function PendingParticipantsPage() {
  const { selectedSlotId } = useAdmin(); 
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSlotId) {
      fetchPendingParticipants();
    }
  }, [selectedSlotId]);

  async function fetchPendingParticipants() {
    setLoading(true);
    setErrorLog(null);
    
    try {
      // TEŞHİS: Önce filtre koymadan bu slotta hiç adam var mı ona bakalım
      const { data, error } = await supabase
        .from('katilimcilar')
        .select('*')
        .eq('etkinlik_id', selectedSlotId);

      if (error) {
        setErrorLog("Supabase Hatası: " + error.message);
      } else if (data) {
        // Gelen verileri manuel filtreleyelim (Hata payını sıfıra indirmek için)
        const pendingOnes = data.filter(p => p.onayli_mi === false || p.onayli_mi === null);
        setParticipants(pendingOnes);
        
        if (data.length > 0 && pendingOnes.length === 0) {
          setErrorLog(`Bu etkinlikte ${data.length} kişi var ama hepsi onaylı.`);
        }
      }
    } catch (err: any) {
      setErrorLog("Bağlantı Hatası: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveUser(id: string) {
    const { error } = await supabase
      .from('katilimcilar')
      .update({ onayli_mi: true })
      .eq('id', id);

    if (!error) {
      setParticipants(prev => prev.filter(p => p.id !== id));
    } else {
      alert("Hata: " + error.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hata Mesajı Paneli */}
      {errorLog && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-500 text-sm">
          <AlertTriangle size={20} />
          <p>{errorLog}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase text-white">Onay Bekleyenler</h1>
          <p className="text-slate-400 text-sm italic">Slot ID: {selectedSlotId || 'Seçilmedi'}</p>
        </div>
        <button onClick={fetchPendingParticipants} className="p-3 bg-white/5 rounded-2xl text-white">
          <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
        ) : participants.length === 0 ? (
          <div className="text-center p-12 bg-slate-900/20 rounded-[2.5rem] border border-dashed border-white/10 text-white">
            <UserCheck className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 font-bold uppercase text-xs">Görüntülenecek bekleyen kayıt yok.</p>
          </div>
        ) : participants.map((person) => (
          <div key={person.id} className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl flex justify-between items-center text-white">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-amber-500" />
                <h3 className="font-bold text-lg">{person.ad_soyad}</h3>
              </div>
              <p className="text-sm text-slate-400">{person.telefon}</p>
              {person.dekont_url && (
                <a href={person.dekont_url} target="_blank" className="text-blue-400 text-xs font-bold hover:underline mt-2 inline-block">DEKONTU GÖR</a>
              )}
            </div>
            
            <button 
              onClick={() => approveUser(person.id)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95"
            >
              <Check size={18} /> ONAYLA
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
