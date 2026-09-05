import React, { useState } from 'react';
import { X, CheckCircle, Calendar, ShieldCheck, Activity, User, Mail, Phone, Flame } from 'lucide-react';
import { ScrambleCTAButton } from './ScrambleCTAButton';
import { RedCrosshair } from './RedCrosshair';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: string;
  onSuccess: (message: string) => void;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  onClose,
  initialService = 'consultation',
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    sport: '',
    primaryGoal: initialService || 'consultation',
    athleteLevel: 'Professional',
    preferredDate: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess(`Consultation reserved for ${formData.fullName || 'Athlete'}! A sports scientist will review your intake.`);
      onClose();
      setStep(1);
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 text-[#111] shadow-2xl my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <RedCrosshair position="top-left" />
        <RedCrosshair position="top-right" />
        <RedCrosshair position="bottom-left" />
        <RedCrosshair position="bottom-right" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-neutral-500 hover:text-black rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 border-b border-neutral-200 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-xs font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            <Activity className="w-4 h-4" />
            <span>Sports Science Intake & Booking</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#111] uppercase">
            Book Your Consultation
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            185 Bridgeland Ave, Toronto &bull; Lab Diagnostics &bull; Custom Athlete Performance
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 border-b border-neutral-100 pb-3 text-xs uppercase font-bold tracking-wider">
          <span className={step >= 1 ? 'text-[#ff3b30]' : 'text-neutral-400'}>
            01. Discipline & Level
          </span>
          <span className="text-neutral-300">&rarr;</span>
          <span className={step >= 2 ? 'text-[#ff3b30]' : 'text-neutral-400'}>
            02. Contact & Sport
          </span>
          <span className="text-neutral-300">&rarr;</span>
          <span className={step >= 3 ? 'text-[#ff3b30]' : 'text-neutral-400'}>
            03. Confirmation
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-neutral-700 mb-2">
                  Select Primary Focus
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'testing', name: '001 Testing', sub: 'VO2 & Force Plates' },
                    { id: 'training', name: '002 Training', sub: 'Periodization' },
                    { id: 'therapy', name: '003 Therapy', sub: 'Soft Tissue & Rehab' },
                    { id: 'longevity', name: '004 Longevity', sub: 'Bio-Health & Peak' },
                  ].map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, primaryGoal: srv.id })}
                      className={`p-3 text-left rounded-2xl border text-xs transition-all cursor-pointer ${
                        formData.primaryGoal === srv.id
                          ? 'border-[#ff3b30] bg-[#ff3b30]/5 font-bold text-[#ff3b30] shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-400 text-neutral-800'
                      }`}
                    >
                      <div className="font-display font-bold uppercase">{srv.name}</div>
                      <div className="text-[10px] text-neutral-500 font-normal mt-0.5">{srv.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-neutral-700 mb-2">
                  Athlete Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Professional / Pro League',
                    'Olympic / National Team',
                    'NCAA / D1 / Collegiate',
                    'Youth Competitive',
                    'High-Performance Masters',
                    'Tactical / First Responder',
                  ].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, athleteLevel: level })}
                      className={`p-2.5 text-xs text-left rounded-xl border transition-all cursor-pointer ${
                        formData.athleteLevel === level
                          ? 'border-[#111] bg-[#111] text-white font-semibold shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-400 text-neutral-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-[#111] text-white text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
                >
                  Continue to Details &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-neutral-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 focus:border-[#ff3b30] focus:outline-hidden text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-neutral-700 mb-1">
                    Sport / Discipline *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Baseball, Track & Field, Hockey"
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 focus:border-[#ff3b30] focus:outline-hidden text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-neutral-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="athlete@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 focus:border-[#ff3b30] focus:outline-hidden text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-neutral-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (416) 555-0199"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 focus:border-[#ff3b30] focus:outline-hidden text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-neutral-700 mb-1">
                  Primary Goals or Current Limitations
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Increase vertical jump velocity, rehab hamstring tendonitis, analyze pitch biomechanics..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 focus:border-[#ff3b30] focus:outline-hidden text-sm resize-none"
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs uppercase tracking-wider text-neutral-600 hover:text-black font-semibold cursor-pointer px-4 py-2 rounded-full hover:bg-neutral-100 transition-colors"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.fullName || !formData.email) {
                      return;
                    }
                    setStep(3);
                  }}
                  className="px-6 py-3 bg-[#111] text-white text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
                >
                  Review Booking &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-neutral-50/90 p-5 rounded-2xl border border-neutral-200 space-y-2 text-xs">
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="text-neutral-500 uppercase font-bold">Athlete:</span>
                  <span className="font-bold text-neutral-900">{formData.fullName}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="text-neutral-500 uppercase font-bold">Sport / Level:</span>
                  <span className="font-bold text-neutral-900">{formData.sport || 'Multi-sport'} &bull; {formData.athleteLevel}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="text-neutral-500 uppercase font-bold">Focus Discipline:</span>
                  <span className="font-bold text-[#ff3b30] uppercase">{formData.primaryGoal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-bold">Direct Contact:</span>
                  <span className="font-bold text-neutral-900">{formData.email} &bull; {formData.phone}</span>
                </div>
              </div>

              <div className="p-4 bg-red-50/60 rounded-2xl border border-red-200 text-[11px] text-red-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#ff3b30] shrink-0 mt-0.5" />
                <span>
                  No commitment required. Initial consultation includes full laboratory tour, baseline movement screen review, and direct consult with a lead sports scientist.
                </span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs uppercase tracking-wider text-neutral-600 hover:text-black font-semibold cursor-pointer px-4 py-2 rounded-full hover:bg-neutral-100 transition-colors"
                >
                  &larr; Edit Details
                </button>
                <ScrambleCTAButton
                  text={isSubmitting ? 'SECURING INTAKE...' : 'CONFIRM CONSULTATION'}
                  variant="red"
                  size="md"
                  arrowIcon="diagonal"
                  onClick={(e) => {
                    handleSubmit(e);
                  }}
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
