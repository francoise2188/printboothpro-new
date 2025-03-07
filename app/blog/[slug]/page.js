'use client';

import { useState, useEffect } from 'react';
import { getBlogPost } from '../../../lib/contentful';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import Link from 'next/link';
import styles from './post.module.css';
import { use } from 'react';

export default function BlogPostPage({ params }) {
  // Unwrap the params using React.use()
  const resolvedParams = use(params);
  const { slug } = resolvedParams;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadPost() {
      try {
        console.log('Fetching blog post with slug:', slug);
        const fetchedPost = await getBlogPost(slug);
        console.log('Fetched post:', fetchedPost);
        
        // Only update state if component is still mounted
        if (mounted) {
          setPost(fetchedPost);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading blog post:', err);
        if (mounted) {
          setError(err.message || 'Failed to load blog post');
          setLoading(false);
        }
      }
    }

    loadPost();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [slug]); // Add slug as dependency

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <p>Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error || 'Blog post not found'}</p>
          <Link href="/blog" className={styles.backLink}>
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/blog" className={styles.backLink}>
        ← Back to Blog
      </Link>
      
      {post.fields.featuredImage && (
        <div className={styles.imageWrapper}>
          <img
            src={post.fields.featuredImage.fields.file.url}
            alt={post.fields.title}
            className={styles.image}
          />
        </div>
      )}

      <h1 className={styles.title}>{post.fields.title}</h1>
      
      <div className={styles.metadata}>
        <time dateTime={post.sys.createdAt}>
          {new Date(post.sys.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </time>
      </div>

      <div className={styles.content}>
        {post.fields.content && documentToReactComponents(post.fields.content)}
      </div>
    </div>
  );
} 