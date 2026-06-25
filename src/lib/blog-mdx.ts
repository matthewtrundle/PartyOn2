import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface MDXBlogFAQ {
  q: string;
  a: string;
}

export interface MDXRecipe {
  name: string;
  description?: string;
  recipeYield?: string;
  prepTime?: string;
  ingredients: string[];
  instructions: string[];
}

export interface MDXBlogPost {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  image: string;
  keywords: string[];
  author: string;
  content: string;
  faq?: MDXBlogFAQ[];
  recipes?: MDXRecipe[];
}

const POSTS_DIRECTORY = path.join(process.cwd(), 'content', 'blog', 'posts');

/**
 * Get all MDX blog post slugs
 */
export function getAllMDXPostSlugs(): string[] {
  try {
    if (!fs.existsSync(POSTS_DIRECTORY)) {
      return [];
    }

    const files = fs.readdirSync(POSTS_DIRECTORY);
    return files
      .filter(file => file.endsWith('.mdx'))
      .map(file => file.replace(/\.mdx$/, ''));
  } catch (error) {
    console.error('Error reading MDX posts directory:', error);
    return [];
  }
}

/**
 * Get a single MDX blog post by slug
 */
export function getMDXPost(slug: string): MDXBlogPost | null {
  try {
    const fullPath = path.join(POSTS_DIRECTORY, `${slug}.mdx`);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    const faq = Array.isArray(data.faq)
      ? data.faq
          .filter((item: unknown): item is MDXBlogFAQ =>
            !!item && typeof item === 'object' && typeof (item as MDXBlogFAQ).q === 'string' && typeof (item as MDXBlogFAQ).a === 'string'
          )
      : undefined;

    const recipes = Array.isArray(data.recipes)
      ? data.recipes
          .filter((item: unknown): item is MDXRecipe =>
            !!item && typeof item === 'object'
            && typeof (item as MDXRecipe).name === 'string'
            && Array.isArray((item as MDXRecipe).ingredients)
            && Array.isArray((item as MDXRecipe).instructions)
          )
      : undefined;

    return {
      slug,
      title: data.title || '',
      date: data.date || '',
      category: data.category || '',
      excerpt: data.excerpt || '',
      image: data.image || '',
      keywords: data.keywords || [],
      author: data.author || 'Party On Delivery Team',
      content,
      faq,
      recipes,
    };
  } catch (error) {
    console.error(`Error reading MDX post ${slug}:`, error);
    return null;
  }
}

/**
 * Get all MDX blog posts
 */
export function getAllMDXPosts(): MDXBlogPost[] {
  const slugs = getAllMDXPostSlugs();
  const posts = slugs
    .map(slug => getMDXPost(slug))
    .filter((post): post is MDXBlogPost => post !== null)
    .sort((a, b) => {
      // Sort by date, newest first
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  return posts;
}

/**
 * Get MDX posts by category
 */
export function getMDXPostsByCategory(category: string): MDXBlogPost[] {
  const allPosts = getAllMDXPosts();
  return allPosts.filter(post =>
    post.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Convert MDX post to format compatible with existing blog system
 */
export function mdxPostToLegacyFormat(post: MDXBlogPost) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.date,
    image: {
      url: post.image,
      alt: post.title,
    },
    tags: [post.category, ...post.keywords],
  };
}
