'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBlogPosts } from '../../lib/contentful';
import styles from './blog.module.css';

export default function Page() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadPosts() {
      try {
        console.log('Fetching blog posts...');
        const fetchedPosts = await getBlogPosts();
        console.log('Fetched posts:', fetchedPosts);
        setPosts(fetchedPosts || []);
      } catch (err) {
        console.error('Error loading posts:', err);
        setError(err.message || 'Failed to load blog posts');
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, []);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingDot}></div>
          <div className={styles.loadingDot}></div>
          <div className={styles.loadingDot}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Insights & Updates</h1>
          <p className={styles.subtitle}>
            The PrintBooth Pro Blog
          </p>
        </header>

        <section className={styles.whySection}>
          <div className={styles.whyContent}>
            <div className={styles.grid}>
              {posts.map((post, index) => (
                <Link 
                  href={`/blog/${post.fields?.slug || '#'}`}
                  key={post.sys?.id || Math.random()}
                  className={styles.card}
                  style={{
                    '--animation-delay': `${index * 0.1}s`
                  }}
                >
                  {post.fields?.featuredImage && (
                    <div className={styles.imageWrapper}>
                      <img
                        src={post.fields.featuredImage.fields.file.url}
                        alt={post.fields.title}
                        className={styles.image}
                      />
                      <div className={styles.imageOverlay} />
                    </div>
                  )}
                  <div className={styles.content}>
                    <div className={styles.date}>
                      {post.sys?.createdAt ? new Date(post.sys.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      }) : ''}
                    </div>
                    <h2 className={styles.postTitle}>{post.fields?.title || 'Untitled'}</h2>
                    <p className={styles.excerpt}>{post.fields?.excerpt || ''}</p>
                    <span className={styles.readMore}>Read More →</span>
                  </div>
                </Link>
              ))}
            </div>
            
            {posts.length === 0 && !loading && !error && (
              <div className={styles.empty}>
                <p>No blog posts found</p>
                <p className={styles.emptySubtext}>Check back soon for new content!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
} 