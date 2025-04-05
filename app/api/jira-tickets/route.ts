import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '../auth/[...nextauth]/auth.config';
import { prisma } from '../../../lib/prisma';

// Jira priority ID mapping
const PRIORITY_MAP = {
  low: '4', // Low
  medium: '3', // Medium
  high: '2', // High
};

const ticketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['task', 'story', 'bug']),
  priority: z.enum(['low', 'medium', 'high']),
  estimatedPoints: z.number().optional(),
});

const createTicketsSchema = z.object({
  tickets: z.array(ticketSchema),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Jira credentials
    const jiraCredentials = await prisma.jiraCredential.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!jiraCredentials) {
      return NextResponse.json(
        {
          message:
            'Jira credentials not found. Please set up your Jira credentials first.',
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { tickets } = createTicketsSchema.parse(body);

    console.log('Creating tickets with credentials:', {
      domain: jiraCredentials.domain,
      email: jiraCredentials.email,
      projectKey: jiraCredentials.projectKey,
    });

    // Create tickets in Jira
    const createdTickets = await Promise.all(
      tickets.map(async (ticket) => {
        try {
          const jiraPayload = {
            fields: {
              project: {
                key: jiraCredentials.projectKey,
              },
              summary: ticket.title,
              description: ticket.description,
              issuetype: {
                name:
                  ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1),
              },
              ...(ticket.estimatedPoints && {
                customfield_10016: ticket.estimatedPoints,
              }),
            },
          };

          console.log('Creating Jira ticket with payload:', jiraPayload);

          const response = await fetch(
            `https://${jiraCredentials.domain}/rest/api/2/issue`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${Buffer.from(
                  `${jiraCredentials.email}:${jiraCredentials.apiToken}`
                ).toString('base64')}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(jiraPayload),
            }
          );

          const responseText = await response.text();
          console.log('Jira API response:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
          });

          if (!response.ok) {
            let errorMessage = 'Failed to create Jira ticket';
            try {
              const errorJson = JSON.parse(responseText);
              errorMessage =
                errorJson.errorMessages?.[0] ||
                errorJson.errors?.[Object.keys(errorJson.errors)[0]] ||
                errorJson.message ||
                errorMessage;
            } catch (e) {
              console.error('Failed to parse error response:', e);
            }
            throw new Error(errorMessage);
          }

          const result = JSON.parse(responseText);
          return {
            id: result.id,
            key: result.key,
            title: ticket.title,
            status: 'created',
            priority: ticket.priority,
          };
        } catch (error) {
          console.error('Error creating Jira ticket:', {
            error,
            ticket,
            domain: jiraCredentials.domain,
            projectKey: jiraCredentials.projectKey,
          });
          return {
            title: ticket.title,
            status: 'failed',
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create ticket',
          };
        }
      })
    );

    const failedTickets = createdTickets.filter(
      (ticket) => ticket.status === 'failed'
    );

    if (failedTickets.length > 0) {
      return NextResponse.json(
        {
          message: 'Some tickets failed to create',
          results: createdTickets,
        },
        { status: 207 } // 207 Multi-Status
      );
    }

    return NextResponse.json({
      message: 'All tickets created successfully',
      results: createdTickets,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating Jira tickets:', error);
    return NextResponse.json(
      { message: 'Failed to create Jira tickets' },
      { status: 500 }
    );
  }
}
