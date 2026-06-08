import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Mail, Shield, UserCircle } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import {
  useCreateFeedback,
  useFeedbackMembers,
  useMemberFeedback,
  useMyFeedback,
} from '../features/feedback/feedback.hooks';
import { FeedbackTimeline } from '../features/feedback/FeedbackTimeline';
import { getApiErrorMessage } from '../lib/api';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{t('pages.profile.title')}</h1>
        <p className="mt-1 text-slate-500">{t('pages.profile.subtitle')}</p>
      </header>

      {/* Account card */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <UserCircle size={32} />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">{user?.name}</p>
            <p className="flex items-center gap-1 text-sm text-slate-500">
              <Mail size={14} /> {user?.email}
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            <Shield size={14} />
            {t(`roles.${user?.role}`)}
          </span>
        </div>
      </section>

      {isStaff ? <StaffFeedback /> : <MemberFeedback />}
    </div>
  );
}

// Member: read-only timeline of feedback from trainers.
function MemberFeedback() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyFeedback();
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold text-slate-700">
        {t('profile.feedbackFromTrainers')}
      </h2>
      <FeedbackTimeline items={data} loading={isLoading} emptyText={t('profile.noFeedback')} />
    </section>
  );
}

// Trainer/Admin: pick a member, give feedback, see their timeline.
function StaffFeedback() {
  const { t } = useTranslation();
  const members = useFeedbackMembers();
  const [memberId, setMemberId] = useState('');
  const [note, setNote] = useState('');
  const memberFeedback = useMemberFeedback(memberId);
  const create = useCreateFeedback();

  function submit() {
    if (!memberId || !note.trim()) return;
    create.mutate(
      { memberId, note: note.trim() },
      {
        onError: (err) => toast.error(getApiErrorMessage(err, 'Could not send feedback')),
        onSuccess: () => {
          toast.success(t('profile.sentToast'));
          setNote('');
        },
      },
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-700">{t('profile.giveFeedback')}</h2>

      <select
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      >
        <option value="">{t('profile.selectMember')}</option>
        {members.data?.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.email})
          </option>
        ))}
      </select>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={t('profile.notePlaceholder')}
        disabled={!memberId}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
      />
      <button
        onClick={submit}
        disabled={!memberId || !note.trim() || create.isPending}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {t('profile.submit')}
      </button>

      {memberId && (
        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase text-slate-400">
            {t('profile.memberFeedback')}
          </h3>
          <FeedbackTimeline
            items={memberFeedback.data}
            loading={memberFeedback.isLoading}
            emptyText={t('profile.noFeedback')}
          />
        </div>
      )}
    </section>
  );
}
