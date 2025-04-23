// app/api/schedule/route.ts
'use server';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Zod schemas for runtime validation:
const ScheduledTask = z.object({
  name: z.string(),
  sessions: z.number(),
  duration: z.number(),
  fixed: z.boolean(),
  days: z.array(z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])),
  startTime: z.string().regex(/^\d\d:\d\d$/),
  endTime: z.string().regex(/^\d\d:\d\d$/),
  preference: z.string().nullable(),
  notes: z.string(),
});
const ReturnSchedule = z.object({
  schedule: z.array(ScheduledTask),
});

// JSON Schema for OpenAI function-calling:
const returnScheduleJsonSchema = {
  type: 'object',
  properties: {
    schedule: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          sessions: { type: 'number' },
          duration: { type: 'number' },
          fixed: { type: 'boolean' },
          days: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            },
          },
          startTime: { type: 'string', pattern: '^\\d\\d:\\d\\d$' },
          endTime: { type: 'string', pattern: '^\\d\\d:\\d\\d$' },
          preference: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
          },
          notes: { type: 'string' },
        },
        required: [
          'name',
          'sessions',
          'duration',
          'fixed',
          'days',
          'startTime',
          'endTime',
          'preference',
          'notes',
        ],
      },
    },
  },
  required: ['schedule'],
};

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as { prompt: string };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      functions: [
        {
          name: 'return_schedule',
          description: 'Return the week schedule as JSON',
          parameters: returnScheduleJsonSchema,
        },
      ],
      function_call: { name: 'return_schedule' },
      temperature: 0.2,
    });

    // pull out the JSON string
    const raw = (completion.choices[0].message as any).function_call?.arguments;
    const args = raw ? JSON.parse(raw) : {};

    // runtime-validate
    const parsed = ReturnSchedule.parse(args);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Scheduling API error:', err);
    // Always return valid JSON to the client
    return NextResponse.json({ schedule: [] }, { status: 200 });
  }
}
