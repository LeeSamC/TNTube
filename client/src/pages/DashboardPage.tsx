import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../libs/api'
import { useGetAllPosts } from '../modules/posts/hooks/usePosts'
import { PostCard } from '../modules/posts/components/PostCard'
import { PlayerArtwork } from '../modules/posts/components/PostPresentation'

function feedLink(term: string, page: number){
    const params = new URLSearchParams()
    if (term) params.set('q', term)
    if (page > 1) params.set('page', String(page))
    return params.size ? `/?${params}` : '/'
}

export default function DashboardPage() {
    const [params] = useSearchParams()
    const term = (params.get('q') ?? '').trim()
    const requestedPage = Number(params.get('page') ?? '1')
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const {data, error, isPending, isPlaceholderData, refetch} = useGetAllPosts(page, 12, term)
    const loading = isPending || isPlaceholderData
    const invalidSearch = error instanceof ApiError && error.status === 400

    return (
        <main className='mx-auto max-w-352'>
            <h1 className='tube-title wrap-break-word text-3xl font-bold lg:text-5xl'>
                {term ? `Results for "${term}"` : 'Latest posts'}
            </h1>

            <p aira-live='polite' className='mt-2 text-sm text-(--muted)'>
                {loading ? 'Loading posts...' : data && `${data.pagination.total} posts`}
            </p>

            {error && (
                <div className='mt-6 rounded-xl border border-(--line) bg-(--panel) p-5'>
                    <p role='alert'>
                        {invalidSearch ? error.message : 'Could not load posts'}
                    </p>
                    {invalidSearch ? (
                        <Link to='/' className='mt-3 inline-block underline'>Clear search</Link>
                    ) : (
                        <button 
                            type='button' 
                            onClick={() => void refetch()}
                            className='mt-3 cursor-pointer underline'
                            >
                                Try again
                        </button>
                    )}
                </div>
            )}

            {!loading && data && (
                <>
                    {data.posts.length === 0 ? (
                        <div className='mt-6 grid gap-4 rounded-xl border border-(--line) bg-(--panel) p-5 sm:grid-cols-[12rem_1fr] sm:items-center'>
                            <div className='max-w-48'>
                                <PlayerArtwork/>
                            </div>
                            <div>
                                <h2 className='tube-title text-xl font-semibold'>
                                    {page > 1 ? 'No posts on this page' : term ? 'No matching posts' : 'No posts yet'}
                                </h2>

                                {page > 1 ? (
                                    <Link to={feedLink(term, 1)} className='underline'>Go to the first page</Link>
                                ): term ? (
                                    <Link to='/' className='underline'>Clear search</Link>
                                ): (
                                    <p className='mt-1 text-(--muted)'>New posts from  TNTube creators will appear here</p>
                                )}
                            </div>
                        </div>
                    ): (
                        <ul className='mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3'>
                            {data.posts.map(post => (
                                <li key={post.postId}>
                                    <PostCard post={post} />
                                </li>
                            ))}
                        </ul>
                    )}

                    {data.posts.length > 0 && data.pagination.totalPages > 1 && (
                        <nav aria-label='Post pages' className='mt-8 flex flex-wrap justify-center gap-4 text-sm'>
                            {data.pagination.hasPreviousPage && (
                                <Link to={feedLink(term, page-1)} className='underline'>Previous</Link>
                            )}
                            <span>Page {page} of {data.pagination.totalPages}</span>
                            {data.pagination.hasNextPage && (
                                <Link to={feedLink(term, page + 1)} className='underline'>Next</Link>
                            )}
                        </nav>
                    )}
                </>
            )}
        </main>
    )
}