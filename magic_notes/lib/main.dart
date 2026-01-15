import 'package:flutter/material.dart';

import 'screens/magic_canvas.dart';
import 'screens/token_entry_screen.dart';
import 'services/api_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
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
  bool _isReady = false;
  bool _needsToken = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await _apiService.loadAuthToken();
    if (!mounted) return;
    setState(() {
      _isReady = true;
      _needsToken = !_apiService.hasAuthToken;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_isReady) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    if (_needsToken) {
      return TokenEntryScreen(
        onSave: (token) async {
          await _apiService.setAuthToken(token);
          if (!mounted) return;
          setState(() => _needsToken = false);
        },
      );
    }
    return MagicCanvas(
      apiService: _apiService,
      onRequestToken: () {
        _apiService.clearAuthToken();
        setState(() => _needsToken = true);
      },
      onAuthExpired: () {
        setState(() => _needsToken = true);
      },
    );
  }
}
