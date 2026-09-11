import { supabase } from './supabase'

/**
 * A book's current page is derived from its reading history:
 * the latest reading entry's end_page, or the book's starting_page
 * when there is no history yet.
 *
 * Centralizing this keeps every "where is this book now?" path in
 * sync — the member reopen (Books), the admin reopen (AdminBooks),
 * and the admin entry sync (AdminReading) — so an accidental
 * "finished" that inflates current_page to total_pages can always
 * be reconstructed from the real entries.
 */
export async function computeCurrentPageFromHistory(
  bookId: string,
  startingPage: number
): Promise<number> {
  const { data, error } = await supabase
    .from('reading_entries')
    .select('end_page')
    .eq('book_id', bookId)
    .order('reading_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw error
  }

  return data && data.length > 0
    ? data[0].end_page
    : startingPage
}
