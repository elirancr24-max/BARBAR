'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket';

export function useRealtimeAppointments() {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const onCreated = (p: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('🆕 תור חדש נוסף', { id: `apt-${p.id}` });
    };
    const onUpdated = () => qc.invalidateQueries({ queryKey: ['appointments'] });
    const onDeleted = (p: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.message('תור בוטל', { id: `apt-del-${p.id}` });
    };
    const onStatus = () => qc.invalidateQueries({ queryKey: ['appointments'] });
    const onSlotLocked = () => qc.invalidateQueries({ queryKey: ['availability'] });
    const onSlotUnlocked = () => qc.invalidateQueries({ queryKey: ['availability'] });

    socket.on('appointment.created', onCreated);
    socket.on('appointment.updated', onUpdated);
    socket.on('appointment.deleted', onDeleted);
    socket.on('appointment.status_changed', onStatus);
    socket.on('slot.locked', onSlotLocked);
    socket.on('slot.unlocked', onSlotUnlocked);

    return () => {
      socket.off('appointment.created', onCreated);
      socket.off('appointment.updated', onUpdated);
      socket.off('appointment.deleted', onDeleted);
      socket.off('appointment.status_changed', onStatus);
      socket.off('slot.locked', onSlotLocked);
      socket.off('slot.unlocked', onSlotUnlocked);
    };
  }, [qc]);
}
