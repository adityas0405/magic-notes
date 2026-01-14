import 'package:flutter/material.dart';

import '../models/deck.dart';
import '../services/api_service.dart';

class DeckDetailScreen extends StatefulWidget {
  const DeckDetailScreen({
    super.key,
    required this.apiService,
    required this.deckId,
  });

  final ApiService apiService;
  final int deckId;

  @override
  State<DeckDetailScreen> createState() => _DeckDetailScreenState();
}

class _DeckDetailScreenState extends State<DeckDetailScreen> {
  late Future<DeckDetail> _deckFuture;
  int _currentCardIndex = 0;
  bool _isFlipped = false;

  @override
  void initState() {
    super.initState();
    _deckFuture = widget.apiService.fetchDeckDetail(widget.deckId);
  }

  void _nextCard(DeckDetail deck) {
    if (_currentCardIndex < deck.cards.length - 1) {
      setState(() {
        _currentCardIndex += 1;
        _isFlipped = false;
      });
    }
  }

  void _previousCard() {
    if (_currentCardIndex > 0) {
      setState(() {
        _currentCardIndex -= 1;
        _isFlipped = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notebook'),
        backgroundColor: const Color.fromARGB(255, 192, 158, 252),
      ),
      body: FutureBuilder<DeckDetail>(
        future: _deckFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError || !snapshot.hasData) {
            return const Center(child: Text('Unable to load deck details.'));
          }

          final deck = snapshot.data!;
          final cards = deck.cards;
          final imageUrl = widget.apiService.resolveImageUrl(deck.imageUrl);
          final activeCard = cards.isNotEmpty ? cards[_currentCardIndex] : null;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                deck.topic,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              if (imageUrl.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    imageUrl,
                    height: 220,
                    fit: BoxFit.cover,
                  ),
                )
              else
                Container(
                  height: 180,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Center(
                    child: Text('No image available'),
                  ),
                ),
              const SizedBox(height: 24),
              Text(
                'Flashcards',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade800,
                ),
              ),
              const SizedBox(height: 12),
              if (cards.isEmpty)
                const Text('No flashcards generated yet.')
              else
                Column(
                  children: [
                    Text(
                      'Card ${_currentCardIndex + 1} of ${cards.length}',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 12),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _isFlipped = !_isFlipped;
                        });
                      },
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        transitionBuilder: (child, animation) {
                          return FadeTransition(opacity: animation, child: child);
                        },
                        child: _isFlipped
                            ? _FlashcardFace(
                                key: const ValueKey('answer'),
                                title: 'ANSWER',
                                body: activeCard?.answer ?? '',
                                accentColor: Colors.teal,
                                backgroundColor: Colors.teal.shade50,
                              )
                            : _FlashcardFace(
                                key: const ValueKey('question'),
                                title: 'QUESTION',
                                body: activeCard?.question ?? '',
                                accentColor: Colors.indigo,
                                backgroundColor: Colors.white,
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton.icon(
                          onPressed:
                              _currentCardIndex == 0 ? null : _previousCard,
                          icon: const Icon(Icons.chevron_left),
                          label: const Text('Previous'),
                        ),
                        TextButton.icon(
                          onPressed: _currentCardIndex == cards.length - 1
                              ? null
                              : () => _nextCard(deck),
                          icon: const Icon(Icons.chevron_right),
                          label: const Text('Next'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {},
                            child: const Text('Needs Practice'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {},
                            child: const Text('Got it'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tap the card to flip',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    ),
                  ],
                ),
            ],
          );
        },
      ),
    );
  }
}

class _FlashcardFace extends StatelessWidget {
  const _FlashcardFace({
    super.key,
    required this.title,
    required this.body,
    required this.accentColor,
    required this.backgroundColor,
  });

  final String title;
  final String body;
  final Color accentColor;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: key,
      padding: const EdgeInsets.all(20),
      height: 220,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accentColor.withOpacity(0.4), width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
              color: accentColor,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            body,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
