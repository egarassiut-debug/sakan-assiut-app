import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Sparkles, X, Search, PlusCircle, 
  MapPin, CheckCircle2, AlertCircle, ArrowLeft, Volume2, VolumeX, Building2, Send
} from 'lucide-react';
import { parseArabicVoiceTranscript, ParsedVoiceResult } from '../utils/voiceParser';
import { Property, TenantRequest } from '../types/property';

export interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyVoiceSearch?: (searchCriteria: { 
    query?: string; 
    district?: string; 
    propertyType?: string; 
    purpose?: 'rent' | 'sale'; 
    maxPrice?: number;
  }) => void;
  onOpenAddOfferWithData?: (data: Partial<Property>) => void;
  onOpenAddRequestWithData?: (data: Partial<TenantRequest>) => void;
  activeDistricts?: string[];
  activePropertyTypes?: string[];
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyVoiceSearch,
  onOpenAddOfferWithData,
  onOpenAddRequestWithData,
  activeDistricts = [],
  activePropertyTypes = [],
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [parsedResult, setParsedResult] = useState<ParsedVoiceResult | null>(null);
  const [intentType, setIntentType] = useState<'search' | 'offer' | 'request' | 'general'>('general');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [manualText, setManualText] = useState('');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Speech Recognition on Mount or Open
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setFeedbackMsg('المتصفح الحالي لا يدعم التعرف الصوتي المباشر. يمكنك كتابة طلبك بالأسفل.');
      return;
    }

    setSpeechSupported(true);
  }, []);

  // Stop listening when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setInterimTranscript('');
      setParsedResult(null);
      setFeedbackMsg(null);
      setManualText('');
    }
  }, [isOpen]);

  const speakArabic = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-EG';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setFeedbackMsg('المتصفح لا يدعم ميزة التعرف الصوتي. يرجى استخدام متصفح Chrome أو كتابة طلبك.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceSeconds(0);
        setFeedbackMsg('جاري الاستماع... تحدث بوضوح عن طلبك أو عقارك');
        setInterimTranscript('');

        // Timer limit to prevent infinite listening
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setVoiceSeconds((prev) => {
            if (prev >= 15) {
              stopListening();
              return 15;
            }
            return prev + 1;
          });
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript + ' ';
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (currentFinal) {
          const newFull = (transcript + ' ' + currentFinal).trim();
          setTranscript(newFull);
          processVoiceText(newFull);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setFeedbackMsg('تم رفض إذن استخدام الميكروفون. يرجى السماح به من إعدادات المتصفح.');
        } else if (event.error === 'no-speech') {
          setFeedbackMsg('لم يتم التقاط صوت واضح. حاول التحدث بالقرب من الميكروفون.');
        } else {
          setFeedbackMsg('انتهت جلسة الاستماع.');
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setFeedbackMsg('تعذر تشغيل الميكروفون. يرجى تجربة الكتابة أو إعادة المحاولة.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const processVoiceText = (text: string) => {
    if (!text || !text.trim()) return;

    const parsed = parseArabicVoiceTranscript(
      text,
      activePropertyTypes.length > 0 ? activePropertyTypes : ['شقة سكنية', 'محل تجاري', 'مكتب إداري', 'فيلا', 'قطعة أرض'],
      activeDistricts.length > 0 ? activeDistricts : ['حي الجامعة', 'الهلالي', 'الجمهورية', 'النميس', 'أسيوط الجديدة', 'شركة قلتة', 'سيتي', 'المعلمين', 'الوليدية']
    );

    setParsedResult(parsed);

    // Determine Intent:
    // Offer: "عندي شقة", "أريد نشر", "عرض شقة للبيع", "شقة للبيع مساحة", "للإيجار شقة"
    // Request: "مطلوب", "أبحث عن", "بدور على", "عايز شقة", "محتاج"
    // Search: Default for browsing
    const lower = text.toLowerCase();
    if (lower.includes('عندي') || lower.includes('أعرض') || lower.includes('اعرض') || lower.includes('إضافة عرض') || lower.includes('نشر إعلان')) {
      setIntentType('offer');
      setFeedbackMsg('🎯 تم التعرف على رغبتك في: نشر عرض عقاري جديد');
      speakArabic('تم فهم تفاصيل عقارك، يمكنك مراجعتها والضغط على إضافة العرض.');
    } else if (lower.includes('مطلوب') || lower.includes('بدور') || lower.includes('أبحث') || lower.includes('ابحث') || lower.includes('عايز شقة') || lower.includes('محتاج')) {
      setIntentType('request');
      setFeedbackMsg('🎯 تم التعرف على رغبتك في: طلب سكن أو عقار');
      speakArabic('تم فهم طلب السكن المطلوب، يمكنك المتابعة لتسجيل الطلب أو البحث الفوري.');
    } else {
      setIntentType('search');
      setFeedbackMsg('🔍 تم فهم رغبتك في: البحث عن عقارات مطابقة');
      speakArabic('تم تحديد معايير البحث، يمكنك عرض النتائج المطابقة الآن.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setTranscript(manualText.trim());
    processVoiceText(manualText.trim());
    setManualText('');
  };

  const handleApplySearch = () => {
    if (!parsedResult) return;
    if (onApplyVoiceSearch) {
      onApplyVoiceSearch({
        query: transcript,
        district: parsedResult.district,
        propertyType: parsedResult.propertyType,
        purpose: parsedResult.purpose,
        maxPrice: parsedResult.price ? Number(parsedResult.price) : undefined,
      });
    }
    onClose();
  };

  const handleCreateOffer = () => {
    if (onOpenAddOfferWithData && parsedResult) {
      onOpenAddOfferWithData({
        title: parsedResult.propertyType ? `${parsedResult.propertyType} في ${parsedResult.district || 'أسيوط'}` : 'عرض عقاري صوتي',
        propertyType: parsedResult.propertyType || 'شقة سكنية',
        purpose: parsedResult.purpose || 'rent',
        district: parsedResult.district || 'حي الجامعة',
        price: parsedResult.price ? Number(parsedResult.price) : 0,
        area: parsedResult.area ? Number(parsedResult.area) : 100,
        bedrooms: parsedResult.bedrooms ? Number(parsedResult.bedrooms) : 2,
        bathrooms: parsedResult.bathrooms ? Number(parsedResult.bathrooms) : 1,
        floorLevel: parsedResult.floorLevel !== undefined ? Number(parsedResult.floorLevel) : 1,
        hasElevator: parsedResult.hasElevator,
        description: transcript,
      });
    }
    onClose();
  };

  const handleCreateRequest = () => {
    if (onOpenAddRequestWithData && parsedResult) {
      onOpenAddRequestWithData({
        propertyType: parsedResult.propertyType || 'شقة سكنية',
        purpose: parsedResult.purpose || 'rent',
        preferredDistrict: parsedResult.district || 'حي الجامعة',
        maxPrice: parsedResult.price ? Number(parsedResult.price) : 5000,
        minArea: parsedResult.area ? Number(parsedResult.area) : 80,
        bedrooms: parsedResult.bedrooms ? Number(parsedResult.bedrooms) : 2,
        notes: transcript,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#24313D]/70 backdrop-blur-xs select-none animate-in fade-in"
      dir="rtl"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#D6DEE5] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header Branding */}
        <div className="bg-[#124C46] p-4 sm:p-5 text-white flex items-center justify-between border-b border-[#0D3D38] relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 text-[#D6A84F] flex items-center justify-center border border-white/20 shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>المساعد الصوتي الذكي</span>
                <span className="text-[10px] bg-[#D6A84F] text-[#24313D] px-2 py-0.5 rounded-full font-bold">
                  سكن أسيوط
                </span>
              </h3>
              <p className="text-xs text-[#DCECE7]">
                تحدث بحرية للبحث أو إضافة عرض أو تسجيل طلب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                ttsEnabled ? 'bg-white/20 text-[#D6A84F] border-white/30' : 'bg-white/10 text-white/60 border-white/10'
              }`}
              title={ttsEnabled ? 'الرد الصوتي مفعل' : 'الرد الصوتي صامت'}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Main Visual Waveform & Microphone Button */}
          <div className="flex flex-col items-center justify-center pt-2 pb-1 space-y-4">
            <div className="relative flex items-center justify-center">
              {/* Pulsing Aura Rings when listening */}
              {isListening && (
                <>
                  <div className="absolute w-28 h-28 rounded-full bg-[#124C46]/20 animate-ping pointer-events-none" />
                  <div className="absolute w-36 h-36 rounded-full bg-[#D6A84F]/20 animate-pulse pointer-events-none" />
                </>
              )}

              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 cursor-pointer active:scale-95 border-4 ${
                  isListening
                    ? 'bg-rose-500 border-rose-200 text-white animate-pulse'
                    : 'bg-[#124C46] hover:bg-[#0D3D38] border-[#D6A84F]/50 text-white hover:scale-105'
                }`}
                title={isListening ? 'اضغط للإيقاف' : 'اضغط للتحدث'}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 animate-bounce" />
                ) : (
                  <Mic className="w-8 h-8 text-[#D6A84F]" />
                )}
              </button>
            </div>

            {/* Status Indicator */}
            <div className="text-center space-y-1">
              <span className={`text-xs font-black px-3 py-1 rounded-full inline-block ${
                isListening
                  ? 'bg-rose-100 text-rose-700 animate-pulse'
                  : 'bg-[#EAF3EF] text-[#124C46]'
              }`}>
                {isListening ? `جاري الاستماع (${voiceSeconds} ثانية) • اضغط للإيقاف` : 'اضغط على الميكروفون وتحدث بصوتك'}
              </span>
              {feedbackMsg && (
                <p className="text-xs text-[#5D6B78] font-medium max-w-sm mx-auto">
                  {feedbackMsg}
                </p>
              )}
            </div>
          </div>

          {/* Transcript Display Bubble */}
          {(transcript || interimTranscript) && (
            <div className="p-4 rounded-2xl bg-[#F5F9F8] border border-[#D6DEE5] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#5D6B78]">
                <span>النص الصوتي المسموع:</span>
                <span className="text-[#124C46]">لهجة مصرية / أسيوط</span>
              </div>
              <p className="text-sm font-bold text-[#24313D] leading-relaxed">
                {transcript}
                {interimTranscript && (
                  <span className="text-[#788593] italic mr-1">{interimTranscript}...</span>
                )}
              </p>
            </div>
          )}

          {/* Smart Recognized Intent & Parameters Card */}
          {parsedResult && (parsedResult.district || parsedResult.propertyType || parsedResult.price || parsedResult.area) && (
            <div className="p-4 rounded-2xl bg-white border border-[#124C46]/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#D6DEE5] pb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#124C46]">
                  <CheckCircle2 className="w-4 h-4 text-[#16856B]" />
                  <span>البيانات المستخرجة ذكياً:</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF8ED] text-[#8B641C] border border-[#D6A84F]/40">
                  {intentType === 'offer' ? 'عرض عقاري' : intentType === 'request' ? 'طلب سكن' : 'بحث فوري'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {parsedResult.propertyType && (
                  <div className="p-2 rounded-xl bg-[#F5F9F8] border border-[#D6DEE5]">
                    <span className="text-[#5D6B78] block text-[10px]">نوع العقار</span>
                    <span className="font-bold text-[#24313D]">{parsedResult.propertyType}</span>
                  </div>
                )}
                {parsedResult.district && (
                  <div className="p-2 rounded-xl bg-[#F5F9F8] border border-[#D6DEE5]">
                    <span className="text-[#5D6B78] block text-[10px]">المنطقة / الحي</span>
                    <span className="font-bold text-[#124C46]">{parsedResult.district}</span>
                  </div>
                )}
                {parsedResult.purpose && (
                  <div className="p-2 rounded-xl bg-[#F5F9F8] border border-[#D6DEE5]">
                    <span className="text-[#5D6B78] block text-[10px]">الغرض</span>
                    <span className="font-bold text-[#24313D]">
                      {parsedResult.purpose === 'rent' ? 'إيجار' : 'بيع وشراء'}
                    </span>
                  </div>
                )}
                {parsedResult.price && (
                  <div className="p-2 rounded-xl bg-[#F5F9F8] border border-[#D6DEE5]">
                    <span className="text-[#5D6B78] block text-[10px]">السعر التقديري</span>
                    <span className="font-bold text-[#8B641C]">
                      {Number(parsedResult.price).toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                )}
                {parsedResult.area && (
                  <div className="p-2 rounded-xl bg-[#F5F9F8] border border-[#D6DEE5]">
                    <span className="text-[#5D6B78] block text-[10px]">المساحة التقريبية</span>
                    <span className="font-bold text-[#24313D]">{parsedResult.area} م²</span>
                  </div>
                )}
              </div>

              {/* Action Buttons based on parsed intent */}
              <div className="pt-2 flex flex-col gap-2">
                {/* 1. Quick Search Action */}
                <button
                  type="button"
                  onClick={handleApplySearch}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4 text-[#D6A84F]" />
                  <span>عرض العقارات والنتائج المطابقة فوراً</span>
                </button>

                {/* 2. Intent Action (Offer or Request) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateOffer}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-[#F5F9F8] text-[#124C46] border border-[#124C46]/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>إضافة عرض جديد</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateRequest}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-[#F5F9F8] text-[#5D6B78] hover:text-[#24313D] border border-[#D6DEE5] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>تسجيل طلب سكن</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Arabic Voice Prompts Ideas */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#5D6B78] block">
              أمثلة يمكنك قولها بالصوت:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'شقة للإيجار في حي الجامعة بسعر 4000',
                'عندي شقة للبيع بالنميس مساحة 140 متر',
                'مطلوب سكن طالبات في سيتي مفروش',
                'أرض للبيع بأسيوط الجديدة',
              ].map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTranscript(sample);
                    processVoiceText(sample);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F9F8] hover:bg-[#EAF3EF] text-[#24313D] hover:text-[#124C46] border border-[#D6DEE5] text-[11px] font-semibold transition-colors cursor-pointer text-right"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>

          {/* Manual Text Fallback (in case of microphone refusal or noisy environment) */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-[#D6DEE5]/80">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="أو اكتب وصفك أو طلبك هنا واضغط تحليل..."
                className="flex-1 py-2 px-3 rounded-xl border border-[#D6DEE5] text-xs focus:ring-1 focus:ring-[#124C46] focus:border-[#124C46] outline-hidden bg-[#F5F9F8]"
              />
              <button
                type="submit"
                disabled={!manualText.trim()}
                className="py-2 px-3 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>تحليل</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
