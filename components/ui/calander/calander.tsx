// components/ui/calendar/CalendarComponent.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import withDragAndDrop, {
  EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addDays, set } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarOverrides.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});
const DnDCalendar = withDragAndDrop<CalendarEventType>(Calendar);

export interface ScheduledTask {
  name: string;
  timesPerWeek: number;
  duration: number;
  fixed: boolean;
  days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
  startTime: string;
  endTime: string;
  preference: string | null;
  notes: string;
}

export interface CalendarEventType extends Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
}

function DayHeader({ date }: { date: Date }) {
  return (
    <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
        {localizer.format(date, 'EEEE')}
      </div>
      <div style={{ fontSize: '0.8rem' }}>{localizer.format(date, 'd')}</div>
    </div>
  );
}

export default function CalendarComponent({
  schedule,
}: {
  schedule: ScheduledTask[];
}) {
  const [events, setEvents] = useState<CalendarEventType[]>([]);

  useEffect(() => {
    // Always build events (may be an empty array)
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    let id = 1;
    const evts: CalendarEventType[] = [];

    schedule.forEach((task) => {
      task.days.forEach((d) => {
        const dayIndex = [
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
          'Sun',
        ].indexOf(d);
        const date = addDays(weekStart, dayIndex);
        const [sh, sm] = task.startTime.split(':').map(Number);
        const [eh, em] = task.endTime.split(':').map(Number);
        evts.push({
          id: id++,
          title: task.name,
          start: set(date, { hours: sh, minutes: sm }),
          end: set(date, { hours: eh, minutes: em }),
        });
      });
    });

    setEvents(evts);
  }, [schedule]);

  const moveEvent = (args: EventInteractionArgs<CalendarEventType>) => {
    const { event, start, end } = args;
    setEvents((evts) =>
      evts.map((e) =>
        e.id === event.id
          ? { ...e, start: new Date(start), end: new Date(end) }
          : e
      )
    );
  };

  const resizeEvent = (args: EventInteractionArgs<CalendarEventType>) => {
    const { event, start, end } = args;
    setEvents((evts) =>
      evts.map((e) =>
        e.id === event.id
          ? { ...e, start: new Date(start), end: new Date(end) }
          : e
      )
    );
  };

  return (
    <div className="myCalendar" style={{ height: '800px', width: '100%' }}>
      <DnDCalendar
        localizer={localizer}
        events={events}
        onEventDrop={moveEvent}
        onEventResize={resizeEvent}
        resizable
        step={15}
        timeslots={4}
        min={new Date(1970, 1, 1, 8, 0)}
        views={['week']}
        defaultView="week"
        toolbar={false}
        startAccessor="start"
        endAccessor="end"
        components={{ week: { header: DayHeader } }}
        style={{ height: '100%' }}
      />
    </div>
  );
}
