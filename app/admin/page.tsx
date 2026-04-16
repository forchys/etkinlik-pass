"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { 
  Users, CheckCircle, XCircle, Loader2, Search, X, 
  RefreshCcw, TicketCheck, Camera, ShieldCheck, AlertTriangle, 
  Settings2, Save, Trash2, Lock, UserPlus, Plus, FileUp, Link2
} from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<'scanner' | 'list' | 'add'>('scanner'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [csvLink, setCsvLink] = useState(""); // Yeni: Google Form Linki için state
  const [scanStatus, setScanStatus] = useState<{status: 'idle' | 'success' | 'error' | 'warning', message: string}>({
    status: 'idle',
    message: ''
  });

  const ADMIN_PASSWORD = "flickbaba31";

  const [eventSettings, setEventSettings] = useState({
    etkinlik_adi: "",
    tarih_saat: "",
    konum: ""
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  const [newPerson, setNewPerson] = useState({ ad_soyad: "", telefon: "" });
  const [addLoading, setAddLoading] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  // --- TELEFON NUMARASI TEMİZLEME FONKSİYONU ---
  const formatPhoneNumber = (phone: any) => {
    let cleaned = String(phone).replace(/\D/g, ''); 
    if (cleaned.startsWith('90')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    return cleaned.slice(-10); // Son 10 haneyi al (5xx...)
  };

  // --- GOOGLE FORM (CSV) SENKRONİZASYON FONKSİYONU ---
  const handleGoogleSync = async () => {
    if (!csvLink) return alert("Lütfen önce Google Sheets CSV linkini yapıştırın!");
    
    setAddLoading(true);
    try {
      const response = await fetch(csvLink);
      const csvText = await response.text();
      
      // CSV'yi satırlara ayır
      const rows = csvText.split("\n").map(row => row.split(","));
      const headers = rows[0].map(h => h.trim().replace(/"/g, ""));
      
      const nameKeys = ["Adınız Soyisimiz", "Adınız Soyisim", "Ad Soyad", "ad_soyad", "Adınız", "İsim Soyisim"];
      const phoneKeys = ["Telefon numarası", "Telefon", "telefon", "No", "Tel"];

      const nameIndex = headers.findIndex(h => nameKeys.some(key => h.includes(key)));
      const phoneIndex = headers.findIndex(h => phoneKeys.some(key => h.includes(key)));

      if (nameIndex === -1 || phoneIndex === -1) {
        throw new Error("CSV sütunları algılanamadı. Başlıkları kontrol edin.");
      }

      const formattedData = rows.slice(1).map(row => {
        const name = row[nameIndex]?.replace(/"/g, "").trim();
        const phone = row[phoneIndex]?.replace(/"/g, "").trim();

        if (name && phone) {
          return {
            ad_soyad: name,
            telefon: formatPhoneNumber(phone),
            qr_kodu: crypto.randomUUID(),
            geldi_mi: false,
            bilet_alindi_mi: true
          };
        }
        return null;
      }).filter(item => item !== null);

      if (formattedData.length > 0) {
        // Upsert kullanarak aynı telefon numarasına sahip olanları tekrar eklemiyoruz
        const { error } = await supabase.from('katilimcilar').upsert(formattedData, { onConflict: 'telefon' });
        if (!error) {
          alert(`${formattedData.length} kişi kontrol edildi ve yeni olanlar eklendi!`);
          fetchParticipants();
          setCsvLink("");
        } else throw error;
      }
    } catch (err: any) {
      alert("Hata: " + err.message);
    }
    setAddLoading(false);
  };

  // --- AKILLI EXCEL YÜKLEME FONKSİYONU ---
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

        const formattedData = data.map(row => {
          const nameKeys = ["Adınız Soyisimiz", "Adınız Soyisim", "Ad Soyad", "ad_soyad", "Adınız", "İsim Soyisim"];
          const phoneKeys = ["Telefon numarası", "Telefon", "telefon", "No", "Tel"];

          const nameKey = Object.keys(row).find(k => nameKeys.includes(k.trim()));
          const phoneKey = Object.keys(row).find(k => phoneKeys.includes(k.trim()));

          if (nameKey && phoneKey && row[nameKey] && row[phoneKey]) {
            return {
              ad_soyad: String(row[nameKey]).trim(),
              telefon: formatPhoneNumber(row[phoneKey]),
              qr_kodu: crypto.randomUUID(),
              geldi_mi: false,
              bilet_alindi_mi: true
            };
          }
          return null;
        }).filter(item => item !== null);

        if (formattedData.length > 0) {
          const { error } = await supabase.from('katilimcilar').upsert(formattedData, { onConflict: 'telefon' });
          if (!error) {
            alert(`${formattedData.length} kişi başarıyla eklendi!`);
            fetchParticipants();
          } else {
            alert("Supabase Hatası: " + error.message);
          }
        } else {
          alert("Excel'de uygun sütun başlıkları bulunamadı!");
        }
      } catch (err) {
        alert("Dosya okunurken bir hata oluştu.");
      }
      setAddLoading(false);
      e.target.value = ""; 
    };
    reader.readAsBinaryString(file);
  };

  const playScanSound = (isSuccess: boolean) => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(isSuccess ? 980 : 220, context.currentTime);
      gain.gain.setValueAtTime(0.7, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
    } catch (e) { console.error("Audio error", e); }
  };

  const handleAddSinglePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.ad_soyad.trim() || !newPerson.telefon.trim()) {
      return alert("Lütfen hem Ad Soyad hem de Telefon numarasını doldurunuz!");
    }

    setAddLoading(true);
    const { error } = await supabase.from('katilimcilar').insert([{
      ad_soyad: newPerson.ad_soyad.trim(),
      telefon: formatPhoneNumber(newPerson.telefon),
      qr_kodu: crypto.randomUUID(),
      geldi_mi: false,
      bilet_alindi_mi: true
    }]);

    if (!error) {
      setNewPerson({ ad_soyad: "", telefon: "" });
      fetchParticipants();
      alert("Katılımcı başarıyla eklendi!");
    } else {
      alert("Hata: " + error.message);
    }
    setAddLoading(false);
  };

  const deleteAllParticipants = async () => {
    const confirmText = prompt("Bütün katılımcı listesini silmek istediğinize emin misiniz? Devam etmek için ONAYLIYORUM yazın.");
    
    if (confirmText === "ONAYLIYORUM") {
      setLoading(true);
      const { error } = await supabase.from('katilimcilar').delete().neq('id', 0);
      if (!error) {
        alert("Tüm liste başarıyla temizlendi.");
        fetchParticipants();
      } else {
        alert("Hata: " + error.message);
      }
      setLoading(false);
    } else if (confirmText !== null) {
      alert("Hatalı onay kelimesi. İşlem iptal edildi.");
    }
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('flick_admin_auth');
    if (authStatus === 'true') setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('flick_admin_auth', 'true');
      setIsAuthenticated(true);
    } else {
      alert("Hatalı şifre!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('flick_admin_auth');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    document.title = "Flick Bilet | Yönetim Paneli";
    fetchEventSettings();
    fetchParticipants();
  }, [isAuthenticated]);

  const fetchEventSettings = async () => {
    const { data, error } = await supabase.from('etkinlik_ayarlari').select('*').single();
    if (!error && data) {
      setEventSettings({
        etkinlik_adi: data.etkinlik_adi,
        tarih_saat: data.tarih_saat,
        konum: data.konum
      });
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    const { error } = await supabase.from('etkinlik_ayarlari').update(eventSettings).eq('id', 1);
    if (!error) {
      alert("Etkinlik bilgileri başarıyla güncellendi!");
      setIsSettingsOpen(false);
    } else alert("Güncelleme sırasında bir hata oluştu.");
    setSettingsLoading(false);
  };

  const fetchParticipants = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('katilimcilar').select('*').order('ad_soyad', { ascending: true });
    if (!error && data) setParticipants(data);
    setLoading(false);
  };

  const deleteUser = async (id: number) => {
    if (confirm("Bu katılımcıyı tamamen silmek istediğinize emin misiniz?")) {
      const { error } = await supabase.from('katilimcilar').delete().eq('id', id);
      if (!error) fetchParticipants();
    }
  };

  const resetSeat = async (id: number) => {
    if (confirm("Bu kullanıcının bilet bilgilerini sıfırlayıp yeni bir QR kod üretmek istiyor musunuz?")) {
      const { error } = await supabase.from('katilimcilar').update({ 
        koltuk_no: null, bilet_alindi_mi: false, geldi_mi: false, qr_kodu: crypto.randomUUID() 
      }).eq('id', id);
      if (!error) fetchParticipants();
      else alert("Sıfırlama hatası!");
    }
  };

  const safeStopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Scanner stop error:", err);
      }
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
              const { data: user } = await supabase.from('katilimcilar').select('*').eq('qr_kodu', cleanCode).maybeSingle();
              if (!user) {
                playScanSound(false);
                setScanStatus({ status: 'error', message: 'Geçersiz bilet!' });
              } else if (user.geldi_mi) {
                playScanSound(false);
                setScanStatus({ status: 'warning', message: `Zaten Giriş Yapıldı: ${user.ad_soyad}` });
              } else {
                playScanSound(true);
                await supabase.from('katilimcilar').update({ geldi_mi: true }).eq('id', user.id);
                setParticipants(prev => prev.map(p => p.id === user.id ? { ...p, geldi_mi: true } : p));
                setScanStatus({ status: 'success', message: `${user.ad_soyad} giriş yaptı!` });
              }
              setTimeout(() => setScanStatus({ status: 'idle', message: '' }), 2000);
            }, () => {}
          );
        } catch (err) {}
      };
      startCamera();
    } else {
      safeStopScanner();
    }
    return () => { safeStopScanner(); };
  }, [view, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md bg-slate-900/40 border border-white/5 p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Flick Admin</h1>
          <p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-8">Yönetim Paneline Erişin</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="Erişim Şifresi" className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none text-center text-lg text-white tracking-widest focus:border-blue-500/50 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 p-5 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all">Sisteme Giriş Yap</button>
          </form>
        </div>
      </main>
    );
  }

  const filteredList = participants.filter(p => p.ad_soyad.toLowerCase().includes(searchTerm.toLowerCase()) || (p.telefon && p.telefon.includes(searchTerm)));

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 font-sans flex flex-col items-center overflow-x-hidden">
      
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Settings2 size={24} className="text-blue-400" />
                <h2 className="text-lg font-bold uppercase tracking-tight">Etkinlik Bilgileri</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <input type="text" placeholder="Etkinlik Adı" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none text-sm text-white focus:border-blue-500/30" value={eventSettings.etkinlik_adi} onChange={(e) => setEventSettings({...eventSettings, etkinlik_adi: e.target.value})} />
              <input type="text" placeholder="Tarih" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none text-sm text-white focus:border-blue-500/30" value={eventSettings.tarih_saat} onChange={(e) => setEventSettings({...eventSettings, tarih_saat: e.target.value})} />
              <input type="text" placeholder="Konum" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none text-sm text-white focus:border-blue-500/30" value={eventSettings.konum} onChange={(e) => setEventSettings({...eventSettings, konum: e.target.value})} />
              <button disabled={settingsLoading} type="submit" className="w-full bg-blue-600 p-5 rounded-2xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest text-white transition-all mt-4">
                {settingsLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Bilgileri Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg flex justify-between items-center bg-slate-900/40 p-5 rounded-[2rem] border border-white/5 mb-6 backdrop-blur-xl shadow-2xl relative z-[60]">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl"><ShieldCheck size={24} /></div>
          <div>
            <h1 className="text-lg font-bold uppercase tracking-tight">Flick Admin</h1>
            <button onClick={handleLogout} className="text-[10px] text-rose-500 uppercase font-bold tracking-widest hover:underline text-left block leading-none mt-1">Sistemden Çık</button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="bg-slate-800 p-3 rounded-2xl border border-white/5 transition-all text-blue-400 hover:bg-slate-700">
            <Settings2 size={22} />
          </button>
          <button onClick={() => setView('add')} className={`${view === 'add' ? 'bg-emerald-600' : 'bg-slate-800'} p-3 rounded-2xl border border-white/5 transition-all`}>
            <Plus size={22} />
          </button>
          <button onClick={() => setView('list')} className={`${view === 'list' ? 'bg-blue-600' : 'bg-slate-800'} p-3 rounded-2xl border border-white/5 transition-all relative`}>
            <Users size={22} />
            <span className="absolute -top-1 -right-1 bg-blue-600 text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#020617] font-bold">{participants.length}</span>
          </button>
          <button onClick={() => setView('scanner')} className={`${view === 'scanner' ? 'bg-blue-600' : 'bg-slate-800'} p-3 rounded-2xl border border-white/5 transition-all`}>
            <Camera size={22} />
          </button>
        </div>
      </div>

      <div className="w-full max-w-lg flex flex-col gap-6">
        {view === 'scanner' && (
          <div className="space-y-6">
            <div className={`relative transition-all duration-300 border-[4px] rounded-[2.5rem] overflow-hidden shadow-2xl min-h-[300px] ${
              scanStatus.status === 'success' ? 'border-emerald-500' : 
              scanStatus.status === 'error' ? 'border-rose-500' : 
              scanStatus.status === 'warning' ? 'border-amber-500' : 'border-white/10'
            }`}>
              <div id="reader" className="w-full aspect-square bg-black"></div>
              {scanStatus.status !== 'idle' && (
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center justify-center gap-2 font-bold text-sm uppercase bg-black/60">
                  {scanStatus.status === 'success' ? <CheckCircle className="text-emerald-400" size={20} /> : <AlertTriangle className={scanStatus.status === 'warning' ? "text-amber-400" : "text-rose-400"} size={20} />}
                  <span className={scanStatus.status === 'success' ? 'text-emerald-400' : scanStatus.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}>{scanStatus.message}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2rem] text-center">
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">İçeride</p>
                <p className="text-4xl font-black text-emerald-400">{participants.filter(p => p.geldi_mi).length}</p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-[2rem] text-center">
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">Beklenen</p>
                <p className="text-4xl font-black text-blue-400">{participants.filter(p => !p.geldi_mi).length}</p>
              </div>
            </div>
          </div>
        )}

        {view === 'add' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* GOOGLE FORM CSV SENKRONİZASYONU */}
            <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Link2 size={24} className="text-blue-400" />
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Google Form Entegrasyonu</h2>
              </div>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="CSV Yayın Linkini Buraya Yapıştırın" 
                  className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl outline-none text-xs text-white focus:border-blue-500/30 transition-all"
                  value={csvLink}
                  onChange={(e) => setCsvLink(e.target.value)}
                />
                <button 
                  onClick={handleGoogleSync}
                  disabled={addLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 p-5 rounded-2xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest text-white transition-all active:scale-95 shadow-lg shadow-blue-600/10"
                >
                  {addLoading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCcw size={20} />} Formu Senkronize Et
                </button>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-dashed border-white/20 rounded-[2.5rem] p-8 text-center hover:border-emerald-500/50 transition-all group">
              <label className="cursor-pointer">
                <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleExcelUpload} disabled={addLoading} />
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-emerald-500/10 p-5 rounded-2xl group-hover:scale-110 transition-transform">
                    {addLoading ? <Loader2 className="animate-spin text-emerald-400" size={40} /> : <FileUp size={40} className="text-emerald-400" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Excel'den Toplu Ekle</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Başlıklar otomatik algılanır</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <UserPlus size={24} className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Manuel Katılımcı Ekle</h2>
              </div>
              <form onSubmit={handleAddSinglePerson} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1 mb-2 block">Ad Soyad (Zorunlu)</label>
                  <input type="text" placeholder="Örn: Ahmet Yılmaz" className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl outline-none text-white focus:border-emerald-500/30 transition-all" value={newPerson.ad_soyad} onChange={(e) => setNewPerson({...newPerson, ad_soyad: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1 mb-2 block">Telefon (Zorunlu)</label>
                  <input type="text" placeholder="Örn: 05xx xxx xx xx" className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl outline-none text-white focus:border-emerald-500/30 transition-all" value={newPerson.telefon} onChange={(e) => setNewPerson({...newPerson, telefon: e.target.value})} />
                </div>
                <button disabled={addLoading} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 p-5 rounded-2xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest text-white transition-all active:scale-95 shadow-lg shadow-emerald-600/10 mt-4">
                  {addLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />} Listeye Kaydet
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input type="text" placeholder="İsim veya telefonla ara..." className="flex-1 bg-slate-900 border border-white/5 p-4 rounded-2xl outline-none text-sm text-white" onChange={(e) => setSearchTerm(e.target.value)} />
              <button onClick={fetchParticipants} className="bg-slate-800 p-4 rounded-2xl text-white active:rotate-180 transition-all duration-500"><RefreshCcw size={20} /></button>
            </div>
            
            <button 
              onClick={deleteAllParticipants}
              className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all group"
            >
              <Trash2 size={16} /> Tüm Katılımcı Listesini Sil
            </button>

            <div className="space-y-3 pb-10">
              {filteredList.map((person) => (
                <div key={person.id} className="bg-slate-900/40 p-5 rounded-[2.5rem] border border-white/5 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <p className="font-bold text-lg leading-tight">{person.ad_soyad}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-md border ${person.geldi_mi ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border-white/5'}`}>{person.geldi_mi ? 'İÇERİDE' : 'GELMEDİ'}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">{person.telefon}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {!person.geldi_mi && (
                        <button onClick={async () => {
                          if(confirm(`${person.ad_soyad} giriş yapsın mı?`)) {
                            const { error } = await supabase.from('katilimcilar').update({ geldi_mi: true }).eq('id', person.id);
                            if (!error) setParticipants(prev => prev.map(p => p.id === person.id ? { ...p, geldi_mi: true } : p));
                          }
                        }} className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><TicketCheck size={18} /></button>
                      )}
                      <button onClick={() => resetSeat(person.id)} className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20"><RefreshCcw size={18} /></button>
                      <button onClick={() => deleteUser(person.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #reader { border: none !important; }
      `}</style>
    </main>
  );
}
