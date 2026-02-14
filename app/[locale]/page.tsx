"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const redirectToChat = async () => {
      try {
        // 尝试获取 session
        const session = (await supabase.auth.getSession()).data.session

        if (session) {
          // 如果有 session，获取用户的工作区
          const { data: homeWorkspace, error } = await supabase
            .from("workspaces")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("is_home", true)
            .single()

          if (homeWorkspace && !error) {
            router.push(`/${homeWorkspace.id}/chat`)
            return
          }
        }

        // 如果没有 session 或没有工作区，尝试获取第一个公开的工作区
        const { data: publicWorkspaces } = await supabase
          .from("workspaces")
          .select("*")
          .eq("sharing", "public")
          .limit(1)

        if (publicWorkspaces && publicWorkspaces.length > 0) {
          router.push(`/${publicWorkspaces[0].id}/chat`)
          return
        }

        // 如果都没有，使用一个固定的默认工作区 ID
        // 注意：这个工作区需要在数据库中存在，或者工作区布局需要处理不存在的情况
        const defaultWorkspaceId = "00000000-0000-0000-0000-000000000000"
        router.push(`/${defaultWorkspaceId}/chat`)
      } catch (error) {
        console.error("Error redirecting to chat:", error)
        // 即使出错也尝试重定向，让工作区布局处理错误
        router.push("/00000000-0000-0000-0000-000000000000/chat")
      }
    }

    redirectToChat()
  }, [router])

  // 显示加载状态
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div className="text-lg">Loading TritonDFT...</div>
    </div>
  )
}
