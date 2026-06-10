'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { TOPIC_CLUSTERS } from '@/lib/topic-clusters'

interface BlogPost {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  image?: {
    url: string
    alt: string
  }
  tags: string[]
}

interface BlogSearchFilterProps {
  posts: BlogPost[]
}

const PILLAR_CATEGORIES = TOPIC_CLUSTERS.map(cluster => ({
  slug: cluster.pillarSlug,
  label: cluster.category,
  clusterSlugs: cluster.clusterSlugs,
}))

export default function BlogSearchFilter({ posts }: BlogSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredPosts = useMemo(() => {
    let filtered = posts

    // Filter by category (pillar + its cluster posts)
    if (activeCategory) {
      const category = PILLAR_CATEGORIES.find(c => c.label === activeCategory)
      if (category) {
        const relevantSlugs = [category.slug, ...category.clusterSlugs]
        filtered = filtered.filter(post => relevantSlugs.includes(post.slug))
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [posts, searchQuery, activeCategory])

  return (
    <>
      {/* Search and Filter Section */}
      <section className="py-8 px-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 pl-12 border border-gray-300 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none text-gray-900 placeholder-gray-400"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-5 py-2 text-sm tracking-[0.08em] transition-all border ${
                activeCategory === null
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-500 hover:text-brand-yellow'
              }`}
            >
              ALL POSTS
            </button>
            {PILLAR_CATEGORIES.map((category) => (
              <button
                key={category.label}
                onClick={() => setActiveCategory(activeCategory === category.label ? null : category.label)}
                className={`px-5 py-2 text-sm tracking-[0.08em] transition-all border ${
                  activeCategory === category.label
                    ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-500 hover:text-brand-yellow'
                }`}
              >
                {category.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Results Count */}
          {(searchQuery || activeCategory) && (
            <p className="text-center text-sm text-gray-500 mt-6">
              {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'} found
              {activeCategory && ` in ${activeCategory}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          )}
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 px-8">
        <div className="max-w-7xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg mb-4">No articles found</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory(null)
                }}
                className="text-brand-yellow hover:text-yellow-600 underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {filteredPosts.map((post) => {
                const category = post.tags[0] || 'Article'
                const imageUrl = post.image?.url || '/images/hero/lake-travis-yacht-sunset.webp'

                return (
                  <article
                    key={post.slug}
                    className="bg-white border border-gray-200 hover:border-yellow-500 transition-all duration-300 group"
                  >
                    <Link href={`/blog/${post.slug}`}>
                      <div className="relative h-64 overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={post.image?.alt || post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="bg-white px-3 py-1 text-xs tracking-[0.1em] text-gray-700">
                            {category.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <time>
                            {new Date(post.publishedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </time>
                        </div>
                        <h2 className="font-heading text-2xl text-gray-900 mb-3 group-hover:text-yellow-500 transition-colors">
                          {post.title}
                        </h2>
                        <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                        <span className="inline-block mt-2 px-4 py-2 border border-yellow-500 text-brand-yellow group-hover:bg-brand-yellow group-hover:text-gray-900 font-medium text-sm tracking-[0.1em] transition-all">
                          READ MORE →
                        </span>
                      </div>
                    </Link>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
