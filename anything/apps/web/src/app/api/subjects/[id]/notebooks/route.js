import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const notebooks = await sql`
      SELECT d.*, 
        COUNT(DISTINCT p.id) as page_count,
        MAX(d.created_at) as last_edited
      FROM decks d
      LEFT JOIN pages p ON p.notebook_id = d.id
      WHERE d.subject_id = ${id}
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `;

    return Response.json(notebooks);
  } catch (error) {
    console.error("Error fetching notebooks:", error);
    return Response.json(
      { error: "Failed to fetch notebooks" },
      { status: 500 },
    );
  }
}
