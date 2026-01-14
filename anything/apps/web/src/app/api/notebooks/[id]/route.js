import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Get notebook details
    const [notebook] = await sql`
      SELECT d.*, s.name as subject_name, s.color as subject_color
      FROM decks d
      LEFT JOIN subjects s ON s.id = d.subject_id
      WHERE d.id = ${id}
    `;

    if (!notebook) {
      return Response.json({ error: "Notebook not found" }, { status: 404 });
    }

    // Get all pages for this notebook
    const pages = await sql`
      SELECT * FROM pages
      WHERE notebook_id = ${id}
      ORDER BY page_number
    `;

    // Get flashcards for this notebook
    const cards = await sql`
      SELECT * FROM cards
      WHERE deck_id = ${id}
      ORDER BY id
    `;

    return Response.json({
      ...notebook,
      pages,
      cards,
    });
  } catch (error) {
    console.error("Error fetching notebook:", error);
    return Response.json(
      { error: "Failed to fetch notebook" },
      { status: 500 },
    );
  }
}
