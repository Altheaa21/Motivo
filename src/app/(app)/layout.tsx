import { AppShell } from '@/components/layout/AppShell'
import { TTSInitializer } from '@/components/layout/TTSInitializer'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <TTSInitializer />
      {children}
    </AppShell>
  )
}