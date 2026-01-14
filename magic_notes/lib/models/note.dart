class NoteSummary {
  final int id;
  final String title;
  final DateTime updatedAt;
  final int flashcardCount;

  NoteSummary({
    required this.id,
    required this.title,
    required this.updatedAt,
    required this.flashcardCount,
  });

  factory NoteSummary.fromJson(Map<String, dynamic> json) {
    return NoteSummary(
      id: json['id'] as int,
      title: (json['title'] as String?) ?? 'Untitled Note',
      updatedAt: DateTime.parse(json['updated_at'] as String),
      flashcardCount: (json['flashcard_count'] as num?)?.toInt() ?? 0,
    );
  }
}

class NoteDetail {
  final int id;
  final String title;
  final String summary;
  final String notebookName;
  final String fileUrl;
  final List<Flashcard> cards;

  NoteDetail({
    required this.id,
    required this.title,
    required this.summary,
    required this.notebookName,
    required this.fileUrl,
    required this.cards,
  });

  factory NoteDetail.fromJson(Map<String, dynamic> json) {
    final cardsJson = (json['cards'] as List<dynamic>? ?? []);
    final notebookJson = json['notebook'] as Map<String, dynamic>?;
    return NoteDetail(
      id: json['id'] as int,
      title: (json['title'] as String?) ?? 'Untitled Note',
      summary: (json['summary'] as String?) ?? '',
      notebookName: (notebookJson?['name'] as String?) ?? 'Unsorted',
      fileUrl: (json['file_url'] as String?) ?? '',
      cards: cardsJson.map((card) => Flashcard.fromJson(card)).toList(),
    );
  }
}

class Flashcard {
  final String question;
  final String answer;

  Flashcard({
    required this.question,
    required this.answer,
  });

  factory Flashcard.fromJson(Map<String, dynamic> json) {
    return Flashcard(
      question: (json['question'] as String?) ?? 'Question unavailable',
      answer: (json['answer'] as String?) ?? 'Answer unavailable',
    );
  }
}
