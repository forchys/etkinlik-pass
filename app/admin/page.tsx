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
  Eye, ExternalLink, Mail, School, UserCheck, Clock, Check // Yeni ikonlar eklendi
} from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<'scanner' | 'list' | 'add' | 'pending'>('scanner'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- SLOT YÖNETİMİ STATE'LERİ ---
  const [eventSlots, setEventSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number>(1); 
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null);

  const [filterArrived, setFilterArrived] = useState<'all' | 'arrived' | 'not_arrived'>('all');
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid'>('all'); // unpaid seçeneği kaldırıldı
  const [filterSlot, setFilterSlot] = useState<string>("all");

  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') setIsAuthenticated(true);
    fetchParticipants();
    fetchEventSlots();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") { // Güçlü bir şifre ile değiştirin
      setIsAuthenticated(true);
      localStorage.setItem('admin_auth', 'true');
    } else {
      alert("Hatalı şifre!");
    }
  };

  const fetchParticipants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('katilimcilar')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setParticipants(data);
    setLoading(false);
  };

  const fetchEventSlots = async () => {
    const { data, error } = await supabase
      .from('event_slots')
      .select('*')
      .order('slot_id', { ascending: true });
    
    if (data) setEventSlots(data);
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Bu kaydı onaylıyor musunuz? Onaylandığında kullanıcı bilet alabilir duruma gelecektir.")) return;
    
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

  const handleScan = async (decodedText: string) => {
    if (scanner) {
      // Önce veritabanında ara
      const { data, error } = await supabase
        .from('katilimcilar')
        .select('*')
        .eq('id', decodedText)
        .single();

      if (data) {
        if (data.geldi_mi) {
          setScanResult({ success: false, message: `${data.ad_soyad} zaten giriş yapmış!` });
        } else {
          const { error: updateError } = await supabase
            .from('katilimcilar')
            .update({ geldi_mi: true })
            .eq('id', decodedText);

          if (!updateError) {
            setScanResult({ success: true, message: `Hoş geldin, ${data.ad_soyad}!` });
            fetchParticipants();
          }
        }
      } else {
        setScanResult({ success: false, message: "Geçersiz veya bulunamayan bilet!" });
      }

      setTimeout(() => setScanResult(null), 3000);
    }
  };

  const startScanner = () => {
    const html5QrCode = new Html5Qrcode("reader", {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    });
    setScanner(html5QrCode);
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      handleScan,
      undefined
    );
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.stop().then(() => {
        setScanner(null);
      });
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Bu kullanıcıyı tamamen silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from('katilimcilar').delete().eq('id', id);
    if (!error) fetchParticipants();
  };

  const resetStatus = async (id: string) => {
    if (!confirm("Koltuk ve giriş durumunu sıfırlamak istiyor musunuz?")) return;
    const { error } = await supabase
      .from('katilimcilar')
      .update({ geldi_mi: false, koltuk_no: null })
      .eq('id', id);
    if (!error) fetchParticipants();
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(participants);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Katılımcılar");
    XLSX.writeFile(workbook, "Katilimci_Listesi.xlsx");
  };

  // Onaylılar Listesi Filtresi
  const filteredList = participants.filter(p => {
    const matchesSearch = p.ad_soyad.toLowerCase().includes(searchTerm.toLowerCase()) || p.telefon.includes(searchTerm);
    const matchesArrived = filterArrived === 'all' ? true : (filterArrived === 'arrived' ? p.geldi_mi : !p.geldi_mi);
    const matchesPaid = filterPaid === 'all' ? true : (filterPaid === 'paid' ? p.bilet_alindi_mi : !p.bilet_alindi_mi);
    const matchesSlot = filterSlot === 'all' ? true : p.slot_id === parseInt(filterSlot);
    // Onay bekleyenleri (bilet almamışları) ana listede göstermiyoruz
    return matchesSearch && matchesArrived && matchesPaid && matchesSlot && p.bilet_alindi_mi === true;
  });

  // Onay Bekleyenler Listesi Filtresi
  const pendingList = participants.filter(p => {
    const matchesSearch = p.ad_soyad.toLowerCase().includes(searchTerm.toLowerCase()) || p.telefon.includes(searchTerm);
    return matchesSearch && p.bilet_alindi_mi === false;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900/50 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-blue-900/20">
              <ShieldCheck className="text-white" size={40} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">FLICK ADMIN</h1>
            <p className="text-slate-500 text-xs font-bold tracking-widest mt-2">YÖNETİCİ GİRİŞİ</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="Yönetici Şifresi"
                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 pl-12 text-white outline-none focus:border-blue-500/50 transition-all font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] uppercase tracking-widest text-xs">
              Sisteme Gir
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-20">
      {/* HEADER & NAV */}
      <nav className="sticky top-0 z-[100] bg-slate-900/80 backdrop-blur-2xl border-b border-white/5 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 group">
            <div className="bg-blue-600 p-2.5 rounded-2xl group-hover:rotate-6 transition-transform shadow-lg shadow-blue-900/20">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tighter uppercase">FLICK <span className="text-blue-500">ADMIN</span></h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Yönetim Konsolu</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto max-w-full custom-scrollbar">
            <button onClick={() => { stopScanner(); setView('scanner'); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'scanner' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <Camera size={14} /> TARAYICI
            </button>
            <button onClick={() => { stopScanner(); setView('list'); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <Users size={14} /> LİSTE
            </button>
            <button onClick={() => { stopScanner(); setView('pending'); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'pending' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <Clock size={14} /> ONAY BEKLEYENLER
            </button>
            <button onClick={() => { stopScanner(); setView('add'); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'add' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <UserPlus size={14} /> YENİ KAYIT
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
              <Settings2 size={18} />
            </button>
            <button onClick={() => { localStorage.removeItem('admin_auth'); window.location.reload(); }} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
              <Power size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[3rem] p-10 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600/10 p-3 rounded-2xl text-blue-500">
                  <Settings2 size={24} />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase">ETKİNLİK AYARLARI</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {eventSlots.map((slot) => (
                <div key={slot.id} className="bg-slate-950/50 border border-white/5 p-8 rounded-[2.5rem] relative group overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-8 relative z-10">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-lg">SLOT #{slot.slot_id}</span>
                        <div className="flex-1 border-t border-white/5" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Etkinlik Adı</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={slot.event_name} 
                              onChange={(e) => updateSlotSetting(slot.id, 'event_name', e.target.value)}
                              className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50"
                            />
                            <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Tarih Bilgisi</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={slot.event_date} 
                              onChange={(e) => updateSlotSetting(slot.id, 'event_date', e.target.value)}
                              className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50"
                            />
                            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Konum</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={slot.event_location} 
                              onChange={(e) => updateSlotSetting(slot.id, 'event_location', e.target.value)}
                              className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50"
                            />
                            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Koltuk Düzeni (JSON)</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={JSON.stringify(slot.seating_config)} 
                              onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value);
                                  updateSlotSetting(slot.id, 'seating_config', parsed);
                                } catch(e) {}
                              }}
                              className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-white font-mono text-xs outline-none focus:border-blue-500/50"
                            />
                            <LayoutGrid className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-64 space-y-4">
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Sistem Durumu</p>
                        
                        <div className="space-y-4">
                          <button 
                            onClick={() => updateSlotSetting(slot.id, 'is_active', !slot.is_active)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${slot.is_active ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                          >
                            <span className="text-[10px] font-black tracking-widest">YAYIN DURUMU</span>
                            {slot.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                          </button>

                          <button 
                            onClick={() => updateSlotSetting(slot.id, 'has_seating', !slot.has_seating)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${slot.has_seating ? 'bg-blue-600/10 border-blue-500/20 text-blue-500' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                          >
                            <span className="text-[10px] font-black tracking-widest uppercase">KOLTUK SEÇİMİ</span>
                            {slot.has_seating ? <Armchair size={20} /> : <LayoutGrid size={20} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {savingSlotId === slot.id && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center">
                      <Loader2 className="text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto p-6">
        {view === 'scanner' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="relative group p-10 bg-slate-900/50 border border-white/10 rounded-[4rem] backdrop-blur-xl overflow-hidden shadow-2xl shadow-blue-900/10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-50" />
              
              {!scanner ? (
                <div className="text-center py-10 relative z-10">
                  <div className="w-32 h-32 bg-blue-600/10 rounded-[3rem] flex items-center justify-center mx-auto mb-8 text-blue-500 group-hover:scale-110 transition-transform">
                    <Camera size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase mb-4">GİRİŞ TARAYICI</h3>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest max-w-xs mx-auto leading-relaxed mb-8">
                    Kamera izni vererek katılımcı biletlerini anında taramaya başlayın.
                  </p>
                  <button onClick={startScanner} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-10 py-5 rounded-[2rem] transition-all shadow-xl shadow-blue-900/20 active:scale-95 uppercase text-xs tracking-widest">
                    KAMERAYI AÇ
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div id="reader" className="w-full overflow-hidden rounded-[2.5rem] border-4 border-white/5 bg-black aspect-square" />
                  <button onClick={stopScanner} className="w-full bg-rose-500/10 text-rose-500 font-black py-5 rounded-3xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all uppercase text-[10px] tracking-widest">
                    TARAMAYI DURDUR
                  </button>
                </div>
              )}
            </div>

            {scanResult && (
              <div className={`p-8 rounded-[3rem] border animate-in zoom-in slide-in-from-top-4 duration-300 ${scanResult.success ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                <div className="flex items-center justify-center gap-4 text-center">
                  {scanResult.success ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                  <p className="text-lg font-black uppercase tracking-tight">{scanResult.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'pending' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">ONAY BEKLEYENLER</h2>
                <p className="text-emerald-500 font-bold text-[10px] tracking-widest uppercase mt-1">YENİ DOLDURULMUŞ KAYITLAR ({pendingList.length})</p>
              </div>
              <div className="w-full md:w-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  placeholder="İsim veya telefon..."
                  className="w-full md:w-80 bg-slate-900/50 border border-white/5 rounded-2xl p-4 pl-12 text-white outline-none focus:border-emerald-500/50 transition-all text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingList.map((person) => (
                <div key={person.id} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] relative group hover:border-emerald-500/30 transition-all">
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="bg-emerald-600/10 p-3 rounded-2xl text-emerald-500">
                        <Clock size={24} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-600 bg-slate-950 px-3 py-1 rounded-full uppercase tracking-tighter">
                        {new Date(person.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-2">{person.ad_soyad}</h4>
                      <p className="text-xs font-mono text-slate-500 mb-4">{person.telefon}</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">OKUL</p>
                          <p className="text-[10px] font-bold text-slate-300 truncate">{person.okul || 'YOK'}</p>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">REF</p>
                          <p className="text-[10px] font-bold text-blue-500 truncate">{person.referans || 'YOK'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => window.open(person.dekont_url, '_blank')}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest"
                      >
                        <Eye size={14} /> Dekontu Gör
                      </button>
                      <button 
                        onClick={() => handleApprove(person.id)}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black transition-all shadow-xl shadow-emerald-900/20 uppercase tracking-widest"
                      >
                        <Check size={14} /> Kaydı Onayla
                      </button>
                    </div>

                    <button 
                      onClick={() => deleteUser(person.id)}
                      className="absolute top-8 right-8 text-slate-700 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              {!loading && pendingList.length === 0 && (
                <div className="col-span-full text-center p-20 bg-slate-900/20 rounded-[4rem] border border-dashed border-white/5">
                  <CheckCircle className="mx-auto text-slate-700 mb-4" size={64} />
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em]">Bekleyen herhangi bir yeni kayıt bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">KATILIMCI LİSTESİ</h2>
                <p className="text-blue-500 font-bold text-[10px] tracking-widest uppercase mt-1">SİSTEMDE KAYITLI TÜM ONAYLI BİLETLER ({participants.filter(p => p.bilet_alindi_mi).length})</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/20 text-[10px] uppercase tracking-widest active:scale-95">
                  <FileUp size={16} /> EXCEL ÇIKTISI
                </button>
                <button onClick={fetchParticipants} className="p-4 bg-slate-900 text-slate-400 hover:text-white rounded-2xl border border-white/5 transition-all">
                  <RefreshCcw className={loading ? "animate-spin" : ""} size={20} />
                </button>
              </div>
            </div>

            {/* FILTERS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900/50 rounded-[2.5rem] border border-white/5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  placeholder="İsim veya telefon..."
                  className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 pl-12 text-white outline-none focus:border-blue-500/50 transition-all text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select value={filterArrived} onChange={(e) => setFilterArrived(e.target.value as any)} className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50 text-[10px] font-black uppercase tracking-widest">
                <option value="all">Durum: Tümü</option>
                <option value="arrived">İçerdekiler</option>
                <option value="not_arrived">Gelmemişler</option>
              </select>
              <select value={filterSlot} onChange={(e) => setFilterSlot(e.target.value)} className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50 text-[10px] font-black uppercase tracking-widest">
                <option value="all">Tüm Etkinlikler</option>
                {eventSlots.map(slot => (
                  <option key={slot.id} value={slot.slot_id}>{slot.event_name}</option>
                ))}
              </select>
              <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 flex items-center justify-center text-xs font-black text-blue-500 uppercase tracking-widest">
                {filteredList.length} SONUÇ
              </div>
            </div>

            {/* LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredList.map((person) => {
                const event = eventSlots.find(s => s.slot_id === person.slot_id);
                return (
                  <div key={person.id} className={`bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] relative group hover:border-blue-500/30 transition-all ${person.geldi_mi ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : ''}`}>
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-2xl ${person.geldi_mi ? 'bg-emerald-600/10 text-emerald-500' : 'bg-blue-600/10 text-blue-500'}`}>
                          {person.geldi_mi ? <CheckCircle size={24} /> : <TicketCheck size={24} />}
                        </div>
                        <div className="text-right">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${person.geldi_mi ? 'text-emerald-500' : 'text-slate-600'}`}>
                            {person.geldi_mi ? 'İÇERİDE' : 'GELMEDİ'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1">{person.koltuk_no || 'KOLTUKSUZ'}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-1">{person.ad_soyad}</h4>
                        <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest">{event?.event_name || 'BİLİNMİYOR'}</p>
                        <p className="text-xs font-mono text-slate-500 mt-4">{person.telefon}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <button onClick={() => resetStatus(person.id)} className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20" title="Koltuk/Durum Sıfırla"><RefreshCcw size={18} /></button>
                        
                        <button onClick={() => deleteUser(person.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20" title="Sil"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && filteredList.length === 0 && (
                <div className="text-center p-10 bg-slate-900/20 rounded-[2.5rem] border border-dashed border-white/5">
                  <Users className="mx-auto text-slate-700 mb-4" size={48} />
                  <p className="text-slate-500 font-bold uppercase text-xs">Bu filtreye uygun kimse yok.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'add' && (
          <div className="max-w-2xl mx-auto bg-slate-900/50 border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-700">
             <div className="flex items-center gap-6 mb-12">
              <div className="bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-900/20">
                <UserPlus className="text-white" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase">MANUEL KAYIT</h3>
                <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase">Admin girişli yeni katılımcı</p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const phone = formData.get('phone') as string;
              const slot_id = parseInt(formData.get('slot') as string);
              
              if (!name || !phone) return alert("Eksik bilgi!");

              const { error } = await supabase
                .from('katilimcilar')
                .insert([{ 
                  ad_soyad: name, 
                  telefon: phone, 
                  slot_id, 
                  bilet_alindi_mi: true, // Admin kaydı olduğu için direkt biletli yapıyoruz
                  geldi_mi: false 
                }]);
              
              if (!error) {
                alert("Kayıt başarılı!");
                (e.target as HTMLFormElement).reset();
                fetchParticipants();
              } else {
                alert("Hata: " + error.message);
              }
            }}>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Ad Soyad</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input name="name" type="text" placeholder="Katılımcı Tam Adı" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-5 pl-12 text-white outline-none focus:border-blue-500/50 font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Telefon</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input name="phone" type="tel" placeholder="05XX XXX XX XX" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-5 pl-12 text-white outline-none focus:border-blue-500/50 font-mono" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Etkinlik Slotu</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <select name="slot" className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-5 pl-12 text-white outline-none focus:border-blue-500/50 font-black uppercase tracking-widest appearance-none">
                    {eventSlots.map(slot => (
                      <option key={slot.id} value={slot.slot_id}>{slot.event_name} (Slot {slot.slot_id})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-[2rem] transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] uppercase text-xs tracking-widest">
                KAYDI TAMAMLA
              </button>
            </form>
          </div>
        )}
      </div>

      <style jsx global>{`
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #reader { border: none !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-bottom { 
          from { transform: translateY(1rem); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
        
        .animate-in {
          animation-duration: 400ms;
          animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}

