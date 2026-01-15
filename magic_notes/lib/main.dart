import 'package:flutter/material.dart';

import 'screens/magic_canvas.dart';
import 'services/api_service.dart';

void main() {
  runApp(const MagicNotesApp());
}

class MagicNotesApp extends StatelessWidget {
  const MagicNotesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Magic Notes',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color.fromARGB(255, 192, 158, 252),
        ),
        useMaterial3: true,
      ),
      home: const MagicNotesHome(),
    );
  }
}

class MagicNotesHome extends StatefulWidget {
  const MagicNotesHome({super.key});

  @override
  State<MagicNotesHome> createState() => _MagicNotesHomeState();
}

class _MagicNotesHomeState extends State<MagicNotesHome> {
  final ApiService _apiService = ApiService();

  @override
  Widget build(BuildContext context) {
    return MagicCanvas(apiService: _apiService);
  }
}
