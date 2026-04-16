"use client";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
// import { jsPDF } from "jspdf"; // Bant genişliği için sildik, aşağıda dinamik çağırıyoruz.
import { 
  Ticket, Download, Search, Smartphone, User, CheckCircle2, 
  Loader2, AlertCircle, MapPin, CalendarDays, Presentation, 
  Clock, HelpCircle, Film, Theater, ChevronRight, Sparkles, ArrowLeft,
  Users, Trophy
} from 'lucide-react';

// Koltuk SVG'sini bileşen yaparak dışarıdan dosya (chair.svg) çekme yükünü kaldırıyoruz.
const ChairSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M20 80 L20 40 Q20 20 50 20 Q80 20 80 40 L80 80" fill="none" stroke="currentColor" strokeWidth="6" />
    <rect x="15" y="65" width="70" height="15" rx="5" />
    <rect x="20" y="80" width="15" height="10" rx="2" />
    <rect x="65" y="80" width="15" height="10" rx="2" />
  </svg>
);

export default function Home() {
  const [adSoyad, setAdSoyad] = useState("");
  const [telefon, setTelefon] = useState("");
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState(0); 
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventSlots, setEventSlots] = useState<any[]>([]);

  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  // --- TARAYICI GERİ TUŞU YÖNETİMİ ---
  useEffect(() => {
    window.history.pushState({ step }, `Step ${step}`);
    const handlePopState = (event: PopStateEvent) => {
      if (step > 0) {
        setStep(prev => prev - 1);
        setError(""); 
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [step]);
  // ---------------------------------

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2) {
      const now = Math.floor(Date.now() / 1000);
      const savedTimer = localStorage.getItem('flick_timer');
      let expiry: number;
      if (savedTimer) { expiry = parseInt(savedTimer); } 
      else { expiry = now + 60; localStorage.setItem('flick_timer', expiry.toString()); }

      const updateTimer = () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const remaining = expiry - currentTime;
        if (remaining <= 0) {
          localStorage.removeItem('flick_timer');
          setError("İşlem süreniz dolduğu için başa dönüldü.");
          setStep(1);
          setTimeLeft(60);
          clearInterval(timer);
        } else { setTimeLeft(remaining); }
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else { localStorage.removeItem('flick_timer'); }
    return () => clearInterval(timer);
  }, [step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: slots } = await supabase
        .from('etkinlik_ayarlari')
        .select('*')
        .order('slot_id', { ascending: true });
      
      if (slots) setEventSlots(slots);
      setLoading(false);
    };
    fetchInitialData();

    const settingsChannel = supabase
      .channel('realtime_event_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'etkinlik_ayarlari' }, () => {
        fetchInitialData();
      }).subscribe();

    const seatsChannel = supabase
      .channel('realtime_seats')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'katilimcilar' }, async () => {
        if (selectedEvent) {
          const { data } = await supabase
            .from('katilimcilar')
            .select('koltuk_no')
            .eq('etkinlik_id', selectedEvent.id)
            .not('koltuk_no', 'is', null);
          setOccupiedSeats(data?.map(p => p.koltuk_no) || []);
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(seatsChannel);
    };
  }, [selectedEvent]);

  const getEventIcon = (type: string, size = 16) => {
    switch (type) {
      case 'cinema': return <Film size={size} />;
      case 'theater': return <Theater size={size} />;
      case 'social': return <Users size={size} />;
      case 'quiz': return <Trophy size={size} />;
      default: return <Film size={size} />;
    }
  };

  const rows = ['N', 'M', 'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: supabaseError } = await supabase
        .from('katilimcilar')
        .select('*')
        .ilike('ad_soyad', adSoyad.trim())
        .eq('telefon', telefon.trim())
        .eq('etkinlik_id', selectedEvent.id)
        .maybeSingle();

      if (supabaseError || !data) {
        setError("Kayıt bulunamadı. Lütfen bilgilerinizi kontrol edin.");
        setLoading(false);
      } else {
        setCurrentUserData(data);
        setUserDisplayName(data.ad_soyad);
        if (data.koltuk_no) { handleBiletVerisiniGuncelle(data); } 
        else {
          const { data: allParticipants } = await supabase
            .from('katilimcilar')
            .select('koltuk_no')
            .eq('etkinlik_id', selectedEvent.id)
            .not('koltuk_no', 'is', null);
          setOccupiedSeats(allParticipants?.map(p => p.koltuk_no) || []);
          setStep(2);
          setLoading(false);
        }
      }
    } catch (err) { setError("Bağlantı hatası oluştu."); setLoading(false); }
  };

  const handleBiletVerisiniGuncelle = async (user: any) => {
    const { data, error: updateError } = await supabase.from('katilimcilar').update({ bilet_alindi_mi: true }).eq('id', user.id).select('qr_kodu, koltuk_no').single();
    if (!updateError && data) {
      setQrValue(data.qr_kodu);
      setSelectedSeat(data.koltuk_no);
      setStep(3);
    } else { setError("Bilet bilgileri güncellenirken hata oluştu."); }
    setLoading(false);
  };

  const handleSeatConfirm = async () => {
    if (!selectedSeat) return;
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase
      .from('katilimcilar')
      .update({ koltuk_no: selectedSeat })
      .eq('id', currentUserData.id)
      .eq('etkinlik_id', selectedEvent.id);

    if (updateError) {
      if (updateError.code === '23505') {
        setError("Maalesef bu koltuk az önce başkası tarafından seçildi.");
        const { data } = await supabase.from('katilimcilar').select('koltuk_no').eq('etkinlik_id', selectedEvent.id).not('koltuk_no', 'is', null);
        setOccupiedSeats(data?.map(p => p.koltuk_no) || []);
      } else { setError("Koltuk rezerve edilemedi."); }
      setLoading(false);
    } else { handleBiletVerisiniGuncelle(currentUserData); }
  };

  const indirPDF = async () => {
    // jsPDF'i sadece butona basıldığında yükleyerek açılış hızını artırıyoruz.
    const { jsPDF } = await import("jspdf"); 
    const doc = new jsPDF();
    const canvas = document.getElementById("ticket-qr") as HTMLCanvasElement;
    if (!canvas) return;
    const qrImage = canvas.toDataURL("image/png");
    doc.setFillColor(10, 15, 30); doc.rect(0, 0, 210, 297, 'F');
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
    doc.setFillColor(59, 135, 245); doc.roundedRect(20, 30, 170, 240, 15, 15, 'F');
    doc.restoreGraphicsState();
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.5); doc.roundedRect(20, 30, 170, 240, 15, 15, 'S');
    doc.restoreGraphicsState();
    doc.setTextColor(255, 255, 255); doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.text("FLICK BILET", 105, 55, { align: "center" });
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.setFillColor(59, 130, 246); doc.roundedRect(40, 70, 130, 45, 10, 10, 'F');
    doc.restoreGraphicsState();
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text(userDisplayName.toUpperCase(), 105, 88, { align: "center" });
    doc.setFontSize(12); doc.setTextColor(150, 150, 150); doc.text("KOLTUK NO:", 105, 96, { align: "center" });
    doc.setFontSize(20); doc.setTextColor(59, 130, 246); doc.text(selectedSeat || "---", 105, 106, { align: "center" });
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.95 }));
    doc.setFillColor(255, 255, 255); doc.roundedRect(65, 130, 80, 80, 10, 10, 'F');
    doc.addImage(qrImage, 'PNG', 70, 135, 70, 70);
    doc.restoreGraphicsState();
    doc.setDrawColor(255, 255, 255);
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.line(40, 230, 170, 230);
    doc.restoreGraphicsState();
    doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.text(selectedEvent?.event_name || "", 105, 245, { align: "center" });
    doc.setFontSize(9); doc.setTextColor(160, 160, 160); doc.text(`${selectedEvent?.event_date}  •  ${selectedEvent?.event_location}`, 105, 255, { align: "center" });
    doc.save(`${userDisplayName}_Flick_Bilet.pdf`);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-6 flex flex-col items-center justify-start font-sans overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="w-full max-w-2xl py-8 mb-4 text-center z-50">
        <div className="space-y-1">
          <h2 className="text-blue-500 font-bold text-[10px] tracking-[0.3em] uppercase italic">
            ANKARA MEDIPOL SINEMA VE TIYATRO TOPLULUGU
          </h2>
          <h1 className="text-3xl font-black tracking-tighter flex items-center justify-center gap-2 text-white">
            FLICK <span className="text-white">BILET</span>
          </h1>
        </div>
      </header>

      {/* Arka Plan Desenleri (Dokunulmadı) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -inset-[100%] opacity-[0.08] flex flex-col justify-center gap-4 rotate-[-25deg] scale-150">
          {[...Array(50)].map((_, i) => (
            <div key={i} className={`whitespace-nowrap text-[0.7rem] font-bold tracking-[0.2em] leading-none flex ${i % 2 === 0 ? 'animate-scroll-left' : 'animate-scroll-right'}`}>
              {[...Array(4)].map((_, j) => (
                <span key={j} className="inline-block pr-8">ANKARA MEDİPOL SİNEMA VE TİYATRO TOPLULUĞU • FLICK BİLET •</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* SÜRE SAYAÇ PANELİ */}
      {step === 2 && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-500">
           <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border backdrop-blur-2xl shadow-2xl transition-all duration-500 ${timeLeft < 20 ? 'border-rose-500/50 bg-rose-500/10' : 'border-blue-500/30 bg-slate-900/80'}`}>
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-1">Kalan Süre</span>
                <span className={`text-2xl font-mono font-black leading-none tracking-tighter ${timeLeft < 20 ? 'text-rose-500 animate-pulse' : 'text-blue-400'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className={`h-8 w-[1px] ${timeLeft < 20 ? 'bg-rose-500/20' : 'bg-blue-500/20'}`}></div>
              <Clock size={20} className={timeLeft < 20 ? 'text-rose-500' : 'text-blue-400'} />
           </div>
        </div>
      )}

      <div className="w-full max-w-lg relative z-10">
        <div className="relative bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
          
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] blur-[1px] flex items-center justify-center">
            <div className="w-[120%] h-[120%] animate-super-slow-rotate">
              <Image src="/flick-logo.png" alt="" fill className="object-contain" priority />
            </div>
          </div>

          <div className="relative z-10">
            {/* STEP 0: ETKİNLİK SEÇİMİ */}
            {step === 0 && (
              <div className="view-transition space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="text-amber-400" size={18} />
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">ETKİNLİK TAKVİMİ</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
                  ) : (
                    eventSlots.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => { if (event.is_active) { setSelectedEvent(event); setStep(1); } }}
                        className={`relative overflow-hidden rounded-[2rem] border transition-all duration-500 
                          ${event.is_active 
                            ? 'bg-slate-900/60 border-white/5 cursor-pointer hover:border-blue-500/50 hover:scale-[1.02] active:scale-[0.98]' 
                            : 'bg-slate-900/10 border-white/5 cursor-not-allowed'}`}
                      >
                        {!event.is_active && (
                          <div className="absolute inset-0 z-20 backdrop-blur-sm bg-[#020617]/40 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 opacity-40">
                              <HelpCircle size={40} className="text-slate-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">YAKINDA</span>
                            </div>
                          </div>
                        )}

                        <div className={`p-6 flex items-center justify-between ${!event.is_active ? 'grayscale' : ''}`}>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-500">{getEventIcon(event.event_type)}</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                {event.is_active ? event.event_type : 'BELİRSİZ'}
                              </span>
                            </div>
                            <h4 className="text-xl font-black text-white">{event.event_name}</h4>
                            <div className="flex gap-4 pt-1">
                              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-medium uppercase">
                                <CalendarDays size={12} /> {event.event_date}
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-medium uppercase">
                                <MapPin size={12} /> {event.event_location}
                              </div>
                            </div>
                          </div>
                          {event.is_active && (
                            <div className="bg-blue-600/10 text-blue-500 p-3 rounded-2xl">
                              <ChevronRight size={20} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: BİLGİ GİRİŞİ */}
            {step === 1 && (
              <div className="view-transition max-w-md mx-auto">
                <button onClick={() => setStep(0)} className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-6 hover:text-white transition-colors">
                  <ArrowLeft size={14} /> ETKİNLİKLERE DÖN
                </button>
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-xl">
                    <Ticket size={32} className="text-blue-500" />
                  </div>
                  <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent uppercase">BİLGİLERİNİZ</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input required type="text" placeholder="Ad ve Soyad" className="w-full bg-slate-950/50 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all" onChange={(e) => setAdSoyad(e.target.value)} />
                  </div>
                  <div className="relative group">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input required type="tel" maxLength={10} value={telefon} placeholder="5XXXXXXXXX" className="w-full bg-slate-950/50 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all" onChange={(e) => setTelefon(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/40">
                    {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                    <span className="tracking-widest uppercase text-sm">Koltuk Seçimine Geç</span>
                  </button>

                  {selectedEvent && (
                    <div className="grid grid-cols-1 gap-3 pt-4">
                      <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] backdrop-blur-sm">
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Presentation size={14}/> SEÇİLEN ETKİNLİK DETAYLARI
                        </p>
                        <div className="space-y-2">
                          <p className="text-white font-black text-sm uppercase tracking-tight">{selectedEvent.event_name}</p>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
                              <CalendarDays size={12} className="text-slate-500" /> {selectedEvent.event_date}
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
                              <MapPin size={12} className="text-slate-500" /> {selectedEvent.event_location}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20">
                      <AlertCircle size={16} />
                      <p className="text-xs font-bold">{error}</p>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* STEP 2: KOLTUK SEÇİMİ */}
            {step === 2 && (
              <div className="view-transition pt-4">
                <h2 className="text-xl font-black text-center mb-6 tracking-widest uppercase text-white">KOLTUK SEÇİNİZ</h2>
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 scrollbar-hide">
                  {rows.map((row) => (
                    <div key={row} className="flex items-center gap-3">
                      <div className="w-4 text-[10px] font-black text-slate-600 font-mono">{row}</div>
                      <div className="flex-1 grid grid-cols-17 gap-1">
                        {[...Array(17)].map((_, i) => {
                          const slotIndex = i + 1;
                          let seatNum: number | null = null;
                          let isGap = false;
                          if (['M', 'L', 'K'].includes(row)) {
                            if (slotIndex <= 2) seatNum = slotIndex;
                            else if (slotIndex >= 3 && slotIndex <= 5) isGap = true;
                            else if (slotIndex >= 6 && slotIndex <= 16) seatNum = slotIndex - 3;
                            else isGap = true;
                          } 
                          else if (row === 'N') { seatNum = slotIndex; }
                          else if (['J', 'I', 'H', 'G', 'F', 'E', 'D'].includes(row)) { if(slotIndex <= 11) seatNum = slotIndex; else isGap = true; }
                          else { if(slotIndex <= 13) seatNum = slotIndex; else isGap = true; }
                          if (isGap || seatNum === null) return <div key={`gap-${row}-${slotIndex}`} className="aspect-[1/1.1]"></div>;
                          const seatId = `${row}-${seatNum}`;
                          const isOccupied = occupiedSeats.includes(seatId);
                          const isSelected = selectedSeat === seatId;
                          return (
                            <button
                              key={seatId} disabled={isOccupied} 
                              onClick={() => {
                                setSelectedSeat(seatId);
                                setTimeout(() => { confirmButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
                              }}
                              className={`relative aspect-[1/1.1] transition-all duration-300 ${isOccupied ? 'occupied-seat' : isSelected ? 'selected-seat' : 'empty-seat'}`}
                            >
                              {/* img yerine yeni ChairSVG bileşenini kullanıyoruz */}
                              <ChairSVG className="absolute inset-0 w-full h-full pointer-events-none seat-img" />
                              <span className={`absolute inset-0 flex items-center justify-center text-[7px] font-bold translate-y-1 z-10 ${isOccupied ? 'text-rose-200/40' : isSelected ? 'text-white' : 'text-slate-400'}`}>{seatNum}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative w-full mt-10 mb-6 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-slate-800"></div></div>
                  <div className="relative flex justify-center"><span className="bg-[#0f172a] px-4 text-[10px] font-black tracking-[0.6em] text-slate-500 uppercase">PERDE</span></div>
                </div>
                <div className="mt-8 space-y-3">
                  <button ref={confirmButtonRef} onClick={handleSeatConfirm} disabled={!selectedSeat || loading} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold tracking-widest disabled:opacity-20 transition-all">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : `KOLTUK ${selectedSeat || ''} ONAYLA`}
                  </button>
                  <button onClick={() => { setStep(1); setError(""); }} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest p-2">Geri Dön</button>
                </div>
              </div>
            )}

            {/* STEP 3: BİLET EKRANI */}
            {step === 3 && (
              <div className="view-transition flex flex-col items-center">
                <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full mb-6 flex items-center gap-2 text-xs font-black border border-emerald-500/20 uppercase">
                  <CheckCircle2 size={14} /> Biletiniz Hazır
                </div>
                <h2 className="text-2xl font-black mb-1 text-center text-white uppercase">{userDisplayName}</h2>
                <p className="text-blue-400 font-bold mb-8 text-sm uppercase">KOLTUK: {selectedSeat}</p>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl mb-8 relative z-20">
                  <QRCodeCanvas id="ticket-qr" value={qrValue || ""} size={180} level="H" />
                </div>
                <button onClick={indirPDF} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                  <Download size={20} /> PDF OLARAK İNDİR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scroll-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        @keyframes rotate-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .view-transition {
          animation: flickerFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }

        @keyframes flickerFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-scroll-left { animation: scroll-left 40s linear infinite; }
        .animate-scroll-right { animation: scroll-right 40s linear infinite; }
        .animate-super-slow-rotate { animation: rotate-slow 150s linear infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .grid-cols-17 { grid-template-columns: repeat(17, minmax(0, 1fr)); }
        .empty-seat { color: #334155; transition: all 0.2s; }
        .empty-seat:hover { color: #94a3b8; transform: scale(1.1); }
        .occupied-seat { color: #e11d48; cursor: not-allowed; opacity: 0.6; }
        /* .seat-img seçicisi hem SVG hem de img için çalışır */
        .occupied-seat .seat-img { filter: sepia(1) saturate(5) hue-rotate(-50deg); }
        .selected-seat { color: #3b82f6; transform: scale(1.2); z-index: 20; }
        .selected-seat .seat-img { filter: drop-shadow(0 0 8px #3b82f6) brightness(1.2) contrast(1.2); }

        button:active {
          transform: scale(0.96);
          transition: transform 0.1s;
        }
      `}</style>
    </main>
  );
}

