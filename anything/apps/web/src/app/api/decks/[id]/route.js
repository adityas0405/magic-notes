import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Fetch deck details
    const [deck] = await sql`
      SELECT 
        id,
        topic,
        summary,
        image_url,
        card_count,
        created_at
      FROM decks
      WHERE id = ${id}
    `;

    if (!deck) {
      return Response.json({ error: "Deck not found" }, { status: 404 });
    }

    // Fetch associated cards
    const cards = await sql`
      SELECT 
        id,
        question,
        answer
      FROM cards
      WHERE deck_id = ${id}
      ORDER BY id
    `;

    return Response.json({
      ...deck,
      cards,
    });
  } catch (error) {
    console.error("Error fetching deck:", error);
    return Response.json(
      { error: "Failed to fetch deck details" },
      { status: 500 },
    );
  }
}
