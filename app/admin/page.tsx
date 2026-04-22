"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { 
  Users, CheckCircle, XCircle, Loader2, Search, X, 
  RefreshCcw, TicketCheck, Camera, ShieldCheck, AlertTriangle, 
  Settings2, Save, Trash2, Lock, UserPlus, Plus, FileUp, Edit3, Armchair,
  Power, Film, Theater, Trophy, MapPin, Calendar, LayoutGrid, ToggleLeft, ToggleRight,
  Eye, ExternalLink, Mail, School, UserCheck, Clock, Check, Smartphone, User, FileText
} from 'lucide-react';

/**
 * ADMIN PANELİ v2.5
 * Bu panel; katılımcı yönetimi, QR bilet tarama, manuel kayıt 
 * ve yeni gelen başvuruların dekont kontrolü ile onaylanmasını sağlar.
 */

export default function AdminPage() {
  // --- KİMLİK DOĞRULAMA VE GÖRÜNÜM ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<'scanner' | 'list' | 'add' | 'pending'>('scanner'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // --- VERİ STATE'LERİ ---
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- SLOT YÖNETİMİ STATE'LERİ ---
  const [eventSlots, setEventSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number>(1); 
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null);

  // --- FİLTRELEME STATE'LERİ ---
  const [filterArrived, setFilterArrived] = useState<'all' | 'arrived' | 'not_arrived'>('all');
  const [filterSlot, setFilterSlot] = useState<string>("all");

  // --- QR TARAYICI STATE'LERİ ---
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // --- BAŞLANGIÇ VERİ ÇEKME ---
  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') setIsAuthenticated(true);
    fetchParticipants();
    fetchEventSlots();
  }, []);

  // --- YÖNETİCİ GİRİŞİ ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") { // Güvenliğiniz için bu şifreyi değiştirin
      setIsAuthenticated(true);
      localStorage.setItem('admin_auth', 'true');
    } else {
      alert("Hatalı şifre!");
    }
  };

  // --- VERİTABANI İŞLEMLERİ ---
  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('katilimcilar')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setParticipants(data);
    } catch (err) {
      console.error("Veri çekme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventSlots = async () => {
    const { data, error } = await supabase
      .from('event_slots')
      .select('*')
      .order('slot_id', { ascending: true });
    
    if (data) setEventSlots(data);
  };

  const handleApproveUser = async (id: string) => {
    if (!confirm("Bu kaydı onaylamak istiyor musunuz? Onaylandığında bilet aktifleşecektir.")) return;
    
    const { error } = await supabase
      .from('katilimcilar')
      .update({ bilet_alindi_mi: true })
      .eq('id', id);

    if (error) {
      alert("Onaylama işlemi sırasında bir hata oluştu.");
    } else {
      fetchParticipants();
    }
  };

  const updateSlotSetting = async (id: string, field: string, value: any) => {
    setSavingSlotId(id);
    const { error } = await supabase
      .from('event_slots')
      .update({ [field]: value })
      .eq('id', id);
    
    if (!error) {
      setEventSlots(prev => prev.map(slot => slot.id === id ? { ...slot, [field]: value } : slot));
    }
    setSavingSlotId(null);
  };

  // --- QR TARAYICI MANTIĞI ---
  const handleScan = async (decodedText: string) => {
    if (scanner) {
      const { data, error } = await supabase
        .from('katilimcilar')
        .select('*')
        .eq('id', decodedText)
        .single();

      if (data) {
        if (!data.bilet_alindi_mi) {
          setScanResult({ success: false, message: "BU KAYIT HENÜZ ONAYLANMAMIŞ!" });
        } else if (data.geldi_mi) {
          setScanResult({ success: false, message: `${data.ad_soyad} ZATEN İÇERİDE!` });
        } else {
          const { error: updateError } = await supabase
            .from('katilimcilar')
            .update({ geldi_mi: true })
            .eq('id', decodedText);

          if (!updateError) {
            setScanResult({ success: true, message: `HOŞ GELDİN, ${data.ad_soyad}!` });
            fetchParticipants();
          }
        }
      } else {
        setScanResult({ success: false, message: "GEÇERSİZ QR KOD!" });
      }

      setTimeout(() => setScanResult(null), 3500);
    }
  };

  const startScanner = () => {
    // TypeScript Hata Düzeltmesi: Constructor sadeleştirildi
    const html5QrCode = new Html5Qrcode("reader");
    setScanner(html5QrCode);

    html5QrCode.start(
      { facingMode: "environment" },
      { 
        fps: 15, 
        qrbox: { width: 260, height: 260 },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      },
      handleScan,
      undefined
    ).catch((err) => {
      console.error("Kamera başlatılamadı:", err);
    });
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.stop().then(() => {
        setScanner(null);
      }).catch(err => console.error("Durdurma hatası:", err));
    }
  };

  // --- KATILIMCI YÖNETİMİ ---
  const deleteUser = async (id: string) => {
    if (!confirm("Bu kullanıcıyı tamamen silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from('katilimcilar').delete().eq('id', id);
    if (!error) fetchParticipants();
  };

  const resetStatus = async (id: string) => {
    if (!confirm("Durumu sıfırlamak istiyor musunuz? (Giriş bilgisi ve koltuk silinir)")) return;
    const { error } = await supabase
      .from('katilimcilar')
      .update({ geldi_mi: false, koltuk_no: null })
      .eq('id', id);
    if (!error) fetchParticipants();
  };

  const exportToExcel = () => {
    const dataToExport = participants.map(p => ({
      'Ad Soyad': p.ad_soyad,
      'Telefon': p.telefon,
      'Okul': p.okul,
      'Referans': p.referans,
      'Bilet Durumu': p.bilet_alindi_mi ? 'Onaylı' : 'Beklemede',
      'Giriş Yaptı mı': p.geldi_mi ? 'Evet' : 'Hayır',
      'Koltuk': p.koltuk_no || '-',
      'Kayıt Tarihi': new Date(p.created_at).toLocaleString('tr-TR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Katılımcılar");
    XLSX.writeFile(workbook, "Flick_Etkinlik_Listesi.xlsx");
  };

  // --- LİSTE FİLTRELEME MANTIĞI ---
  
  // 1. Ana Liste (Sadece Onaylanmışlar)
  const approvedList = participants.filter(p => {
    const matchesSearch = p.ad_soyad.toLowerCase().includes(searchTerm.toLowerCase()) || p.telefon.includes(searchTerm);
    const matchesArrived = filterArrived === 'all' ? true : (filterArrived === 'arrived' ? p.geldi_mi : !p.geldi_mi);
    const matchesSlot = filterSlot === 'all' ? true : p.slot_id === parseInt(filterSlot);
    return matchesSearch && matchesArrived && matchesSlot && p.bilet_alindi_mi === true;
  });

  // 2. Onay Bekleyenler Listesi
  const pendingList = participants.filter(p => {
    const matchesSearch = p.ad_soyad.toLowerCase().includes(searchTerm.toLowerCase()) || p.telefon.includes(searchTerm);
    return matchesSearch && p.bilet_alindi_mi === false;
  });

  // --- GİRİŞ EKRANI ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900/50 border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-blue-900/40">
              <ShieldCheck className="text-white" size={48} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">FLICK <span className="text-blue-500">ADMIN</span></h1>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] mt-3 uppercase">Güvenli Yönetim Paneli</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="Yönetici Şifresi"
                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-5 pl-14 text-white outline-none focus:border-blue-500/50 transition-all font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-95 uppercase tracking-widest text-xs">
              YÖNETİCİ GİRİŞİ YAP
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-32">
      {/* ÜST NAVİGASYON */}
      <nav className="sticky top-0 z-[100] bg-slate-900/80 backdrop-blur-2xl border-b border-white/5 p-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">FLICK <span className="text-blue-500">CONTROL</span></h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">ETKİNLİK YÖNETİM MERKEZİ</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-[1.5rem] border border-white/5 overflow-x-auto max-w-full no-scrollbar">
            <button onClick={() => { stopScanner(); setView('scanner'); }} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'scanner' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <Camera size={14} /> TARAYICI
            </button>
            <button onClick={() => { stopScanner(); setView('list'); }} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <Users size={14} /> KATILIMCILAR
            </button>
            <button onClick={() => { stopScanner(); setView('pending'); }} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'pending' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Clock size={14} /> ONAY BEKLEYENLER
            </button>
            <button onClick={() => { stopScanner(); setView('add'); }} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'add' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <UserPlus size={14} /> MANUEL KAYIT
            </button>
            <div className="w-[1px] h-6 bg-white/10 mx-2" />
            <button onClick={() => setIsSettingsOpen(true)} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
              <Settings2 size={20} />
            </button>
            <button onClick={() => { localStorage.removeItem('admin_auth'); window.location.reload(); }} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
              <Power size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* AYARLAR MODALI */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[3.5rem] p-12 overflow-hidden max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-5">
                <div className="bg-blue-600/10 p-4 rounded-3xl text-blue-500">
                  <Settings2 size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight uppercase">SİSTEM YAPILANDIRMASI</h3>
                  <p className="text-slate-500 text-[10px] font-bold tracking-widest mt-1">ETKİNLİK VE SLOT AYARLARI</p>
                </div>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-4 bg-slate-800 text-slate-400 hover:text-white rounded-[1.5rem] transition-all"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {eventSlots.map((slot) => (
                <div key={slot.id} className="bg-slate-950/50 border border-white/5 p-10 rounded-[3rem] relative group overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-10 relative z-10">
                    <div className="flex-1 space-y-8">
                      <div className="flex items-center gap-5">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-xl">SLOT ID: {slot.slot_id}</span>
                        <div className="flex-1 border-t border-white/5" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Etkinlik Başlığı</label>
                          <input 
                            type="text" 
                            value={slot.event_name} 
                            onChange={(e) => updateSlotSetting(slot.id, 'event_name', e.target.value)}
                            className="w-full bg-slate-900 border border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-blue-500/50"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Tarih Bilgisi</label>
                          <input 
                            type="text" 
                            value={slot.event_date} 
                            onChange={(e) => updateSlotSetting(slot.id, 'event_date', e.target.value)}
                            className="w-full bg-slate-900 border border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-blue-500/50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Konum / Mekan</label>
                          <input 
                            type="text" 
                            value={slot.event_location} 
                            onChange={(e) => updateSlotSetting(slot.id, 'event_location', e.target.value)}
                            className="w-full bg-slate-900 border border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-blue-500/50"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Koltuk Yapılandırması</label>
                          <input 
                            type="text" 
                            value={JSON.stringify(slot.seating_config)} 
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updateSlotSetting(slot.id, 'seating_config', parsed);
                              } catch(e) { /* Hatalı JSON girişini yoksay */ }
                            }}
                            className="w-full bg-slate-900 border border-white/5 rounded-2xl p-5 text-white font-mono text-[10px] outline-none focus:border-blue-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-72 space-y-6">
                      <div className="bg-slate-900/80 border border-white/5 rounded-[2.5rem] p-8">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6">Yayın Kontrolleri</p>
                        
                        <div className="space-y-4">
                          <button 
                            onClick={() => updateSlotSetting(slot.id, 'is_active', !slot.is_active)}
                            className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${slot.is_active ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-800/50 border-white/5 text-slate-600'}`}
                          >
                            <span className="text-[10px] font-black tracking-widest uppercase">SLOT DURUMU</span>
                            {slot.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                          </button>

                          <button 
                            onClick={() => updateSlotSetting(slot.id, 'has_seating', !slot.has_seating)}
                            className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${slot.has_seating ? 'bg-blue-600/10 border-blue-500/20 text-blue-500' : 'bg-slate-800/50 border-white/5 text-slate-600'}`}
                          >
                            <span className="text-[10px] font-black tracking-widest uppercase">KOLTUK SEÇİMİ</span>
                            {slot.has_seating ? <Armchair size={24} /> : <LayoutGrid size={24} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {savingSlotId === slot.id && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-20">
                      <Loader2 className="text-blue-500 animate-spin" size={40} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANA İÇERİK ALANI */}
      <div className="max-w-7xl mx-auto p-8">
        
        {/* 1. QR TARAYICI SEKİMESİ */}
        {view === 'scanner' && (
          <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in duration-700">
            <div className="relative group p-12 bg-slate-900/50 border border-white/10 rounded-[5rem] backdrop-blur-3xl overflow-hidden shadow-[0_0_80px_rgba(37,99,235,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-50" />
              
              {!scanner ? (
                <div className="text-center py-12 relative z-10">
                  <div className="w-40 h-40 bg-blue-600/10 rounded-[4rem] flex items-center justify-center mx-auto mb-10 text-blue-500 group-hover:scale-105 transition-transform duration-500 border border-blue-500/20">
                    <Camera size={64} />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-6 italic">GİRİŞ KONTROLÜ</h3>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest max-w-sm mx-auto leading-relaxed mb-10">
                    Katılımcıların biletlerini kameraya okutarak giriş işlemlerini anında gerçekleştirin.
                  </p>
                  <button onClick={startScanner} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-6 rounded-[2.5rem] transition-all shadow-2xl shadow-blue-900/40 active:scale-95 uppercase text-xs tracking-[0.2em]">
                    TARAYICIYI BAŞLAT
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div id="reader" className="w-full overflow-hidden rounded-[3.5rem] border-8 border-white/5 bg-black aspect-square shadow-inner" />
                  <button onClick={stopScanner} className="w-full bg-rose-500/10 text-rose-500 font-black py-6 rounded-[2rem] border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all uppercase text-[10px] tracking-widest">
                    TARAMAYI DURDUR VE KAPAT
                  </button>
                </div>
              )}
            </div>

            {scanResult && (
              <div className={`p-10 rounded-[4rem] border-2 animate-in zoom-in slide-in-from-top-6 duration-300 ${scanResult.success ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.1)]'}`}>
                <div className="flex items-center justify-center gap-6 text-center">
                  {scanResult.success ? <CheckCircle size={48} /> : <AlertTriangle size={48} />}
                  <p className="text-2xl font-black uppercase tracking-tighter italic">{scanResult.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. ONAY BEKLEYENLER SEKİMESİ (YENİ) */}
        {view === 'pending' && (
          <div className="space-y-10 animate-in fade-in duration-700">
             <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">ONAY <span className="text-emerald-500">BEKLEYENLER</span></h2>
                <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mt-2">ÖDEME KONTROLÜ VE KAYIT ONAYLAMA ({pendingList.length} KAYIT)</p>
              </div>
              <div className="w-full md:w-auto relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input 
                  type="text" 
                  placeholder="İsim veya telefon ile ara..."
                  className="w-full md:w-96 bg-slate-900/50 border border-white/10 rounded-2xl p-5 pl-14 text-white outline-none focus:border-emerald-500/50 transition-all text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pendingList.map((person) => (
                <div key={person.id} className="bg-slate-900/40 border border-white/5 p-10 rounded-[3.5rem] relative group hover:border-emerald-500/40 transition-all duration-500 shadow-xl">
                  <div className="space-y-8">
                    <div className="flex items-start justify-between">
                      <div className="bg-emerald-600/10 p-4 rounded-3xl text-emerald-500 shadow-inner">
                        <Clock size={28} />
                      </div>
                      <span className="text-[10px] font-black text-slate-600 bg-slate-950/80 border border-white/5 px-4 py-2 rounded-full uppercase tracking-widest">
                        {new Date(person.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-3 italic">{person.ad_soyad}</h4>
                      <div className="flex items-center gap-3 text-slate-500 mb-6">
                        <Smartphone size={14} />
                        <p className="text-xs font-mono">{person.telefon}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">OKUL</p>
                          <p className="text-[10px] font-bold text-slate-300 truncate italic">{person.okul || 'BELİRTİLMEMİŞ'}</p>
                        </div>
                        <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">REFERANS</p>
                          <p className="text-[10px] font-bold text-blue-500 truncate italic">{person.referans || 'YOK'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => window.open(person.dekont_url, '_blank')}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest border border-white/5"
                      >
                        <FileText size={16} /> DEKONTU GÖRÜNTÜLE
                      </button>
                      <button 
                        onClick={() => handleApproveUser(person.id)}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black transition-all shadow-2xl shadow-emerald-900/40 uppercase tracking-widest"
                      >
                        <Check size={16} /> KAYDI ONAYLA
                      </button>
                    </div>

                    <button 
                      onClick={() => deleteUser(person.id)}
                      className="absolute top-10 right-10 text-slate-700 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={22} />
                    </button>
                  </div>
                </div>
              ))}
              
              {!loading && pendingList.length === 0 && (
                <div className="col-span-full text-center p-32 bg-slate-900/20 rounded-[5rem] border-2 border-dashed border-white/5">
                  <UserCheck className="mx-auto text-slate-800 mb-8" size={80} />
                  <p className="text-slate-600 font-black uppercase text-sm tracking-[0.4em]">Onay bekleyen başvuru bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ANA KATILIMCI LİSTESİ SEKİMESİ */}
        {view === 'list' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">KATILIMCI <span className="text-blue-500">ARŞİVİ</span></h2>
                <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mt-2">SİSTEMDE KAYITLI TÜM ONAYLI BİLETLER ({approvedList.length})</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={exportToExcel} className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-5 rounded-[2rem] transition-all shadow-2xl shadow-emerald-900/40 text-[10px] uppercase tracking-widest active:scale-95">
                  <FileUp size={18} /> EXCEL RAPORU AL
                </button>
                <button onClick={fetchParticipants} className="p-5 bg-slate-900 text-slate-400 hover:text-white rounded-2xl border border-white/5 transition-all">
                  <RefreshCcw className={loading ? "animate-spin" : ""} size={22} />
                </button>
              </div>
            </div>

            {/* FİLTRE ÇUBUĞU */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 p-6 bg-slate-900/50 rounded-[3rem] border border-white/10 backdrop-blur-md">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  placeholder="İsim veya telefon..."
                  className="w-full bg-slate-950/60 border border-white/5 rounded-2xl p-5 pl-14 text-white outline-none focus:border-blue-500/50 transition-all text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select value={filterArrived} onChange={(e) => setFilterArrived(e.target.value as any)} className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 text-white outline-none focus:border-blue-500/50 text-[10px] font-black uppercase tracking-widest appearance-none">
                <option value="all">GİRİŞ DURUMU: TÜMÜ</option>
                <option value="arrived">SADECE İÇERDEKİLER</option>
                <option value="not_arrived">HENÜZ GELMEYENLER</option>
              </select>
              <select value={filterSlot} onChange={(e) => setFilterSlot(e.target.value)} className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 text-white outline-none focus:border-blue-500/50 text-[10px] font-black uppercase tracking-widest appearance-none">
                <option value="all">ETKİNLİK: TÜMÜ</option>
                {eventSlots.map(slot => (
                  <option key={slot.id} value={slot.slot_id}>{slot.event_name.toUpperCase()}</option>
                ))}
              </select>
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-center text-[10px] font-black text-blue-500 uppercase tracking-widest">
                {approvedList.length} KAYIT BULUNDU
              </div>
            </div>

            {/* LİSTE IZGARASI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {approvedList.map((person) => {
                const event = eventSlots.find(s => s.slot_id === person.slot_id);
                return (
                  <div key={person.id} className={`bg-slate-900/40 border border-white/5 p-10 rounded-[3.5rem] relative group hover:border-blue-500/40 transition-all duration-500 ${person.geldi_mi ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.05)]' : 'shadow-xl'}`}>
                    <div className="space-y-8">
                      <div className="flex items-start justify-between">
                        <div className={`p-4 rounded-3xl shadow-inner ${person.geldi_mi ? 'bg-emerald-600/10 text-emerald-500' : 'bg-blue-600/10 text-blue-500'}`}>
                          {person.geldi_mi ? <CheckCircle size={28} /> : <TicketCheck size={28} />}
                        </div>
                        <div className="text-right">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${person.geldi_mi ? 'text-emerald-500' : 'text-slate-600'}`}>
                            {person.geldi_mi ? 'İÇERİDE' : 'GİRİŞ BEKLİYOR'}
                          </p>
                          <p className="text-xs font-black text-slate-500 mt-2 italic">{person.koltuk_no || 'KOLTUKSUZ'}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2 italic">{person.ad_soyad}</h4>
                        <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-[0.2em]">{event?.event_name || 'BİLİNMEYEN ETKİNLİK'}</p>
                        <div className="flex items-center gap-3 text-slate-500 mt-6">
                           <Smartphone size={14} />
                           <p className="text-xs font-mono">{person.telefon}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                        <button onClick={() => resetStatus(person.id)} className="flex-1 py-4 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all" title="Durumu Sıfırla">
                          SIFIRLA
                        </button>
                        <button onClick={() => deleteUser(person.id)} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all" title="Sil">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && approvedList.length === 0 && (
                <div className="col-span-full text-center p-20 bg-slate-900/10 rounded-[4rem] border border-dashed border-white/5">
                  <Users className="mx-auto text-slate-800 mb-6" size={60} />
                  <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">Kriterlere uygun onaylı katılımcı bulunamadı.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. MANUEL KAYIT SEKİMESİ */}
        {view === 'add' && (
          <div className="max-w-3xl mx-auto bg-slate-900/50 border border-white/10 rounded-[5rem] p-16 backdrop-blur-3xl animate-in slide-in-from-bottom-10 duration-700 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <UserPlus size={180} className="text-blue-500" />
             </div>
             
             <div className="flex items-center gap-8 mb-16 relative z-10">
              <div className="bg-blue-600 p-5 rounded-[2rem] shadow-2xl shadow-blue-900/40">
                <UserPlus className="text-white" size={40} />
              </div>
              <div>
                <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">MANUEL <span className="text-blue-500">KAYIT</span></h3>
                <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mt-2">YÖNETİCİ TARAFINDAN DOĞRUDAN BİLET OLUŞTURMA</p>
              </div>
            </div>

            <form className="space-y-8 relative z-10" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const phone = formData.get('phone') as string;
              const slot_id = parseInt(formData.get('slot') as string);
              
              if (!name || !phone) return alert("Lütfen zorunlu alanları doldurun!");

              const { error } = await supabase
                .from('katilimcilar')
                .insert([{ 
                  ad_soyad: name, 
                  telefon: phone, 
                  slot_id, 
                  bilet_alindi_mi: true, 
                  geldi_mi: false 
                }]);
              
              if (!error) {
                alert("Kayıt başarıyla oluşturuldu ve onaylandı!");
                (e.target as HTMLFormElement).reset();
                fetchParticipants();
                setView('list');
              } else {
                alert("Bir hata oluştu: " + error.message);
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Tam Ad Soyad</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input name="name" type="text" placeholder="Örn: Ahmet Yılmaz" className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 pl-14 text-white outline-none focus:border-blue-500/50 font-black italic tracking-tight" required />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Telefon Numarası</label>
                  <div className="relative group">
                    <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input name="phone" type="tel" placeholder="05XX XXX XX XX" className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 pl-14 text-white outline-none focus:border-blue-500/50 font-mono" required />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Atanacak Etkinlik Slotu</label>
                <div className="relative group">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <select name="slot" className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 pl-14 text-white outline-none focus:border-blue-500/50 font-black uppercase tracking-widest appearance-none">
                    {eventSlots.map(slot => (
                      <option key={slot.id} value={slot.slot_id}>{slot.event_name.toUpperCase()} (SLOT {slot.slot_id})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-8 rounded-[3rem] transition-all shadow-2xl shadow-blue-900/40 active:scale-[0.98] uppercase text-xs tracking-[0.4em] mt-8">
                BİLETİ OLUŞTUR VE ONAYLA
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ÖZEL STİLLER */}
      <style jsx global>{`
        #reader video { 
          width: 100% !important; 
          height: 100% !important; 
          object-fit: cover !important; 
          border-radius: 3rem;
        }
        #reader { border: none !important; }
        #reader__dashboard_section_csr button {
          display: none !important;
        }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        
        .animate-in {
          animation-duration: 600ms;
          animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
          animation-fill-mode: both;
        }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slide-in-bottom { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
      `}</style>
    </div>
  );
}
