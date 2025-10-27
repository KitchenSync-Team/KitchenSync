// app/debug-env.tsx
'use client'
export default function DebugEnv() {
    return (
        <pre style={{whiteSpace:'pre-wrap', wordBreak:'break-all'}}>
      {JSON.stringify({
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0,8) + '…'
      }, null, 2)}
    </pre>
    )
}