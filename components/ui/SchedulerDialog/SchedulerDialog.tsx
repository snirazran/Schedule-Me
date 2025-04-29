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
    let prompt = `I want you to schedule my week for me.
  Here are my tasks:\n`;

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
    prompt += `\nIMPORTANT: do not schedule any task on top of each other.\n`;
    prompt += `\nIMPORTANT: treat Sunday as the first day of the week.\n`;
    prompt += `\nIMPORTANT: only schedule between the hours 08:00 and 22:00.\n`;

    // Define exact bounds for preferences
    prompt += `\n**Preference windows (exact bounds):**\n`;
    prompt += `- Morning  = 08:00–11:00\n`;
    prompt += `- Noon     = 11:00–15:00\n`;
    prompt += `- Afternoon= 15:00–18:00\n`;
    prompt += `- Evening  = 18:00–22:00\n`;

    // Placement algorithm description
    prompt += `\n**Placement algorithm for non-fixed tasks:**\n`;
    prompt += `1. For each session, look only within its preference window.\n`;
    prompt += `2. Place it at the earliest available slot (start = window start or immediately after the previous booked session that day).\n`;
    prompt += `3. If that slot is already taken, shift forward by the session’s duration until you find a free slot in the same window.\n`;
    prompt += `4. If you run out of room in that window for that day, allow the session to spill into the next preference window on the same day (e.g., Morning → Noon, Noon → Afternoon, Afternoon → Evening), before moving to the next day.\n`;
    prompt += `5. If all windows on that day are full, move the session to the next valid day in week order.\n`;

    // Validation step
    prompt += `\n**Validation step (must do before returning):**\n`;
    prompt += `- Scan every pair of sessions on the same day; if any overlap, shift the later one forward until it no longer overlaps, possibly into the next preference window if needed.\n`;
    prompt += `- Confirm that every session’s endTime ≤ 22:00 and startTime ≥ 08:00.\n`;

    // Task naming clarification
    prompt += `\n**Task naming and parsing:**\n`;
    prompt += `- Each task line starts with an index (e.g. \"1.\") followed by the task name. `;
    prompt += `Do not include the index or period in the \"name\" field—use only the text after the dot and space, exactly as given.\n`;
    prompt += `- The \"name\" field may contain letters, numbers, or symbols (e.g. \"42\", \"Task #1\"); preserve it verbatim.\n`;

    // Enforce exact field names
    prompt += `\n**Field names must match exactly** (no synonyms):\n`;
    prompt += `- \"name\", \"timesPerWeek\", \"duration\", \"fixed\", \"days\", \"startTime\", \"endTime\", \"preference\", \"notes\"\n`;

    prompt += `\nRespond with **only** valid JSON matching this schema (no extra fields):\n\n`;
    prompt += '```json\n';
    prompt += `{
  `;
    prompt += `  "schedule": [\n`;
    prompt += `    {\n`;
    prompt += `      "name": "string",\n`;
    prompt += `      "timesPerWeek": number,\n`;
    prompt += `      "duration": number,\n`;
    prompt += `      "fixed": boolean,\n`;
    prompt += `      "days": ["Mon","Tue",...],\n`;
    prompt += `      "startTime": "HH:MM",\n`;
    prompt += `      "endTime": "HH:MM",\n`;
    prompt += `      "preference": "string",\n`;
    prompt += `      "notes": "string"\n`;
    prompt += `    }\n`;
    prompt += `  ]\n`;
    prompt += `}\n`;
    prompt += '```\n';

    return prompt;
  };

  const handleSave = async () => {
    const aiPrompt = buildAiPrompt();
    console.log('AI prompt:', aiPrompt);
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
      <DialogContent className="min-w-[70%] max-w-7xl w-full">
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
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="p-2 border text-left w-[100px]">Task name</th>
                  <th className="p-2 border text-center w-[40px]">Fixed?</th>
                  {!hasFixed && (
                    <th className="p-2 border text-center w-[120px]">
                      Per week
                    </th>
                  )}
                  {!hasFixed && (
                    <th className="p-2 border text-center w-[80px]">
                      Duration
                    </th>
                  )}
                  <th className="p-2 border text-center w-[200px]">
                    Days / Preference
                  </th>
                  {hasFixed && (
                    <th className="p-2 border text-center w-[160px]">
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
                      <Checkbox
                        checked={task.fixed}
                        onCheckedChange={(c) => updateTask(i, 'fixed', !!c)}
                      />
                    </td>
                    {!hasFixed && (
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
                    )}

                    {!task.fixed && (
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
                    )}

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
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-40 mt-20 bg-[#ff006e] cursor-pointer hover:bg-[#9e0059]"
        >
          Schedule My Week
        </Button>
      </DialogTrigger>
    </Dialog>
  );
}
