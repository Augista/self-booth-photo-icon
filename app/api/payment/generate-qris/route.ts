export async function POST() {
  return new Response(JSON.stringify({ error: 'This endpoint is not used.' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  });
}
