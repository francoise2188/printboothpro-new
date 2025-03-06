'use client';

import Head from 'next/head';
import Link from 'next/link';
import styles from '../subscription/subscription.module.css';
import blogStyles from './blog.module.css';

export default function BlogPage() {
  const blogPosts = [
    {
      title: "Maximizing Your Event Photography Revenue",
      excerpt: "Learn how to increase your profits with photo magnets at events and markets.",
      date: "March 15, 2024",
      category: "Business Tips",
      readTime: "5 min read"
    },
    {
      title: "Top 5 Wedding Photo Booth Trends for 2024",
      excerpt: "Discover the latest trends in wedding photo booths and how to implement them.",
      date: "March 10, 2024",
      category: "Industry Trends",
      readTime: "4 min read"
    },
    {
      title: "Setting Up Your Photo Magnet Station",
      excerpt: "A complete guide to creating the perfect photo magnet printing setup.",
      date: "March 5, 2024",
      category: "Setup Guide",
      readTime: "7 min read"
    },
    {
      title: "Marketing Your Photo Magnet Services",
      excerpt: "Effective strategies to promote your photo magnet business to event planners.",
      date: "March 1, 2024",
      category: "Marketing",
      readTime: "6 min read"
    },
    {
      title: "Choosing the Right Equipment",
      excerpt: "Essential guide to selecting printers and supplies for photo magnets.",
      date: "February 25, 2024",
      category: "Equipment",
      readTime: "8 min read"
    },
    {
      title: "Customer Success Stories",
      excerpt: "Real stories from photographers using PrintBooth Pro at their events.",
      date: "February 20, 2024",
      category: "Success Stories",
      readTime: "5 min read"
    }
  ];

  return (
    <>
      <Head>
        <title>Blog - PrintBooth Pro</title>
        <meta name="description" content="Read the latest articles about photo booth business tips, industry trends, and success stories from PrintBooth Pro." />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>PrintBooth Pro Blog</h1>
            <p className={styles.subtitle}>
              Tips, trends, and insights for photo booth professionals
            </p>
          </header>

          <section className={styles.whySection}>
            <div className={styles.whyContent}>
              <div className={blogStyles.blogGrid}>
                {blogPosts.map((post, index) => (
                  <article key={index} className={blogStyles.blogCard}>
                    <div className={blogStyles.category}>{post.category}</div>
                    <h2>{post.title}</h2>
                    <p>{post.excerpt}</p>
                    <div className={blogStyles.meta}>
                      <span>{post.date}</span>
                      <span>•</span>
                      <span>{post.readTime}</span>
                    </div>
                    <Link href="#" className={blogStyles.readMore}>
                      Read More →
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
} 