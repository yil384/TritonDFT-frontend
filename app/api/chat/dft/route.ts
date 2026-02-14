import { StreamingTextResponse } from "ai"

export const runtime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { messages } = json

  try {
    const response = await fetch("http://localhost:8000/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messages,
        stream: true
      })
    })

    if (!response.body) {
      throw new Error("No response stream from DFT Agent")
    }

    return new StreamingTextResponse(response.body)
  } catch (error: any) {
    return new Response(
      JSON.stringify({ message: error.message || "DFT Agent error" }),
      { status: 500 }
    )
  }
}
