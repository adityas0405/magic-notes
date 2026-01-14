import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const decks = await sql`
      SELECT 
        id,
        topic,
        created_at,
        card_count
      FROM decks
      ORDER BY created_at DESC
    `;

    return Response.json(decks);
  } catch (error) {
    console.error("Error fetching decks:", error);
    return Response.json({ error: "Failed to fetch decks" }, { status: 500 });
  }
}
