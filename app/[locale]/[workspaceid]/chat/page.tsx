"use client"

import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatSettings } from "@/components/chat/chat-settings"
import { QuickSettings } from "@/components/chat/quick-settings"
import { ChatUI } from "@/components/chat/chat-ui"
import { Brand } from "@/components/ui/brand"
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { useTheme } from "next-themes"
import { useContext, useState, useEffect } from "react"
import { IconChevronRight } from "@tabler/icons-react"

export default function ChatPage() {
  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const { chatMessages } = useContext(ChatbotUIContext)
  const { handleNewChat, handleFocusChatInput } = useChatHandler()
  const { theme } = useTheme()

  const [showSidePanel, setShowSidePanel] = useState(true)
  const [panelWidth, setPanelWidth] = useState(450)
  const [isResizing, setIsResizing] = useState(false)

  const MIN_WIDTH_TO_COLLAPSE = 100
  const DEFAULT_WIDTH = 450

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX

      // Collapse if dragged below threshold
      if (newWidth < MIN_WIDTH_TO_COLLAPSE) {
        setShowSidePanel(false)
        setPanelWidth(DEFAULT_WIDTH)
      } else {
        setShowSidePanel(true)
        setPanelWidth(Math.min(700, newWidth))
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  return (
    <>
      {chatMessages.length === 0 ? (
        <div className="flex size-full">
          {/* Left panel - Initial state (empty) */}
          {showSidePanel && (
            <div
              className="flex h-full shrink-0 flex-col overflow-y-auto bg-zinc-900"
              style={{ width: `${panelWidth}px` }}
            >
              <div className="flex h-full flex-col items-center justify-center p-4">
                <p className="text-center text-sm text-zinc-400">
                  Start a conversation to see workflow progress here.
                </p>
              </div>
            </div>
          )}

          {/* Resize handle - always visible as a border between panels */}
          <div
            className={`flex h-full w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors ${
              isResizing ? "bg-green-500" : "bg-zinc-700 hover:bg-green-500"
            }`}
            onMouseDown={handleMouseDown}
          >
            {!showSidePanel && (
              <IconChevronRight size={14} className="text-zinc-400" />
            )}
          </div>

          {/* Main content area */}
          <div className="relative flex h-full flex-1 flex-col items-center justify-center">
            <div className="top-50% left-50% -translate-x-50% -translate-y-50% absolute mb-20">
              <Brand theme={theme === "dark" ? "dark" : "light"} />
            </div>

            <div className="absolute left-2 top-2">
              <QuickSettings />
            </div>

            <div className="absolute right-2 top-2">
              <ChatSettings />
            </div>

            <div className="flex grow flex-col items-center justify-center" />

            <div className="w-full min-w-[300px] items-end px-2 pb-3 pt-0 sm:w-[600px] sm:pb-8 sm:pt-5 md:w-[700px] lg:w-[700px] xl:w-[800px]">
              <ChatInput />
            </div>

            <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
              <ChatHelp />
            </div>
          </div>
        </div>
      ) : (
        <ChatUI />
      )}
    </>
  )
}
