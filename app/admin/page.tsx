"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { 
  Users, CheckCircle, XCircle, Loader2, Search, X, 
  RefreshCcw, TicketCheck, Camera, ShieldCheck, AlertTriangle, 
  Settings2, Save, Trash2, Lock, UserPlus, Plus, FileUp, Edit3, Armchair,
  Power, Film, Theater, Trophy, MapPin, Calendar, LayoutGrid, ToggleLeft, ToggleRight,
  Eye, ExternalLink, Mail, School, UserCheck, Clock, Check, Smartphone, User, FileText,
  ChevronDown, Filter, Download, ArrowUpRight, ArrowDownRight, Hash, Copy, Bell, History
} from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<'scanner' | 'list' | 'add' | 'pending' | 'stats'>('scanner'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [eventSlots, setEventSlots] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArrived, setFilterArrived] = useState<'all' | 'arrived' | 'not_arrived'>('all');
  const [filterSlot, setFilterSlot] = useState<string>("all");
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') setIsAuthenticated(true);
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchParticipants(),
      fetchEventSlots(),
      fetchLogs()
    ]);
    setLoading(false);
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from('katilimcilar')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setParticipants(data);
  };

  const fetchEventSlots = async () => {
    const { data, error } = await supabase
      .from('event_slots')
      .select('*')
      .order('slot_id', { ascending: true });
    if (data) setEventSlots(data);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setLogs(data);
  };

  const addLog = async (action: string, detail: string) => {
    await supabase.from('system_logs').insert([{ action, detail }]);
    fetchLogs();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      setIsAuthenticated(true);
      localStorage.setItem('admin_auth', 'true');
      addLog("Giriş", "Yönetici sisteme giriş yaptı.");
    } else {
      alert("Hatalı şifre!");
    }
  };

  const handleApproveUser = async (id: string, name: string) => {
    if (!confirm(`${name} isimli kaydı onaylamak istiyor musunuz?`)) return;
    const { error } = await supabase.from('katilimcilar').update({ bilet_alindi_mi: true }).eq('id', id);
    if (!error) {
      addLog("Onay", `${name} onaylandı.`);
      fetchParticipants();
    }
  };

  const updateSlotSetting = async (id: string, field: string, value: any) => {
    setSavingSlotId(id);
    const { error } = await supabase.from('event_slots').update({ [field]: value }).eq('id', id);
    if (!error) {
      setEventSlots(prev => prev.map(slot => slot.id === id ? { ...slot, [field]: value } : slot));
    }
    setSavingSlotId(null);
  };

  const handleScan = async (decodedText: string) => {
    if (scanner) {
      const { data, error } = await supabase.from('katilimcilar').select('*').eq('id', decodedText).single();
      if (data) {
        if (!data.bilet_alindi_mi) {
          setScanResult({ success: false, message: "KAYIT ONAYSIZ!" });
        } else if (data.geldi_mi) {
          setScanResult({ success: false, message: `${data.ad_soyad} ZATEN İÇERİDE!` });
        } else {
          const { error: ue } = await supabase.from('katilimcilar').update({ geldi_mi: true }).eq('id', decodedText);
          if (!ue) {
            setScanResult({ success: true, message: `GİRİŞ BAŞARILI: ${data.ad_soyad}` });
            addLog("Check-in", `${data.ad_soyad} giriş yaptı.`);
            fetchParticipants();
          }
        }
      } else {
        setScanResult({ success: false, message: "GEÇERSİZ QR!" });
      }
      setTimeout(() => setScanResult(null), 3500);
    }
  };

  const startScanner = () => {
    const html5QrCode = new Html5Qrcode("reader", {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false
    });
    setScanner(html5QrCode);
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 20, qrbox: { width: 280, height: 280 } },
      handleScan,
      undefined
    ).catch(e => console.error(e));
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.stop().then(() => setScanner(null)).catch(e => console.error(e));
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`${name} silinecek. Emin misiniz?`)) return;
    const { error } = await supabase.from('katilimcilar').delete().eq('id', id);
    if (!error) {
      addLog("Silme", `${name} silindi.`);
      fetchParticipants();
    }
  };

  const resetStatus = async (id: string) => {
    if (!confirm("Giriş durumu sıfırlanacak?")) return;
    const { error } = await supabase.from('katilimcilar').update({ geldi_mi: false, koltuk_no: null }).eq( 'id', id);
    if (!error) fetchParticipants();
  };

  const stats = useMemo(() => {
    const total = participants.length;
    const approved = participants.filter(p => p.bilet_alindi_mi).length;
    const pending = total - approved;
    const arrived = participants.filter(p => p.geldi_mi).length;
    const revenue = approved * 150; 
    return { total, approved, pending, arrived, revenue };
  }, [participants]);

  const filteredList = participants.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchSearch = p.ad_soyad.toLowerCase().includes(s) || p.telefon.includes(s) || (p.okul && p.okul.toLowerCase().includes(s));
    const matchArrived = filterArrived === 'all' ? true : (filterArrived === 'arrived' ? p.geldi_mi : !p.geldi_mi);
    const matchSlot = filterSlot === 'all' ? true : p.slot_id === parseInt(filterSlot);
    return matchSearch && matchArrived && matchSlot && p.bilet_alindi_mi;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/20 blur-[100px]" />
          <div className="relative z-10 text-center space-y-8">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-900/40">
              <ShieldCheck className="text-white" size={40} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Flick <span className="text-blue-500">Auth</span></h1>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">Güvenli Yönetim Erişimi</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input 
                  type="password" 
                  placeholder="Root Password"
                  className="w-full bg-black/50 border border-white/5 rounded-2xl p-5 pl-14 text-white outline-none focus:border-blue-500/50 font-mono transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-[0.97] uppercase text-[10px] tracking-[0.2em]">
                Sistemi Aç
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-xl">
              <Trophy className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">FLICK <span className="text-blue-500 text-sm">ADMIN</span></h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Sistem Aktif</p>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
            <button onClick={() => { stopScanner(); setView('scanner'); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${view === 'scanner' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
              <Camera size={14} /> TARAYICI
            </button>
            <button onClick={() => { stopScanner(); setView('list'); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${view === 'list' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
              <Users size={14} /> LİSTE
            </button>
            <button onClick={() => { stopScanner(); setView('pending'); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${view === 'pending' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
              <Clock size={14} /> ONAYLAR
            </button>
            <button onClick={() => { stopScanner(); setView('stats'); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${view === 'stats' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
              <History size={14} /> ANALİZ
            </button>
            <div className="w-px h-6 bg-white/5 mx-2" />
            <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-zinc-500 hover:text-white transition-all"><Settings2 size={18} /></button>
            <button onClick={() => { localStorage.removeItem('admin_auth'); window.location.reload(); }} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Power size={18} /></button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 lg:p-10">
        
        {/* STATS SECTION */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {[
            { label: 'TOPLAM', val: stats.total, icon: Users, color: 'blue' },
            { label: 'ONAYLI', val: stats.approved, icon: CheckCircle, color: 'emerald' },
            { label: 'BEKLEYEN', val: stats.pending, icon: Clock, color: 'amber' },
            { label: 'GİRİŞ', val: stats.arrived, icon: LogIn, color: 'indigo' },
            { label: 'KAPASİTE', val: '%'+Math.round((stats.arrived/stats.total)*100 || 0), icon: LayoutGrid, color: 'rose' }
          ].map((s, i) => (
            <div key={i} className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
              <s.icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{s.label}</p>
              <h3 className="text-2xl font-black text-white mt-2 italic">{s.val}</h3>
            </div>
          ))}
        </div>

        {/* SCANNER VIEW */}
        {view === 'scanner' && (
          <div className="max-w-2xl mx-auto py-10">
            <div className="bg-zinc-900 border border-white/5 rounded-[4rem] p-12 text-center relative overflow-hidden">
              {!scanner ? (
                <div className="space-y-8 py-10">
                  <div className="w-32 h-32 bg-blue-600/10 rounded-[3rem] flex items-center justify-center mx-auto border border-blue-500/20 text-blue-500">
                    <Camera size={48} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Terminal Hazır</h3>
                    <p className="text-zinc-500 text-xs mt-3 max-w-xs mx-auto font-medium">Bilet tarama işlemini başlatmak için kameraya erişim izni verin.</p>
                  </div>
                  <button onClick={startScanner} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-5 rounded-2xl transition-all shadow-xl uppercase text-[10px] tracking-widest">Kamerayı Aç</button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div id="reader" className="w-full aspect-square rounded-[3rem] overflow-hidden border-4 border-white/5 bg-black" />
                  <button onClick={stopScanner} className="w-full bg-zinc-800 text-zinc-400 font-black py-5 rounded-2xl hover:bg-rose-900/20 hover:text-rose-500 transition-all uppercase text-[10px] tracking-widest">Kapat</button>
                </div>
              )}
            </div>
            {scanResult && (
              <div className={`mt-8 p-10 rounded-[3rem] border-2 animate-in zoom-in text-center ${scanResult.success ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-600/10 border-rose-500/20 text-rose-500'}`}>
                <p className="text-xl font-black uppercase italic tracking-tight">{scanResult.message}</p>
              </div>
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input 
                    type="text" 
                    placeholder="İsim, Tel, Okul..."
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl p-4 pl-12 text-xs outline-none focus:border-blue-500/50 font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select value={filterArrived} onChange={(e) => setFilterArrived(e.target.value as any)} className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none appearance-none cursor-pointer">
                  <option value="all">TÜMÜ</option>
                  <option value="arrived">GELEN</option>
                  <option value="not_arrived">GELMEYEN</option>
                </select>
                <select value={filterSlot} onChange={(e) => setFilterSlot(e.target.value)} className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none appearance-none cursor-pointer">
                  <option value="all">SLOT SEÇ</option>
                  {eventSlots.map(s => <option key={s.id} value={s.slot_id}>{s.event_name}</option>)}
                </select>
              </div>
              <button onClick={() => {
                const ws = XLSX.utils.json_to_sheet(filteredList);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Participants");
                XLSX.writeFile(wb, "Flick_List.xlsx");
              }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-4 rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Download size={16} /> EXCEL AL
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredList.map((user) => (
                <div key={user.id} className={`bg-zinc-900/20 border border-white/5 p-8 rounded-[2.5rem] relative group hover:bg-zinc-900/40 transition-all ${user.geldi_mi ? 'border-emerald-500/20' : ''}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${user.geldi_mi ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {user.geldi_mi ? <UserCheck size={24} /> : <User size={24} />}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }} className="p-2 text-zinc-600 hover:text-white transition-all"><Edit3 size={16} /></button>
                      <button onClick={() => deleteUser(user.id, user.ad_soyad)} className="p-2 text-zinc-600 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-white uppercase italic truncate">{user.ad_soyad}</h4>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                      <Smartphone size={12} /> {user.telefon}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                      <School size={12} /> {user.okul || '-'}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500">
                      <MapPin size={12} /> Slot {user.slot_id} | {user.koltuk_no || 'Lobi'}
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/5 flex gap-2">
                    <button onClick={() => resetStatus(user.id)} className="flex-1 py-3 bg-zinc-800 rounded-xl text-[9px] font-black uppercase hover:bg-zinc-700 transition-all">Sıfırla</button>
                    {user.geldi_mi && <div className="px-3 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl text-[9px] font-black uppercase">İçeride</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PENDING VIEW */}
        {view === 'pending' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white uppercase italic">Onay Bekleyenler</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">Dekont Kontrolü Gereken {participants.filter(p => !p.bilet_alindi_mi).length} Kayıt</p>
              </div>
              <button onClick={fetchParticipants} className="p-4 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-500 hover:text-white transition-all"><RefreshCcw size={20} /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {participants.filter(p => !p.bilet_alindi_mi).map(p => (
                <div key={p.id} className="bg-zinc-900/40 border border-white/5 p-10 rounded-[3rem] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={120} /></div>
                  <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="px-4 py-1.5 bg-zinc-800 rounded-full text-[9px] font-black text-zinc-400 uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString()}</div>
                      <button onClick={() => deleteUser(p.id, p.ad_soyad)} className="text-zinc-700 hover:text-rose-500"><X size={20} /></button>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white uppercase italic">{p.ad_soyad}</h4>
                      <p className="text-xs font-mono text-zinc-500 mt-1">{p.telefon}</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button onClick={() => window.open(p.dekont_url, '_blank')} className="w-full flex items-center justify-center gap-2 py-4 bg-zinc-800 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all">
                        <Eye size={14} /> Dekontu Aç
                      </button>
                      <button onClick={() => handleApproveUser(p.id, p.ad_soyad)} className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all">
                        <Check size={14} /> Kaydı Onayla
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS VIEW */}
        {view === 'stats' && (
          <div className="space-y-10 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-zinc-900/30 border border-white/5 p-10 rounded-[3rem]">
                <h4 className="text-lg font-black text-white uppercase italic mb-8">Son Sistem Logları</h4>
                <div className="space-y-4">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div>
                          <p className="text-[10px] font-black text-white uppercase">{log.action}</p>
                          <p className="text-[11px] text-zinc-500 font-medium">{log.detail}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-600">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900/30 border border-white/5 p-10 rounded-[3rem] flex flex-col justify-between">
                <div>
                  <h4 className="text-lg font-black text-white uppercase italic mb-8">Tahmini Ciro</h4>
                  <div className="text-5xl font-black text-emerald-500 italic">₺{stats.revenue}</div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-4">150₺ Sabit Bilet Fiyatı üzerinden</p>
                </div>
                <div className="pt-10 space-y-4">
                   <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-zinc-500 uppercase">Onay Oranı</span>
                      <span className="text-sm font-black text-white">%{(stats.approved/stats.total*100).toFixed(1)}</span>
                   </div>
                   <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${(stats.approved/stats.total*100)}%` }} />
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-[3rem] p-10 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl"><Settings2 size={24} className="text-white" /></div>
                <h3 className="text-2xl font-black text-white uppercase italic">Sistem Yapılandırması</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-4 bg-zinc-800 text-zinc-500 hover:text-white rounded-2xl transition-all"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {eventSlots.map(slot => (
                <div key={slot.id} className="bg-black/40 border border-white/5 p-8 rounded-[2.5rem] relative group">
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-2">Etkinlik Adı</label>
                          <input type="text" value={slot.event_name} onChange={e => updateSlotSetting(slot.id, 'event_name', e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-2">Tarih</label>
                          <input type="text" value={slot.event_date} onChange={e => updateSlotSetting(slot.id, 'event_date', e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-2">Lokasyon</label>
                          <input type="text" value={slot.event_location} onChange={e => updateSlotSetting(slot.id, 'event_location', e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-2">Slot ID (Sayısal)</label>
                          <input type="number" value={slot.slot_id} onChange={e => updateSlotSetting(slot.id, 'slot_id', parseInt(e.target.value))} className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                        </div>
                      </div>
                    </div>
                    <div className="w-full lg:w-64 flex flex-col gap-3">
                      <button onClick={() => updateSlotSetting(slot.id, 'is_active', !slot.is_active)} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${slot.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-zinc-800 border-white/5 text-zinc-600'}`}>
                        <span className="text-[10px] font-black uppercase">Aktif</span>
                        {slot.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                      <button onClick={() => updateSlotSetting(slot.id, 'has_seating', !slot.has_seating)} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${slot.has_seating ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-zinc-800 border-white/5 text-zinc-600'}`}>
                        <span className="text-[10px] font-black uppercase">Koltuk</span>
                        {slot.has_seating ? <Armchair size={20} /> : <LayoutGrid size={20} />}
                      </button>
                    </div>
                  </div>
                  {savingSlotId === slot.id && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[3rem] p-10 shadow-2xl">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white uppercase italic">Kaydı Düzenle</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-600 hover:text-white"><X size={24} /></button>
             </div>
             <form className="space-y-6" onSubmit={async (e) => {
               e.preventDefault();
               const fd = new FormData(e.currentTarget);
               const up = {
                 ad_soyad: fd.get('name'),
                 telefon: fd.get('phone'),
                 okul: fd.get('school'),
                 koltuk_no: fd.get('seat')
               };
               const { error } = await supabase.from('katilimcilar').update(up).eq('id', selectedUser.id);
               if (!error) { fetchParticipants(); setIsEditModalOpen(false); }
             }}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-2">Ad Soyad</label>
                    <input name="name" defaultValue={selectedUser.ad_soyad} className="w-full bg-black/50 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-2">Telefon</label>
                    <input name="phone" defaultValue={selectedUser.telefon} className="w-full bg-black/50 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-2">Okul</label>
                      <input name="school" defaultValue={selectedUser.okul} className="w-full bg-black/50 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-2">Koltuk</label>
                      <input name="seat" defaultValue={selectedUser.koltuk_no} className="w-full bg-black/50 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest transition-all">Güncelle</button>
             </form>
          </div>
        </div>
      )}

      {/* FOOTER STATS OVERLAY */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-6 pointer-events-none">
        <div className="max-w-[1600px] mx-auto flex justify-end">
           <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-6 pointer-events-auto shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{participants.length} Kayıt</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{stats.arrived} Giriş</span>
              </div>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all"><ArrowUpRight size={14} /></button>
           </div>
        </div>
      </footer>

      <style jsx global>{`
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 2.5rem; }
        #reader { border: none !important; }
        #reader__dashboard_section_csr button { display: none !important; }
        #reader__status_span { display: none !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        .animate-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-position: right 1rem center; background-repeat: no-repeat; background-size: 1em; padding-right: 2.5rem; }
      `}</style>
    </div>
  );
}
