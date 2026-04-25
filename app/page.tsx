"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import RegistrationForm from './components/RegistrationForm';
import SeatMap from './components/SeatMap';
import TicketView from './components/TicketView';
import NewRegistration from './components/NewRegistration'; // Yeni eklendi
import { UserPlus, Info, ArrowLeft } from 'lucide-react'; // Yeni ikonlar

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

  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    window.history.pushState({ step }, `Step ${step}`);
    const handlePopState = () => {
      if (step > 0) {
        setStep(prev => prev - 1);
        setError(""); 
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [step]);

  useEffect(() => {
    if (step !== 2) {
      localStorage.removeItem('flick_timer');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const savedTimer = localStorage.getItem('flick_timer');
    const expiry = savedTimer ? parseInt(savedTimer) : now + 60;
    
    if (!savedTimer) localStorage.setItem('flick_timer', expiry.toString());

    const updateTimer = () => {
      const remaining = expiry - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        localStorage.removeItem('flick_timer');
        setError("İşlem süreniz dolduğu için başa dönüldü.");
        setStep(1);
        setTimeLeft(60);
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [step]);

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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'etkinlik_ayarlari' }, fetchInitialData)
      .subscribe();

    const seatsChannel = supabase
      .channel('realtime_seats')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'katilimcilar' }, async () => {
        if (!selectedEvent) return;
        const { data } = await supabase
          .from('katilimcilar')
          .select('koltuk_no')
          .eq('etkinlik_id', selectedEvent.id)
          .not('koltuk_no', 'is', null);
        setOccupiedSeats(data?.map(p => p.koltuk_no) || []);
      }).subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(seatsChannel);
    };
  }, [selectedEvent]);

  const handleBiletVerisiniGuncelle = async (user: any) => {
    const { data, error: updateError } = await supabase
      .from('katilimcilar')
      .update({ bilet_alindi_mi: true })
      .eq('id', user.id)
      .select('qr_kodu, koltuk_no')
      .single();
      
    if (!updateError && data) {
      setQrValue(data.qr_kodu);
      setSelectedSeat(data.koltuk_no);
      setStep(3);
    } else {
      setError("Bilet bilgileri güncellenirken hata oluştu.");
    }
  };

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
        .eq('onayli_mi', true) // QR almak için sadece onaylıları kabul et
        .maybeSingle();

      if (supabaseError || !data) {
        setError("Onaylı kayıt bulunamadı. Kayıt olduysanız lütfen onay bekleyin.");
        return; 
      } 
      
      setCurrentUserData(data);
      setUserDisplayName(data.ad_soyad);
      
      if (data.koltuk_no || selectedEvent.has_seating === false) { 
        await handleBiletVerisiniGuncelle(data); 
      } else {
        const { data: allParticipants } = await supabase
          .from('katilimcilar')
          .select('koltuk_no')
          .eq('etkinlik_id', selectedEvent.id)
          .not('koltuk_no', 'is', null);
        setOccupiedSeats(allParticipants?.map(p => p.koltuk_no) || []);
        setStep(2);
      }
    } catch (err) { 
      setError("Bağlantı hatası oluştu."); 
    } finally {
      setLoading(false); 
    }
  };

  const handleSeatConfirm = async () => {
    if (!selectedSeat) return;
    setLoading(true);
    setError("");
    try {
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
        } else { 
          setError("Koltuk rezerve edilemedi."); 
        }
      } else { 
        await handleBiletVerisiniGuncelle(currentUserData); 
      }
    } finally {
      setLoading(false);
    }
  };

  const indirPDF = async () => {
    const { jsPDF } = await import("jspdf"); 
    const doc = new jsPDF();
    const canvas = document.getElementById("ticket-qr") as HTMLCanvasElement;
    if (!canvas) return;
    const qrImage = canvas.toDataURL("image/png");
    
    doc.setFillColor(10, 15, 30); doc.rect(0, 0, 210, 297, 'F');
    doc.saveGraphicsState(); doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
    doc.setFillColor(59, 135, 245); doc.roundedRect(20, 30, 170, 240, 15, 15, 'F');
    doc.restoreGraphicsState(); doc.saveGraphicsState(); doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.5); doc.roundedRect(20, 30, 170, 240, 15, 15, 'S');
    doc.restoreGraphicsState();
    doc.setTextColor(255, 255, 255); doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.text("FLICK BILET", 105, 55, { align: "center" });
    doc.saveGraphicsState(); doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.setFillColor(59, 130, 246); doc.roundedRect(40, 70, 130, 45, 10, 10, 'F');
    doc.restoreGraphicsState();
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text(userDisplayName.toUpperCase(), 105, 88, { align: "center" });
    doc.setFontSize(12); doc.setTextColor(150, 150, 150); doc.text("KOLTUK NO:", 105, 96, { align: "center" });
    doc.setFontSize(20); doc.setTextColor(59, 130, 246); doc.text(selectedSeat || "---", 105, 106, { align: "center" });
    doc.saveGraphicsState(); doc.setGState(new (doc as any).GState({ opacity: 0.95 }));
    doc.setFillColor(255, 255, 255); doc.roundedRect(65, 130, 80, 80, 10, 10, 'F');
    doc.addImage(qrImage, 'PNG', 70, 135, 70, 70);
    doc.restoreGraphicsState();
    doc.setDrawColor(255, 255, 255); doc.saveGraphicsState(); doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.line(40, 230, 170, 230);
    doc.restoreGraphicsState();
    doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.text(selectedEvent?.event_name || "", 105, 245, { align: "center" });
    doc.setFontSize(9); doc.setTextColor(160, 160, 160); doc.text(`${selectedEvent?.event_date}  •  ${selectedEvent?.event_location}`, 105, 255, { align: "center" });
    
    doc.save(`${userDisplayName}_Flick_Bilet.pdf`);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-6 flex flex-col items-center justify-start font-sans overflow-x-hidden relative">
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

      <div className="w-full max-w-lg relative z-10">
        <div className="relative bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
          
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] blur-[1px] flex items-center justify-center">
            <div className="w-[120%] h-[120%] animate-super-slow-rotate">
              <Image src="/flick-logo.png" alt="" fill className="object-contain" priority />
            </div>
          </div>

          <div className="relative z-10">
            {(step === 0 || step === 1) && (
              <div className="space-y-6">
                <RegistrationForm 
                  step={step}
                  setStep={setStep}
                  eventSlots={eventSlots}
                  loading={loading}
                  selectedEvent={selectedEvent}
                  setSelectedEvent={setSelectedEvent}
                  adSoyad={adSoyad}
                  setAdSoyad={setAdSoyad}
                  telefon={telefon}
                  setTelefon={setTelefon}
                  handleSubmit={handleSubmit}
                  error={error}
                />
                
                {/* Step 1'deyken Yeni Kayıt Butonunu göster */}
                {step === 1 && (
                  <div className="pt-6 border-t border-white/5 text-center">
                    <p className="text-[10px] text-slate-500 mb-4 uppercase font-black tracking-widest italic">Henüz Kayıt Yapmadınız mı?</p>
                    <button 
                      onClick={() => setStep(4)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      <UserPlus size={16} /> Yeni Kayıt Oluştur
                    </button>
                    <button onClick={() => setStep(0)} className="mt-4 w-full text-slate-600 text-[10px] font-black uppercase hover:text-white transition-colors flex items-center justify-center gap-2">
                      <ArrowLeft size={12} /> Etkinlik Listesine Dön
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Yeni Kayıt Formu (NewRegistration.tsx) */}
            {step === 4 && (
              <div className="space-y-4">
                <NewRegistration onSuccess={() => setStep(5)} />
                <button onClick={() => setStep(1)} className="w-full text-slate-500 text-[10px] font-black uppercase py-2 hover:text-white transition-colors">Vazgeç ve Geri Dön</button>
              </div>
            )}

            {/* Başarılı Kayıt Mesajı */}
            {step === 5 && (
              <div className="text-center py-8 animate-in zoom-in duration-500">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                  <Info className="text-emerald-500" size={32} />
                </div>
                <h2 className="text-xl font-black uppercase italic text-white mb-2 tracking-tighter">Başvuru Alındı</h2>
                <p className="text-slate-400 text-[11px] font-bold leading-relaxed px-4 uppercase">
                  Kaydınız yöneticilerimiz tarafından onaylandıktan sonra biletinizi buradan alabileceksiniz.
                </p>
                <button 
                  onClick={() => { setStep(0); setAdSoyad(""); setTelefon(""); }} 
                  className="mt-8 w-full bg-white text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                >
                  Ana Menüye Dön
                </button>
              </div>
            )}

            {step === 2 && (
              <SeatMap 
                timeLeft={timeLeft}
                occupiedSeats={occupiedSeats}
                selectedSeat={selectedSeat}
                setSelectedSeat={setSelectedSeat}
                handleSeatConfirm={handleSeatConfirm}
                loading={loading}
                setStep={setStep}
                setError={setError}
              />
            )}

            {step === 3 && (
              <TicketView 
                userDisplayName={userDisplayName}
                selectedSeat={selectedSeat}
                qrValue={qrValue}
                indirPDF={indirPDF}
              />
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
