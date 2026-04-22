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
  Eye, ExternalLink, Mail, School, UserCheck // YENİ EKLENEN İKONLAR
} from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<'scanner' | 'list' | 'add'>('scanner'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- SLOT YÖNETİMİ STATE'LERİ ---
  const [eventSlots, setEventSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number>(1); 
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null);

  const [filterArrived, setFilterArrived] = useState(false);
  const [filterTicketed, setFilterTicketed] = useState(false);
  const [filterNotTicketed, setFilterNotTicketed] = useState(false);
  const [filterPendingApproval, setFilterPendingApproval] = useState(false); // Yeni eklenen filtre state'i

  const [scanStatus, setScanStatus] = useState<{
    status: 'idle' | 'success' | 'error' | 'warning',
    message: string,
    details?: any
  }>({ status: 'idle', message: '' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any>(null);
  const [showDekontModal, setShowDekontModal] = useState<string | null>(null); // Dekont görseli için modal state

  const ADMIN_PASSWORD = "flickbaba31";
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchParticipants();
      fetchEventSlots();
    }
  }, [selectedSlotId, isAuthenticated]);

  const fetchParticipants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('katilimcilar')
      .select('*')
      .eq('etkinlik_id', selectedSlotId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setParticipants(data);
    }
    setLoading(false);
  };

  const fetchEventSlots = async () => {
    const { data, error } = await supabase
      .from('etkinlik_ayarlari')
      .select('*')
      .order('slot_id', { ascending: true });
    
    if (!error && data) {
      setEventSlots(data);
    }
  };

  // --- FİLTRELEME MANTIĞI (DÜZELTİLDİ VE GÜNCELLENDİ) ---
  const filteredList = participants.filter(p => {
    const matchesSearch = p.ad_soyad.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.telefon && p.telefon.includes(searchTerm)) ||
                         (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Eğer hiçbir filtre butonu aktif değilse sadece arama sonucuna bak
    if (!filterArrived && !filterTicketed && !filterNotTicketed && !filterPendingApproval) {
      return matchesSearch;
    }

    // Filtre butonlarından biri aktifse VEYA mantığıyla eşleştir
    let matchesFilter = false;
    if (filterArrived && p.geldi_mi === true) matchesFilter = true;
    if (filterTicketed && p.bilet_alindi_mi === true) matchesFilter = true;
    if (filterNotTicketed && p.bilet_alindi_mi === false) matchesFilter = true;
    // Onay bekleyenler: Bilet almamış VE dekont yüklemiş olanlar
    if (filterPendingApproval && (p.bilet_alindi_mi === false && p.dekont_url)) matchesFilter = true;

    return matchesSearch && matchesFilter;
  });

  const toggleArrival = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('katilimcilar')
      .update({ geldi_mi: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      setParticipants(participants.map(p => 
        p.id === id ? { ...p, geldi_mi: !currentStatus } : p
      ));
    }
  };

  const toggleTicket = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('katilimcilar')
      .update({ bilet_alindi_mi: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      setParticipants(participants.map(p => 
        p.id === id ? { ...p, bilet_alindi_mi: !currentStatus } : p
      ));
    }
  };

  const resetSeat = async (id: string) => {
    const { error } = await supabase
      .from('katilimcilar')
      .update({ 
        koltuk_numarasi: null,
        geldi_mi: false,
        bilet_alindi_mi: false
      })
      .eq('id', id);
    
    if (!error) {
      fetchParticipants();
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Bu katılımcıyı tamamen silmek istediğinize emin misiniz?")) return;
    
    const { error } = await supabase
      .from('katilimcilar')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setParticipants(participants.filter(p => p.id !== id));
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredList.map(p => ({
      'Ad Soyad': p.ad_soyad,
      'Telefon': p.telefon,
      'E-posta': p.email || '-',
      'Okul': p.okul || '-',
      'Referans': p.referans || '-',
      'Bilet': p.bilet_alindi_mi ? 'ALINDI' : 'YOK',
      'Katılım': p.geldi_mi ? 'GELDİ' : 'GELMEDİ',
      'Koltuk': p.koltuk_numarasi || '-',
      'Kayıt Tarihi': new Date(p.created_at).toLocaleString('tr-TR')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Katılımcılar");
    XLSX.writeFile(wb, `Katilimci_Listesi_Slot_${selectedSlotId}.xlsx`);
  };

  const startScanner = async () => {
    setScanStatus({ status: 'idle', message: 'QR kod okutulması bekleniyor...' });
    
    if (scannerRef.current) {
      await scannerRef.current.stop();
    }

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    try {
      await html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        async (decodedText) => {
          setScanStatus({ status: 'idle', message: 'Kontrol ediliyor...' });
          
          const { data, error } = await supabase
            .from('katilimcilar')
            .select('*')
            .eq('qr_kodu', decodedText)
            .single();

          if (error || !data) {
            setScanStatus({ status: 'error', message: 'Geçersiz veya kayıtlı olmayan bilet!' });
            return;
          }

          if (data.etkinlik_id !== selectedSlotId) {
            setScanStatus({ 
              status: 'warning', 
              message: `Yanlış Slot! Bu bilet Slot ${data.etkinlik_id} için tanımlı.`,
              details: data 
            });
            return;
          }

          if (data.geldi_mi) {
            setScanStatus({ 
              status: 'warning', 
              message: 'Bu bilet zaten kullanılmış!', 
              details: data 
            });
            return;
          }

          if (!data.bilet_alindi_mi) {
            setScanStatus({ 
              status: 'error', 
              message: 'Ödeme onayı verilmemiş bilet!', 
              details: data 
            });
            return;
          }

          const { error: updateError } = await supabase
            .from('katilimcilar')
            .update({ geldi_mi: true })
            .eq('id', data.id);

          if (!updateError) {
            setScanStatus({ 
              status: 'success', 
              message: `Giriş Başarılı: ${data.ad_soyad}`, 
              details: data 
            });
            fetchParticipants();
          }
        },
        undefined
      );
    } catch (err) {
      console.error(err);
      setScanStatus({ status: 'error', message: 'Kamera başlatılamadı!' });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md bg-slate-900/40 border border-white/5 p-10 rounded-[2.5rem] text-center backdrop-blur-xl">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-600/20 rotate-3">
            <Lock size={40} className="text-white -rotate-3" />
          </div>
          <h1 className="text-2xl font-black mb-2 tracking-tight">Admin Paneli</h1>
          <p className="text-slate-500 text-sm mb-8">Devam etmek için şifreyi giriniz</p>
          
          <div className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && password === ADMIN_PASSWORD && setIsAuthenticated(true)}
              className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500 transition-all text-center tracking-[0.5em] font-bold"
              placeholder="••••••"
            />
            <button 
              onClick={() => password === ADMIN_PASSWORD ? setIsAuthenticated(true) : alert("Hatalı Şifre!")}
              className="w-full bg-blue-600 hover:bg-blue-500 p-5 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans">
      {/* DEKONT MODAL */}
      {showDekontModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md transition-all">
          <div className="max-w-xl w-full bg-slate-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
                  <Eye size={18} />
                </div>
                <span className="font-bold text-sm uppercase tracking-wider">Ödeme Dekontu</span>
              </div>
              <button 
                onClick={() => setShowDekontModal(null)}
                className="p-2 hover:bg-white/5 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-2 bg-black/20 overflow-auto max-h-[70vh]">
              <img 
                src={showDekontModal} 
                alt="Dekont" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
            <div className="p-4 bg-slate-800/50 flex justify-end">
              <a 
                href={showDekontModal} 
                download 
                target="_blank"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 p-3 px-6 rounded-xl font-bold text-xs transition-all"
              >
                <ExternalLink size={14} /> TAM BOYUTTA GÖR / İNDİR
              </a>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            FLICK <span className="text-blue-500 font-medium">ADMIN</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">Etkinlik Katılım ve Bilet Yönetim Sistemi</p>
        </div>
        
        <div className="flex bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
          <button 
            onClick={() => setView('scanner')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${view === 'scanner' ? 'bg-blue-600 shadow-lg shadow-blue-600/20 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Camera size={18} /> <span className="hidden md:block">QR Tarayıcı</span>
          </button>
          <button 
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${view === 'list' ? 'bg-blue-600 shadow-lg shadow-blue-600/20 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Users size={18} /> <span className="hidden md:block">Katılımcı Listesi</span>
          </button>
        </div>
      </div>

      {/* SLOT SEÇİMİ */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex flex-wrap gap-2">
          {eventSlots.length > 0 ? eventSlots.map(slot => (
            <button 
              key={slot.id}
              onClick={() => setSelectedSlotId(slot.slot_id)}
              className={`flex-1 min-w-[140px] p-4 rounded-[1.5rem] border transition-all text-left group ${selectedSlotId === slot.slot_id ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-600/10' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${selectedSlotId === slot.slot_id ? 'bg-white/20' : 'bg-blue-600/20 text-blue-500'}`}>
                   {slot.slot_id === 1 ? <Film size={16}/> : slot.slot_id === 2 ? <Theater size={16}/> : slot.slot_id === 3 ? <Trophy size={16}/> : <Users size={16}/>}
                </div>
                {selectedSlotId === slot.slot_id && <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>}
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${selectedSlotId === slot.slot_id ? 'text-blue-100' : 'text-slate-500'}`}>Slot {slot.slot_id}</p>
              <h3 className="font-bold text-sm truncate">{slot.etkinlik_adi || "İsimsiz Etkinlik"}</h3>
            </button>
          )) : (
            <div className="w-full p-4 bg-slate-900/20 rounded-2xl border border-dashed border-white/5 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
              Slot verileri yükleniyor...
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {view === 'scanner' ? (
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  Kamera Aktif
                </h3>
                <div className="flex gap-2">
                   <button onClick={startScanner} className="p-2 bg-emerald-600/20 text-emerald-500 rounded-xl hover:bg-emerald-600/30 transition-all"><RefreshCcw size={18}/></button>
                   <button onClick={stopScanner} className="p-2 bg-rose-600/20 text-rose-500 rounded-xl hover:bg-rose-600/30 transition-all"><Power size={18}/></button>
                </div>
              </div>
              <div className="aspect-square relative bg-black">
                <div id="reader" className="w-full h-full"></div>
                {scanStatus.status === 'idle' && (
                  <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                    <div className="w-full h-full border-2 border-white/20 rounded-3xl border-dashed"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className={`p-8 rounded-[2.5rem] border transition-all ${
                scanStatus.status === 'success' ? 'bg-emerald-600/10 border-emerald-500/20 shadow-2xl shadow-emerald-600/10' :
                scanStatus.status === 'error' ? 'bg-rose-600/10 border-rose-500/20' :
                scanStatus.status === 'warning' ? 'bg-amber-600/10 border-amber-500/20' :
                'bg-slate-900/40 border-white/5'
              }`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-4 rounded-2xl ${
                    scanStatus.status === 'success' ? 'bg-emerald-600 text-white' :
                    scanStatus.status === 'error' ? 'bg-rose-600 text-white' :
                    scanStatus.status === 'warning' ? 'bg-amber-600 text-white' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    {scanStatus.status === 'success' ? <CheckCircle size={32} /> :
                     scanStatus.status === 'error' ? <XCircle size={32} /> :
                     scanStatus.status === 'warning' ? <AlertTriangle size={32} /> :
                     <TicketCheck size={32} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">{scanStatus.message || "Hazır"}</h2>
                    <p className="text-slate-500 text-sm">Sistem durumu ve geri bildirim</p>
                  </div>
                </div>

                {scanStatus.details && (
                  <div className="bg-black/20 rounded-3xl p-6 border border-white/5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Katılımcı</p>
                        <h4 className="text-lg font-bold">{scanStatus.details.ad_soyad}</h4>
                      </div>
                      <div className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black italic">SLOT {scanStatus.details.etkinlik_id}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-3 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Koltuk</p>
                        <p className="font-mono font-bold text-blue-400">{scanStatus.details.koltuk_numarasi || "SEÇİLMEMİŞ"}</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Bilet No</p>
                        <p className="font-mono font-bold text-slate-300">#{scanStatus.details.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2.5rem]">
                 <div className="flex gap-4 items-start">
                    <div className="p-3 bg-blue-600 rounded-2xl"><ShieldCheck size={24}/></div>
                    <div>
                      <h4 className="font-bold mb-1 tracking-tight text-blue-100">Güvenli Giriş Sistemi</h4>
                      <p className="text-sm text-blue-400/80 leading-relaxed">Sistem sadece onaylı biletlerin girişine izin verir. Tekrar kullanılan veya onaylanmamış biletler anında raporlanır.</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LİSTE FİLTRELERİ */}
            <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-xl space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-all" size={20} />
                  <input 
                    type="text" 
                    placeholder="İsim, telefon veya e-posta ile ara..." 
                    className="w-full bg-slate-950 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={exportToExcel}
                  className="bg-emerald-600 hover:bg-emerald-500 p-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-600/10"
                >
                  <FileUp size={20} /> EXCEL İNDİR
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterPendingApproval(!filterPendingApproval)}
                  className={`flex-1 min-w-[150px] p-3 rounded-xl text-[10px] font-black tracking-widest border transition-all flex items-center justify-center gap-2 ${filterPendingApproval ? 'bg-amber-600 border-amber-500 shadow-lg shadow-amber-600/20' : 'bg-slate-950 border-white/5 text-slate-500'}`}
                >
                  <AlertTriangle size={14}/> ONAY BEKLEYENLER
                </button>
                <button 
                  onClick={() => setFilterArrived(!filterArrived)}
                  className={`flex-1 min-w-[150px] p-3 rounded-xl text-[10px] font-black tracking-widest border transition-all flex items-center justify-center gap-2 ${filterArrived ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-600/20' : 'bg-slate-950 border-white/5 text-slate-500'}`}
                >
                  <CheckCircle size={14}/> GIRIŞ YAPANLAR
                </button>
                <button 
                  onClick={() => setFilterTicketed(!filterTicketed)}
                  className={`flex-1 min-w-[150px] p-3 rounded-xl text-[10px] font-black tracking-widest border transition-all flex items-center justify-center gap-2 ${filterTicketed ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-950 border-white/5 text-slate-500'}`}
                >
                  <TicketCheck size={14}/> BILETI OLANLAR
                </button>
                <button 
                  onClick={() => setFilterNotTicketed(!filterNotTicketed)}
                  className={`flex-1 min-w-[150px] p-3 rounded-xl text-[10px] font-black tracking-widest border transition-all flex items-center justify-center gap-2 ${filterNotTicketed ? 'bg-rose-600 border-rose-500 shadow-lg shadow-rose-600/20' : 'bg-slate-950 border-white/5 text-slate-500'}`}
                >
                  <XCircle size={14}/> BILETI OLMAYANLAR
                </button>
              </div>
            </div>

            {/* KATILIMCI KARTLARI */}
            <div className="grid gap-3">
              {loading ? (
                <div className="bg-slate-900/20 rounded-[2.5rem] p-20 text-center border border-dashed border-white/5">
                  <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={40} />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Veriler senkronize ediliyor...</p>
                </div>
              ) : filteredList.map(person => {
                const biletOnayli = person.bilet_alindi_mi;
                const dekontVar = !!person.dekont_url;
                
                return (
                  <div key={person.id} className="group relative bg-slate-900/40 hover:bg-slate-900/60 p-5 rounded-[2.5rem] border border-white/5 transition-all hover:border-blue-500/30 hover:translate-x-1">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex gap-5 items-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${person.geldi_mi ? 'bg-emerald-600/20 text-emerald-500' : 'bg-slate-800 text-slate-600'}`}>
                          <UserCheck size={28} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg tracking-tight">{person.ad_soyad}</h3>
                            {person.geldi_mi && <div className="p-1 bg-emerald-500 rounded-full"><CheckCircle size={10} className="text-white"/></div>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                             <span className="flex items-center gap-1 text-[10px] bg-slate-950 border border-white/5 p-1 px-2 rounded-lg text-slate-400 font-bold uppercase tracking-wider">
                               <Smartphone size={10}/> {person.telefon}
                             </span>
                             {person.email && (
                               <span className="flex items-center gap-1 text-[10px] bg-slate-950 border border-white/5 p-1 px-2 rounded-lg text-slate-400 font-bold lowercase tracking-wider">
                                 <Mail size={10}/> {person.email}
                               </span>
                             )}
                             {person.okul && (
                               <span className="flex items-center gap-1 text-[10px] bg-blue-600/10 border border-blue-500/20 p-1 px-2 rounded-lg text-blue-400 font-bold uppercase tracking-wider">
                                 <School size={10}/> {person.okul}
                               </span>
                             )}
                          </div>
                          
                          <div className="mt-3 flex gap-2">
                            <div className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${biletOnayli ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                              {biletOnayli ? 'Bilet Onaylı' : 'Ödeme Bekliyor'}
                            </div>
                            {person.koltuk_numarasi && (
                              <div className="text-[9px] font-black px-2 py-1 rounded-md bg-blue-500 text-white uppercase tracking-tighter flex items-center gap-1">
                                <Armchair size={8}/> {person.koltuk_numarasi}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {dekontVar && (
                          <button 
                            onClick={() => setShowDekontModal(person.dekont_url)}
                            className="flex-1 md:flex-none p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
                            title="Dekontu Görüntüle"
                          >
                            <Eye size={18} /> <span className="md:hidden text-[10px] font-bold">DEKONT</span>
                          </button>
                        )}
                        
                        <button 
                          onClick={() => toggleTicket(person.id, biletOnayli)}
                          className={`flex-1 md:flex-none p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${biletOnayli ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                          title={biletOnayli ? "Bileti İptal Et" : "Bileti Onayla"}
                        >
                          {biletOnayli ? <XCircle size={18} /> : <TicketCheck size={18} />}
                          <span className="md:hidden text-[10px] font-bold uppercase">{biletOnayli ? 'İPTAL' : 'ONAYLA'}</span>
                        </button>

                        <button 
                          onClick={() => toggleArrival(person.id, person.geldi_mi)}
                          className={`flex-1 md:flex-none p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${person.geldi_mi ? 'bg-slate-800 text-slate-400 border-white/5' : 'bg-blue-600/10 text-blue-500 border-blue-500/20 hover:bg-blue-600/20'}`}
                          title={person.geldi_mi ? "Girişi İptal Et" : "Giriş Yapıldı İşaretle"}
                        >
                          <Users size={18} />
                          <span className="md:hidden text-[10px] font-bold uppercase">{person.geldi_mi ? 'GERİ AL' : 'GELDİ'}</span>
                        </button>

                        <button 
                          onClick={() => resetSeat(person.id)}
                          className="flex-1 md:flex-none p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center justify-center"
                          title="Koltuk/Durum Sıfırla"
                        >
                          <RefreshCcw size={18} />
                        </button>
                        
                        <button 
                          onClick={() => deleteUser(person.id)}
                          className="flex-1 md:flex-none p-3 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center justify-center"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && filteredList.length === 0 && (
                <div className="text-center p-20 bg-slate-900/20 rounded-[2.5rem] border border-dashed border-white/5">
                  <Users className="mx-auto text-slate-700 mb-4" size={48} />
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Bu filtreye uygun kimse bulunamadı.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #reader { border: none !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </main>
  );
}
