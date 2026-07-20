import { Sidebar } from './sidebar'
import { Toolbar } from './toolbar'
import { ArticleList } from '../article/article-list'
import { ArticleReader } from '../article/article-reader'
import { useArticleStore } from '../../stores/article-store'
import { useAppStore } from '../../stores/app-store'

export function MainLayout() {
  const selectedEntryId = useArticleStore((s) => s.selectedEntryId)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)

  return (
    <div className="flex h-screen overflow-hidden">
      {!sidebarCollapsed && <Sidebar />}
      <div className="flex flex-1 min-w-0">
        <div className="flex flex-col w-[380px] min-w-[380px] border-r border-zinc-200 dark:border-zinc-800">
          <Toolbar />
          <ArticleList />
        </div>
        {selectedEntryId && <ArticleReader />}
      </div>
    </div>
  )
}
