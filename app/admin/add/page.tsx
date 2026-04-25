"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { useAdmin } from '../layout';
import { Loader2, UserPlus, FileUp, AlertTriangle } from 'lucide-react';

export default function AddPage() {
  const { participants, fetchParticipants, selectedSlotId } = useAdmin();
  const [newPerson, setNewPerson] = useState({ ad_soyad: "", telefon: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [uiWarnings, setUiWarnings] = useState<{
    isOpen: boolean;
    messages: string[];
    onConfirm: () => void;
    onCancel: () => void;
  }>({ isOpen: false, messages: [], onConfirm: () => {}, onCancel: () => {} });

  const formatPhoneNumber = (phone: any) => {
    let cleaned = String(phone).replace(/\D/g, ''); 
    if (cleaned.startsWith('90')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    return cleaned.slice(-10);
  };

  const validateParticipant = (name: string, rawPhone: string, formattedPhone: string, existingList: any[], seenPhones: Set<string>) => {
    const warnings = [];
    const cleanName = name.trim();
    if (!cleanName.includes(" ")) warnings.push(`"${cleanName}": Soyadı eksik olabilir.`);
    if (cleanName.length > 25) warnings.push(`"${cleanName}": İsim çok uzun.`);
    
    if (/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(String(rawPhone))) {
      warnings.push(`"${cleanName}": Telefon numarasında metin (harf) bulunuyor (${rawPhone}).`);
    }

    const isDuplicate = existingList.some(p => p.telefon === formattedPhone);
    const isDuplicateInBatch = seenPhones.has(formattedPhone);
    
    if (isDuplicate || isDuplicateInBatch) {
      warnings.push(`Uyarı: "${cleanName}" ile aynı telefon (${formattedPhone}) listeye eklenecek.`);
    }
    
    return warnings;
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        
        const allWarnings: string[] = [];
        const seenPhones = new Set<string>();
        const formattedData = data.map(row => {
          const nameKeys = ["Adınız Soyisimiz", "Adınız Soyisim", "Ad Soyad", "ad_soyad", "Adınız", "İsim Soyisim"];
          const phoneKeys = ["Telefon numarası", "Telefon", "telefon", "No", "Tel"];
          const nameKey = Object.keys(row).find(k => nameKeys.includes(k.trim()));
          const phoneKey = Object.keys(row).find(k => phoneKeys.includes(k.trim()));
          if (nameKey && phoneKey && row[nameKey] && row[phoneKey]) {
            const name = String(row[nameKey]).trim();
            const rawPhone = String(row[phoneKey]);
            const phone = formatPhoneNumber(rawPhone);
            
            const rowWarnings = validateParticipant(name, rawPhone, phone, participants, seenPhones);
            if (rowWarnings.length > 0) allWarnings.push(...rowWarnings);

            seenPhones.add(phone);

            return {
              ad_soyad: name,
              telefon: phone,
              qr_kodu: crypto.randomUUID(),
              geldi_mi: false,
              bilet_alindi_mi: false,
              etkinlik_id: selectedSlotId
            };
          }
          return null;
        }).filter(item => item !== null);

        const proceedWithUpload = async () => {
          setAddLoading(true);
          if (formattedData.length > 0) {
            const { error } = await supabase
              .from('katilimcilar')
              .insert(formattedData);

            if (!error) {
              alert(`${formattedData.length} kayıt işlendi.`);
              fetchParticipants();
            } else alert("Supabase Hatası: " + error.message);
          } else alert("Excel'de uygun sütun bulunamadı!");
          setAddLoading(false);
          e.target.value = "";
        };

        if (allWarnings.length > 0) {
          setAddLoading(false);
          setUiWarnings({
            isOpen: true,
            messages: allWarnings,
            onConfirm: () => {
              setUiWarnings(prev => ({ ...prev, isOpen: false }));
              proceedWithUpload();
            },
            onCancel: () => {
              setUiWarnings(prev => ({ ...prev, isOpen: false }));
              e.target.value = "";
            }
          });
          return;
        }

        proceedWithUpload();

      } catch (err) { 
        alert("Dosya okunurken bir hata oluştu."); 
        setAddLoading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddSinglePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.ad_soyad.trim() || !newPerson.telefon.trim()) return alert("Eksik bilgi!");
    
    const rawPhone = newPerson.telefon;
    const phone = formatPhoneNumber(rawPhone);
    const seenPhones = new Set<string>();
    const warnings = validateParticipant(newPerson.ad_soyad, rawPhone, phone, participants, seenPhones);
    
    const proceedWithAdd = async () => {
      setAddLoading(true);
      const { error } = await supabase.from('katilimcilar').insert([{ 
        ad_soyad: newPerson.ad_soyad.trim(), 
        telefon: phone, 
        qr_kodu: crypto.randomUUID(), 
        geldi_mi: false, 
        bilet_alindi_mi: false,
        etkinlik_id: selectedSlotId 
      }]);

      if (!error) { 
          setNewPerson({ ad_soyad: "", telefon: "" }); 
          fetchParticipants(); 
      } else {
          alert("Hata: " + error.message);
      }
      setAddLoading(false);
    };

    if (warnings.length > 0) {
      setUiWarnings({
        isOpen: true,
        messages: warnings,
        onConfirm: () => {
          setUiWarnings(prev => ({ ...prev, isOpen: false }));
          proceedWithAdd();
        },
        onCancel: () => {
          setUiWarnings(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    proceedWithAdd();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {uiWarnings.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6 text-amber-500">
              <AlertTriangle size={32} />
              <h2 className="text-xl font-black uppercase">Uyarılar Var</h2>
            </div>
            <div className="max-h-60 overflow-y-auto mb-6 space-y-2 pr-2 custom-scrollbar">
              {uiWarnings.messages.map((msg, idx) => (
                <div key={idx} className="bg-amber-500/10 text-amber-400 p-3 rounded-xl text-xs font-bold border border-amber-500/20">
                  {msg}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-400 mb-6 font-bold">Yine de işleme devam etmek istiyor musunuz?</p>
            <div className="flex gap-3">
              <button onClick={uiWarnings.onCancel} className="flex-1 bg-slate-800 text-white p-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-700 transition-colors">Vazgeç</button>
              <button onClick={uiWarnings.onConfirm} className="flex-1 bg-amber-600 text-white p-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-amber-500 transition-colors">Yine de Kaydet</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900/60 border border-dashed border-white/20 rounded-[2.5rem] p-8 text-center cursor-pointer">
        <label className="cursor-pointer"><input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleExcelUpload} disabled={addLoading} />
          <div className="flex flex-col items-center gap-4">
            <div className="bg-emerald-500/10 p-5 rounded-2xl">{addLoading ? <Loader2 className="animate-spin text-emerald-400" size={40} /> : <FileUp size={40} className="text-emerald-400" />}</div>
            <h3 className="text-lg font-bold uppercase tracking-tight">Slot {selectedSlotId}'e Excel Yükle</h3>
          </div>
        </label>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8">
        <div className="flex items-center gap-3 mb-6"><UserPlus size={24} className="text-emerald-400" /><h2 className="text-lg font-bold uppercase">Manuel Ekle (Slot {selectedSlotId})</h2></div>
        <form onSubmit={handleAddSinglePerson} className="space-y-4">
          <input type="text" placeholder="Ad Soyad" className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white outline-none" value={newPerson.ad_soyad} onChange={(e) => setNewPerson({...newPerson, ad_soyad: e.target.value})} />
          <input type="text" placeholder="Telefon" className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white outline-none" value={newPerson.telefon} onChange={(e) => setNewPerson({...newPerson, telefon: e.target.value})} />
          <button disabled={addLoading} type="submit" className="w-full bg-emerald-600 p-5 rounded-2xl font-bold uppercase text-xs tracking-widest mt-4">Listeye Kaydet</button>
        </form>
      </div>
    </div>
  );
}
