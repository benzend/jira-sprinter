import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

const jiraCredentialsSchema = z.object({
  domain: z.string().min(1),
  email: z.string().email(),
  apiToken: z.string().min(1),
  projectKey: z.string().min(1),
});

async function getAuthSession() {
  const { getServerSession } = await import('next-auth/next');
  const { authOptions } = await import('../auth/[...nextauth]/auth.config');
  return getServerSession(authOptions);
}

async function fetchJiraProjectConfig(credentials: {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
}) {
  const response = await fetch(
    `https://${credentials.domain}/rest/api/2/issue/createmeta?projectKeys=${credentials.projectKey}&expand=projects.issuetypes.fields`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${credentials.email}:${credentials.apiToken}`
        ).toString('base64')}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Jira API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error('Failed to fetch Jira project configuration');
  }

  const data = await response.json();
  const project = data.projects[0];
  return {
    projectKey: project.key,
    projectName: project.name,
    issueTypes: project.issuetypes.map((type: any) => ({
      id: type.id,
      name: type.name,
      description: type.description,
      subtask: type.subtask,
    })),
  };
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { domain, email, apiToken, projectKey } =
      jiraCredentialsSchema.parse(body);

    // First, verify the credentials by fetching project config
    const projectConfig = await fetchJiraProjectConfig({
      domain,
      email,
      apiToken,
      projectKey,
    });

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

    // Store the project configuration
    await prisma.jiraProjectConfig.upsert({
      where: {
        jiraCredentialId: credentials.id,
      },
      update: {
        projectKey: projectConfig.projectKey,
        projectName: projectConfig.projectName,
        issueTypes: projectConfig.issueTypes,
      },
      create: {
        projectKey: projectConfig.projectKey,
        projectName: projectConfig.projectName,
        issueTypes: projectConfig.issueTypes,
        jiraCredentialId: credentials.id,
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
      {
        message:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();

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
    const session = await getAuthSession();

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
