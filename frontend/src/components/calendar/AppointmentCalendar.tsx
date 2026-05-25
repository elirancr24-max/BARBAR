'use client';

import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Phone, Clock, Scissors, User as UserIcon, X, MessageCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatAgorot, formatDateHe, formatTime } from '@/lib/utils';

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string | null;
  priceAgorot: number;
  service: { name: string; color: string; durationMin: number };
  employee: { id: string; color: string; user: { fullName: string } };
  customer: { fullName: string; phone: string };
}

const statusStyles: Record<string, { bg: string; ring: string; label: string }> = {
  PENDING:   { bg: '#94a3b8', ring: '#64748b', label: 'ממתין' },
  CONFIRMED: { bg: '#10b981', ring: '#059669', label: 'אושר' },
  COMPLETED: { bg: '#3b82f6', ring: '#2563eb', label: 'הושלם' },
  CANCELLED: { bg: '#ef4444', ring: '#dc2626', label: 'בוטל' },
  NO_SHOW:   { bg: '#f59e0b', ring: '#d97706', label: 'לא הגיע' },
};

interface Props {
  editable?: boolean;
  employeeIdFilter?: string;
}

export function AppointmentCalendar({ editable = true, employeeIdFilter }: Props) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Appointment | null>(null);

  const { data: appts = [] } = useQuery({
    queryKey: ['appointments', employeeIdFilter],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>('/appointments', {
        params: employeeIdFilter ? { employeeId: employeeIdFilter } : {},
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; startAt?: string; status?: string }) =>
      (await api.patch(`/appointments/${input.id}`, input)).data,
    onSuccess: () => { toast.success('עודכן'); qc.invalidateQueries({ queryKey: ['appointments'] }); },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/appointments/${id}`)).data,
    onSuccess: () => { toast.success('בוטל'); setSelected(null); qc.invalidateQueries({ queryKey: ['appointments'] }); },
  });

  const whatsappMutation = useMutation({
    mutationFn: async (input: { id: string; kind: string }) =>
      (await api.post<{ url: string }>(`/appointments/${input.id}/whatsapp?kind=${input.kind}`)).data,
    onSuccess: (data) => { window.open(data.url, '_blank'); },
  });

  const events = useMemo(() => appts.map((a) => {
    const style = statusStyles[a.status];
    return {
      id: a.id,
      start: a.startAt,
      end: a.endAt,
      backgroundColor: style.bg,
      borderColor: a.employee.color,
      textColor: '#fff',
      extendedProps: a,
    };
  }), [appts]);

  return (
    <>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        {Object.entries(statusStyles).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: s.bg }} />
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden barbar-calendar">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          direction="rtl"
          locale="he"
          initialView="timeGridWeek"
          headerToolbar={{
            start: 'today',
            center: 'title',
            end: 'timeGridDay,timeGridWeek,dayGridMonth',
          }}
          buttonText={{ today: 'היום', month: 'חודש', week: 'שבוע', day: 'יום' }}
          events={events}
          editable={editable}
          eventDurationEditable={false}
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          nowIndicator
          allDaySlot={false}
          weekends
          firstDay={0}
          height="auto"
          contentHeight={780}
          expandRows
          eventClick={(info) => {
            const apt = info.event.extendedProps as Appointment;
            setSelected(apt);
          }}
          eventDrop={(info) => {
            if (info.event.start) {
              updateMutation.mutate({ id: info.event.id, startAt: info.event.start.toISOString() });
            }
          }}
          eventContent={(arg) => {
            const a = arg.event.extendedProps as Appointment;
            return (
              <div className="px-2 py-1.5 h-full overflow-hidden text-xs leading-tight">
                <div className="font-bold truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  {arg.timeText}
                </div>
                <div className="font-semibold truncate mt-0.5">{a.customer.fullName}</div>
                <div className="opacity-90 truncate">{a.service.name}</div>
              </div>
            );
          }}
          dayHeaderFormat={{ weekday: 'short', day: '2-digit', month: '2-digit' }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        />
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelected(null)}>
          <Card className="max-w-md w-full p-0 overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 pb-4 relative" style={{ background: statusStyles[selected.status].bg + '15' }}>
              <button className="absolute start-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)}>
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: statusStyles[selected.status].bg, color: '#fff' }}>
                  {statusStyles[selected.status].label}
                </span>
                <div className="text-xs text-muted-foreground font-mono">#{selected.id.slice(-6).toUpperCase()}</div>
              </div>
              <h3 className="text-2xl font-bold">{selected.customer.fullName}</h3>
              <p className="text-sm text-muted-foreground mt-1">{formatDateHe(selected.startAt)}</p>
            </div>

            <div className="p-6 space-y-3">
              <DetailRow icon={Scissors} label="שירות" value={selected.service.name} />
              <DetailRow icon={UserIcon} label="ספר" value={selected.employee.user.fullName} />
              <DetailRow icon={Clock} label="משך" value={`${selected.service.durationMin} דק' · ${formatTime(selected.startAt)}-${formatTime(selected.endAt)}`} />
              <DetailRow icon={Phone} label="טלפון" value={selected.customer.phone} link={`tel:${selected.customer.phone}`} />
              <div className="flex items-center justify-between py-2 border-t mt-3">
                <span className="text-muted-foreground text-sm">מחיר</span>
                <span className="text-xl font-bold text-primary">{formatAgorot(selected.priceAgorot)}</span>
              </div>
              {selected.notes && <div className="text-sm bg-secondary/50 rounded-lg p-3 mt-2">📝 {selected.notes}</div>}
            </div>

            <div className="p-4 border-t bg-secondary/30 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => whatsappMutation.mutate({ id: selected.id, kind: 'confirm' })}>
                <MessageCircle className="w-4 h-4 ms-1" /> WhatsApp
              </Button>
              {selected.status !== 'CONFIRMED' && selected.status !== 'COMPLETED' ? (
                <Button variant="gold" onClick={() => updateMutation.mutate({ id: selected.id, status: 'CONFIRMED' })}>
                  <CheckCircle2 className="w-4 h-4 ms-1" /> אשר
                </Button>
              ) : (
                <Button variant="default" onClick={() => updateMutation.mutate({ id: selected.id, status: 'COMPLETED' })}>
                  סמן הושלם
                </Button>
              )}
              {selected.status !== 'CANCELLED' && (
                <Button variant="destructive" className="col-span-2" onClick={() => confirm('לבטל את התור?') && cancelMutation.mutate(selected.id)}>
                  <X className="w-4 h-4 ms-1" /> בטל תור
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function DetailRow({ icon: Icon, label, value, link }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; link?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {link ? (
          <a href={link} className="font-medium hover:text-primary">{value}</a>
        ) : (
          <div className="font-medium truncate">{value}</div>
        )}
      </div>
    </div>
  );
}
