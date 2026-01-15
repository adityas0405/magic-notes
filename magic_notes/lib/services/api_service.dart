import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';
import '../models/drawing.dart';
import '../models/note.dart';

class ApiService {
  ApiService({this.baseUrl = apiBaseUrl, String? authToken})
      : _authToken = authToken;

  final String baseUrl;
  String? _authToken;

  /// Persist + set the auth token (JWT).
  Future<void> setAuthToken(String token) async {
    _authToken = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsTokenKey, token);
  }

  /// Load a persisted auth token (JWT) into memory.
  Future<void> loadAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_prefsTokenKey);
    if (token != null && token.isNotEmpty) {
      _authToken = token;
    }
  }

  /// Clear token from memory + storage (logout / reset).
  Future<void> clearAuthToken() async {
    _authToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsTokenKey);
  }

  /// Optional helper: is a token currently available?
  bool get hasAuthToken => _authToken != null && _authToken!.isNotEmpty;

  Map<String, String> _headers({bool json = true}) {
    final headers = <String, String>{};
    if (json) {
      headers['Content-Type'] = 'application/json';
    }
    if (_authToken != null && _authToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  Future<int> createNote({String? title, String? device, int? notebookId}) async {
    final payload = {
      'title': title,
      'device': device ?? 'samsung-tab-s7',
      'notebook_id': notebookId,
    }..removeWhere((key, value) => value == null);

    final response = await http.post(
      Uri.parse('$baseUrl/api/notes'),
      headers: _headers(),
      body: jsonEncode(payload),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Failed to create note (${response.statusCode}): ${_safeBody(response)}',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['id'] as int;
  }

  Future<void> uploadStrokes(int noteId, List<Stroke> strokes) async {
    final payload = {
      'strokes': strokes.map((s) => s.toJson()).toList(),
      'captured_at': DateTime.now().toIso8601String(),
    };

    final response = await http.post(
      Uri.parse('$baseUrl/api/notes/$noteId/strokes'),
      headers: _headers(),
      body: jsonEncode(payload),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Failed to upload strokes (${response.statusCode}): ${_safeBody(response)}',
      );
    }
  }

  Future<List<NotebookSummary>> fetchNotebooks() async {
    final response =
        await http.get(Uri.parse('$baseUrl/api/library'), headers: _headers());

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Failed to load library (${response.statusCode}): ${_safeBody(response)}',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final notebooks = (decoded['notebooks'] as List<dynamic>? ?? []);
    return notebooks
        .map((notebook) => NotebookSummary.fromJson(notebook))
        .toList();
  }

  Future<List<NoteSummary>> fetchNotes(int notebookId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/notebooks/$notebookId/notes'),
      headers: _headers(),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Failed to load notes (${response.statusCode}): ${_safeBody(response)}',
      );
    }

    final decoded = jsonDecode(response.body) as List<dynamic>;
    return decoded.map((note) => NoteSummary.fromJson(note)).toList();
  }

  Future<NoteDetail> fetchNoteDetail(int noteId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/notes/$noteId'),
      headers: _headers(),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Failed to load note (${response.statusCode}): ${_safeBody(response)}',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return NoteDetail.fromJson(decoded);
  }

  String resolveFileUrl(String fileUrl) {
    if (fileUrl.isEmpty) {
      return '';
    }

    final parsed = Uri.parse(fileUrl);
    if (parsed.hasScheme) {
      return fileUrl;
    }

    return Uri.parse(baseUrl).resolve(fileUrl).toString();
  }

  // --- helpers ---

  static const String _prefsTokenKey = 'auth_token';

  String _safeBody(http.Response response) {
    try {
      final body = response.body;
      if (body.isEmpty) return '';
      // Avoid huge logs
      return body.length > 500 ? '${body.substring(0, 500)}…' : body;
    } catch (_) {
      return '';
    }
  }
}

class NotebookSummary {
  final int id;
  final String name;
  final String color;
  final String icon;
  final int noteCount;

  NotebookSummary({
    required this.id,
    required this.name,
    required this.color,
    required this.icon,
    required this.noteCount,
  });

  factory NotebookSummary.fromJson(Map<String, dynamic> json) {
    return NotebookSummary(
      id: json['id'] as int,
      name: (json['name'] as String?) ?? 'Notebook',
      color: (json['color'] as String?) ?? '#14b8a6',
      icon: (json['icon'] as String?) ?? 'Atom',
      noteCount: (json['note_count'] as num?)?.toInt() ?? 0,
    );
  }
}
