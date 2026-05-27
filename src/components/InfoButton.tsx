import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface InfoButtonProps {
  title: string;
  description: string;
}

const InfoButton: React.FC<InfoButtonProps> = ({ title, description }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <>
      <div className="relative inline-flex items-center flex-shrink-0">
        <button
          onClick={() => setModalOpen(true)}
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}
          className="text-[#2E86AB] hover:text-[#1E3A5F] transition-colors"
          aria-label={`Πληροφορίες: ${title}`}
        >
          <Info className="w-4 h-4" />
        </button>

        {tooltipVisible && (
          <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg z-[100] pointer-events-none shadow-lg"
            style={{ whiteSpace: 'nowrap', maxWidth: '320px' }}>
            {description.length > 72 ? description.slice(0, 69) + '…' : description}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#1E3A5F] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#2E86AB]" />
                <h3 className="text-white font-semibold text-sm">{title}</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 leading-relaxed text-sm">{description}</p>
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => setModalOpen(false)}
                className="w-full bg-[#1E3A5F] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#2E86AB] transition-colors"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfoButton;
