import 'package:flutter/material.dart';

import 'screens/library_screen.dart';
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
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      MagicCanvas(apiService: _apiService),
      LibraryScreen(apiService: _apiService),
    ];

    return Scaffold(
      body: pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.draw),
            label: 'Canvas',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book),
            label: 'Library',
          ),
        ],
      ),
    );
  }
}
