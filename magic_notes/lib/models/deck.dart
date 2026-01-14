import 'flashcard.dart';

class Deck {
  final int id;
  final String topic;
  final DateTime createdAt;
  final int cardCount;

  Deck({
    required this.id,
    required this.topic,
    required this.createdAt,
    required this.cardCount,
  });

  factory Deck.fromJson(Map<String, dynamic> json) {
    return Deck(
      id: json['id'] as int,
      topic: (json['topic'] as String?) ?? 'Untitled',
      createdAt: DateTime.parse(json['created_at'] as String),
      cardCount: (json['card_count'] as num?)?.toInt() ?? 0,
    );
  }
}

class DeckDetail {
  final int id;
  final String topic;
  final String imageUrl;
  final List<Flashcard> cards;

  DeckDetail({
    required this.id,
    required this.topic,
    required this.imageUrl,
    required this.cards,
  });

  factory DeckDetail.fromJson(Map<String, dynamic> json) {
    final cardsJson = (json['cards'] as List<dynamic>? ?? []);
    return DeckDetail(
      id: json['id'] as int,
      topic: (json['topic'] as String?) ?? 'Untitled',
      imageUrl: (json['image_url'] as String?) ?? '',
      cards: cardsJson
          .map((cardJson) => Flashcard.fromJson(cardJson))
          .toList(),
    );
  }
}
