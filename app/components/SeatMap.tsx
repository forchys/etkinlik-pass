"use client";
import { useRef } from 'react';
import { Clock, Loader2 } from 'lucide-react';

const ChairSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M20 80 L20 40 Q20 20 50 20 Q80 20 80 40 L80 80" fill="none" stroke="currentColor" strokeWidth="6" />
    <rect x="15" y="65" width="70" height="15" rx="5" />
    <rect x="20" y="80" width="15" height="10" rx="2" />
    <rect x="65" y="80" width="15" height="10" rx="2" />
  </svg>
);

interface SeatMapProps {
  timeLeft: number;
  occupiedSeats: string[];
  selectedSeat: string | null;
  setSelectedSeat: (seat: string | null) => void;
  handleSeatConfirm: () => void;
  loading: boolean;
  setStep: (step: number) => void;
  setError: (err: string) => void;
}

export default function SeatMap({
  timeLeft, occupiedSeats, selectedSeat, setSelectedSeat,
  handleSeatConfirm, loading, setStep, setError
}: SeatMapProps) {

  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const rows = ['N', 'M', 'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];

  const formatTime = (seconds: number) => 
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const getSeatNumber = (row: string, slotIndex: number): number | null => {
    if (['M', 'L', 'K'].includes(row)) {
      if (slotIndex <= 2) return slotIndex;
      if (slotIndex >= 6 && slotIndex <= 16) return slotIndex - 3;
      return null;
    }
    if (row === 'N') return slotIndex;
    if (['J', 'I', 'H', 'G', 'F', 'E', 'D'].includes(row)) return slotIndex <= 11 ? slotIndex : null;
    return slotIndex <= 13 ? slotIndex : null;
  };

  return (
    <>
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

      <div className="view-transition pt-4">
        <h2 className="text-xl font-black text-center mb-6 tracking-widest uppercase text-white">KOLTUK SEÇİNİZ</h2>
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 scrollbar-hide">
          {rows.map((row) => (
            <div key={row} className="flex items-center gap-3">
              <div className="w-4 text-[10px] font-black text-slate-600 font-mono">{row}</div>
              <div className="flex-1 grid grid-cols-17 gap-1">
                {[...Array(17)].map((_, i) => {
                  const slotIndex = i + 1;
                  const seatNum = getSeatNumber(row, slotIndex);
                  
                  if (seatNum === null) {
                    return <div key={`gap-${row}-${slotIndex}`} className="aspect-[1/1.1]"></div>;
                  }

                  const seatId = `${row}-${seatNum}`;
                  const isOccupied = occupiedSeats.includes(seatId);
                  const isSelected = selectedSeat === seatId;
                  
                  return (
                    <button
                      key={seatId} 
                      disabled={isOccupied} 
                      onClick={() => {
                        setSelectedSeat(seatId);
                        setTimeout(() => confirmButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                      }}
                      className={`relative aspect-[1/1.1] transition-all duration-300 ${isOccupied ? 'occupied-seat' : isSelected ? 'selected-seat' : 'empty-seat'}`}
                    >
                      <ChairSVG className="absolute inset-0 w-full h-full pointer-events-none seat-img" />
                      <span className={`absolute inset-0 flex items-center justify-center text-[7px] font-bold translate-y-1 z-10 ${isOccupied ? 'text-rose-200/40' : isSelected ? 'text-white' : 'text-slate-400'}`}>
                        {seatNum}
                      </span>
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
    </>
  );
}
