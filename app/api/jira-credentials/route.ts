import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

const jiraCredentialsSchema = z.object({
  domain: z.string().min(1),
  email: z.string().email(),
  apiToken: z.string().min(1),
  projectKey: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { domain, email, apiToken, projectKey } =
      jiraCredentialsSchema.parse(body);

    // Upsert Jira credentials (create or update)
    const credentials = await prisma.jiraCredential.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        domain,
        email,
        apiToken,
        projectKey,
      },
      create: {
        domain,
        email,
        apiToken,
        projectKey,
        userId: session.user.id,
      },
    });

    // Don't return the API token in the response
    const { apiToken: _, ...credentialsWithoutToken } = credentials;

    return NextResponse.json(
      {
        credentials: credentialsWithoutToken,
        message: 'Jira credentials saved successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Jira credentials creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const credentials = await prisma.jiraCredential.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        domain: true,
        email: true,
        projectKey: true,
      },
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Jira credentials fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await prisma.jiraCredential.delete({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { message: 'Jira credentials deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Jira credentials deletion error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
