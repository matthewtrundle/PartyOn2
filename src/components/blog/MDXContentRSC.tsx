import { compileMDX } from 'next-mdx-remote/rsc'
import CorporateEventCalculator from '@/components/CorporateEventCalculator'
import YouTubeEmbed from '@/components/YouTubeEmbed'

interface MDXContentRSCProps {
  source: string
}

// Custom components for MDX rendering (RSC-compatible)
const components = {
  // Custom React components
  CorporateEventCalculator,
  // Lets a post embed a video with:
  //   <YouTubeEmbed videoId="abc123" title="How to plan a bachelorette party" />
  // Pair it with a VideoObject JSON-LD block on the post (generateVideoSchema
  // in @/lib/seo/schemas) — the embed alone is not indexable as a video.
  YouTubeEmbed,

  // Custom image component
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    if (!props.src) return null

    return (
      <div className="my-8">
        <img
          src={props.src}
          alt={props.alt || ''}
          className="w-full h-auto rounded-lg"
          loading="lazy"
        />
      </div>
    )
  },

  // Custom heading components with styling
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="font-heading text-4xl md:text-5xl text-gray-900 mb-6 mt-12 tracking-[0.1em]" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 mt-10 tracking-[0.1em]" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="font-heading text-2xl md:text-3xl text-gray-900 mb-3 mt-8 tracking-[0.1em]" {...props} />
  ),

  // Paragraph styling
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-gray-700 text-lg leading-relaxed mb-6" {...props} />
  ),

  // List styling
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside text-gray-700 text-lg space-y-2 mb-6 ml-4" {...props} />
  ),
  ol: (props: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside text-gray-700 text-lg space-y-2 mb-6 ml-4" {...props} />
  ),
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li className="text-gray-700" {...props} />
  ),

  // Link styling - external links open in new tab
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = props.href?.startsWith('http')
    return (
      <a
        className="text-brand-yellow hover:text-yellow-600 underline"
        {...props}
        {...(isExternal && {
          target: '_blank',
          rel: 'noopener noreferrer'
        })}
      />
    )
  },

  // Blockquote styling
  blockquote: (props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-4 border-yellow-500 pl-6 py-2 my-6 italic text-gray-700" {...props} />
  ),

  // Code styling
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800" {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-6" {...props} />
  ),

  // Table styling - preserve className from MDX for comparison-table styling
  table: ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
    <table className={className || 'min-w-full border-collapse border border-gray-300'} {...props} />
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead {...props} />
  ),
  tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...props} />
  ),
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr {...props} />
  ),
  th: ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className={className} {...props} />
  ),
  td: ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className={className} {...props} />
  ),
  caption: (props: React.HTMLAttributes<HTMLTableCaptionElement>) => (
    <caption {...props} />
  ),
  // Pass through div elements to preserve Schema.org itemScope/itemType attributes
  div: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props} />
  ),
}

export default async function MDXContentRSC({ source }: MDXContentRSCProps) {
  const { content } = await compileMDX({
    source,
    components,
    options: {
      parseFrontmatter: false,
    },
  })

  return (
    <div className="prose prose-lg max-w-none">
      {content}
    </div>
  )
}
