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
  const [filterNotArrived, setFilterNotArrived] = useState(false); // filterArrived -> filterNotArrived
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
    const confirmText = prompt(`Slot ${selectedSlotId} içindeki tüm kayıtları silmek için ONAYLIYORUM yazın.`);
    
    if (confirmText === "ONAYLIYORUM") {
      setLoading(true); // İşlem sürerken yükleniyor göster
      
      const { error } = await supabase
        .from('katilimcilar')
        .delete()
        .eq('etkinlik_id', String(selectedSlotId)); // ID'nin string olduğundan emin ol

      if (error) {
        console.error("Silme Hatası:", error);
        alert("Silme başarısız: " + error.message);
      } else {
        alert("Tüm kayıtlar başarıyla silindi.");
        fetchParticipants();
      }
      setLoading(false);
    }
  };

  const filteredList = participants.filter((p: any) => {
    const isApproved = p.onayli_mi === true;
    
    const matchesSearch = p.ad_soyad.toLowerCase().includes(searchTerm.toLowerCase()) || (p.telefon && p.telefon.includes(searchTerm));
    
    // REVİZE: Gelmeyenler filtresi (geldi_mi: false olanları gösterir)
    const matchesNotArrived = filterNotArrived ? p.geldi_mi === false : true;
    
    const matchesTicketed = filterTicketed ? p.bilet_alindi_mi === true : true;
    const matchesNotTicketed = filterNotTicketed ? p.bilet_alindi_mi === false : true;
    
    return isApproved && matchesSearch && matchesNotArrived && matchesTicketed && matchesNotTicketed;
  });

  const currentSlotSettings = eventSlots.find((s: any) => s.slot_id === selectedSlotId);

  return (
    <div className="space-y-4">
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

      <div className="bg-slate-900/40 p-4 rounded-[2.5rem] border border-white/5 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input type="text" placeholder="Bu slotta ara..." className="w-full bg-slate-950 border border-white/5 pl-11 pr-4 py-3 rounded-xl outline-none text-sm text-white" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={fetchParticipants} className="bg-slate-800 p-3 rounded-xl text-white"><RefreshCcw size={20} /></button>
        </div>
        <div className="flex gap-2">
          {/* REVİZE: GELMEYENLER BUTONU */}
          <button onClick={() => setFilterNotArrived(!filterNotArrived)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold border transition-all ${filterNotArrived ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}><XCircle size={14} /> GELMEYENLER</button>
          
          <button onClick={() => setFilterTicketed(!filterTicketed)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold border transition-all ${filterTicketed ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}><TicketCheck size={14} /> BİLET ALANLAR</button>
          <button onClick={() => setFilterNotTicketed(!filterNotTicketed)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold border transition-all ${filterNotTicketed ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}><XCircle size={14} /> BİLET ALMAYANLAR</button>
        </div>
      </div>
      <button onClick={deleteAllParticipants} className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2"><Trash2 size={16} /> Slot {selectedSlotId} Listesini Sil</button>
      <div className="space-y-3 pb-10">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : filteredList.map((person: any) => {
          const isDuplicate = participants.filter((p: any) => p.telefon === person.telefon).length > 1;

          return (
            <div key={person.id} className="bg-slate-900/40 p-5 rounded-[2.5rem] border border-white/5 shadow-xl">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-lg leading-tight">{person.ad_soyad}</p>
                    {isDuplicate && (
                      <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-md border border-amber-500/30">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span className="text-[8px] font-bold text-amber-500 uppercase">ORTAK TEL NO</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-md border ${person.geldi_mi ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border-white/5'}`}>{person.geldi_mi ? 'İÇERİDE' : 'GELMEDİ'}</span>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-md border ${person.bilet_alindi_mi ? 'bg-blue-500 text-white border-blue-500' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{person.bilet_alindi_mi ? 'BİLET ALINDI' : 'BİLET ALINMADI'}</span>
                    {currentSlotSettings?.has_seating && person.koltuk_no && (
                      <span className="text-[9px] font-bold px-2 py-1 rounded-md border bg-slate-800 text-blue-300 border-white/10 flex items-center gap-1">
                        <Armchair size={10} /> {person.koltuk_no}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <p className={`text-[10px] ${isDuplicate ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>TEL: {person.telefon}</p>
                    <p className="text-[8px] text-slate-600 font-mono">ID: {person.id} | Slot: {person.etkinlik_id}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {!person.geldi_mi && (
                    <button onClick={async () => {
                      if(confirm(`${person.ad_soyad} girsin mi?`)) {
                        const { error } = await supabase.from('katilimcilar').update({ geldi_mi: true }).eq('id', person.id);
                        if (!error) setParticipants((prev: any[]) => prev.map(p => p.id === person.id ? { ...p, geldi_mi: true } : p));
                      }
                    }} className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><TicketCheck size={18} /></button>
                  )}
                  <button onClick={() => { setEditingPerson(person); setIsEditModalOpen(true); }} className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20"><Edit3 size={18} /></button>
                  <button onClick={() => resetSeat(person.id)} className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20"><RefreshCcw size={18} /></button>
                  <button onClick={() => deleteUser(person.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && filteredList.length === 0 && (
          <div className="text-center p-10 bg-slate-900/20 rounded-[2.5rem] border border-dashed border-white/5">
            <Users className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 font-bold uppercase text-xs">Arama kriterlerine uygun kimse yok.</p>
          </div>
        )}
      </div>
    </div>
  );
}
