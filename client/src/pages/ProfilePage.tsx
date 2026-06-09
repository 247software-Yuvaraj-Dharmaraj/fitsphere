import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Mail, Shield, UserCircle, Send } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import {
  useCreateFeedback,
  useFeedbackMembers,
  useMemberFeedback,
  useMyFeedback,
} from '../features/feedback/feedback.hooks';
import { FeedbackTimeline } from '../features/feedback/FeedbackTimeline';
import { getApiErrorMessage } from '../lib/api';
import { PageHeader } from '../components/ui/page-header';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { fieldClasses } from '../components/ui/field';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={<UserCircle size={24} />}
        title={t('pages.profile.title')}
        subtitle={t('pages.profile.subtitle')}
      />

      {/* Account card */}
      <Card className="mb-6 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            <UserCircle size={32} />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
            <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <Mail size={14} /> {user?.email}
            </p>
          </div>
          <span className="ml-auto">
            <Badge tone="slate">
              <Shield size={12} className="mr-1" />
              {t(`roles.${user?.role}`)}
            </Badge>
          </span>
        </div>
      </Card>

      {isStaff ? <StaffFeedback /> : <MemberFeedback />}
    </div>
  );
}

function MemberFeedback() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyFeedback();
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t('profile.feedbackFromTrainers')}
      </h2>
      <FeedbackTimeline items={data} loading={isLoading} emptyText={t('profile.noFeedback')} />
    </Card>
  );
}

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
    <Card className="space-y-4 p-6">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t('profile.giveFeedback')}
      </h2>

      <Select
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        placeholder={t('profile.selectMember')}
        options={(members.data ?? []).map((m) => ({ value: m.id, label: `${m.name} (${m.email})` }))}
      />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={t('profile.notePlaceholder')}
        disabled={!memberId}
        className={`${fieldClasses} disabled:bg-slate-50 dark:disabled:bg-slate-800/50`}
      />
      <Button onClick={submit} disabled={!memberId || !note.trim()} loading={create.isPending}>
        {!create.isPending && <Send size={16} />}
        {t('profile.submit')}
      </Button>

      {memberId && (
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <h3 className="mb-3 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
            {t('profile.memberFeedback')}
          </h3>
          <FeedbackTimeline
            items={memberFeedback.data}
            loading={memberFeedback.isLoading}
            emptyText={t('profile.noFeedback')}
          />
        </div>
      )}
    </Card>
  );
}
