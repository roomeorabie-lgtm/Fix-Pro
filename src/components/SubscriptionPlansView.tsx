import React, { useState } from 'react';
import {
  Check,
  Zap,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SubscriptionPlan, UserProfile } from '../types';
import { createSubscriptionRequest } from '../lib/api';

interface SubscriptionPlansViewProps {
  plans: SubscriptionPlan[];
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSuccessRequest?: () => void;
}

export const SubscriptionPlansView: React.FC<SubscriptionPlansViewProps> = ({
  plans,
  user,
  onOpenAuth,
  onSuccessRequest,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePlans = plans.filter((p) => p.active);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setSelectedPlan(plan);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleConfirmRequest = async () => {
    if (!user || !selectedPlan) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await createSubscriptionRequest(user, selectedPlan, notes);
      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        setSuccessMessage('تم إرسال طلب الاشتراك بنجاح! سيتم مراجعته وتفعيله من قبل الإدارة فوراً.');
        setSelectedPlan(null);
        setNotes('');
        onSuccessRequest?.();
      } else {
        setErrorMessage(res.error || 'تعذر إرسال الطلب');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ في النظام');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>خطط اشتراك FixBoard الاحترافية</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
          اختر الباقة المناسبة لمركز صيانتك
        </h2>
        <p className="text-sm text-slate-400">
          وصول فوري وشامل لجميع مخططات الهواتف الذكية ولوحات Boardview التفاعلية وتتبع الخطوط
          والقطع بدقة هندسية عالية.
        </p>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Subscription Request Confirmation Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              تأكيد طلب الاشتراك ({selectedPlan.name})
            </h3>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">قيمة الاشتراك:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  ${selectedPlan.price} {selectedPlan.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المدة:</span>
                <span className="text-slate-200 font-semibold">{selectedPlan.durationLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المستخدم:</span>
                <span className="text-slate-200">{user?.name} ({user?.phone})</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ملاحظات أو وسيلة التحويل (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="مثال: تم إرسال المبلغ عبر فودافون كاش / STC Pay / USDT..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConfirmRequest}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>إرسال الطلب...</span>
                  </>
                ) : (
                  <>
                    <span>تأكيد وإرسال للإدارة</span>
                    <ArrowRight className="w-4 h-4 -rotate-180" />
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {activePlans.map((plan, index) => {
          const isPopular = index === 1; // 3 months or best value
          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 bg-slate-900/90 border flex flex-col justify-between transition-all hover:translate-y-[-4px] ${
                isPopular
                  ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>الأكثر اختياراً</span>
                </div>
              )}

              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>
                </div>

                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-100 font-mono">
                    ${plan.price}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    / {plan.durationLabel}
                  </span>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800/80 mb-6">
                  {plan.features?.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  isPopular
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                }`}
              >
                <span>اختيار هذه الباقة</span>
                <ArrowRight className="w-4 h-4 -rotate-180" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="mt-12 rounded-2xl bg-slate-900/50 border border-slate-800 p-6 flex flex-wrap items-center justify-around gap-6 text-center text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span>مخططات حقيقية وموثوقة 100%</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-cyan-400" />
          <span>تفعيل فوري للاشتراك بعد المراجعة</span>
        </div>
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>تحديثات مستمرة لأحدث اللوحات شهرياً</span>
        </div>
      </div>
    </div>
  );
};
