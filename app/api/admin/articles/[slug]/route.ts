//E:\trifuzja-mix\app\api\admin\articles\[slug]\route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = params.slug;
  if (!slug) {
    return NextResponse.json({ error: 'Slug missing' }, { status: 400 });
  }

  try {
    const db = (await clientPromise).db();
    const article = await db.collection('articles').findOne({ slug });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = params.slug;
  if (!slug) {
    return NextResponse.json({ error: 'Slug missing' }, { status: 400 });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!data.title || !data.content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const db = (await clientPromise).db();
    const articles = db.collection('articles');

    const updateResult = await articles.updateOne(
      { slug },
      {
        $set: {
          title: data.title,
          excerpt: data.excerpt,
          content: data.content,
          page: data.page,
          categoryId: data.categoryId,
          coverUrl: data.coverUrl,
          videoUrl: data.videoUrl,
          status: data.status,
          readingTime: data.readingTime,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Article updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = params.slug;
  if (!slug) {
    return NextResponse.json({ error: 'Slug missing' }, { status: 400 });
  }

  try {
    const db = (await clientPromise).db();
    const articles = db.collection('articles');

    const deleteResult = await articles.deleteOne({ slug });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Article deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete article:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
