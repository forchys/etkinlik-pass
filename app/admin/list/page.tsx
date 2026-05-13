"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '../layout';
import { 
  Users, CheckCircle, XCircle, Loader2, Search, X, 
  RefreshCcw, TicketCheck, AlertTriangle, Save, Trash2, Edit3, Armchair
} from 'lucide-react';

export default function ListPage() {
  const { participants, setParticipants, fetchParticipants, loading, setLoading, selectedSlotId, eventSlots } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNotArrived, setFilterNotArrived] = useState(false);
  const [filterTicketed, setFilterTicketed] = useState(false);
  const [filterNotTicketed, setFilterNotTicketed] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any>(null);

  const formatPhoneNumber = (phone: any) => {
    let cleaned = String(phone).replace(/\D/g, ''); 
    if (cleaned.startsWith('90')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    return cleaned.slice(-10);
  };

  const handleUpdateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('katilimcilar').update({ ad_soyad: editingPerson.ad_soyad, telefon: formatPhoneNumber(editingPerson.telefon) }).eq('id', editingPerson.id);
    if (!error) { setIsEditModalOpen(false); fetchParticipants(); } else { alert("Hata: " + error.message); }
  };

  const deleteUser = async (id: number) => {
    if (confirm("Silinsin mi?")) {
      const { error } = await supabase.from('katilimcilar').delete().eq('id', id);
      if (!error) fetchParticipants();
    }
  };

  const resetSeat = async (id: number) => {
    if (confirm("Sıfırlansın mı?")) {
      const { error } = await supabase.from('katilimcilar').update({ koltuk_no: null, bilet_alindi_mi: false, geldi_mi: false, qr_kodu: crypto.randomUUID() }).eq('id', id);
      if (!error) fetchParticipants();
    }
  };

  const deleteAllParticipants = async () => {
  // participants listesi boşsa direkt çık
  if (!participants || participants.length === 0) {
    alert("Silinecek kimse bulunamadı.");
    return;
  }

  const confirmText = prompt(`Slot ${selectedSlotId} listesini temizlemek için ONAYLIYORUM yazın.`);
  
  if (confirmText === "ONAYLIYORUM") {
    try {
      setLoading(true);

      // ID'leri al
      const idsToDelete = participants.map((p: any) => p.id);

      // Supabase'e silme isteği gönder
      const { error } = await supabase
        .from('katilimcilar')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      // BAŞARILI: Burası kritik. 
      // Context fonksiyonları (j is not a function hatası veren yerler) 
      // yerine tarayıcıyı zorla yeniliyoruz.
      alert("Liste başarıyla temizlendi.");
      window.location.reload(); 

    } catch (err: any) {
      console.error("Silme Hatası:", err);
      alert("Hata oluştu: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  }
};

  const filteredList = participants.filter((p: any) => {
    const isApproved = p.onayli_mi === true;
    const matchesSearch = p.ad_soyad.toLowerCase().includes(searchTerm.toLowerCase()) || (p.telefon && p.telefon.includes(searchTerm));
    const matchesNotArrived = filterNotArrived ? p.geldi_mi === false : true;
    const matchesTicketed = filterTicketed ? p.bilet_alindi_mi === true : true;
    const matchesNotTicketed = filterNotTicketed ? p.bilet_alindi_mi === false : true;
    return isApproved && matchesSearch && matchesNotArrived && matchesTicketed && matchesNotTicketed;
  });

  const currentSlotSettings = eventSlots.find((s: any) => s.slot_id === selectedSlotId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {isEditModalOpen && editingPerson && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold uppercase">Bilgileri Düzenle</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateParticipant} className="space-y-4">
              <input type="text" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none text-white" value={editingPerson.ad_soyad} onChange={(e) => setEditingPerson({...editingPerson, ad_soyad: e.target.value})} />
              <input type="text" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none text-white" value={editingPerson.telefon} onChange={(e) => setEditingPerson({...editingPerson, telefon: e.target.value})} />
              <button type="submit" className="w-full bg-blue-600 p-5 rounded-2xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2"><Save size={18}/> Güncelle</button>
            </form>
          </div>
        </div>
      )}

      {/* Arama ve Filtre Bölümü */}
      <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input type="text" placeholder="İsim veya telefon ile ara..." className="w-full bg-slate-950 border border-white/5 pl-12 pr-4 py-4 rounded-2xl outline-none text-base text-white focus:border-blue-500 transition-colors" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={fetchParticipants} className="bg-slate-800 p-4 rounded-2xl text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-bold uppercase text-xs"><RefreshCcw size={20} /> Yenile</button>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setFilterNotArrived(!filterNotArrived)} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold border transition-all ${filterNotArrived ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}><XCircle size={16} /> GELMEYENLER</button>
          <button onClick={() => setFilterTicketed(!filterTicketed)} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold border transition-all ${filterTicketed ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}><TicketCheck size={16} /> BİLET ALANLAR</button>
          <button onClick={() => setFilterNotTicketed(!filterNotTicketed)} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold border transition-all ${filterNotTicketed ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}><XCircle size={16} /> BİLET ALMAYANLAR</button>
        </div>
      </div>

      <button onClick={deleteAllParticipants} className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 p-5 rounded-2xl font-bold uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /> Slot {selectedSlotId} Listesini Tamamen Sil</button>

      {/* Liste Bölümü */}
      <div className="space-y-4 pb-20">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={48} /></div>
        ) : filteredList.map((person: any) => {
          const isDuplicate = participants.filter((p: any) => p.telefon === person.telefon).length > 1;

          return (
            <div key={person.id} className="bg-slate-900/40 p-6 md:p-8 rounded-[2.5rem] border border-white/5 shadow-xl hover:border-white/10 transition-colors">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-bold text-xl md:text-2xl leading-tight text-white">{person.ad_soyad}</p>
                    {isDuplicate && (
                      <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">ORTAK TEL NO</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border tracking-wider ${person.geldi_mi ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-800 text-slate-500 border-white/5'}`}>{person.geldi_mi ? 'İÇERİDE' : 'GELMEDİ'}</span>
                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border tracking-wider ${person.bilet_alindi_mi ? 'bg-blue-500 text-white border-blue-400' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{person.bilet_alindi_mi ? 'BİLET ALINDI' : 'BİLET ALINMADI'}</span>
                    {currentSlotSettings?.has_seating && person.koltuk_no && (
                      <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg border bg-slate-800 text-blue-300 border-blue-500/20 flex items-center gap-2">
                        <Armchair size={14} /> KOLTUK: {person.koltuk_no}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-2">
                    <p className={`text-sm md:text-base font-medium ${isDuplicate ? 'text-amber-400' : 'text-slate-400'}`}>📞 {person.telefon}</p>
                    <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Kayıt No: {person.id} | Slot: {person.etkinlik_id}</p>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto border-t md:border-none pt-4 md:pt-0">
                  {!person.geldi_mi && (
                    <button onClick={async () => {
                      if(confirm(`${person.ad_soyad} girsin mi?`)) {
                        const { error } = await supabase.from('katilimcilar').update({ geldi_mi: true }).eq('id', person.id);
                        if (!error) setParticipants((prev: any[]) => prev.map(p => p.id === person.id ? { ...p, geldi_mi: true } : p));
                      }
                    }} className="flex-1 p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center"><TicketCheck size={22} /></button>
                  )}
                  <div className="flex flex-1 gap-2">
                    <button onClick={() => { setEditingPerson(person); setIsEditModalOpen(true); }} className="flex-1 p-4 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center"><Edit3 size={20} /></button>
                    <button onClick={() => resetSeat(person.id)} className="flex-1 p-4 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center"><RefreshCcw size={20} /></button>
                    <button onClick={() => deleteUser(person.id)} className="flex-1 p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"><Trash2 size={20} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && filteredList.length === 0 && (
          <div className="text-center py-20 bg-slate-900/20 rounded-[3rem] border border-dashed border-white/10">
            <Users className="mx-auto text-slate-700 mb-4" size={64} />
            <p className="text-slate-500 font-bold uppercase text-sm tracking-widest">Arama kriterlerine uygun kimse bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}
