import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Bookmark } from 'lucide-react';
import {
  useCancelMyBooking,
  useLeaveWaitlistMine,
  useMyBookings,
} from '../features/slots/slots.hooks';
import { getApiErrorMessage } from '../lib/api';
import { PageHeader } from '../components/ui/page-header';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Empty } from '../components/ui/empty';

export function BookingsPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useMyBookings();
  const cancel = useCancelMyBooking();
  const leaveWaitlist = useLeaveWaitlistMine();

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(iso));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={<Bookmark size={24} />}
        title={t('pages.bookings.title')}
        subtitle={t('pages.bookings.subtitle')}
      />

      {isLoading ? (
        <p className="text-slate-400 dark:text-slate-500">{t('common.loading')}</p>
      ) : !data || data.length === 0 ? (
        <Empty text={t('bookings.empty')} icon={<Bookmark size={28} className="opacity-60" />} />
      ) : (
        <ul className="space-y-3">
          {data.map((s) => (
            <Card key={s.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                  {s.startTime} – {s.endTime}
                  {s.waitlistedByMe && (
                    <Badge tone="amber">
                      {t('slots.waitlistPosition', { position: s.waitlistPosition })}
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtDate(s.date)} · {t('slots.spotsLeft', { count: s.available })}
                </p>
              </div>
              {s.waitlistedByMe ? (
                <Button
                  variant="secondary"
                  loading={leaveWaitlist.isPending && leaveWaitlist.variables === s.id}
                  onClick={() =>
                    leaveWaitlist.mutate(s.id, {
                      onError: (e) => toast.error(getApiErrorMessage(e, 'Could not leave waitlist')),
                      onSuccess: () => toast.success(t('slots.leftWaitlistToast')),
                    })
                  }
                >
                  {t('slots.leaveWaitlist')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  loading={cancel.isPending && cancel.variables === s.id}
                  onClick={() =>
                    cancel.mutate(s.id, {
                      onError: (e) => toast.error(getApiErrorMessage(e, 'Cancel failed')),
                      onSuccess: () => toast.success(t('slots.cancelledToast')),
                    })
                  }
                >
                  {t('slots.cancel')}
                </Button>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
