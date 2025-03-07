import { createClient } from 'contentful';

const client = createClient({
  space: process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID,
  accessToken: process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN,
});

export async function getBlogPosts() {
  try {
    console.log('Fetching blog posts from Contentful...');
    const response = await client.getEntries({
      content_type: 'blogPost',
    });

    console.log('Contentful Response:', {
      total: response.total,
      itemCount: response.items.length,
      firstItem: response.items[0] ? {
        fields: response.items[0].fields,
        contentTypeId: response.items[0].sys.contentType.sys.id
      } : null
    });

    return response.items;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw error;
  }
}

export async function getBlogPost(slug) {
  try {
    const response = await client.getEntries({
      content_type: 'blogPost',
      'fields.slug': slug,
      limit: 1,
    });

    return response.items[0];
  } catch (error) {
    console.error('Error fetching single blog post:', error);
    throw error;
  }
} 