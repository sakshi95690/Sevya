import React, { useState } from 'react';
import { TempleInfo, User } from '../types';
import {
  HeartHandshake,
  ShieldCheck,
  ExternalLink,
  Lock,
  Building,
  CheckCircle2,
  ArrowRight,
  Coins,
  Award,
  Heart,
  Info,
  X,
  Loader2,
  Gift,
  QrCode,
  FileCheck,
} from 'lucide-react';

interface DonationsViewProps {
  temple: TempleInfo;
  currentUser: User;
}

interface DonationCampaign {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  purposeCode: string;
  suggestedAmounts: number[];
  color: string;
  iconBg: string;
}

export const DonationsView: React.FC<DonationsViewProps> = ({ temple, currentUser }) => {
  const campaigns: DonationCampaign[] = [
    {
      id: 'annadaan',
      title: 'Annadaan Seva',
      subtitle: 'Mass Prashadam Distribution',
      description: 'Sponsor daily wholesome hot meals and mahaprasadam for hundreds of visiting pilgrims, sadhus, and devotees.',
      category: 'Food Seva',
      purposeCode: 'Annadaan',
      suggestedAmounts: [501, 1100, 2100, 5100, 11000],
      color: 'border-amber-300 bg-amber-50/60 text-amber-900',
      iconBg: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'gauseva',
      title: 'Gau Seva',
      subtitle: 'Cow Protection & Feeding',
      description: 'Provide fresh green fodder, medical care, and clean shelter for indigenous cows in the temple gaushala.',
      category: 'Gaushala',
      purposeCode: 'Gau%20Seva',
      suggestedAmounts: [501, 1100, 2500, 5000, 10000],
      color: 'border-emerald-300 bg-emerald-50/60 text-emerald-900',
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'nitya',
      title: 'Nitya Deity Seva & Puja',
      subtitle: 'Daily Shringhar & Worship',
      description: 'Support daily deity shringhar, fresh flower garlands, incense, lamp oil, bhog items, and garbhagriha maintenance.',
      category: 'Daily Worship',
      purposeCode: 'Temple%20Maintenance',
      suggestedAmounts: [251, 501, 1001, 2501, 5001],
      color: 'border-purple-300 bg-purple-50/60 text-purple-900',
      iconBg: 'bg-purple-100 text-purple-700',
    },
    {
      id: 'festival',
      title: 'Grand Utsav & Festival Seva',
      subtitle: 'Special Festival Celebrations',
      description: 'Sponsor grand festival decorations, abhishek, cultural performances, and large-scale kirtan gatherings.',
      category: 'Festival Sponsorship',
      purposeCode: 'Festival%20Donation',
      suggestedAmounts: [1001, 2100, 5100, 11000, 25000],
      color: 'border-rose-300 bg-rose-50/60 text-rose-900',
      iconBg: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'nirman',
      title: 'Temple Construction & Infra',
      subtitle: 'Nirman & Renovation Fund',
      description: 'Contribute towards permanent temple infrastructure, hall expansion, pilgrim guest house, and garbhagriha development.',
      category: 'Infrastructure',
      purposeCode: 'Construction%20Fund',
      suggestedAmounts: [2100, 5100, 11000, 21000, 50000],
      color: 'border-blue-300 bg-blue-50/60 text-blue-900',
      iconBg: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'general',
      title: 'General Seva & Ashram Fund',
      subtitle: 'Unrestricted Operational Support',
      description: 'Flexible general fund utilized where the temple needs operational assistance and seva support the most.',
      category: 'General Support',
      purposeCode: 'General%20Donation',
      suggestedAmounts: [108, 501, 1008, 2100, 5000],
      color: 'border-slate-300 bg-slate-50/80 text-slate-900',
      iconBg: 'bg-slate-200 text-slate-700',
    },
  ];

  const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign>(campaigns[0]);
  const [amount, setAmount] = useState<number>(1100);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [isRedirectingModal, setIsRedirectingModal] = useState<boolean>(false);
  const [donorName, setDonorName] = useState<string>(currentUser.name || '');
  const [donorPhone, setDonorPhone] = useState<string>(currentUser.phone || '');

  const officialBaseUrl = temple.tagline && temple.tagline.includes('http')
    ? temple.tagline
    : 'https://sevya.org/donate';

  const handleSelectAmount = (val: number) => {
    setAmount(val);
    setCustomAmountInput('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmountInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
    }
  };

  const getTargetDonationUrl = () => {
    const finalAmt = customAmountInput ? parseInt(customAmountInput, 10) || amount : amount;
    return `${officialBaseUrl}?purpose=${selectedCampaign.purposeCode}&amount=${finalAmt}&name=${encodeURIComponent(donorName)}&phone=${encodeURIComponent(donorPhone)}`;
  };

  const handleProceedToDonate = () => {
    setIsRedirectingModal(true);
    setTimeout(() => {
      window.open(getTargetDonationUrl(), '_blank', 'noopener,noreferrer');
    }, 1200);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Temple Sacred Seva & Donations
              </h1>
              <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                80G Exempt
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Support daily deity worship, Anna Prashadam, Gaushala care, and seva causes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium text-[11px]">Official Temple Trust Gateway</span>
        </div>
      </div>

      {/* Main Campaign Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Campaign Categories */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-600" /> Choose Seva Campaign
              </h3>
              <p className="text-xs text-slate-500">Select a cause to support temple operations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {campaigns.map((camp) => {
              const isSelected = selectedCampaign.id === camp.id;
              return (
                <div
                  key={camp.id}
                  onClick={() => {
                    setSelectedCampaign(camp);
                    setAmount(camp.suggestedAmounts[1] || 1100);
                    setCustomAmountInput('');
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-3 right-3 text-amber-600">
                      <CheckCircle2 className="w-5 h-5 fill-amber-500 text-white" />
                    </span>
                  )}
                  <div className="space-y-1.5 pr-6">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${camp.iconBg}`}>
                      {camp.category}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-1">{camp.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{camp.description}</p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">Suggested:</span>
                    <span className="font-extrabold text-amber-700">₹{camp.suggestedAmounts[0]} – ₹{camp.suggestedAmounts[camp.suggestedAmounts.length - 1]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Amount Selector & Proceed Box */}
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs space-y-4 sticky top-6">
            <div className="border-b border-slate-100 pb-3 space-y-1">
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded font-black uppercase tracking-wider">
                Selected Seva
              </span>
              <h3 className="text-base font-extrabold text-slate-900">{selectedCampaign.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{selectedCampaign.subtitle}</p>
            </div>

            {/* Quick Amount Pills */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Select Offering Amount (₹)</label>
              <div className="grid grid-cols-3 gap-2">
                {selectedCampaign.suggestedAmounts.map((amt) => {
                  const isSelected = amount === amt && !customAmountInput;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleSelectAmount(amt)}
                      className={`py-2 px-1 text-center font-extrabold text-xs rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600">Or Enter Custom Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 2500"
                  value={customAmountInput}
                  onChange={handleCustomAmountChange}
                  className="w-full pl-7 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Donor Quick Info */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block font-bold text-slate-700 text-[11px]">Devotee Name</label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg mt-0.5"
                  placeholder="Your Name for Receipt"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 text-[11px]">Mobile Number</label>
                <input
                  type="text"
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg mt-0.5"
                  placeholder="For SMS confirmation & receipt"
                />
              </div>
            </div>

            {/* Proceed Button */}
            <button
              onClick={handleProceedToDonate}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-white" /> Proceed to Official Portal <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium text-center">
              <Lock className="w-3 h-3 text-emerald-600" /> Redirects to Official Temple Payment Portal
            </div>
          </div>
        </div>
      </div>

      {/* Official Guarantee Notice & FAQ */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Official Temple Payment & Tax Exemption Guarantee</h4>
            <p className="text-xs text-slate-500">
              Transactions are processed directly by the official temple trust payment gateway. SEVYA does not collect bank credentials.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-amber-600" /> 80G Tax Exemption
            </span>
            <p className="text-[11px] text-slate-500">
              Donations are eligible for 50% tax exemption under Section 80G of Income Tax Act, India.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> SSL Encrypted & Direct
            </span>
            <p className="text-[11px] text-slate-500">
              Payments redirect directly to the official temple gateway via UPI, Cards, Netbanking & Wallets.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-blue-600" /> Instant Receipt & SMS
            </span>
            <p className="text-[11px] text-slate-500">
              Official donation receipt certificate and confirmation SMS are sent to your phone immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Redirection Overlay Modal */}
      {isRedirectingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-4 sm:p-6 text-center space-y-4 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">Opening Official Donation Gateway</h3>
              <p className="text-xs text-slate-500">
                Transferring you to the official payment portal...
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Campaign:</span>
                <span>{selectedCampaign.title}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-700">
                <span>Offering Amount:</span>
                <span>₹{(customAmountInput ? parseInt(customAmountInput, 10) || amount : amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <a
                href={getTargetDonationUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsRedirectingModal(false)}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center justify-center gap-1.5"
              >
                Click Here if Portal Doesn't Open <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setIsRedirectingModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Return to SEVYA App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
