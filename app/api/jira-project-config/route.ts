import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

async function getAuthSession() {
  const { getServerSession } = await import('next-auth/next');
  const { authOptions } = await import('../auth/[...nextauth]/auth.config');
  return getServerSession(authOptions);
}

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Jira credentials
    const jiraCredentials = await prisma.jiraCredential.findUnique({
      where: {
        userId: session.user.id,
      },
      include: {
        projectConfig: true,
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

    // If we have cached config and it's less than 24 hours old, return it
    if (jiraCredentials.projectConfig) {
      const configAge =
        Date.now() - jiraCredentials.projectConfig.updatedAt.getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (configAge < oneDay) {
        return NextResponse.json({
          projectKey: jiraCredentials.projectConfig.projectKey,
          projectName: jiraCredentials.projectConfig.projectName,
          issueTypes: jiraCredentials.projectConfig.issueTypes,
          cached: true,
        });
      }
    }

    // Fetch fresh project configuration from Jira
    const response = await fetch(
      `https://${jiraCredentials.domain}/rest/api/2/issue/createmeta?projectKeys=${jiraCredentials.projectKey}&expand=projects.issuetypes.fields`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${jiraCredentials.email}:${jiraCredentials.apiToken}`
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

    // Extract available issue types
    const project = data.projects[0];
    const issueTypes = project.issuetypes.map((type: any) => ({
      id: type.id,
      name: type.name,
      description: type.description,
      subtask: type.subtask,
    }));

    // Store or update the configuration in the database
    await prisma.jiraProjectConfig.upsert({
      where: {
        jiraCredentialId: jiraCredentials.id,
      },
      update: {
        projectKey: project.key,
        projectName: project.name,
        issueTypes: issueTypes,
      },
      create: {
        projectKey: project.key,
        projectName: project.name,
        issueTypes: issueTypes,
        jiraCredentialId: jiraCredentials.id,
      },
    });

    return NextResponse.json({
      projectKey: project.key,
      projectName: project.name,
      issueTypes,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching Jira project configuration:', error);
    return NextResponse.json(
      { message: 'Failed to fetch Jira project configuration' },
      { status: 500 }
    );
  }
}
