import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

const apiKeySchema = z.object({
  key: z.string().min(1),
  model: z.string().min(1),
});

async function getAuthSession() {
  const { getServerSession } = await import('next-auth/next');
  const { authOptions } = await import('../auth/[...nextauth]/auth.config');
  return getServerSession(authOptions);
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { key, model } = apiKeySchema.parse(body);

    const apiKey = await prisma.aPIKey.create({
      data: {
        key,
        model,
        userId: session.user.id,
      },
    });

    // Don't return the actual API key in the response
    return NextResponse.json(
      {
        apiKey: {
          id: apiKey.id,
          model: apiKey.model,
        },
        message: 'API key saved successfully',
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

    console.error('API key creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
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

    const apiKeys = await prisma.aPIKey.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        model: true,
      },
    });

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('API key fetch error:', error);
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

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'API key ID is required' },
        { status: 400 }
      );
    }

    const apiKey = await prisma.aPIKey.findUnique({
      where: { id },
    });

    if (!apiKey || apiKey.userId !== session.user.id) {
      return NextResponse.json(
        { message: 'API key not found' },
        { status: 404 }
      );
    }

    await prisma.aPIKey.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'API key deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('API key deletion error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
