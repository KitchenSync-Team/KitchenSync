export async function GET() {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    return new Response(
        JSON.stringify({ hasUrl, hasAnon, hasService }, null, 2),
        { headers: { 'content-type': 'application/json' } }
    );
}