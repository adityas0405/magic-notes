import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const subjects = await sql`
      SELECT s.*, COUNT(d.id) as notebook_count
      FROM subjects s
      LEFT JOIN decks d ON d.subject_id = s.id
      GROUP BY s.id
      ORDER BY s.name
    `;

    return Response.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return Response.json(
      { error: "Failed to fetch subjects" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const { name, color, icon } = await request.json();

    if (!name || !color || !icon) {
      return Response.json(
        { error: "Name, color, and icon are required" },
        { status: 400 },
      );
    }

    const result = await sql`
      INSERT INTO subjects (name, color, icon)
      VALUES (${name}, ${color}, ${icon})
      RETURNING *
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("Error creating subject:", error);
    return Response.json(
      { error: "Failed to create subject" },
      { status: 500 },
    );
  }
}
