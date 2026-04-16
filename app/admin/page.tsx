"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { 
  Users, CheckCircle, XCircle, Loader2, Search, X, 
  RefreshCcw, TicketCheck, Camera, ShieldCheck, AlertTriangle, 
  Settings2, Save, Trash2, Lock, UserPlus, Plus, FileUp, Edit3, Armchair,
  Power, Film, Theater, Trophy, MapPin, Calendar, LayoutGrid, Zap, UserCheck
} from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<'scanner' | 'list' | 'add'>('scanner'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- CANLI AKIŞ STATE ---
  const [liveCheckins, setLiveCheckins] = useState<any[]>([]);

  // --- SLOT YÖNETİMİ STATE'LERİ ---
  const [eventSlots, setEventSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number>(1); 
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null);

  const [filterArrived, setFilterArrived] = useState(false);
  const [filterTicketed, setFilterTicketed] = useState(false);
  const [scanStatus, setScanStatus] = useState<{status: 'idle' | 'success' | 'error' | 'warning', message: string}>({ status: 'idle', message: '' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any>(null);

  const [uiWarnings, setUiWarnings] = useState<{
    isOpen: boolean;
    messages: string[];
    onConfirm: () => void;
    onCancel: () => void;
  }>({ isOpen: false, messages: [], onConfirm: () => {}, onCancel: () => {} });

  const ADMIN_PASSWORD = "flickbaba31";
  const [newPerson, setNewPerson] = useState({ ad_soyad: "", telefon: "" });
  const [addLoading, setAddLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // --- SES EFEKTİ FONKSİYONU ---
  const playSuccessSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'); 
    audio.volume = 0.4;
    audio.play().catch(() => console.log("Ses çalma izni bekleniyor..."));
  };

  // --- CANLI AKIŞ REALTIME ABONELİĞİ ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('admin_live_feed')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'katilimcilar',
          filter: `etkinlik_id=eq.${selectedSlotId}`
        },
        (payload) => {
          // Eğer geldi_mi alanı false'tan true'ya döndüyse
          if (payload.old.geldi_mi === false && payload.new.geldi_mi === true) {
            setLiveCheckins((prev) => [payload.new, ...prev].slice(0, 3));
            playSuccessSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, selectedSlotId]);

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
          return { ...slot, is_active: false, event_name: "Çok Yakında", event_date: "bilinmiyor", event_location: "bilinmiyor" };
        }
        return { ...slot, [field]: value };
      }
      return slot;
    }));
  };

  const handleUpdateSlot = async (slot: any) => {
    setSavingSlotId(slot.id);
    const { error } = await supabase.from('etkinlik_ayarlari').update({
        event_name: slot.event_name,
        event_date: slot.event_date,
        event_location: slot.event_location,
        event_type: slot.event_type,
        is_active: slot.is_active
    }).eq('id', slot.id);
    if (error) alert("Hata: " + error.message);
    setSavingSlotId(null);
  };

  const formatPhoneNumber = (phone: any) => {
    let cleaned = String(phone).replace(/\D/g, ''); 
    if (cleaned.startsWith('90')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    return cleaned.slice(-10);
  };

  const fetchParticipants = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('katilimcilar').select('*').eq('etkinlik_id', selectedSlotId).order('ad_soyad', { ascending: true });
    if (!error && data) setParticipants(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) fetchParticipants();
  }, [selectedSlotId, isAuthenticated]);

  const validateParticipant = (name: string, rawPhone: string, formattedPhone: string, existingList: any[], seenPhones: Set<string>) => {
    const warnings = [];
    const cleanName = name.trim();
    if (!cleanName.includes(" ")) warnings.push(`"${cleanName}": Soyadı eksik olabilir.`);
    if (cleanName.length > 25) warnings.push(`"${cleanName}": İsim çok uzun.`);
    if (/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(String(rawPhone))) warnings.push(`"${cleanName}": Telefon numarasında metin bulunuyor (${rawPhone}).`);
    const isDuplicate = existingList.some(p => p.telefon === formattedPhone);
    const isDuplicateInBatch = seenPhones.has(formattedPhone);
    if (isDuplicate || isDuplicateInBatch) warnings.push(`Uyarı: "${cleanName}" ile aynı telefon (${formattedPhone}) listeye eklenecek.`);
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
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);
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
            return { ad_soyad: name, telefon: phone, qr_kodu: crypto.randomUUID(), geldi_mi: false, bilet_alindi_mi: false, etkinlik_id: selectedSlotId };
          }
          return null;
        }).filter(item => item !== null);

        const proceedWithUpload = async () => {
          setAddLoading(true);
          if (formattedData.length > 0) {
            const { error } = await supabase.from('katilimcilar').insert(formattedData);
            if (!error) { alert(`${formattedData.length} kayıt işlendi.`); fetchParticipants(); } 
            else alert("Supabase Hatası: " + error.message);
          } else alert("Excel'de uygun sütun bulunamadı!");
          setAddLoading(false); e.target.value = "";
        };

        if (allWarnings.length > 0) {
          setAddLoading(false);
          setUiWarnings({ isOpen: true, messages: allWarnings, onConfirm: () => { setUiWarnings(prev => ({ ...prev, isOpen: false })); proceedWithUpload(); }, onCancel: () => { setUiWarnings(prev => ({ ...prev, isOpen: false })); e.target.value = ""; } });
          return;
        }
        proceedWithUpload();
      } catch (err) { alert("Dosya okunurken bir hata oluştu."); setAddLoading(false); e.target.value = ""; }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('katilimcilar').update({ ad_soyad: editingPerson.ad_soyad, telefon: formatPhoneNumber(editingPerson.telefon) }).eq('id', editingPerson.id);
    if (!error) { setIsEditModalOpen(false); fetchParticipants(); } else { alert("Hata: " + error.message); }
  };

  const handleAddSinglePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.ad_soyad.trim() || !newPerson.telefon.trim()) return alert("Eksik bilgi!");
    const phone = formatPhoneNumber(newPerson.telefon);
    const warnings = validateParticipant(newPerson.ad_soyad, newPerson.telefon, phone, participants, new Set());
    
    const proceedWithAdd = async () => {
      setAddLoading(true);
      const { error } = await supabase.from('katilimcilar').insert([{ ad_soyad: newPerson.ad_soyad.trim(), telefon: phone, qr_kodu: crypto.randomUUID(), geldi_mi: false, bilet_alindi_mi: false, etkinlik_id: selectedSlotId }]);
      if (!error) { setNewPerson({ ad_soyad: "", telefon: "" }); fetchParticipants(); } 
      else alert("Hata: " + error.message);
      setAddLoading(false);
    };

    if (warnings.length > 0) {
      setUiWarnings({ isOpen: true, messages: warnings, onConfirm: () => { setUiWarnings(prev => ({ ...prev, isOpen: false })); proceedWithAdd(); }, onCancel: () => setUiWarnings(prev => ({ ...prev, isOpen: false })) });
      return;
    }
    proceedWithAdd();
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('flick_admin_auth');
    if (authStatus === 'true') setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) { localStorage.setItem('flick_admin_auth', 'true'); setIsAuthenticated(true); } 
    else alert("Hatalı şifre!");
  };

  const handleLogout = () => { localStorage.removeItem('flick_admin_auth'); setIsAuthenticated(false); };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchEventSlots();
  }, [isAuthenticated]);

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
      const { error } = await supabase.from('katilimcilar').delete().eq('etkinlik_id', selectedSlotId);
      if (!error) fetchParticipants();
    }
  };

  const safeStopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try { await scannerRef.current.stop(); scannerRef.current = null; } catch (err) {}
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (view === 'scanner') {
      const startCamera = async () => {
        try {
          await safeStopScanner();
          const html5QrCode = new Html5Qrcode("reader", { formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], verbose: false });
          scannerRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" }, { fps: 15, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
              const cleanCode = decodedText.trim();
              if (scanStatus.status !== 'idle') return;
              const { data: user } = await supabase.from('katilimcilar').select('*').eq('qr_kodu', cleanCode).eq('etkinlik_id', selectedSlotId).maybeSingle();
              if (!user) { setScanStatus({ status: 'error', message: 'Geçersiz veya Yanlış Etkinlik!' }); }
              else if (user.geldi_mi) { setScanStatus({ status: 'warning', message: 'Zaten Girdi!' }); }
              else {
                await supabase.from('katilimcilar').update({ geldi_mi: true }).eq('id', user.id);
                setParticipants(prev => prev.map(p => p.id === user.id ? { ...p, geldi_mi: true } : p));
                setScanStatus({ status: 'success', message: `${user.ad_soyad} girdi!` });
              }
              setTimeout(() => setScanStatus({ status: 'idle', message: '' }), 2000);
            }, () => {}
          );
        } catch (err) {}
      };
      startCamera();
    } else safeStopScanner();
    return () => { safeStopScanner(); };
  }, [view, isAuthenticated, selectedSlotId]);

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

  const filteredList = participants.filter(p => {
    const matchesSearch = p.ad_soyad.toLowerCase().includes(searchTerm.toLowerCase()) || (p.telefon && p.telefon.includes(searchTerm));
    const matchesArrived = filterArrived ? p.geldi_mi === true : true;
    const matchesTicketed = filterTicketed ? p.bilet_alindi_mi === true : true;
    return matchesSearch && matchesArrived && matchesTicketed;
  });

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 font-sans flex flex-col items-center">
      
      {/* --- CANLI GİRİŞ AKIŞI UI --- */}
      <div className="fixed bottom-6 right-6 w-64 z-[200] space-y-2 pointer-events-none">
        {liveCheckins.map((person, idx) => (
          <div key={person.id + idx} className="bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 p-3 rounded-2xl flex items-center gap-3 animate-in slide-in-from-right duration-500 pointer-events-auto shadow-2xl">
            <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400 shrink-0"><UserCheck size={16} /></div>
            <div className="min-w-0">
              <p className="text-white font-bold text-xs truncate uppercase leading-none">{person.ad_soyad}</p>
              <p className="text-[9px] text-slate-500 font-black mt-1 uppercase">KOLTUK: {person.koltuk_no || '---'}</p>
            </div>
          </div>
        ))}
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-950 border border-white/10 rounded-[3rem] p-6 my-8">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-slate-950 py-2 z-10">
              <div><h2 className="text-xl font-black uppercase tracking-tighter">Etkinlik Slotları</h2><p className="text-[10px] text-slate-500 font-bold tracking-widest">4 AKTİF SLOTU YÖNET</p></div>
              <button onClick={() => setIsSettingsOpen(false)} className="bg-slate-900 p-3 rounded-2xl"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {eventSlots.map((slot) => (
                <div key={slot.id} className={`p-6 rounded-[2.5rem] border transition-all duration-500 ${slot.is_active ? 'bg-slate-900/40 border-blue-500/30' : 'bg-slate-900/10 border-white/5 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black bg-blue-600/20 text-blue-500 px-3 py-1 rounded-lg">SLOT #{slot.slot_id}</span>
                    <button onClick={() => updateLocalSlot(slot.id, 'is_active', !slot.is_active)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black transition-all ${slot.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}><Power size={14} /> {slot.is_active ? 'AKTİF' : 'PASİF'}</button>
                  </div>
                  <div className={`space-y-4 ${!slot.is_active && 'pointer-events-none opacity-50'}`}>
                    <div className="grid grid-cols-4 gap-2">
                      {[{ id: 'cinema', icon: <Film size={16}/> }, { id: 'theater', icon: <Theater size={16}/> }, { id: 'social', icon: <Users size={16}/> }, { id: 'quiz', icon: <Trophy size={16}/> }].map((t) => (
                        <button key={t.id} onClick={() => updateLocalSlot(slot.id, 'event_type', t.id)} className={`p-3 rounded-xl flex flex-col items-center gap-1 border transition-all ${slot.event_type === t.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}>{t.icon}<span className="text-[8px] font-bold uppercase">{t.id}</span></button>
                      ))}
                    </div>
                    <input placeholder="Etkinlik Adı" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none" value={slot.event_name || ''} onChange={(e) => updateLocalSlot(slot.id, 'event_name', e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Tarih" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl text-[10px] font-bold outline-none" value={slot.event_date || ''} onChange={(e) => updateLocalSlot(slot.id, 'event_date', e.target.value)} />
                        <input placeholder="Konum" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl text-[10px] font-bold outline-none" value={slot.event_location || ''} onChange={(e) => updateLocalSlot(slot.id, 'event_location', e.target.value)} />
                    </div>
                  </div>
                  <button disabled={savingSlotId === slot.id} onClick={() => handleUpdateSlot(slot)} className="w-full bg-white text-black p-4 rounded-2xl font-black text-[10px] tracking-widest mt-6 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">{savingSlotId === slot.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} GÜNCELLE</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingPerson && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold uppercase">Bilgileri Düzenle</h2><button onClick={() => setIsEditModalOpen(false)} className="p-2"><X size={24} /></button></div>
            <form onSubmit={handleUpdateParticipant} className="space-y-4">
              <input type="text" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none text-white" value={editingPerson.ad_soyad} onChange={(e) => setEditingPerson({...editingPerson, ad_soyad: e.target.value})} />
              <input type="text" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none text-white" value={editingPerson.telefon} onChange={(e) => setEditingPerson({...editingPerson, telefon: e.target.value})} />
              <button type="submit" className="w-full bg-blue-600 p-5 rounded-2xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2"><Save size={18}/> Güncelle</button>
            </form>
          </div>
        </div>
      )}

      {uiWarnings.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6 text-amber-500"><AlertTriangle size={32} /><h2 className="text-xl font-black uppercase">Uyarılar Var</h2></div>
            <div className="max-h-60 overflow-y-auto mb-6 space-y-2 pr-2 custom-scrollbar">{uiWarnings.messages.map((msg, idx) => (<div key={idx} className="bg-amber-500/10 text-amber-400 p-3 rounded-xl text-xs font-bold border border-amber-500/20">{msg}</div>))}</div>
            <div className="flex gap-3"><button onClick={uiWarnings.onCancel} className="flex-1 bg-slate-800 text-white p-4 rounded-2xl font-bold uppercase text-xs tracking-widest">Vazgeç</button><button onClick={uiWarnings.onConfirm} className="flex-1 bg-amber-600 text-white p-4 rounded-2xl font-bold uppercase text-xs tracking-widest">Yine de Kaydet</button></div>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg flex justify-between items-center bg-slate-900/40 p-5 rounded-[2rem] border border-white/5 mb-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl relative">
            <ShieldCheck size={24} />
            {liveCheckins.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>}
          </div>
          <div><h1 className="text-lg font-bold uppercase leading-none">Flick Admin</h1><button onClick={handleLogout} className="text-[10px] text-rose-500 font-bold uppercase">Çıkış</button></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="bg-slate-800 p-3 rounded-2xl text-blue-400"><Settings2 size={22} /></button>
          <button onClick={() => setView('add')} className={`${view === 'add' ? 'bg-emerald-600' : 'bg-slate-800'} p-3 rounded-2xl`}><Plus size={22} /></button>
          <button onClick={() => setView('list')} className={`${view === 'list' ? 'bg-blue-600' : 'bg-slate-800'} p-3 rounded-2xl relative`}><Users size={22} /></button>
          <button onClick={() => setView('scanner')} className={`${view === 'scanner' ? 'bg-blue-600' : 'bg-slate-800'} p-3 rounded-2xl`}><Camera size={22} /></button>
        </div>
      </div>

      <div className="w-full max-w-lg grid grid-cols-4 gap-2 mb-6">
        {[1, 2, 3, 4].map((num) => (
          <button key={num} onClick={() => setSelectedSlotId(num)} className={`py-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${selectedSlotId === num ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)] scale-105 z-10' : 'bg-slate-900/40 border-white/5 text-slate-500 hover:bg-slate-800'}`}><LayoutGrid size={14} /><span className="text-[9px] font-black uppercase">Slot {num}</span></button>
        ))}
      </div>

      <div className="w-full max-w-lg flex flex-col gap-6">
        {view === 'scanner' && (
          <div className="space-y-6">
            <div className={`relative border-[4px] rounded-[2.5rem] overflow-hidden min-h-[300px] ${scanStatus.status === 'success' ? 'border-emerald-500' : scanStatus.status === 'error' ? 'border-rose-500' : scanStatus.status === 'warning' ? 'border-amber-500' : 'border-white/10'}`}>
              <div id="reader" className="w-full aspect-square bg-black"></div>
              {scanStatus.message && (<div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50"><p className={`text-xl font-black uppercase ${scanStatus.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>{scanStatus.message}</p></div>)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2rem] text-center"><p className="text-[10px] text-emerald-500 font-bold uppercase mb-1">İçeride</p><p className="text-4xl font-black text-emerald-400">{participants.filter(p => p.geldi_mi).length}</p></div>
              <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-[2rem] text-center"><p className="text-[10px] text-blue-500 font-bold uppercase mb-1">Beklenen</p><p className="text-4xl font-black text-blue-400">{participants.filter(p => !p.geldi_mi).length}</p></div>
            </div>
          </div>
        )}

        {view === 'add' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-slate-900/60 border border-dashed border-white/20 rounded-[2.5rem] p-8 text-center cursor-pointer">
              <label className="cursor-pointer"><input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleExcelUpload} disabled={addLoading} />
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-emerald-500/10 p-5 rounded-2xl">{addLoading ? <Loader2 className="animate-spin text-emerald-400" size={40} /> : <FileUp size={40} className="text-emerald-400" />}</div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">Slot {selectedSlotId}'e Excel Yükle</h3>
                </div>
              </label>
            </div>
            <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8">
              <div className="flex items-center gap-3 mb-6"><UserPlus size={24} className="text-emerald-400" /><h2 className="text-lg font-bold uppercase">Manuel Ekle</h2></div>
              <form onSubmit={handleAddSinglePerson} className="space-y-4">
                <input type="text" placeholder="Ad Soyad" className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white outline-none" value={newPerson.ad_soyad} onChange={(e) => setNewPerson({...newPerson, ad_soyad: e.target.value})} />
                <input type="text" placeholder="Telefon" className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white outline-none" value={newPerson.telefon} onChange={(e) => setNewPerson({...newPerson, telefon: e.target.value})} />
                <button disabled={addLoading} type="submit" className="w-full bg-emerald-600 p-5 rounded-2xl font-bold uppercase text-xs tracking-widest mt-4">Listeye Kaydet</button>
              </form>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="space-y-4">
            <div className="bg-slate-900/40 p-4 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input type="text" placeholder="Bu slotta ara..." className="w-full bg-slate-950 border border-white/5 pl-11 pr-4 py-3 rounded-xl outline-none text-sm text-white" onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={fetchParticipants} className="bg-slate-800 p-3 rounded-xl text-white"><RefreshCcw size={20} /></button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFilterArrived(!filterArrived)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold border transition-all ${filterArrived ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}><CheckCircle size={14} /> GELENLER</button>
                <button onClick={() => setFilterTicketed(!filterTicketed)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold border transition-all ${filterTicketed ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}><TicketCheck size={14} /> BİLET ALANLAR</button>
              </div>
            </div>
            <button onClick={deleteAllParticipants} className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2"><Trash2 size={16} /> Slot {selectedSlotId} Listesini Sil</button>
            <div className="space-y-3 pb-10">
              {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
              ) : filteredList.map((person) => {
                const isDuplicate = participants.filter(p => p.telefon === person.telefon).length > 1;
                return (
                  <div key={person.id} className="bg-slate-900/40 p-5 rounded-[2.5rem] border border-white/5 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg leading-tight">{person.ad_soyad}</p>
                          {isDuplicate && (<div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-md border border-amber-500/30"><AlertTriangle size={12} className="text-amber-500" /><span className="text-[8px] font-bold text-amber-500 uppercase">Mükerrer</span></div>)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-md border ${person.geldi_mi ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border-white/5'}`}>{person.geldi_mi ? 'İÇERİDE' : 'GELMEDİ'}</span>
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-md border ${person.bilet_alindi_mi ? 'bg-blue-500 text-white border-blue-500' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{person.bilet_alindi_mi ? 'BİLET ALINDI' : 'BİLET ALINMADI'}</span>
                          {person.koltuk_no && <span className="text-[9px] font-bold px-2 py-1 rounded-md border bg-slate-800 text-blue-300 border-white/10 flex items-center gap-1"><Armchair size={10} /> {person.koltuk_no}</span>}
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
                              if (!error) setParticipants(prev => prev.map(p => p.id === person.id ? { ...p, geldi_mi: true } : p));
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
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #reader { border: none !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.2); border-radius: 10px; }
      `}</style>
    </main>
  );
}
