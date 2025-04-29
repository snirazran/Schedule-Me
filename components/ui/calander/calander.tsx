'use client';

import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import withDragAndDrop, {
  EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop';
import {
  format as formatDate,
  parse,
  startOfWeek,
  getDay,
  addDays,
  set,
} from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarOverrides.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format: (d, f) => formatDate(d, f, { locale: locales['en-US'] }),
  parse,
  startOfWeek,
  getDay,
  locales,
});
const DnDCalendar = withDragAndDrop<CalendarEventType>(Calendar);
const anchorDate = new Date(1970, 1, 1);
const minTime = set(anchorDate, { hours: 8, minutes: 0 });
const maxTime = set(anchorDate, { hours: 22, minutes: 0 });
const scrollToTime = set(anchorDate, { hours: 8, minutes: 0 });

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
  bgColor: string;
  textColor: string;
}

const TASK_COLOR_PAIRS: { background: string; text: string }[] = [
  { background: '#FFECB3', text: '#FF6F00' },
  { background: '#B3E5FC', text: '#0277BD' },
  { background: '#C8E6C9', text: '#2E7D32' },
  { background: '#F8BBD0', text: '#C2185B' },
];

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
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    let nextId = 1;
    const evts: CalendarEventType[] = [];

    // build flat event list
    schedule.forEach((task) => {
      task.days.forEach((day) => {
        const dayIndex = [
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
          'Sun',
        ].indexOf(day);
        const baseDate = addDays(weekStart, dayIndex);
        const [sh, sm] = task.startTime.split(':').map(Number);
        const [eh, em] = task.endTime.split(':').map(Number);
        evts.push({
          id: nextId++,
          title: task.name,
          start: set(baseDate, { hours: sh, minutes: sm }),
          end: set(baseDate, { hours: eh, minutes: em }),
          bgColor: '',
          textColor: '',
        });
      });
    });

    // group by date
    const byDate: Record<string, CalendarEventType[]> = {};
    evts.forEach((e) => {
      const key = formatDate(e.start, 'yyyy-MM-dd');
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(e);
    });

    // assign colors per day, avoiding duplicates in a row
    Object.values(byDate).forEach((dayEvents) => {
      dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
      dayEvents.forEach((evt, idx) => {
        let pair;
        if (idx === 0) {
          // first event: pick any color
          pair =
            TASK_COLOR_PAIRS[
              Math.floor(Math.random() * TASK_COLOR_PAIRS.length)
            ];
        } else {
          const prev = dayEvents[idx - 1];
          // FILTER OUT the exact previous pair
          const choices = TASK_COLOR_PAIRS.filter(
            (c) => c.background !== prev.bgColor || c.text !== prev.textColor // ← use prev.textColor here
          );
          pair = choices[Math.floor(Math.random() * choices.length)];
        }
        evt.bgColor = pair.background;
        evt.textColor = pair.text;
      });
    });

    setEvents(evts);
  }, [schedule]);

  const moveEvent = (args: EventInteractionArgs<CalendarEventType>) => {
    const { event, start, end } = args;
    setEvents((all) =>
      all.map((e) =>
        e.id === event.id
          ? { ...e, start: new Date(start), end: new Date(end) }
          : e
      )
    );
  };

  const resizeEvent = (args: EventInteractionArgs<CalendarEventType>) => {
    const { event, start, end } = args;
    setEvents((all) =>
      all.map((e) =>
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
        min={minTime}
        max={maxTime}
        scrollToTime={scrollToTime}
        views={['week']}
        defaultView="week"
        toolbar={false}
        startAccessor="start"
        endAccessor="end"
        components={{ week: { header: DayHeader } }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.bgColor,
            color: event.textColor,
            border: 'none',
            padding: '4px',
            borderRadius: '4px',
            fontWeight: 500,
          },
        })}
        style={{ height: '100%' }}
      />
    </div>
  );
}
