"use client";
import { CheckCircle2, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface TicketViewProps {
  userDisplayName: string;
  selectedSeat: string | null;
  qrValue: string | null;
  indirPDF: () => void;
}

export default function TicketView({ userDisplayName, selectedSeat, qrValue, indirPDF }: TicketViewProps) {
  return (
    <div className="view-transition flex flex-col items-center">
      <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full mb-6 flex items-center gap-2 text-xs font-black border border-emerald-500/20 uppercase">
        <CheckCircle2 size={14} /> Biletiniz Hazır
      </div>
      <h2 className="text-2xl font-black mb-1 text-center text-white uppercase">{userDisplayName}</h2>
      {selectedSeat ? (
        <p className="text-blue-400 font-bold mb-8 text-sm uppercase">KOLTUK: {selectedSeat}</p>
      ) : (
        <p className="text-blue-400 font-bold mb-8 text-sm uppercase">GENEL GİRİŞ</p>
      )}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl mb-8 relative z-20">
        <QRCodeCanvas id="ticket-qr" value={qrValue || ""} size={180} level="H" />
      </div>
      <button onClick={indirPDF} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
        <Download size={20} /> PDF OLARAK İNDİR
      </button>
    </div>
  );
}
