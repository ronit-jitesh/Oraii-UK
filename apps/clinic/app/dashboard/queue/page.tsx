import { listTriageFlags } from '../../actions'
import { QueueClient } from './QueueClient'

// Server component — fetches flags with RLS, hands off to client.
export default async function TriageQueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ show?: string }>
}) {
  const sp = (await searchParams) || {}
  const includeResolved = sp.show === 'all'

  const { flags, counts } = await listTriageFlags({ includeResolved })

  return <QueueClient initialFlags={flags} counts={counts} includeResolved={includeResolved} />
}
