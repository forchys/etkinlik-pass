"use client";
import { 
  Loader2, HelpCircle, Film, Theater, Users, Trophy, 
  CalendarDays, MapPin, ChevronRight, ArrowLeft, Ticket, 
  User, Smartphone, Search, Presentation, AlertCircle, Sparkles 
} from 'lucide-react';

const EVENT_ICONS: Record<string, React.ElementType> = {
  cinema: Film,
  theater: Theater,
  social: Users,
  quiz: Trophy
};

interface RegistrationFormProps {
  step: number;
  setStep: (step: number) => void;
  eventSlots: any[];
  loading: boolean;
  selectedEvent: any;
  setSelectedEvent: (event: any) => void;
  adSoyad: string;
  setAdSoyad: (val: string) => void;
  telefon: string;
  setTelefon: (val: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  error: string;
}

export default function RegistrationForm({
  step, setStep, eventSlots, loading, selectedEvent, setSelectedEvent,
  adSoyad, setAdSoyad, telefon, setTelefon, handleSubmit, error
}: RegistrationFormProps) {

  const getEventIcon = (type: string, size = 16) => {
    const Icon = EVENT_ICONS[type] || Film;
    return <Icon size={size} />;
  };

  return (
    <>
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
              <input required type="text" placeholder="Ad ve Soyad" value={adSoyad} className="w-full bg-slate-950/50 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all" onChange={(e) => setAdSoyad(e.target.value)} />
            </div>
            <div className="relative group">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input required type="tel" maxLength={10} value={telefon} placeholder="5XXXXXXXXX" className="w-full bg-slate-950/50 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all" onChange={(e) => setTelefon(e.target.value.replace(/\D/g, ""))} />
            </div>
            <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/40">
              {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
              <span className="tracking-widest uppercase text-sm">
                {selectedEvent?.has_seating === false ? 'Biletimi Hazırla' : 'Koltuk Seçimine Geç'}
              </span>
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
    </>
  );
}
