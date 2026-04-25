"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '../layout';
import { 
  UserCheck, RefreshCcw, Loader2, Clock, Check, ImageIcon, AlertTriangle,
  Mail, School, Users, Calendar
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

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
        ) : participants.length === 0 ? (
          <div className="text-center p-12 bg-slate-900/20 rounded-[2.5rem] border border-dashed border-white/10 text-white">
            <UserCheck className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 font-bold uppercase text-xs">Görüntülenecek bekleyen kayıt yok.</p>
          </div>
        ) : participants.map((person) => (
          <div key={person.id} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                <h3 className="font-bold text-xl tracking-tight">{person.ad_soyad}</h3>
              </div>

              {/* Katılımcı Bilgileri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Mail size={14} className="text-blue-400" />
                  <span>{person.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Users size={14} className="text-purple-400" />
                  <span>{person.telefon}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <School size={14} className="text-emerald-400" />
                  <span>{person.okul || 'Okul belirtilmedi'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                  <Check size={14} className="text-orange-400" />
                  <span>Ref: {person.referans || 'Yok'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-wider">
                  <Calendar size={12} />
                  <span>Kayıt: {new Date(person.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
              
              {person.dekont_url && (
                <a 
                  href={person.dekont_url} 
                  target="_blank" 
                  className="flex items-center gap-2 bg-blue-500/10 text-blue-400 text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-500/20 transition-colors mt-2 w-fit"
                >
                  <ImageIcon size={14} /> DEKONTU GÖRÜNTÜLE
                </a>
              )}
            </div>
            
            <button 
              onClick={() => approveUser(person.id)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-500/20 w-full md:w-auto justify-center"
            >
              <Check size={20} strokeWidth={3} /> ONAYLA
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
