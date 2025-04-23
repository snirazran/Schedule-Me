'use client';
import React, { useState } from 'react';
import CalendarComponent, {
  ScheduledTask,
} from '@/components/ui/calander/calander';
import { SchedulerDialog } from '@/components/ui/SchedulerDialog/SchedulerDialog';

export default function Home() {
  const [schedule, setSchedule] = useState<ScheduledTask[]>([]);

  return (
    <div className="p-8 space-y-6">
      <SchedulerDialog onSave={setSchedule} />
      <CalendarComponent schedule={schedule} />
    </div>
  );
}
