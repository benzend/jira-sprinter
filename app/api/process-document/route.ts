import { NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { prisma } from '../../../lib/prisma';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const documentSchema = z.object({
  content: z.string().min(1),
});

async function getAuthSession() {
  const { getServerSession } = await import('next-auth/next');
  const { authOptions } = await import('../auth/[...nextauth]/auth.config');
  return getServerSession(authOptions);
}

// Define the structure for a Jira ticket
interface JiraTicket {
  title: string;
  description: string;
  type: 'task' | 'story' | 'bug';
  priority: 'low' | 'medium' | 'high';
  estimatedPoints?: number;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant that analyzes documents and creates structured Jira tickets. 
For the given document:
1. Identify distinct tasks, features, or issues that should be tracked
2. Create Jira tickets for each item with:
   - A clear, concise title
   - A detailed description
   - Appropriate type (task, story, or bug)
   - Priority level (low, medium, high)
   - Story point estimate (optional)
3. Focus on actionable items and ensure each ticket is independent
4. Include acceptance criteria in the description where applicable

Return a JSON object with this exact structure:
{
  "tickets": [
    {
      "title": "string",
      "description": "string",
      "type": "task" | "story" | "bug",
      "priority": "low" | "medium" | "high",
      "estimatedPoints": number (optional)
    }
  ]
}`;

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { content } = documentSchema.parse(body);

    // Get the user's API key
    const apiKey = await prisma.aPIKey.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { message: 'No API key found. Please add an API key first.' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: apiKey.key });

    // Generate tickets using OpenAI
    const completion = await openai.chat.completions.create({
      model: apiKey.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('Failed to generate tickets');
    }

    const tickets = JSON.parse(response);

    // Store the generated tickets in the session or return them for review
    return NextResponse.json({
      tickets: tickets.tickets,
      message:
        'Tickets generated successfully. Please review before creating in Jira.',
    });
  } catch (error) {
    console.error('Document processing error:', error);
    return NextResponse.json(
      { message: 'Failed to process document' },
      { status: 500 }
    );
  }
}
