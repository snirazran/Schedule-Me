'use client';
import React, { useState } from 'react';
import CalendarComponent, {
  ScheduledTask,
} from '@/components/ui/calander/calander';
import { SchedulerDialog } from '@/components/ui/SchedulerDialog/SchedulerDialog';
import Navbar from '@/components/ui/navbar/Navbar';

export default function Home() {
  const [schedule, setSchedule] = useState<ScheduledTask[]>([]);

  return (
    <>
      <Navbar />
      <div className="p-8 space-y-6 flex flex-col-reverse items-center">
        <SchedulerDialog onSave={setSchedule} />
        <CalendarComponent schedule={schedule} />
      </div>
    </>
  );
}
