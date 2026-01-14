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
