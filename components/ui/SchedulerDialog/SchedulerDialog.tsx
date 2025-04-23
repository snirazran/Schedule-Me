// components/SchedulerDialog.tsx
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

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

interface Task extends ScheduledTask {}

interface Props {
  onSave: (schedule: ScheduledTask[]) => void;
}

export function SchedulerDialog({ onSave }: Props) {
  const [goalInput, setGoalInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);

  const addGoal = () => {
    const name = goalInput.trim();
    if (!name) return;
    setTasks((t) => [
      ...t,
      {
        name,
        timesPerWeek: 1,
        duration: 30,
        fixed: false,
        days: [],
        startTime: '08:00',
        endTime: '08:30',
        preference: 'Morning',
        notes: '',
      },
    ]);
    setGoalInput('');
  };

  const removeGoal = (idx: number) =>
    setTasks((t) => t.filter((_, i) => i !== idx));

  const updateTask = <K extends keyof Task>(
    idx: number,
    field: K,
    value: Task[K]
  ) =>
    setTasks((ts) => {
      const copy = [...ts];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });

  const hasFixed = tasks.some((t) => t.fixed);

  const buildAiPrompt = () => {
    let prompt = `I want you to schedule my week for me.\nHere are my tasks:\n`;
    tasks.forEach((t, i) => {
      prompt += `\n${i + 1}. ${t.name}\n`;
      prompt += `   - Times per week: ${t.timesPerWeek}\n`;
      prompt += `   - Duration per session: ${t.duration} minutes\n`;
      if (t.fixed) {
        prompt += `   - Fixed: Yes\n`;
        prompt += `     • Days: ${t.days.join(', ')}\n`;
        prompt += `     • Time window: ${t.startTime} to ${t.endTime}\n`;
      } else {
        prompt += `   - Fixed: No\n`;
        prompt += `     • Preference: ${t.preference}\n`;
      }
      if (t.notes.trim()) {
        prompt += `   - Notes: ${t.notes.trim()}\n`;
      }
    });

    prompt += `\nPlease place fixed tasks exactly in their windows, and for the rest use my time preferences.\n`;
    prompt += `\nIMPORTANT: “timesPerWeek” = number of occurrences per week. Schedule exactly that many distinct sessions on different days.\n`;
    prompt += `\nRespond with only valid JSON matching **exactly** this schema (no extra fields):\n\n`;
    prompt += '```json\n';
    prompt += `{
`;
    prompt += `  "schedule": [
`;
    prompt += `    {
`;
    prompt += `      "name": "string",
`;
    prompt += `      "timesPerWeek": number,
`;
    prompt += `      "duration": number,
`;
    prompt += `      "fixed": boolean,
`;
    prompt += `      "days": ["Mon","Tue",...],
`;
    prompt += `      "startTime": "HH:MM",
`;
    prompt += `      "endTime": "HH:MM",
`;
    prompt += `      "preference": "string",
`;
    prompt += `      "notes": "string"
`;
    prompt += `    }
`;
    prompt += `  ]
`;
    prompt += `}
`;
    prompt += '```\n';

    return prompt;
  };

  const handleSave = async () => {
    const aiPrompt = buildAiPrompt();
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: aiPrompt }),
    });
    const payload = await res.json();
    console.log('AI response:', payload);
    if (payload.schedule) onSave(payload.schedule);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg">Schedule My Week</Button>
      </DialogTrigger>
      <DialogContent className="min-w-[60%] max-w-7xl w-full">
        <DialogHeader>
          <DialogTitle>
            Write out what you want to achieve this week
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Add a goal and press Enter"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && (e.preventDefault(), addGoal())
            }
            className="flex-1"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {tasks.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full"
            >
              {t.name}
              <button
                onClick={() => removeGoal(i)}
                className="ml-2 text-indigo-600 hover:text-indigo-900"
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        {tasks.length > 0 && (
          <div className="overflow-auto mt-6">
            <table className="w-full min-w-[800px] table-auto border-collapse">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="p-2 border text-left w-[300px]">Task name</th>
                  <th className="p-2 border text-center w-[150px]">Per week</th>
                  <th className="p-2 border text-center w-[20px]">Duration</th>
                  <th className="p-2 border text-center w-[10px]">Fixed?</th>
                  <th className="p-2 border text-center w-[120px]">
                    Days / Preference
                  </th>
                  {hasFixed && (
                    <th className="p-2 border text-center w-[60px]">
                      Start–End
                    </th>
                  )}
                  <th className="p-2 border text-center w-[120px]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, i) => (
                  <tr key={i} className="hover:bg-indigo-25">
                    <td className="p-2 border">
                      <Input
                        value={task.name}
                        onChange={(e) => updateTask(i, 'name', e.target.value)}
                        className="w-full"
                      />
                    </td>
                    <td className="p-2 border text-center">
                      <Input
                        type="number"
                        min={1}
                        value={task.timesPerWeek}
                        onChange={(e) =>
                          updateTask(
                            i,
                            'timesPerWeek',
                            Number(e.target.value) || 1
                          )
                        }
                        className="mx-auto w-16"
                      />
                    </td>
                    <td className="p-2 border text-center">
                      <Select
                        value={String(task.duration)}
                        onValueChange={(v) =>
                          updateTask(i, 'duration', parseInt(v, 10))
                        }
                      >
                        <SelectTrigger className="mx-auto w-24">
                          <SelectValue placeholder="30m" />
                        </SelectTrigger>
                        <SelectContent>
                          {[15, 30, 45, 60, 90, 120].map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {m}m
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 border text-center">
                      <Checkbox
                        checked={task.fixed}
                        onCheckedChange={(c) => updateTask(i, 'fixed', !!c)}
                      />
                    </td>
                    <td className="p-2 border text-center">
                      {task.fixed ? (
                        <div className="flex flex-wrap justify-center gap-1">
                          {[
                            'Mon',
                            'Tue',
                            'Wed',
                            'Thu',
                            'Fri',
                            'Sat',
                            'Sun',
                          ].map((d) => (
                            <label
                              key={d}
                              className="flex items-center space-x-1"
                            >
                              <Checkbox
                                checked={task.days.includes(d)}
                                onCheckedChange={(c) => {
                                  const days = c
                                    ? [...task.days, d]
                                    : task.days.filter((x) => x !== d);
                                  updateTask(i, 'days', days as any);
                                }}
                              />
                              <span className="text-sm">{d}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <Select
                          value={task.preference!}
                          onValueChange={(v) => updateTask(i, 'preference', v)}
                        >
                          <SelectTrigger className="mx-auto w-28">
                            <SelectValue placeholder="Morning" />
                          </SelectTrigger>
                          <SelectContent>
                            {['Morning', 'Noon', 'Afternoon', 'Evening'].map(
                              (p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    {hasFixed && (
                      <td className="p-2 border text-center">
                        {task.fixed ? (
                          <div className="flex justify-center space-x-1">
                            <Input
                              type="time"
                              min="08:00"
                              max="23:00"
                              value={task.startTime}
                              onChange={(e) =>
                                updateTask(i, 'startTime', e.target.value)
                              }
                              className="w-20"
                            />
                            <span>–</span>
                            <Input
                              type="time"
                              min="08:00"
                              max="23:00"
                              value={task.endTime}
                              onChange={(e) =>
                                updateTask(i, 'endTime', e.target.value)
                              }
                              className="w-20"
                            />
                          </div>
                        ) : (
                          <span className="italic text-sm">n/a</span>
                        )}
                      </td>
                    )}
                    <td className="p-2 border text-center">
                      <Input
                        placeholder="—"
                        value={task.notes}
                        onChange={(e) => updateTask(i, 'notes', e.target.value)}
                        className="w-full"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="mt-4 space-x-2">
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
